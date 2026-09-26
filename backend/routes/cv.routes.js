const express = require('express');
const router = express.Router();
const { getMyCVs, getCVById, createCV, updateCV, deleteCV, getAllCVs } = require('../controllers/cv.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/admin/all', authenticate, authorize('admin'), getAllCVs);
router.get('/', authenticate, authorize('student'), getMyCVs);
router.get('/:id', authenticate, getCVById);
router.post('/', authenticate, authorize('student'), createCV);
router.put('/:id', authenticate, authorize('student'), updateCV);
router.delete('/:id', authenticate, deleteCV);

module.exports = router;
