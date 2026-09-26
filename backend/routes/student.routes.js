const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getProfileCompletion,
  getAllStudents,
  getStudentById,
} = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Student routes
router.get('/profile', authenticate, authorize('student'), getProfile);
router.put('/profile', authenticate, authorize('student'), updateProfile);
router.get('/profile/completion', authenticate, authorize('student'), getProfileCompletion);

// Admin routes
router.get('/', authenticate, authorize('admin'), getAllStudents);
router.get('/:id', authenticate, authorize('admin'), getStudentById);

module.exports = router;
