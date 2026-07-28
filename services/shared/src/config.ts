function warnIfDefault(value: string | undefined, fallback: string, label: string): string {
  if (!value || value === fallback) {
    console.warn(`[falcon/config] WARNING: ${label} is using default value. Set the ${label.replace(' ', '_').toUpperCase()} environment variable for production.`);
  }
  return value || fallback;
}

export const config = {
  database: {
    url: warnIfDefault(process.env.DATABASE_URL, 'postgresql://falcon:falcon_dev@localhost:5432/falcon', 'DATABASE_URL'),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  rabbitmq: {
    url: warnIfDefault(process.env.RABBITMQ_URL, 'amqp://falcon:falcon_dev@localhost:5672', 'RABBITMQ_URL'),
    transcodingQueue: 'falcon.transcoding',
    hlsQueue: 'falcon.hls',
    notificationQueue: 'falcon.notifications',
    maxRetries: Number(process.env.RABBITMQ_MAX_RETRIES) || 3,
    retryDelayMs: Number(process.env.RABBITMQ_RETRY_DELAY_MS) || 30000,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: warnIfDefault(process.env.S3_ACCESS_KEY, 'falcon', 'S3_ACCESS_KEY'),
    secretKey: warnIfDefault(process.env.S3_SECRET_KEY, 'falcon_dev', 'S3_SECRET_KEY'),
    rawBucket: 'raw-videos',
    processedBucket: 'processed-videos',
    region: process.env.S3_REGION || 'us-east-1',
  },
  jwt: {
    secret: warnIfDefault(process.env.JWT_SECRET, 'change-me-in-production', 'JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  internalApiKey: warnIfDefault(process.env.INTERNAL_API_KEY, 'falcon-internal-key', 'INTERNAL_API_KEY'),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS) || 300000,
  cdn: {
    url: process.env.CDN_URL || process.env.S3_PUBLIC_ENDPOINT || '',
    signedUrlEnabled: process.env.CDN_SIGNED_URL_ENABLED === 'true',
    signedUrlTtlMs: Number(process.env.CDN_SIGNED_URL_TTL_MS) || 3600000,
    keyPairId: process.env.CDN_KEY_PAIR_ID || '',
    privateKeyPath: process.env.CDN_PRIVATE_KEY_PATH || '',
  },
  resolutions: ['1080p', '720p', '480p'] as const,
};

export type Resolution = (typeof config.resolutions)[number];
