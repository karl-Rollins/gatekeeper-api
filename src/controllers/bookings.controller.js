import {
  cancelBooking,
  createBooking,
  getBookingById,
  listEventBookings,
} from "../services/bookings.service.js";

export async function createBookingController(req, res, next) {
  try {
    const booking = await createBooking(req.params.id, req.body);
    return res
      .status(201)
      .set("Location", `/bookings/${booking.id}`)
      .json(booking);
  } catch (err) {
    return next(err);
  }
}

export async function cancelBookingController(req, res, next) {
  try {
    await cancelBooking(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function getBookingByIdController(req, res, next) {
  try {
    const booking = await getBookingById(req.params.id);
    return res.status(200).json(booking);
  } catch (err) {
    return next(err);
  }
}

export async function listEventBookingsController(req, res, next) {
  try {
    const page = await listEventBookings(req.params.id, req.query);
    return res.status(200).json(page);
  } catch (err) {
    return next(err);
  }
}
