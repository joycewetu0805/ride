const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/payments.controller');

const router = Router();

router.post('/', authMiddleware, ctrl.initiate);
router.get('/:id/status', authMiddleware, ctrl.getStatus);

module.exports = router;
