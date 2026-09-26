const express = require('express');
const router = express.Router();
const { getRecommendations, getJobRecommendation } = require('../controllers/recommendation.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', authenticate, authorize('student'), getRecommendations);
router.get('/:jobId', authenticate, authorize('student'), getJobRecommendation);

module.exports = router;
