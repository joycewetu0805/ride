const prisma = require('../config/database');

async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });
}

async function markAsRead(notificationId, userId) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== userId) {
    throw Object.assign(new Error('Notification introuvable'), { status: 404 });
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  });
}

module.exports = { getUserNotifications, markAsRead };
