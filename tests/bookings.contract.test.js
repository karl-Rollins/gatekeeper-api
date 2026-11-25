import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import {
  applyTestSchema,
  resetTestDatabase,
  seedCustomer,
  seedEvent,
  seedBooking,
  closeTestPool,
} from "./helpers/db.js";
import { startTestServer } from "./helpers/server.js";

describe("Bookings and cancel contracts", () => {
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

  it("books tickets (201 + Location) and flips event to sold_out when last seats are taken", async () => {
    const customer = await seedCustomer();
    const event = await seedEvent({
      capacity: 4,
      seatsRemaining: 4,
      status: "on_sale",
    });

    const firstRes = await fetch(`${baseUrl}/events/${event.id}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customer.id, quantity: 2 }),
    });
    assert.equal(firstRes.status, 201);
    const firstBooking = await firstRes.json();
    assert.equal(
      firstRes.headers.get("location"),
      `/bookings/${firstBooking.id}`,
    );
    assert.equal(firstBooking.status, "confirmed");
    assert.equal(firstBooking.quantity, 2);

    const secondRes = await fetch(`${baseUrl}/events/${event.id}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customer.id, quantity: 2 }),
    });
    assert.equal(secondRes.status, 201);

    const eventAfterRes = await fetch(`${baseUrl}/events/${event.id}`);
    const eventAfter = await eventAfterRes.json();
    assert.equal(eventAfter.seats_remaining, 0);
    assert.equal(eventAfter.status, "sold_out");
  });

  it("validates quantity strictly (0, 11, 1.5, string, missing) with 400", async () => {
    const customer = await seedCustomer();
    const event = await seedEvent({ capacity: 20, seatsRemaining: 20 });

    const invalidQuantities = [0, 11, 1.5, "2"];
    for (const quantity of invalidQuantities) {
      const res = await fetch(`${baseUrl}/events/${event.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id, quantity }),
      });
      assert.equal(res.status, 400);
    }

    const missingQtyRes = await fetch(
      `${baseUrl}/events/${event.id}/bookings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id }),
      },
    );
    assert.equal(missingQtyRes.status, 400);
  });

  it("returns distinct 409 codes for sold_out, insufficient_seats, and cancelled event, plus 404 for missing event", async () => {
    const customer = await seedCustomer();
    const soldOutEvent = await seedEvent({
      capacity: 2,
      seatsRemaining: 0,
      status: "sold_out",
    });
    const fewSeatsEvent = await seedEvent({
      capacity: 5,
      seatsRemaining: 1,
      status: "on_sale",
    });
    const cancelledEvent = await seedEvent({
      capacity: 10,
      seatsRemaining: 10,
      status: "cancelled",
    });

    const soldOutRes = await fetch(
      `${baseUrl}/events/${soldOutEvent.id}/bookings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id, quantity: 1 }),
      },
    );
    assert.equal(soldOutRes.status, 409);
    assert.equal((await soldOutRes.json()).error.code, "EVENT_SOLD_OUT");

    const fewSeatsRes = await fetch(
      `${baseUrl}/events/${fewSeatsEvent.id}/bookings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id, quantity: 3 }),
      },
    );
    assert.equal(fewSeatsRes.status, 409);
    const fewSeatsBody = await fewSeatsRes.json();
    assert.equal(fewSeatsBody.error.code, "INSUFFICIENT_SEATS");
    assert.match(fewSeatsBody.error.message, /1/);

    const cancelledRes = await fetch(
      `${baseUrl}/events/${cancelledEvent.id}/bookings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.id, quantity: 1 }),
      },
    );
    assert.equal(cancelledRes.status, 409);
    assert.equal((await cancelledRes.json()).error.code, "EVENT_CANCELLED");

    const missingEventRes = await fetch(`${baseUrl}/events/999999/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customer.id, quantity: 1 }),
    });
    assert.equal(missingEventRes.status, 404);
  });

  it("cancels confirmed booking (204), restores seats, flips sold_out back to on_sale, and blocks double cancel (409)", async () => {
    const customer = await seedCustomer();
    const event = await seedEvent({
      capacity: 3,
      seatsRemaining: 0,
      status: "sold_out",
    });
    const booking = await seedBooking({
      eventId: event.id,
      customerId: customer.id,
      quantity: 3,
      status: "confirmed",
    });

    const cancelRes = await fetch(`${baseUrl}/bookings/${booking.id}/cancel`, {
      method: "POST",
    });
    assert.equal(cancelRes.status, 204);
    assert.equal(await cancelRes.text(), "");

    const eventAfterCancel = await (
      await fetch(`${baseUrl}/events/${event.id}`)
    ).json();
    assert.equal(eventAfterCancel.seats_remaining, 3);
    assert.equal(eventAfterCancel.status, "on_sale");

    const secondCancelRes = await fetch(
      `${baseUrl}/bookings/${booking.id}/cancel`,
      {
        method: "POST",
      },
    );
    assert.equal(secondCancelRes.status, 409);

    const eventAfterSecondCancel = await (
      await fetch(`${baseUrl}/events/${event.id}`)
    ).json();
    assert.equal(eventAfterSecondCancel.seats_remaining, 3);

    const missingCancelRes = await fetch(`${baseUrl}/bookings/999999/cancel`, {
      method: "POST",
    });
    assert.equal(missingCancelRes.status, 404);
  });

  it("reads single booking and keyset-paginates event bookings including cancelled ones", async () => {
    const customer = await seedCustomer();
    const event = await seedEvent({ capacity: 10, seatsRemaining: 5 });
    const b1 = await seedBooking({
      eventId: event.id,
      customerId: customer.id,
      quantity: 2,
      status: "confirmed",
    });
    const b2 = await seedBooking({
      eventId: event.id,
      customerId: customer.id,
      quantity: 3,
      status: "confirmed",
    });
    const b3 = await seedBooking({
      eventId: event.id,
      customerId: customer.id,
      quantity: 1,
      status: "cancelled",
    });

    const getOne = await fetch(`${baseUrl}/bookings/${b1.id}`);
    assert.equal(getOne.status, 200);
    assert.equal((await getOne.json()).id, b1.id);

    const page1 = await (
      await fetch(`${baseUrl}/events/${event.id}/bookings?limit=2`)
    ).json();
    assert.equal(page1.data.length, 2);
    assert.equal(page1.next_cursor, b2.id);

    const page2 = await (
      await fetch(
        `${baseUrl}/events/${event.id}/bookings?after=${page1.next_cursor}&limit=2`,
      )
    ).json();
    assert.equal(page2.data.length, 1);
    assert.equal(page2.data[0].id, b3.id);
    assert.equal(page2.data[0].status, "cancelled");
    assert.equal(page2.next_cursor, null);
  });
});
