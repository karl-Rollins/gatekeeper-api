import { Router } from 'express';
import { query } from '../db/pool.js';
import { ServiceUnavailableError } from '../errors/AppError.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    return res.status(200).json({
      status: 'ok',
      db: 'connected',
    });
  } catch (err) {
    return next(
      new ServiceUnavailableError(
        'Database connection check failed',
        'DB_UNAVAILABLE',
        { reason: err?.message || 'Unable to reach PostgreSQL' }
      )
    );
  }
});

export default router;