const express = require('express');
const router = express.Router();
const { getStats, getUsers, updateUserRole } = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/stats', authenticate, authorize('admin'), getStats);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.put('/users/:id/role', authenticate, authorize('admin'), updateUserRole);

module.exports = router;
