export type VideoStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRY';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Video {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: VideoStatus;
  originalKey?: string;
  hlsMasterUrl?: string;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  videoId: string;
  resolution: string;
  status: JobStatus;
  workerId?: string;
  outputKey?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TranscodingMessage {
  jobId: string;
  videoId: string;
  resolution: string;
  inputKey: string;
}

export interface HlsMessage {
  videoId: string;
  resolutions: string[];
}

export interface ProcessingProgress {
  videoId: string;
  '1080p': boolean;
  '720p': boolean;
  '480p': boolean;
  progress: number;
  status: VideoStatus;
}

export interface UploadSessionData {
  videoId: string;
  title: string;
  description?: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number[];
  parts: { ETag: string; PartNumber: number }[];
  uploadId: string;
  key: string;
}

export interface CreateVideoRequest {
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
}
