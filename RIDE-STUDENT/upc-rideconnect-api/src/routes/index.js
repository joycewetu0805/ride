const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/trips', require('./trips.routes'));
router.use('/bookings', require('./bookings.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/ratings', require('./ratings.routes'));
router.use('/meeting-points', require('./meetingPoints.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/notifications', require('./notifications.routes'));

module.exports = router;
