import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../src/config/env.js';
import { pool, query } from '../../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

export function assertSafeTestDatabase() {
  const parsedUrl = new URL(config.databaseUrlTest);
  const dbName = parsedUrl.pathname.replace(/^\//, '');

  if (!dbName || !dbName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run test suite against database "${dbName || '(none)'}". DATABASE_URL_TEST must point to a test database.`
    );
  }
}

export async function applyTestSchema() {
  assertSafeTestDatabase();
  const sql = await fs.readFile(schemaPath, 'utf8');
  await query(sql);
}

export async function resetTestDatabase() {
  assertSafeTestDatabase();
  await query('TRUNCATE TABLE bookings, customers, events RESTART IDENTITY CASCADE');
}

export async function seedCustomer({
  fullName = 'Test Attendee',
  email = `attendee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
} = {}) {
  const res = await query(
    `INSERT INTO customers (full_name, email)
     VALUES ($1, $2)
     RETURNING id, full_name, email, created_at`,
    [fullName, email]
  );
  return res.rows[0];
}

export async function seedEvent({
  name = 'Test Event',
  venue = 'Test Venue',
  startsAt = '2027-05-01T18:00:00Z',
  capacity = 10,
  seatsRemaining = capacity,
  status = capacity === 0 ? 'sold_out' : 'on_sale',
} = {}) {
  const res = await query(
    `INSERT INTO events (name, venue, starts_at, capacity, seats_remaining, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, venue, starts_at, capacity, seats_remaining, status, created_at`,
    [name, venue, startsAt, capacity, seatsRemaining, status]
  );
  return res.rows[0];
}

export async function closeTestPool() {
  await pool.end();
}