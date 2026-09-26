const express = require('express');
const router = express.Router();
const { readJSON, findById, insert, updateById, deleteById } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// GET /api/skills - Public
router.get('/', (req, res) => {
  try {
    const skills = readJSON('skills');
    res.json({ success: true, data: { skills } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// POST /api/skills - Admin
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Tên kỹ năng là bắt buộc.' });

    const skills = readJSON('skills');
    const exists = skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(400).json({ success: false, message: 'Kỹ năng đã tồn tại.' });

    const newSkill = { id: uuidv4(), name, category: category || 'Other' };
    insert('skills', newSkill);

    res.status(201).json({ success: true, message: 'Thêm kỹ năng thành công!', data: { skill: newSkill } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// DELETE /api/skills/:id - Admin
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const deleted = deleteById('skills', req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy kỹ năng.' });
    res.json({ success: true, message: 'Xóa kỹ năng thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

module.exports = router;
