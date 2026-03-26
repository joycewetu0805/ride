const geoService = require('../services/geo.service');

async function suggest(req, res, next) {
  try {
    const point = await geoService.suggestMeetingPoint({
      tripId: parseInt(req.query.tripId),
      passengerLat: parseFloat(req.query.lat),
      passengerLon: parseFloat(req.query.lon)
    });
    res.json({ meetingPoint: point });
  } catch (err) { next(err); }
}

async function listByNeighborhood(req, res, next) {
  try {
    const points = await geoService.getMeetingPointsByNeighborhood(parseInt(req.params.neighborhoodId));
    res.json({ meetingPoints: points });
  } catch (err) { next(err); }
}

module.exports = { suggest, listByNeighborhood };
