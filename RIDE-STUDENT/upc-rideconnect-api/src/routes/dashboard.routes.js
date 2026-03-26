const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

const router = Router();

router.get('/stats', authMiddleware, ctrl.getStats);
router.get('/history', authMiddleware, ctrl.getHistory);

module.exports = router;
