const { Router } = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/trips.controller');
const trackingCtrl = require('../controllers/tracking.controller');

const router = Router();

router.get('/search', optionalAuth, ctrl.search);
router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, ctrl.getById);
router.get('/:id/location', optionalAuth, trackingCtrl.getLocation);
router.get('/:id/route', optionalAuth, trackingCtrl.getRoute);
router.post('/', authMiddleware, ctrl.create);
router.patch('/:id/status', authMiddleware, ctrl.updateStatus);

module.exports = router;
