const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/notifications.controller');

const router = Router();

router.get('/', authMiddleware, ctrl.list);
router.patch('/:id/read', authMiddleware, ctrl.markRead);

module.exports = router;
