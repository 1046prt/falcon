export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://falcon:falcon_secret@localhost:5432/falcon',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://falcon:falcon_secret@localhost:5672',
    transcodingQueue: 'falcon.transcoding',
    hlsQueue: 'falcon.hls',
    notificationQueue: 'falcon.notifications',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'falcon',
    secretKey: process.env.S3_SECRET_KEY || 'falcon_secret',
    rawBucket: process.env.S3_RAW_BUCKET || 'raw-videos',
    processedBucket: process.env.S3_PROCESSED_BUCKET || 'processed-videos',
    region: process.env.S3_REGION || 'us-east-1',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  resolutions: ['1080p', '720p', '480p'] as const,
};

export type Resolution = (typeof config.resolutions)[number];
