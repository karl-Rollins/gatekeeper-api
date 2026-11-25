import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createEventSchema,
  eventIdParamSchema,
  listEventsQuerySchema,
} from "../schemas/events.schema.js";
import {
  createBookingBodySchema,
  eventBookingsParamSchema,
  listBookingsQuerySchema,
} from "../schemas/bookings.schema.js";
import {
  createEventController,
  getEventByIdController,
  listEventsController,
} from "../controllers/events.controller.js";
import {
  createBookingController,
  listEventBookingsController,
} from "../controllers/bookings.controller.js";

const router = Router();

router.post("/", validate({ body: createEventSchema }), createEventController);

router.get(
  "/",
  validate({ query: listEventsQuerySchema }),
  listEventsController,
);

router.get(
  "/:id",
  validate({ params: eventIdParamSchema }),
  getEventByIdController,
);

router.post(
  "/:id/bookings",
  validate({ params: eventBookingsParamSchema, body: createBookingBodySchema }),
  createBookingController,
);

router.get(
  "/:id/bookings",
  validate({
    params: eventBookingsParamSchema,
    query: listBookingsQuerySchema,
  }),
  listEventBookingsController,
);

export default router;
