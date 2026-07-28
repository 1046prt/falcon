import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  config,
  createLogger,
  createS3Client,
  deleteUploadSession,
  getUploadSession,
  publishMessage,
  rabbitConfig,
  saveUploadSession,
  setProcessingProgress,
  updateUploadSession,
  CACHE_CONTROL_MP4,
} from '@falcon/shared';
import type { TranscodingMessage } from '@falcon/shared';

const logger = createLogger('upload-service');
const app = express();
const PORT = Number(process.env.UPLOAD_SERVICE_PORT) || 3011;
const METADATA_URL = process.env.METADATA_SERVICE_URL || 'http://localhost:3002';

const s3 = createS3Client();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'upload-service', timestamp: new Date().toISOString() });
});

app.post('/init', async (req, res) => {
  try {
    const { title, description, fileName, fileSize, chunkSize, totalChunks } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!title || !fileName || !fileSize || !totalChunks) {
      res.status(400).json({ error: 'Missing required fields: title, fileName, fileSize, totalChunks' });
      return;
    }

    const videoId = uuidv4();
    const sessionId = uuidv4();
    const key = `raw/${videoId}/${fileName}`;

    const multipart = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: config.s3.rawBucket,
        Key: key,
        ContentType: 'video/mp4',
        CacheControl: CACHE_CONTROL_MP4,
      })
    );

    if (!multipart.UploadId) {
      throw new Error('Failed to create multipart upload');
    }

    await saveUploadSession(sessionId, {
      videoId,
      title,
      description,
      fileName,
      totalChunks,
      uploadedChunks: [],
      parts: [],
      uploadId: multipart.UploadId,
      key,
    });

    await setProcessingProgress({
      videoId,
      '1080p': false,
      '720p': false,
      '480p': false,
      progress: 0,
      status: 'UPLOADING',
    });

    logger.info('Upload session initialized', { sessionId, videoId, fileName });

    res.status(201).json({
      sessionId,
      videoId,
      title,
      description,
      fileName,
      fileSize,
      chunkSize,
      totalChunks,
      userId: userId || null,
    });
  } catch (error) {
    logger.error('Failed to init upload', { error: String(error) });
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

app.post('/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.body;
    const chunkIdx = parseInt(chunkIndex, 10);

    if (!sessionId || Number.isNaN(chunkIdx)) {
      res.status(400).json({ error: 'sessionId and chunkIndex are required' });
      return;
    }

    const session = await getUploadSession(sessionId);
    if (!session || !req.file) {
      res.status(400).json({ error: 'Invalid session or missing chunk' });
      return;
    }

    if (session.uploadedChunks.includes(chunkIdx)) {
      const uploadProgress = Math.round((session.uploadedChunks.length / session.totalChunks) * 100);
      res.json({
        sessionId,
        chunkIndex: chunkIdx,
        uploaded: session.uploadedChunks.length,
        total: session.totalChunks,
        progress: uploadProgress,
        duplicate: true,
      });
      return;
    }

    const partNumber = chunkIdx + 1;
    const result = await s3.send(
      new UploadPartCommand({
        Bucket: config.s3.rawBucket,
        Key: session.key,
        UploadId: session.uploadId,
        PartNumber: partNumber,
        Body: req.file.buffer,
      })
    );

    const updated = await updateUploadSession(sessionId, (s) => ({
      ...s,
      parts: [...s.parts, { ETag: result.ETag!, PartNumber: partNumber }],
      uploadedChunks: [...s.uploadedChunks, chunkIdx],
    }));

    const uploadProgress = Math.round(
      ((updated?.uploadedChunks.length || 0) / session.totalChunks) * 100
    );

    logger.info('Chunk uploaded', { sessionId, chunkIndex: chunkIdx, uploadProgress });

    res.json({
      sessionId,
      chunkIndex: chunkIdx,
      uploaded: updated?.uploadedChunks.length || 0,
      total: session.totalChunks,
      progress: uploadProgress,
    });
  } catch (error) {
    logger.error('Failed to upload chunk', { error: String(error) });
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

app.post('/complete', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await getUploadSession(sessionId);

    if (!session) {
      res.status(400).json({ error: 'Invalid session' });
      return;
    }

    if (session.uploadedChunks.length !== session.totalChunks) {
      res.status(400).json({
        error: 'Not all chunks uploaded',
        uploaded: session.uploadedChunks.length,
        total: session.totalChunks,
      });
      return;
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: config.s3.rawBucket,
        Key: session.key,
        UploadId: session.uploadId,
        MultipartUpload: {
          Parts: session.parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );

    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers['x-user-id']) {
      authHeaders['x-user-id'] = req.headers['x-user-id'] as string;
    }
    if (req.headers.authorization) {
      authHeaders['authorization'] = req.headers.authorization as string;
    }

    const videoResponse = await fetch(`${METADATA_URL}/videos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: session.videoId,
        title: session.title,
        description: session.description,
        originalKey: session.key,
        status: 'PROCESSING',
      }),
    });

    if (!videoResponse.ok) {
      logger.warn('Metadata service unavailable, continuing with queue', {
        videoId: session.videoId,
      });
    }

    await setProcessingProgress({
      videoId: session.videoId,
      '1080p': false,
      '720p': false,
      '480p': false,
      progress: 0,
      status: 'PROCESSING',
    });

    for (const resolution of config.resolutions) {
      const jobId = uuidv4();

      await fetch(`${METADATA_URL}/jobs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ id: jobId, videoId: session.videoId, resolution }),
      }).catch(() => undefined);

      const message: TranscodingMessage = {
        jobId,
        videoId: session.videoId,
        resolution,
        inputKey: session.key,
      };
      await publishMessage(rabbitConfig.rabbitmq.transcodingQueue, message);
    }

    await deleteUploadSession(sessionId);
    logger.info('Upload completed, jobs queued', { videoId: session.videoId });

    res.json({
      videoId: session.videoId,
      title: session.title,
      status: 'PROCESSING',
      key: session.key,
      message: 'Upload complete. Transcoding started.',
    });
  } catch (error) {
    logger.error('Failed to complete upload', { error: String(error) });
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

app.listen(PORT, () => {
  logger.info(`Upload Service running on port ${PORT}`);
});
