const prisma = require('../config/database');
const { CAMPUS_UPC } = require('../config/constants');

// Simulate driver position along the route based on elapsed time
function simulateLocation(trip) {
  const now = new Date();
  const depTime = new Date(trip.departureTime);

  // Estimated trip duration: 30 minutes
  const TRIP_DURATION_MS = 30 * 60 * 1000;
  const elapsed = now - depTime;

  if (elapsed < 0) {
    // Trip hasn't started yet — driver is at departure neighborhood
    return {
      latitude: trip.neighborhood.latitude,
      longitude: trip.neighborhood.longitude,
      progress: 0,
      status: 'waiting',
      eta: Math.ceil(Math.abs(elapsed) / 60000) + ' min avant depart'
    };
  }

  const progress = Math.min(elapsed / TRIP_DURATION_MS, 1.0);

  if (progress >= 1.0) {
    return {
      latitude: CAMPUS_UPC.latitude,
      longitude: CAMPUS_UPC.longitude,
      progress: 1.0,
      status: 'arrived',
      eta: 'Arrive au campus'
    };
  }

  // Interpolate between departure and campus
  const startLat = trip.neighborhood.latitude;
  const startLon = trip.neighborhood.longitude;

  // Add meeting point as intermediate waypoint at 30% progress
  let lat, lon;
  if (trip.meetingPoint && progress < 0.3) {
    // Moving toward meeting point
    const subProgress = progress / 0.3;
    lat = startLat + (trip.meetingPoint.latitude - startLat) * subProgress;
    lon = startLon + (trip.meetingPoint.longitude - startLon) * subProgress;
  } else if (trip.meetingPoint && progress < 0.35) {
    // At meeting point (pickup)
    lat = trip.meetingPoint.latitude;
    lon = trip.meetingPoint.longitude;
  } else {
    // Moving toward campus
    const campusProgress = trip.meetingPoint ? (progress - 0.35) / 0.65 : progress;
    const fromLat = trip.meetingPoint ? trip.meetingPoint.latitude : startLat;
    const fromLon = trip.meetingPoint ? trip.meetingPoint.longitude : startLon;
    lat = fromLat + (CAMPUS_UPC.latitude - fromLat) * campusProgress;
    lon = fromLon + (CAMPUS_UPC.longitude - fromLon) * campusProgress;
  }

  // Add slight random noise to simulate real driving
  lat += (Math.random() - 0.5) * 0.0005;
  lon += (Math.random() - 0.5) * 0.0005;

  const remainingMin = Math.ceil((TRIP_DURATION_MS - elapsed) / 60000);

  return {
    latitude: lat,
    longitude: lon,
    progress: Math.round(progress * 100) / 100,
    status: 'en_route',
    eta: remainingMin + ' min restantes'
  };
}

async function getTripLocation(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      neighborhood: true,
      meetingPoint: true,
      driver: { select: { firstName: true, lastName: true } }
    }
  });

  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });

  const location = simulateLocation(trip);

  return {
    tripId: trip.id,
    driver: trip.driver.firstName + ' ' + trip.driver.lastName.charAt(0) + '.',
    departure: {
      name: trip.neighborhood.name,
      latitude: trip.neighborhood.latitude,
      longitude: trip.neighborhood.longitude
    },
    destination: {
      name: 'Campus UPC',
      latitude: CAMPUS_UPC.latitude,
      longitude: CAMPUS_UPC.longitude
    },
    meetingPoint: trip.meetingPoint ? {
      name: trip.meetingPoint.name,
      latitude: trip.meetingPoint.latitude,
      longitude: trip.meetingPoint.longitude
    } : null,
    current: location
  };
}

async function getTripRoute(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      neighborhood: true,
      meetingPoint: true,
      bookings: {
        where: { status: { in: ['confirmed', 'paid'] } },
        include: {
          meetingPoint: true,
          passenger: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });

  // Build route waypoints
  const waypoints = [
    {
      type: 'departure',
      name: trip.neighborhood.name,
      latitude: trip.neighborhood.latitude,
      longitude: trip.neighborhood.longitude
    }
  ];

  // Add meeting points from bookings
  const addedPoints = new Set();
  for (const booking of trip.bookings) {
    if (booking.meetingPoint && !addedPoints.has(booking.meetingPoint.id)) {
      addedPoints.add(booking.meetingPoint.id);
      waypoints.push({
        type: 'pickup',
        name: booking.meetingPoint.name,
        latitude: booking.meetingPoint.latitude,
        longitude: booking.meetingPoint.longitude,
        passengers: trip.bookings
          .filter(b => b.meetingPointId === booking.meetingPoint.id)
          .map(b => b.passenger.firstName + ' ' + b.passenger.lastName.charAt(0) + '.')
      });
    }
  }

  // If trip has a meeting point but no bookings with points, use trip meeting point
  if (trip.meetingPoint && addedPoints.size === 0) {
    waypoints.push({
      type: 'pickup',
      name: trip.meetingPoint.name,
      latitude: trip.meetingPoint.latitude,
      longitude: trip.meetingPoint.longitude,
      passengers: []
    });
  }

  waypoints.push({
    type: 'destination',
    name: 'Campus UPC',
    latitude: CAMPUS_UPC.latitude,
    longitude: CAMPUS_UPC.longitude
  });

  return { tripId: trip.id, waypoints };
}

module.exports = { getTripLocation, getTripRoute };
