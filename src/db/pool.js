import pg from 'pg';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Failed to roll back transaction', { error: rollbackErr.message });
    }
    throw err;
  } finally {
    client.release();
  }
}

let isShuttingDown = false;

export async function closePool() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  await pool.end();
  logger.info('PostgreSQL pool closed');
}

function registerShutdownHandlers() {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down database pool`);
      try {
        await closePool();
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown', { error: err.message });
        process.exit(1);
      }
    });
  }
}

registerShutdownHandlers();