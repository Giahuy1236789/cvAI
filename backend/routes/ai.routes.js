const express = require('express');
const router = express.Router();
const { generateCV, analyzeCVController, improveCVController } = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/generate-cv', authenticate, authorize('student'), generateCV);
router.post('/analyze-cv', authenticate, authorize('student'), analyzeCVController);
router.post('/improve-cv', authenticate, authorize('student'), improveCVController);

module.exports = router;
