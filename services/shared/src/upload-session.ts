import { getRedis } from './redis';
import type { UploadSessionData } from './types';

const SESSION_PREFIX = 'falcon:upload:';
const SESSION_TTL = 86400; // 24 hours

export async function saveUploadSession(
  sessionId: string,
  data: UploadSessionData
): Promise<void> {
  const client = getRedis();
  await client.setex(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL, JSON.stringify(data));
}

export async function getUploadSession(sessionId: string): Promise<UploadSessionData | null> {
  const client = getRedis();
  const data = await client.get(`${SESSION_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteUploadSession(sessionId: string): Promise<void> {
  const client = getRedis();
  await client.del(`${SESSION_PREFIX}${sessionId}`);
}

export async function updateUploadSession(
  sessionId: string,
  updater: (session: UploadSessionData) => UploadSessionData
): Promise<UploadSessionData | null> {
  const session = await getUploadSession(sessionId);
  if (!session) return null;

  const updated = updater(session);
  await saveUploadSession(sessionId, updated);
  return updated;
}
