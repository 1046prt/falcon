import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKey,
      secretAccessKey: config.s3.secretKey,
    },
    forcePathStyle: true,
  });
}

export const CACHE_CONTROL_HLS = 'max-age=31536000, immutable';
export const CACHE_CONTROL_MP4 = 'max-age=31536000, immutable';
export const CACHE_CONTROL_MANIFEST = 'max-age=60';

export async function getPresignedUrl(
  s3: S3Client,
  bucket: string,
  key: string,
  ttlMs: number = config.cdn.signedUrlTtlMs
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: Math.floor(ttlMs / 1000) });
}

export function buildCdnUrl(key: string): string {
  if (config.cdn.url) {
    return `${config.cdn.url}/${key}`;
  }
  return `${config.s3.endpoint}/${config.s3.processedBucket}/${key}`;
}
