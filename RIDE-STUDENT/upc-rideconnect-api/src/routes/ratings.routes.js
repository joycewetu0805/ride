const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/ratings.controller');

const router = Router();

router.post('/', authMiddleware, ctrl.submit);
router.get('/user/:userId', ctrl.getUserRatings);

module.exports = router;
