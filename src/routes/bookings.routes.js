import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { bookingIdParamSchema } from "../schemas/bookings.schema.js";
import {
  cancelBookingController,
  getBookingByIdController,
} from "../controllers/bookings.controller.js";

const router = Router();

router.get(
  "/:id",
  validate({ params: bookingIdParamSchema }),
  getBookingByIdController,
);

router.post(
  "/:id/cancel",
  validate({ params: bookingIdParamSchema }),
  cancelBookingController,
);

export default router;
