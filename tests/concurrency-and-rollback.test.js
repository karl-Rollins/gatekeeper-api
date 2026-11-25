import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTestSchema,
  resetTestDatabase,
  seedCustomer,
  seedEvent,
  seedBooking,
  closeTestPool,
} from './helpers/db.js';
import { startTestServer } from './helpers/server.js';
import { query } from '../src/db/pool.js';

describe('Concurrency and transaction rollback', () => {
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

  it('rolls back seat decrement when customer does not exist (400)', async () => {
    const event = await seedEvent({ capacity: 5, seatsRemaining: 5, status: 'on_sale' });

    const res = await fetch(`${baseUrl}/events/${event.id}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: 999999, quantity: 2 }),
    });

    assert.equal(res.status, 400);

    const eventCheck = await (await fetch(`${baseUrl}/events/${event.id}`)).json();
    assert.equal(eventCheck.seats_remaining, 5);
    assert.equal(eventCheck.status, 'on_sale');

    const bookingsCount = await query(
      'SELECT COUNT(*)::int AS count FROM bookings WHERE event_id = $1',
      [event.id]
    );
    assert.equal(bookingsCount.rows[0].count, 0);
  });

  it('never oversells under concurrent Promise.all requests across repeated runs', async () => {
    for (let run = 0; run < 20; run += 1) {
      await resetTestDatabase();
      const c1 = await seedCustomer();
      const c2 = await seedCustomer();
      const event = await seedEvent({ capacity: 3, seatsRemaining: 3, status: 'on_sale' });
      await seedBooking({
        eventId: event.id,
        customerId: c1.id,
        quantity: 1,
        status: 'confirmed',
      });
      await query('UPDATE events SET seats_remaining = 2 WHERE id = $1', [event.id]);

      const payload1 = JSON.stringify({ customer_id: c1.id, quantity: 2 });
      const payload2 = JSON.stringify({ customer_id: c2.id, quantity: 2 });

      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/events/${event.id}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload1,
        }),
        fetch(`${baseUrl}/events/${event.id}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload2,
        }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      assert.deepEqual(statuses, [201, 409]);

      const eventState = await (await fetch(`${baseUrl}/events/${event.id}`)).json();
      assert.equal(eventState.seats_remaining, 0);
      assert.ok(eventState.seats_remaining >= 0);
      assert.equal(eventState.status, 'sold_out');

      const confirmedBookings = await query(
        `SELECT COUNT(*)::int AS count
         FROM bookings
         WHERE event_id = $1 AND status = 'confirmed'`,
        [event.id]
      );
      assert.equal(confirmedBookings.rows[0].count, 2);
    }
  });
});