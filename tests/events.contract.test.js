import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTestSchema,
  resetTestDatabase,
  seedEvent,
  closeTestPool,
} from './helpers/db.js';
import { startTestServer } from './helpers/server.js';

describe('Events contract', () => {
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

  it('creates a valid event with 201, Location header, and matching seats_remaining', async () => {
    const res = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Launch Night',
        venue: 'Main Stage',
        starts_at: '2027-06-10T20:00:00Z',
        capacity: 25,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(res.headers.get('location'), `/events/${body.id}`);
    assert.equal(body.capacity, 25);
    assert.equal(body.seats_remaining, 25);
    assert.equal(body.status, 'on_sale');
  });

  it('rejects invalid event payloads and extra keys with 400', async () => {
    const badPayloads = [
      { name: 'Missing capacity', venue: 'Hall', starts_at: '2027-06-10T20:00:00Z' },
      { name: 'x'.repeat(151), venue: 'Hall', starts_at: '2027-06-10T20:00:00Z', capacity: 10 },
      { name: 'Bad date', venue: 'Hall', starts_at: 'not-a-date', capacity: 10 },
      { name: 'Neg cap', venue: 'Hall', starts_at: '2027-06-10T20:00:00Z', capacity: -1 },
      {
        name: 'Extra key',
        venue: 'Hall',
        starts_at: '2027-06-10T20:00:00Z',
        capacity: 10,
        status: 'on_sale',
      },
    ];

    for (const payload of badPayloads) {
      const res = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error?.code);
    }
  });

  it('fetches existing event (200), missing event (404), and paginates with keyset cursor', async () => {
    const e1 = await seedEvent({ name: 'Event 1', capacity: 10 });
    const e2 = await seedEvent({ name: 'Event 2', capacity: 10 });
    await seedEvent({ name: 'Event 3', capacity: 10 });

    const singleOk = await fetch(`${baseUrl}/events/${e1.id}`);
    assert.equal(singleOk.status, 200);
    const singleBody = await singleOk.json();
    assert.equal(singleBody.id, e1.id);

    const missing = await fetch(`${baseUrl}/events/999999`);
    assert.equal(missing.status, 404);

    const page1Res = await fetch(`${baseUrl}/events?limit=2`);
    assert.equal(page1Res.status, 200);
    const page1 = await page1Res.json();
    assert.equal(page1.data.length, 2);
    assert.equal(page1.next_cursor, e2.id);

    const page2Res = await fetch(`${baseUrl}/events?after=${page1.next_cursor}&limit=2`);
    assert.equal(page2Res.status, 200);
    const page2 = await page2Res.json();
    assert.equal(page2.data.length, 1);
    assert.equal(page2.next_cursor, null);
  });
});