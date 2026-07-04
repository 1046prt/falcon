import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger } from '@falcon/shared';

const logger = createLogger('api-gateway');
const app = express();
const PORT = Number(process.env.API_GATEWAY_PORT) || 3000;

const UPLOAD_SERVICE = process.env.UPLOAD_SERVICE_URL || 'http://localhost:3011';
const METADATA_SERVICE = process.env.METADATA_SERVICE_URL || 'http://localhost:3002';
const HLS_SERVICE = process.env.HLS_SERVICE_URL || 'http://localhost:3003';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

/** Express strips the mount prefix — rewrite the remaining path for upstream services */
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

app.use(
  '/api/upload',
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
