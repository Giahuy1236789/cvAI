const express = require('express');
const router = express.Router();
const { getJobs, getMyCompanyJobs, getJobById, createJob, updateJob, deleteJob, importPublicJobs, getImportStatus } = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public
router.get('/', getJobs);

// Admin: Lấy danh sách việc làm
router.get('/company/my-jobs', authenticate, authorize('admin'), getMyCompanyJobs);
router.get('/import/status', authenticate, authorize('admin'), getImportStatus);

router.get('/:id', getJobById);

// Admin
router.post('/import/jobicy', importPublicJobs);
router.post('/', authenticate, authorize('admin'), createJob);
router.put('/:id', authenticate, authorize('admin'), updateJob);
router.delete('/:id', authenticate, authorize('admin'), deleteJob);

module.exports = router;
