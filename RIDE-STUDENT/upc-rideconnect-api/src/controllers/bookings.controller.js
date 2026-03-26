const bookingService = require('../services/booking.service');

async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking({
      tripId: req.body.tripId,
      passengerId: req.user.userId
    });
    res.status(201).json({ booking });
  } catch (err) { next(err); }
}

async function myBookings(req, res, next) {
  try {
    const bookings = await bookingService.getUserBookings(req.user.userId);
    res.json({ bookings });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const result = await bookingService.cancelBooking(parseInt(req.params.id), req.user.userId);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { create, myBookings, cancel };
