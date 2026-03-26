const trackingService = require('../services/tracking.service');

async function getLocation(req, res, next) {
  try {
    const data = await trackingService.getTripLocation(parseInt(req.params.id));
    res.json(data);
  } catch (err) { next(err); }
}

async function getRoute(req, res, next) {
  try {
    const data = await trackingService.getTripRoute(parseInt(req.params.id));
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { getLocation, getRoute };
