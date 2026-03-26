const prisma = require('../config/database');
const haversine = require('../utils/haversine');

async function suggestMeetingPoint({ tripId, passengerLat, passengerLon }) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { neighborhood: true }
  });
  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });

  const points = await prisma.meetingPoint.findMany({
    where: { neighborhoodId: trip.neighborhoodId }
  });

  if (points.length === 0) return null;

  // Score each meeting point: 60% passenger proximity, 40% route proximity
  let best = null;
  let bestScore = Infinity;

  for (const point of points) {
    const distFromPassenger = haversine(passengerLat, passengerLon, point.latitude, point.longitude);
    const distFromNeighborhoodCenter = haversine(
      trip.neighborhood.latitude, trip.neighborhood.longitude,
      point.latitude, point.longitude
    );
    const score = 0.6 * distFromPassenger + 0.4 * distFromNeighborhoodCenter;
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }

  return best;
}

async function getMeetingPointsByNeighborhood(neighborhoodId) {
  return prisma.meetingPoint.findMany({
    where: { neighborhoodId },
    orderBy: { name: 'asc' }
  });
}

module.exports = { suggestMeetingPoint, getMeetingPointsByNeighborhood };
