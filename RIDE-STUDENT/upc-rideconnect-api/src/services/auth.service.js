const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { isUpcEmail } = require('../utils/validators');

async function register({ firstName, lastName, email, studentCard, phone, role, password }) {
  if (!isUpcEmail(email)) {
    throw Object.assign(new Error('Email universitaire UPC requis (@upc.ac.cd)'), { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { studentCard }] }
  });
  if (existing) {
    throw Object.assign(new Error('Un compte existe deja avec cet email ou cette carte'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { firstName, lastName, email: email.toLowerCase(), studentCard, phone, role, passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, reputation: true }
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: { ...user, name: user.firstName + ' ' + user.lastName.charAt(0) + '.' }
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.firstName + ' ' + user.lastName.charAt(0) + '.',
      email: user.email,
      role: user.role,
      reputation: user.reputation,
      totalTrips: user.totalTrips
    }
  };
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      studentCard: true, phone: true, role: true, avatarUrl: true,
      reputation: true, totalTrips: true, totalEarnedFc: true,
      totalSavedFc: true, isVerified: true, createdAt: true
    }
  });
  if (!user) throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });
  return { ...user, name: user.firstName + ' ' + user.lastName.charAt(0) + '.' };
}

module.exports = { register, login, getProfile };
