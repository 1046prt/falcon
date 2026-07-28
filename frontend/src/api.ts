const API_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('falcon_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface UploadSession {
  sessionId: string;
  videoId: string;
  title: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
}

export interface ProcessingProgress {
  videoId: string;
  '1080p': boolean;
  '720p': boolean;
  '480p': boolean;
  progress: number;
  status: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  status: string;
  hls_master_url?: string;
  created_at: string;
  progress?: ProcessingProgress;
}

export async function initUpload(params: {
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
}): Promise<UploadSession> {
  return apiFetch('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  chunk: Blob
): Promise<{ progress: number }> {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('chunk', chunk);

  return apiFetch('/api/upload/chunk', { method: 'POST', body: formData });
}

export async function completeUpload(sessionId: string) {
  return apiFetch<{ videoId: string; status: string }>('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

export async function getVideos(): Promise<Video[]> {
  return apiFetch('/api/videos');
}

export async function getVideo(id: string): Promise<Video> {
  return apiFetch(`/api/videos/${id}`);
}

export async function getProgress(videoId: string): Promise<ProcessingProgress> {
  return apiFetch(`/api/notifications/progress/${videoId}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export const CHUNK_SIZE = 5 * 1024 * 1024;
