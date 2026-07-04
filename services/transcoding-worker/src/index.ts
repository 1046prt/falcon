import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'fs';
import { pipeline } from 'stream/promises';
import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  config,
  consumeMessages,
  createLogger,
  markHlsGenerating,
  publishMessage,
  rabbitConfig,
  tryAcquireHlsLock,
  updateResolutionComplete,
} from '@falcon/shared';
import type { HlsMessage, TranscodingMessage } from '@falcon/shared';

const logger = createLogger('transcoding-worker');
const WORKER_ID = process.env.WORKER_ID || `worker-${uuidv4().slice(0, 8)}`;
const PORT = Number(process.env.WORKER_PORT) || 3005;
const METADATA_URL = process.env.METADATA_SERVICE_URL || 'http://localhost:3002';

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: true,
});

const RESOLUTION_SETTINGS: Record<string, { width: number; height: number; bitrate: string }> = {
  '1080p': { width: 1920, height: 1080, bitrate: '5000k' },
  '720p': { width: 1280, height: 720, bitrate: '2800k' },
  '480p': { width: 854, height: 480, bitrate: '1400k' },
};

const workDir = path.join(os.tmpdir(), 'falcon-worker');

async function downloadFromS3(key: string, localPath: string): Promise<void> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: config.s3.rawBucket, Key: key })
  );
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(localPath));
}

async function uploadToS3(localPath: string, key: string): Promise<void> {
  const { readFileSync } = await import('fs');
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.processedBucket,
      Key: key,
      Body: readFileSync(localPath),
      ContentType: 'video/mp4',
    })
  );
}

function transcodeVideo(inputPath: string, outputPath: string, resolution: string): Promise<void> {
  const settings = RESOLUTION_SETTINGS[resolution];
  if (!settings) {
    return Promise.reject(new Error(`Unknown resolution: ${resolution}`));
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${settings.width}:${settings.height}`,
        `-b:v ${settings.bitrate}`,
        '-c:v libx264',
        '-preset fast',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

async function updateJobStatus(
  jobId: string,
  status: string,
  extra?: { workerId?: string; outputKey?: string; errorMessage?: string }
): Promise<void> {
  await fetch(`${METADATA_URL}/jobs/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, workerId: WORKER_ID, ...extra }),
  }).catch(() => undefined);
}

async function processTranscodingJob(message: TranscodingMessage): Promise<void> {
  const { jobId, videoId, resolution, inputKey } = message;
  const jobDir = path.join(workDir, videoId, resolution);
  const outputKey = `processed/${videoId}/${resolution}/video.mp4`;

  logger.info('Processing transcoding job', { jobId, videoId, resolution, workerId: WORKER_ID });

  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }

  const inputPath = path.join(jobDir, 'input.mp4');
  const outputPath = path.join(jobDir, 'output.mp4');

  try {
    await updateJobStatus(jobId, 'PROCESSING');
    await downloadFromS3(inputKey, inputPath);
    await transcodeVideo(inputPath, outputPath, resolution);
    await uploadToS3(outputPath, outputKey);
    await updateJobStatus(jobId, 'COMPLETED', { outputKey });

    const { allResolutionsDone } = await updateResolutionComplete(
      videoId,
      resolution as '1080p' | '720p' | '480p'
    );

    logger.info('Transcoding completed', { jobId, videoId, resolution, outputKey });

    if (allResolutionsDone && (await tryAcquireHlsLock(videoId))) {
      await markHlsGenerating(videoId);
      const hlsMessage: HlsMessage = { videoId, resolutions: [...config.resolutions] };
      await publishMessage(rabbitConfig.rabbitmq.hlsQueue, hlsMessage);
      logger.info('All resolutions complete, HLS job queued', { videoId });
    }
  } catch (error) {
    await updateJobStatus(jobId, 'FAILED', { errorMessage: String(error) });
    logger.error('Transcoding job failed', { jobId, videoId, resolution, error: String(error) });
    throw error;
  } finally {
    if (existsSync(jobDir)) {
      rmSync(jobDir, { recursive: true, force: true });
    }
  }
}

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'transcoding-worker', workerId: WORKER_ID });
});

app.listen(PORT, () => {
  logger.info(`Transcoding Worker ${WORKER_ID} running on port ${PORT}`);
});

async function startWorker() {
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  logger.info('Starting transcoding worker consumer', { workerId: WORKER_ID });
  await consumeMessages<TranscodingMessage>(
    rabbitConfig.rabbitmq.transcodingQueue,
    processTranscodingJob
  );
}

startWorker().catch((error) => {
  logger.error('Worker failed to start', { error: String(error) });
  process.exit(1);
});
