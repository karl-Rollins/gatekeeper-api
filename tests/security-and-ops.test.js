import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  applyTestSchema,
  resetTestDatabase,
  closeTestPool,
} from './helpers/db.js';
import { startTestServer } from './helpers/server.js';
import { query } from '../src/db/pool.js';

describe('Security regression and operations', () => {
  let testServer;
  let baseUrl;

  before(async () => {
    await applyTestSchema();
    testServer = await startTestServer();
    baseUrl = testServer.baseUrl;
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  after(async () => {
    if (testServer) {
      await testServer.close();
    }
    await closeTestPool();
  });

  it('stores SQL injection strings verbatim in event name without executing SQL', async () => {
    const injectionName = "Summit'; DROP TABLE bookings; --";

    const createRes = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: injectionName,
        venue: 'Safe Hall',
        starts_at: '2027-07-01T12:00:00Z',
        capacity: 15,
      }),
    });

    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.name, injectionName);

    const tablesCheck = await query(
      `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('events', 'customers', 'bookings')`
    );
    assert.equal(tablesCheck.rows[0].count, 3);
  });

  it('rejects injection attempts in query params and path IDs with 400', async () => {
    const badQueryRes = await fetch(
      `${baseUrl}/events?after=${encodeURIComponent('0; DROP TABLE events;')}`
    );
    assert.equal(badQueryRes.status, 400);

    const badParamRes = await fetch(
      `${baseUrl}/events/${encodeURIComponent('1; DROP TABLE events;')}`
    );
    assert.equal(badParamRes.status, 400);
  });

  it('returns 200 on /health and fails fast when required env vars are missing', async () => {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.status, 'ok');

    assert.throws(() => {
      execFileSync(
        process.execPath,
        ['-e', "import('./src/config/env.js')"],
        {
          env: { PATH: process.env.PATH },
          stdio: 'pipe',
        }
      );
    });
  });
});