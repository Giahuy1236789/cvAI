const express = require('express');
const router = express.Router();
const { getSavedJobs, saveJob, unsaveJob, checkSaved } = require('../controllers/savedJob.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', authenticate, authorize('student'), getSavedJobs);
router.post('/', authenticate, authorize('student'), saveJob);
router.get('/check/:jobId', authenticate, authorize('student'), checkSaved);
router.delete('/:jobId', authenticate, authorize('student'), unsaveJob);

module.exports = router;
