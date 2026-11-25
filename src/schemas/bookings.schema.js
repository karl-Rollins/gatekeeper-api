import { z } from "zod";

export const BOOKING_STATUSES = ["confirmed", "cancelled"];
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

const positiveIntParamSchema = z.coerce
  .number()
  .int("Must be an integer")
  .min(1, "Must be a positive integer");

const nonNegativeIntQuerySchema = z.coerce
  .number()
  .int("Must be an integer")
  .min(0, "Must be a non-negative integer");

export const createBookingBodySchema = z
  .object({
    customer_id: z
      .number({ required_error: "customer_id is required" })
      .int("customer_id must be an integer")
      .min(1, "customer_id must be a positive integer"),
    quantity: z
      .number({ required_error: "quantity is required" })
      .int("quantity must be an integer")
      .min(1, "quantity must be at least 1")
      .max(10, "quantity must be at most 10"),
  })
  .strict();

export const eventBookingsParamSchema = z
  .object({
    id: positiveIntParamSchema,
  })
  .strict();

export const bookingIdParamSchema = z
  .object({
    id: positiveIntParamSchema,
  })
  .strict();

export const listBookingsQuerySchema = z
  .object({
    after: nonNegativeIntQuerySchema.optional(),
    limit: z.coerce
      .number()
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(100, "limit must be at most 100")
      .default(20),
  })
  .strict();
