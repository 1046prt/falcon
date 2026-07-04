import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config, createLogger, getProcessingProgress } from '@falcon/shared';

const logger = createLogger('metadata-service');
const app = express();
const PORT = process.env.METADATA_SERVICE_PORT || 3002;

const pool = new Pool({ connectionString: config.database.url });

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'metadata-service' });
  } catch {
    res.status(503).json({ status: 'error', service: 'metadata-service' });
  }
});

app.post('/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
      [id, name, email, passwordHash]
    );

    const token = jwt.sign({ userId: id, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    res.status(201).json({ user: { id, name, email }, token });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    logger.error('Registration failed', { error: String(error) });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    logger.error('Login failed', { error: String(error) });
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/videos', async (req, res) => {
  try {
    const { id, userId, title, description, originalKey, status } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const videoId = id || uuidv4();

    const result = await pool.query(
      `INSERT INTO videos (id, user_id, title, description, status, original_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         original_key = EXCLUDED.original_key,
         updated_at = NOW()
       RETURNING *`,
      [videoId, userId || null, title, description, status || 'UPLOADED', originalKey]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create video', { error: String(error) });
    res.status(500).json({ error: 'Failed to create video record' });
  }
});

app.get('/videos', async (req, res) => {
  try {
    const { userId, status } = req.query;
    let query = 'SELECT * FROM videos';
    const params: string[] = [];
    const conditions: string[] = [];

    if (userId) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(userId as string);
    }
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status as string);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to list videos', { error: String(error) });
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

app.get('/videos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    const progress = await getProcessingProgress(req.params.id);

    if (result.rows.length === 0) {
      if (progress) {
        res.json({
          id: req.params.id,
          title: 'Processing...',
          status: progress.status,
          progress,
        });
        return;
      }
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json({ ...result.rows[0], progress });
  } catch (error) {
    logger.error('Failed to get video', { error: String(error) });
    res.status(500).json({ error: 'Failed to get video' });
  }
});

app.patch('/videos/:id/status', async (req, res) => {
  try {
    const { status, hlsMasterUrl } = req.body;
    const result = await pool.query(
      `UPDATE videos SET status = $1, hls_master_url = COALESCE($2, hls_master_url), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, hlsMasterUrl, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update video status', { error: String(error) });
    res.status(500).json({ error: 'Failed to update video status' });
  }
});

app.get('/videos/:id/jobs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE video_id = $1 ORDER BY resolution',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to get jobs', { error: String(error) });
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

app.post('/jobs', async (req, res) => {
  try {
    const { id, videoId, resolution } = req.body;

    if (!videoId || !resolution) {
      res.status(400).json({ error: 'videoId and resolution are required' });
      return;
    }

    const jobId = id || uuidv4();

    const result = await pool.query(
      `INSERT INTO jobs (id, video_id, resolution, status)
       VALUES ($1, $2, $3, 'PENDING')
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [jobId, videoId, resolution]
    );

    if (result.rows.length === 0) {
      const existing = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
      res.status(200).json(existing.rows[0]);
      return;
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create job', { error: String(error) });
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.patch('/jobs/:id', async (req, res) => {
  try {
    const { status, workerId, outputKey, errorMessage } = req.body;
    const result = await pool.query(
      `UPDATE jobs SET
        status = COALESCE($1, status),
        worker_id = COALESCE($2, worker_id),
        output_key = COALESCE($3, output_key),
        error_message = COALESCE($4, error_message),
        started_at = CASE WHEN $1 = 'PROCESSING' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN $1 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE completed_at END
       WHERE id = $5 RETURNING *`,
      [status, workerId, outputKey, errorMessage, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update job', { error: String(error) });
    res.status(500).json({ error: 'Failed to update job' });
  }
});

app.listen(PORT, () => {
  logger.info(`Metadata Service running on port ${PORT}`);
});
