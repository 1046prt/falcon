import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config, createLogger } from '@falcon/shared';

const logger = createLogger('api-gateway');
const app = express();
const PORT = Number(process.env.API_GATEWAY_PORT) || 3000;

const UPLOAD_SERVICE = process.env.UPLOAD_SERVICE_URL || 'http://localhost:3011';
const METADATA_SERVICE = process.env.METADATA_SERVICE_URL || 'http://localhost:3002';
const HLS_SERVICE = process.env.HLS_SERVICE_URL || 'http://localhost:3003';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const publicPaths = [
  '/health',
  '/api/users/login',
  '/api/users/register',
];

function rewritePath(basePath: string) {
  return (path: string) => {
    const suffix = path === '/' ? '' : path;
    return basePath + suffix;
  };
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  if (publicPaths.some(p => req.path === p)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-email'] = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.use(
  '/api/upload',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Upload rate limit exceeded' },
  }),
  createProxyMiddleware({
    target: UPLOAD_SERVICE,
    changeOrigin: true,
    pathRewrite: rewritePath(''),
  })
);

app.use(express.json({ limit: '10mb' }));

app.use(
  '/api/videos',
  createProxyMiddleware({
    target: METADATA_SERVICE,
    changeOrigin: true,
    pathRewrite: rewritePath('/videos'),
  })
);

app.use(
  '/api/users',
  createProxyMiddleware({
    target: METADATA_SERVICE,
    changeOrigin: true,
    pathRewrite: rewritePath('/users'),
  })
);

app.use(
  '/api/hls',
  createProxyMiddleware({
    target: HLS_SERVICE,
    changeOrigin: true,
    pathRewrite: rewritePath(''),
  })
);

app.use(
  '/api/notifications',
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE,
    changeOrigin: true,
    pathRewrite: rewritePath(''),
  })
);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, { corsOrigin });
});
