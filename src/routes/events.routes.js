import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createEventSchema,
  eventIdParamSchema,
  listEventsQuerySchema,
} from "../schemas/events.schema.js";
import {
  createEventController,
  getEventByIdController,
  listEventsController,
} from "../controllers/events.controller.js";

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

export default router;
