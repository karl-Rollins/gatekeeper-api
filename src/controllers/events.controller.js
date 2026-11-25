import { createEvent, getEventById, listEvents } from '../services/events.service.js';

export async function createEventController(req, res, next) {
  try {
    const event = await createEvent(req.body);
    return res
      .status(201)
      .set('Location', `/events/${event.id}`)
      .json(event);
  } catch (err) {
    return next(err);
  }
}

export async function getEventByIdController(req, res, next) {
  try {
    const event = await getEventById(req.params.id);
    return res.status(200).json(event);
  } catch (err) {
    return next(err);
  }
}

export async function listEventsController(req, res, next) {
  try {
    const page = await listEvents(req.query);
    return res.status(200).json(page);
  } catch (err) {
    return next(err);
  }
}