const notifService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const notifications = await notifService.getUserNotifications(req.user.userId, req.query);
    res.json({ notifications });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const notif = await notifService.markAsRead(parseInt(req.params.id), req.user.userId);
    res.json(notif);
  } catch (err) { next(err); }
}

module.exports = { list, markRead };
