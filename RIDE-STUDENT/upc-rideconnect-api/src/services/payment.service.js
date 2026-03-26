const prisma = require('../config/database');
const { DRIVER_SHARE, PLATFORM_FEE } = require('../config/constants');

async function initiatePayment({ bookingId, operator, phoneNumber, userId }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { trip: true }
  });
  if (!booking) throw Object.assign(new Error('Reservation introuvable'), { status: 404 });
  if (booking.passengerId !== userId) throw Object.assign(new Error('Non autorise'), { status: 403 });

  const amount = booking.trip.priceFc;
  const driverShare = Math.round(amount * DRIVER_SHARE);
  const platformFee = amount - driverShare;
  const transactionRef = 'UPC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      userId,
      amountFc: amount,
      driverShareFc: driverShare,
      platformFeeFc: platformFee,
      operator,
      phoneNumber,
      transactionRef,
      status: 'processing'
    }
  });

  // Simulate async payment confirmation (in real app, this would be a webhook)
  setTimeout(() => confirmPayment(payment.id), 3000);

  return payment;
}

async function confirmPayment(paymentId) {
  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'completed', paidAt: new Date() },
      include: { booking: { include: { trip: true } } }
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'paid' }
    });

    // Decrement available seats
    const trip = payment.booking.trip;
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        availableSeats: { decrement: 1 },
        status: trip.availableSeats <= 1 ? 'full' : 'active'
      }
    });

    // Update driver earnings
    await prisma.user.update({
      where: { id: trip.driverId },
      data: { totalEarnedFc: { increment: payment.driverShareFc } }
    });

    // Update passenger savings
    await prisma.user.update({
      where: { id: payment.userId },
      data: { totalSavedFc: { increment: Math.round(payment.amountFc * 0.3) } }
    });

    // Notify driver
    await prisma.notification.create({
      data: {
        userId: trip.driverId,
        type: 'payment_received',
        title: 'Paiement recu',
        message: payment.driverShareFc + ' FC via ' + payment.operator,
        metadata: { paymentId, bookingId: payment.bookingId }
      }
    });
  } catch (err) {
    console.error('[Payment confirmation error]', err);
  }
}

async function getPaymentStatus(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
  return { id: payment.id, status: payment.status, transactionRef: payment.transactionRef };
}

module.exports = { initiatePayment, getPaymentStatus };
