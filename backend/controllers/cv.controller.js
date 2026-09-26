const { readJSON, findById, insert, updateById, deleteById, writeJSON } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Lấy danh sách CV của sinh viên
 * @route   GET /api/cvs
 * @access  Private (Student)
 */
const getMyCVs = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên.' });

    const cvs = readJSON('cvs');
    const myCVs = cvs.filter((cv) => cv.studentId === student.id);
    myCVs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: { cvs: myCVs, total: myCVs.length } });
  } catch (error) {
    console.error('GetMyCVs error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Lấy chi tiết một CV
 * @route   GET /api/cvs/:id
 * @access  Private
 */
const getCVById = (req, res) => {
  try {
    const cv = findById('cvs', req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'Không tìm thấy CV.' });

    // Kiểm tra quyền sở hữu (student chỉ xem CV của mình)
    if (req.user.role === 'student') {
      const students = readJSON('students');
      const student = students.find((s) => s.userId === req.user.id);
      if (!student || cv.studentId !== student.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem CV này.' });
      }
    }

    res.json({ success: true, data: { cv } });
  } catch (error) {
    console.error('GetCVById error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Tạo CV mới
 * @route   POST /api/cvs
 * @access  Private (Student)
 */
const createCV = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên.' });

    const {
      title, template, personalInfo, careerObjective, summary,
      education, skills, experiences, projects, certificates, languages,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Tên CV là bắt buộc.' });
    }

    const newCV = {
      id: uuidv4(),
      studentId: student.id,
      title: title || 'CV của tôi',
      template: template || 'template1',
      personalInfo: personalInfo || {
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        address: student.address,
        dateOfBirth: student.dateOfBirth,
      },
      careerObjective: careerObjective || student.careerObjective || '',
      summary: summary || '',
      education: education || student.education || [],
      skills: skills || student.skills || [],
      experiences: experiences || student.experiences || [],
      projects: projects || student.projects || [],
      certificates: certificates || student.certificates || [],
      languages: languages || student.languages || [],
      aiGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    insert('cvs', newCV);

    res.status(201).json({
      success: true,
      message: 'Tạo CV thành công!',
      data: { cv: newCV },
    });
  } catch (error) {
    console.error('CreateCV error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Cập nhật CV
 * @route   PUT /api/cvs/:id
 * @access  Private (Student)
 */
const updateCV = (req, res) => {
  try {
    const cv = findById('cvs', req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'Không tìm thấy CV.' });

    // Kiểm tra quyền sở hữu
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student || cv.studentId !== student.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa CV này.' });
    }

    const allowedFields = [
      'title', 'template', 'personalInfo', 'careerObjective', 'summary',
      'education', 'skills', 'experiences', 'projects', 'certificates', 'languages', 'aiGenerated',
    ];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = new Date().toISOString();

    const updated = updateById('cvs', req.params.id, updates);

    res.json({ success: true, message: 'Cập nhật CV thành công!', data: { cv: updated } });
  } catch (error) {
    console.error('UpdateCV error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Xóa CV
 * @route   DELETE /api/cvs/:id
 * @access  Private (Student)
 */
const deleteCV = (req, res) => {
  try {
    const cv = findById('cvs', req.params.id);
    if (!cv) return res.status(404).json({ success: false, message: 'Không tìm thấy CV.' });

    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (req.user.role === 'student' && (!student || cv.studentId !== student.id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa CV này.' });
    }

    deleteById('cvs', req.params.id);
    res.json({ success: true, message: 'Xóa CV thành công!' });
  } catch (error) {
    console.error('DeleteCV error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Admin - Lấy tất cả CVs
 * @route   GET /api/cvs/admin/all
 * @access  Private (Admin)
 */
const getAllCVs = (req, res) => {
  try {
    const cvs = readJSON('cvs');
    const students = readJSON('students');

    const cvsWithStudent = cvs.map((cv) => {
      const student = students.find((s) => s.id === cv.studentId);
      return { ...cv, student: student ? { id: student.id, fullName: student.fullName } : null };
    });

    res.json({ success: true, data: { cvs: cvsWithStudent, total: cvsWithStudent.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getMyCVs, getCVById, createCV, updateCV, deleteCV, getAllCVs };
