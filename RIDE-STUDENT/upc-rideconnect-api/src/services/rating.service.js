const prisma = require('../config/database');
const { REPUTATION_C, REPUTATION_M } = require('../config/constants');

async function submitRating({ tripId, raterId, ratedId, score, comment }) {
  if (score < 1 || score > 5) throw Object.assign(new Error('Note entre 1 et 5'), { status: 400 });
  if (raterId === ratedId) throw Object.assign(new Error('Vous ne pouvez pas vous noter vous-meme'), { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.status !== 'completed') {
    throw Object.assign(new Error('Le trajet doit etre termine pour noter'), { status: 400 });
  }

  const rating = await prisma.rating.create({
    data: { tripId, raterId, ratedId, score, comment }
  });

  // Recalculate reputation using Bayesian average
  await updateReputation(ratedId);

  return rating;
}

async function updateReputation(userId) {
  const ratings = await prisma.rating.findMany({
    where: { ratedId: userId },
    select: { score: true }
  });

  if (ratings.length === 0) return;

  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  const count = ratings.length;
  const reputation = (REPUTATION_C * REPUTATION_M + sum) / (REPUTATION_C + count);

  await prisma.user.update({
    where: { id: userId },
    data: { reputation: Math.round(reputation * 100) / 100 }
  });
}

async function getUserRatings(userId) {
  return prisma.rating.findMany({
    where: { ratedId: userId },
    include: {
      rater: { select: { firstName: true, lastName: true } },
      trip: { include: { neighborhood: { select: { name: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

function getTrustLevel(reputation, totalTrips) {
  if (totalTrips === 0) return 'Nouveau';
  if (reputation >= 4.5 && totalTrips >= 10) return 'Conducteur de confiance';
  if (reputation >= 4.0) return 'Bon conducteur';
  if (reputation < 2.5 && totalTrips >= 5) return 'Compte signale';
  return 'Membre';
}

module.exports = { submitRating, getUserRatings, getTrustLevel };
