import { query, withTransaction } from "../db/pool.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";
import { BOOKING_STATUSES } from "../schemas/bookings.schema.js";

const BOOKING_COLUMNS =
  "id, event_id, customer_id, quantity, status, booked_at";

export async function createBooking(eventId, { customer_id, quantity }) {
  return withTransaction(async (client) => {
    const updatedEvent = await client.query(
      `UPDATE events
       SET seats_remaining = seats_remaining - $2,
           status = CASE
             WHEN seats_remaining - $2 = 0 THEN 'sold_out'
             ELSE status
           END
       WHERE id = $1
         AND status <> 'cancelled'
         AND seats_remaining >= $2
       RETURNING id, seats_remaining, status`,
      [eventId, quantity],
    );

    if (updatedEvent.rowCount === 0) {
      const eventLookup = await client.query(
        "SELECT id, status, seats_remaining FROM events WHERE id = $1",
        [eventId],
      );

      if (eventLookup.rowCount === 0) {
        throw new NotFoundError(
          `Event ${eventId} not found`,
          "EVENT_NOT_FOUND",
        );
      }

      const eventRow = eventLookup.rows[0];

      if (eventRow.status === "cancelled") {
        throw new ConflictError(
          `Event ${eventId} is cancelled and cannot accept bookings`,
          "EVENT_CANCELLED",
        );
      }

      if (eventRow.seats_remaining === 0 || eventRow.status === "sold_out") {
        throw new ConflictError(
          `Event ${eventId} is sold out`,
          "EVENT_SOLD_OUT",
        );
      }

      throw new ConflictError(
        `Only ${eventRow.seats_remaining} seat(s) remaining for event ${eventId}; requested ${quantity}`,
        "INSUFFICIENT_SEATS",
      );
    }

    const insertedBooking = await client.query(
      `INSERT INTO bookings (event_id, customer_id, quantity, status)
       VALUES ($1, $2, $3, $4)
       RETURNING ${BOOKING_COLUMNS}`,
      [eventId, customer_id, quantity, BOOKING_STATUSES[0]],
    );

    return insertedBooking.rows[0];
  });
}

export async function cancelBooking(bookingId) {
  return withTransaction(async (client) => {
    const cancelledBooking = await client.query(
      `UPDATE bookings
       SET status = $2
       WHERE id = $1 AND status = $3
       RETURNING ${BOOKING_COLUMNS}`,
      [bookingId, BOOKING_STATUSES[1], BOOKING_STATUSES[0]],
    );

    if (cancelledBooking.rowCount === 0) {
      const existing = await client.query(
        "SELECT id, status FROM bookings WHERE id = $1",
        [bookingId],
      );

      if (existing.rowCount === 0) {
        throw new NotFoundError(
          `Booking ${bookingId} not found`,
          "BOOKING_NOT_FOUND",
        );
      }

      throw new ConflictError(
        `Booking ${bookingId} is already cancelled`,
        "BOOKING_ALREADY_CANCELLED",
      );
    }

    const booking = cancelledBooking.rows[0];

    await client.query(
      `UPDATE events
       SET seats_remaining = seats_remaining + $2,
           status = CASE
             WHEN status = 'sold_out' THEN 'on_sale'
             ELSE status
           END
       WHERE id = $1`,
      [booking.event_id, booking.quantity],
    );
  });
}

export async function getBookingById(bookingId) {
  const result = await query(
    `SELECT ${BOOKING_COLUMNS}
     FROM bookings
     WHERE id = $1`,
    [bookingId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(
      `Booking ${bookingId} not found`,
      "BOOKING_NOT_FOUND",
    );
  }

  return result.rows[0];
}

export async function listEventBookings(eventId, { after = 0, limit = 20 }) {
  const eventCheck = await query("SELECT id FROM events WHERE id = $1", [
    eventId,
  ]);

  if (eventCheck.rows.length === 0) {
    throw new NotFoundError(`Event ${eventId} not found`, "EVENT_NOT_FOUND");
  }

  const fetchLimit = limit + 1;

  const result = await query(
    `SELECT ${BOOKING_COLUMNS}
     FROM bookings
     WHERE event_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT $3`,
    [eventId, after, fetchLimit],
  );

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  const nextCursor = hasMore ? rows[rows.length - 1].id : null;

  return {
    data: rows,
    next_cursor: nextCursor,
  };
}
