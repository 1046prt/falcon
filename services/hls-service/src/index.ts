import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import cors from 'cors';
import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import {
  config,
  consumeMessages,
  createLogger,
  createS3Client,
  getPresignedUrl,
  buildCdnUrl,
  markCompleted,
  rabbitConfig,
  CACHE_CONTROL_HLS,
  CACHE_CONTROL_MANIFEST,
} from '@falcon/shared';
import type { HlsMessage } from '@falcon/shared';

const logger = createLogger('hls-service');
const app = express();
const PORT = process.env.HLS_SERVICE_PORT || 3003;

const s3 = createS3Client();

const METADATA_URL = process.env.METADATA_SERVICE_URL || 'http://localhost:3002';
const workDir = path.join(os.tmpdir(), 'falcon-hls');

const BANDWIDTH_MAP: Record<string, number> = {
  '1080p': 5000000,
  '720p': 2800000,
  '480p': 1400000,
};

const RESOLUTION_MAP: Record<string, string> = {
  '1080p': '1920x1080',
  '720p': '1280x720',
  '480p': '854x480',
};

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hls-service' });
});

app.get('/:videoId/master.m3u8', async (req, res) => {
  try {
    const key = `processed/${req.params.videoId}/hls/master.m3u8`;
    const response = await s3.send(
      new GetObjectCommand({ Bucket: config.s3.processedBucket, Key: key })
    );
    const body = await response.Body?.transformToString();
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(body);
  } catch {
    res.status(404).json({ error: 'HLS playlist not found' });
  }
});

async function downloadFromS3(key: string, localPath: string): Promise<void> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: config.s3.processedBucket, Key: key })
  );
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(localPath));
}

async function uploadFileToS3(localPath: string, key: string, contentType: string): Promise<void> {
  const cacheControl = contentType === 'application/vnd.apple.mpegurl' ? CACHE_CONTROL_MANIFEST : CACHE_CONTROL_HLS;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.processedBucket,
      Key: key,
      Body: readFileSync(localPath),
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

function generateHlsSegments(inputPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_segment_filename',
        path.join(outputDir, 'segment_%03d.ts'),
        '-f hls',
      ])
      .output(path.join(outputDir, 'playlist.m3u8'));

    const timeout = setTimeout(() => {
      command.kill('SIGKILL');
      reject(new Error(`HLS generation timed out after ${config.jobTimeoutMs}ms`));
    }, config.jobTimeoutMs);

    command
      .on('end', () => {
        clearTimeout(timeout);
        resolve();
      })
      .on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .run();
  });
}

async function processHlsJob(message: HlsMessage): Promise<void> {
  const { videoId, resolutions } = message;
  const hlsDir = path.join(workDir, videoId);

  logger.info('Generating HLS streams', { videoId, resolutions });

  if (!existsSync(hlsDir)) {
    mkdirSync(hlsDir, { recursive: true });
  }

  const masterPlaylistLines = ['#EXTM3U', '#EXT-X-VERSION:3'];

  try {
    for (const resolution of resolutions) {
      const resDir = path.join(hlsDir, resolution);
      mkdirSync(resDir, { recursive: true });

      const inputKey = `processed/${videoId}/${resolution}/video.mp4`;
      const localInput = path.join(resDir, 'input.mp4');

      await downloadFromS3(inputKey, localInput);
      await generateHlsSegments(localInput, resDir);

      const files = readdirSync(resDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
          const contentType = file.endsWith('.ts')
            ? 'video/mp2t'
            : 'application/vnd.apple.mpegurl';
          await uploadFileToS3(
            path.join(resDir, file),
            `processed/${videoId}/hls/${resolution}/${file}`,
            contentType
          );
        }
      }

      masterPlaylistLines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${BANDWIDTH_MAP[resolution]},RESOLUTION=${RESOLUTION_MAP[resolution]}`,
        `${resolution}/playlist.m3u8`
      );
    }

    const masterContent = masterPlaylistLines.join('\n') + '\n';
    const masterPath = path.join(hlsDir, 'master.m3u8');
    const { writeFileSync } = await import('fs');
    writeFileSync(masterPath, masterContent);

    await uploadFileToS3(
      masterPath,
      `processed/${videoId}/hls/master.m3u8`,
      'application/vnd.apple.mpegurl'
    );

    const masterKey = `processed/${videoId}/hls/master.m3u8`;
    let hlsMasterUrl: string;

    if (config.cdn.signedUrlEnabled) {
      hlsMasterUrl = await getPresignedUrl(s3, config.s3.processedBucket, masterKey);
    } else {
      hlsMasterUrl = buildCdnUrl(masterKey);
    }

    await fetch(`${METADATA_URL}/videos/${videoId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': config.internalApiKey },
      body: JSON.stringify({ status: 'COMPLETED', hlsMasterUrl }),
    });

    await markCompleted(videoId);

    logger.info('HLS generation completed', { videoId, hlsMasterUrl });
  } finally {
    if (existsSync(hlsDir)) {
      rmSync(hlsDir, { recursive: true, force: true });
    }
  }
}

app.listen(PORT, () => {
  logger.info(`HLS Service running on port ${PORT}`);
});

async function startConsumer() {
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  await consumeMessages<HlsMessage>(rabbitConfig.rabbitmq.hlsQueue, processHlsJob);
}

startConsumer().catch((error) => {
  logger.error('HLS consumer failed to start', { error: String(error) });
  process.exit(1);
});
