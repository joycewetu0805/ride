const tripService = require('../services/trip.service');

async function list(req, res, next) {
  try {
    const trips = await tripService.listTrips(req.query);
    res.json({ trips });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const trip = await tripService.getTripById(parseInt(req.params.id));
    res.json({ trip });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const trip = await tripService.createTrip({
      driverId: req.user.userId,
      ...req.body
    });
    res.status(201).json({ trip });
  } catch (err) { next(err); }
}

async function search(req, res, next) {
  try {
    const trips = await tripService.searchTrips(req.query);
    res.json({ trips });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const trip = await tripService.updateTripStatus(
      parseInt(req.params.id),
      req.user.userId,
      req.body.status
    );
    res.json({ trip });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, search, updateStatus };
