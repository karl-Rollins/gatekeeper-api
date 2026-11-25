import { z } from "zod";

const positiveIntSchema = z.coerce
  .number()
  .int("Must be an integer")
  .min(1, "Must be a positive integer");

const nonNegativeIntSchema = z.coerce
  .number()
  .int("Must be an integer")
  .min(0, "Must be a non-negative integer");

export const createEventSchema = z
  .object({
    name: z
      .string({ required_error: "name is required" })
      .trim()
      .min(1, "name must be at least 1 character")
      .max(150, "name must be at most 150 characters"),
    venue: z
      .string({ required_error: "venue is required" })
      .trim()
      .min(1, "venue must be at least 1 character")
      .max(150, "venue must be at most 150 characters"),
    starts_at: z
      .string({ required_error: "starts_at is required" })
      .datetime({
        offset: true,
        message: "starts_at must be a valid ISO 8601 timestamp with offset",
      }),
    capacity: z
      .number({ required_error: "capacity is required" })
      .int("capacity must be an integer")
      .min(0, "capacity must be at least 0")
      .max(100000, "capacity must be at most 100000"),
  })
  .strict();

export const eventIdParamSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const listEventsQuerySchema = z
  .object({
    after: nonNegativeIntSchema.optional(),
    limit: z.coerce
      .number()
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(100, "limit must be at most 100")
      .default(20),
  })
  .strict();
