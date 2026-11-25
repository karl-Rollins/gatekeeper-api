import { query } from "../db/pool.js";
import { NotFoundError } from "../errors/AppError.js";

export async function createEvent({ name, venue, starts_at, capacity }) {
  const initialStatus = capacity === 0 ? "sold_out" : "on_sale";
  const seatsRemaining = capacity;

  const result = await query(
    `INSERT INTO events (name, venue, starts_at, capacity, seats_remaining, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, venue, starts_at, capacity, seats_remaining, status, created_at`,
    [name, venue, starts_at, capacity, seatsRemaining, initialStatus],
  );

  return result.rows[0];
}

export async function getEventById(id) {
  const result = await query(
    `SELECT id, name, venue, starts_at, capacity, seats_remaining, status, created_at
     FROM events
     WHERE id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Event ${id} not found`, "EVENT_NOT_FOUND");
  }

  return result.rows[0];
}

export async function listEvents({ after = 0, limit = 20 }) {
  const fetchLimit = limit + 1;

  const result = await query(
    `SELECT id, name, venue, starts_at, capacity, seats_remaining, status, created_at
     FROM events
     WHERE id > $1
     ORDER BY id ASC
     LIMIT $2`,
    [after, fetchLimit],
  );

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  const nextCursor = hasMore ? rows[rows.length - 1].id : null;

  return {
    data: rows,
    next_cursor: nextCursor,
  };
}
