import Redis from 'ioredis';
import { config } from './config';
import type { ProcessingProgress, VideoStatus } from './types';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

const PROGRESS_KEY_PREFIX = 'falcon:progress:';
const HLS_LOCK_PREFIX = 'falcon:hls-lock:';

export async function setProcessingProgress(progress: ProcessingProgress): Promise<void> {
  const client = getRedis();
  await client.setex(
    `${PROGRESS_KEY_PREFIX}${progress.videoId}`,
    86400,
    JSON.stringify(progress)
  );
}

export async function getProcessingProgress(videoId: string): Promise<ProcessingProgress | null> {
  const client = getRedis();
  const data = await client.get(`${PROGRESS_KEY_PREFIX}${videoId}`);
  return data ? JSON.parse(data) : null;
}

export async function updateResolutionComplete(
  videoId: string,
  resolution: '1080p' | '720p' | '480p'
): Promise<{ progress: ProcessingProgress; allResolutionsDone: boolean }> {
  const existing = (await getProcessingProgress(videoId)) || {
    videoId,
    '1080p': false,
    '720p': false,
    '480p': false,
    progress: 0,
    status: 'PROCESSING' as VideoStatus,
  };

  existing[resolution] = true;
  const completed = [existing['1080p'], existing['720p'], existing['480p']].filter(Boolean).length;
  existing.progress = Math.round((completed / 3) * 80); // 80% max before HLS
  existing.status = completed === 3 ? 'PROCESSING' : 'PROCESSING';

  await setProcessingProgress(existing);
  return { progress: existing, allResolutionsDone: completed === 3 };
}

export async function tryAcquireHlsLock(videoId: string): Promise<boolean> {
  const client = getRedis();
  const result = await client.set(`${HLS_LOCK_PREFIX}${videoId}`, '1', 'EX', 600, 'NX');
  return result === 'OK';
}

export async function markHlsGenerating(videoId: string): Promise<void> {
  const existing = await getProcessingProgress(videoId);
  if (!existing) return;

  await setProcessingProgress({
    ...existing,
    progress: 90,
    status: 'PROCESSING',
  });
}

export async function markCompleted(videoId: string): Promise<void> {
  await setProcessingProgress({
    videoId,
    '1080p': true,
    '720p': true,
    '480p': true,
    progress: 100,
    status: 'COMPLETED',
  });
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
