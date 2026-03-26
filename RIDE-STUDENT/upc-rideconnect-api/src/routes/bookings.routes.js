const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/bookings.controller');

const router = Router();

router.post('/', authMiddleware, ctrl.create);
router.get('/my', authMiddleware, ctrl.myBookings);
router.patch('/:id/cancel', authMiddleware, ctrl.cancel);

module.exports = router;
