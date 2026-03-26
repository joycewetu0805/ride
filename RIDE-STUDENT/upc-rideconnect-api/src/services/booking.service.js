const prisma = require('../config/database');

async function createBooking({ tripId, passengerId }) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw Object.assign(new Error('Trajet introuvable'), { status: 404 });
  if (trip.availableSeats <= 0) throw Object.assign(new Error('Plus de places disponibles'), { status: 400 });
  if (trip.driverId === passengerId) throw Object.assign(new Error('Vous ne pouvez pas reserver votre propre trajet'), { status: 400 });

  const existing = await prisma.booking.findUnique({
    where: { tripId_passengerId: { tripId, passengerId } }
  });
  if (existing) throw Object.assign(new Error('Vous avez deja reserve ce trajet'), { status: 409 });

  const booking = await prisma.booking.create({
    data: { tripId, passengerId, status: 'pending' },
    include: {
      trip: {
        include: {
          driver: { select: { firstName: true, lastName: true } },
          neighborhood: { select: { name: true } }
        }
      }
    }
  });

  // Create notification for driver
  await prisma.notification.create({
    data: {
      userId: trip.driverId,
      type: 'booking_new',
      title: 'Nouvelle reservation',
      message: 'Un passager a reserve une place pour votre trajet',
      metadata: { bookingId: booking.id, tripId }
    }
  });

  return booking;
}

async function getUserBookings(userId) {
  return prisma.booking.findMany({
    where: { passengerId: userId },
    include: {
      trip: {
        include: {
          driver: { select: { firstName: true, lastName: true, reputation: true } },
          neighborhood: { select: { name: true } }
        }
      },
      payment: { select: { status: true, amountFc: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function cancelBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw Object.assign(new Error('Reservation introuvable'), { status: 404 });
  if (booking.passengerId !== userId) throw Object.assign(new Error('Non autorise'), { status: 403 });
  if (booking.status === 'completed') throw Object.assign(new Error('Reservation deja terminee'), { status: 400 });

  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'cancelled' } });

  // Restore seat
  await prisma.trip.update({
    where: { id: booking.tripId },
    data: { availableSeats: { increment: 1 } }
  });

  return { message: 'Reservation annulee' };
}

module.exports = { createBooking, getUserBookings, cancelBooking };
