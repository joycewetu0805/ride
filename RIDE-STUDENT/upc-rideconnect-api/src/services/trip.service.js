const prisma = require('../config/database');

async function createTrip({ driverId, neighborhood, departureTime, totalSeats, priceFc, waypoints }) {
  const hood = await prisma.neighborhood.findUnique({ where: { name: neighborhood } });
  if (!hood) throw Object.assign(new Error('Quartier introuvable'), { status: 400 });

  // Parse time - if just HH:MM, set to today
  let depTime;
  if (departureTime.length <= 5) {
    const [h, m] = departureTime.split(':');
    depTime = new Date();
    depTime.setHours(parseInt(h), parseInt(m), 0, 0);
    if (depTime < new Date()) depTime.setDate(depTime.getDate() + 1); // tomorrow if time passed
  } else {
    depTime = new Date(departureTime);
  }

  const trip = await prisma.trip.create({
    data: {
      driverId,
      neighborhoodId: hood.id,
      departureTime: depTime,
      totalSeats,
      availableSeats: totalSeats,
      priceFc,
      waypointsText: waypoints || null,
      status: 'active'
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, reputation: true, avatarUrl: true } },
      neighborhood: { select: { name: true } }
    }
  });

  return formatTrip(trip);
}

async function listTrips({ page = 1, limit = 20 }) {
  const trips = await prisma.trip.findMany({
    where: { status: { in: ['active', 'full'] }, availableSeats: { gt: 0 } },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, reputation: true, avatarUrl: true, phone: true } },
      neighborhood: { select: { name: true } }
    },
    orderBy: { departureTime: 'asc' },
    skip: (page - 1) * limit,
    take: limit
  });

  return trips.map(formatTrip);
}

async function getTripById(id) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, reputation: true, avatarUrl: true, phone: true } },
      neighborhood: { select: { name: true } },
      bookings: { include: { passenger: { select: { firstName: true, lastName: true } } } }
    }
  });
  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });
  return formatTrip(trip);
}

async function searchTrips({ neighborhood, time, maxPrice, includeNearby }) {
  const where = { status: 'active', availableSeats: { gt: 0 } };

  if (neighborhood) {
    const hood = await prisma.neighborhood.findFirst({
      where: { name: { contains: neighborhood, mode: 'insensitive' } }
    });

    if (hood) {
      if (includeNearby === 'true') {
        const adjacents = await prisma.neighborhoodAdjacency.findMany({
          where: { neighborhoodId: hood.id },
          select: { adjacentId: true }
        });
        const ids = [hood.id, ...adjacents.map(a => a.adjacentId)];
        where.neighborhoodId = { in: ids };
      } else {
        where.neighborhoodId = hood.id;
      }
    }
  }

  if (maxPrice) where.priceFc = { lte: parseInt(maxPrice) };

  const trips = await prisma.trip.findMany({
    where,
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, reputation: true, avatarUrl: true, phone: true } },
      neighborhood: { select: { name: true } }
    },
    orderBy: [{ departureTime: 'asc' }]
  });

  // Score and sort
  const scored = trips.map(t => ({
    ...formatTrip(t),
    _score: scoreTrip(t, { neighborhood, time })
  }));
  scored.sort((a, b) => b._score - a._score);

  return scored;
}

function scoreTrip(trip, params) {
  let score = 0;
  // Reputation boost
  score += (trip.driver.reputation || 0) * 4;
  // Seat urgency
  if (trip.availableSeats === 1) score += 5;
  return score;
}

async function updateTripStatus(tripId, driverId, status) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });
  if (trip.driverId !== driverId) throw Object.assign(new Error('Non autorise'), { status: 403 });

  return prisma.trip.update({
    where: { id: tripId },
    data: { status }
  });
}

function formatTrip(trip) {
  const time = trip.departureTime instanceof Date
    ? trip.departureTime.toTimeString().slice(0, 5)
    : trip.departureTime;

  return {
    id: trip.id,
    driver: trip.driver
      ? trip.driver.firstName + ' ' + trip.driver.lastName.charAt(0) + '.'
      : 'Inconnu',
    driverId: trip.driverId,
    avatar: trip.driver?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    from: trip.neighborhood?.name || '',
    time,
    seats: trip.availableSeats,
    totalSeats: trip.totalSeats,
    price: trip.priceFc,
    rating: trip.driver?.reputation || 0,
    waypoints: trip.waypointsText || 'A confirmer',
    phone: trip.driver?.phone || '',
    status: trip.status,
  };
}

module.exports = { createTrip, listTrips, getTripById, searchTrips, updateTripStatus };
