const { Router } = require('express');
const ctrl = require('../controllers/meetingPoints.controller');

const router = Router();

router.get('/suggest', ctrl.suggest);
router.get('/:neighborhoodId', ctrl.listByNeighborhood);

module.exports = router;
