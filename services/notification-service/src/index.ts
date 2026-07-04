import cors from 'cors';
import express from 'express';
import { createLogger, getProcessingProgress, pingRedis } from '@falcon/shared';

const logger = createLogger('notification-service');
const app = express();
const PORT = Number(process.env.NOTIFICATION_SERVICE_PORT) || 3004;

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  const redisOk = await pingRedis();
  res.status(redisOk ? 200 : 503).json({
    status: redisOk ? 'ok' : 'degraded',
    service: 'notification-service',
    redis: redisOk,
  });
});

app.get('/progress/:videoId', async (req, res) => {
  try {
    const progress = await getProcessingProgress(req.params.videoId);

    if (!progress) {
      res.status(404).json({ error: 'No progress data found', videoId: req.params.videoId });
      return;
    }

    res.json(progress);
  } catch (error) {
    logger.error('Failed to get progress', { error: String(error) });
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});
