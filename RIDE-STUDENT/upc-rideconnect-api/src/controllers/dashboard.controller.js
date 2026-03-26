const prisma = require('../config/database');
const { getTrustLevel } = require('../services/rating.service');

async function getStats(req, res, next) {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true, lastName: true, reputation: true,
        totalTrips: true, totalEarnedFc: true, totalSavedFc: true
      }
    });

    const completedTrips = await prisma.booking.count({
      where: { passengerId: userId, status: 'completed' }
    });
    const driverTrips = await prisma.trip.count({
      where: { driverId: userId, status: 'completed' }
    });

    res.json({
      name: user.firstName + ' ' + user.lastName.charAt(0) + '.',
      reputation: user.reputation,
      trustLevel: getTrustLevel(user.reputation, user.totalTrips),
      totalTrips: completedTrips + driverTrips,
      totalEarnedFc: user.totalEarnedFc,
      totalSavedFc: user.totalSavedFc
    });
  } catch (err) { next(err); }
}

async function getHistory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const bookings = await prisma.booking.findMany({
      where: { passengerId: userId },
      include: {
        trip: {
          include: {
            neighborhood: { select: { name: true } },
            driver: { select: { firstName: true, lastName: true } }
          }
        },
        payment: { select: { amountFc: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const driverTrips = await prisma.trip.findMany({
      where: { driverId: userId },
      include: {
        neighborhood: { select: { name: true } },
        bookings: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    res.json({ bookings, driverTrips });
  } catch (err) { next(err); }
}

module.exports = { getStats, getHistory };
