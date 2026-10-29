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

/**
 * @desc    Tải lên và trích xuất nội dung CV (PDF, Word, TXT...)
 * @route   POST /api/cvs/upload-and-parse
 * @access  Private (Student)
 */
const uploadAndParseCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file CV để tải lên.' });
    }

    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên.' });
    }

    const { parseCVFile } = require('../services/cv/cv-parser.service');
    const parsedData = await parseCVFile(req.file);

    // Nếu người dùng chọn lưu trực tiếp thành một bản CV trong DB
    if (req.body.saveToDb === 'true' || req.query.save === 'true') {
      const template = req.body.template || 'topcv';
      const newCV = {
        id: uuidv4(),
        studentId: student.id,
        title: parsedData.title || `CV - ${parsedData.personalInfo?.fullName || student.fullName}`,
        template,
        personalInfo: {
          fullName: parsedData.personalInfo?.fullName || student.fullName,
          email: parsedData.personalInfo?.email || student.email,
          phone: parsedData.personalInfo?.phone || student.phone,
          address: parsedData.personalInfo?.address || student.address,
          title: parsedData.personalInfo?.title || 'Chuyên viên',
          avatar: student.avatar || '',
          dob: parsedData.personalInfo?.dob || student.dateOfBirth || '',
          website: parsedData.personalInfo?.website || '',
        },
        careerObjective: parsedData.careerObjective || student.careerObjective || '',
        summary: '',
        education: parsedData.education?.length ? parsedData.education : (student.education || []),
        skills: parsedData.skills?.length ? parsedData.skills : (student.skills || []),
        experiences: parsedData.experiences?.length ? parsedData.experiences : (student.experiences || []),
        projects: parsedData.projects?.length ? parsedData.projects : (student.projects || []),
        certificates: parsedData.certificates?.length ? parsedData.certificates : (student.certificates || []),
        languages: parsedData.languages?.length ? parsedData.languages : (student.languages || []),
        hobbies: parsedData.hobbies || [],
        aiGenerated: Boolean(parsedData.usedAI),
        uploadedFileName: req.file.originalname,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      insert('cvs', newCV);

      return res.status(201).json({
        success: true,
        message: 'Tải lên và tạo CV thành công!',
        data: {
          cv: newCV,
          parsed: parsedData,
          usedAI: parsedData.usedAI,
        },
      });
    }

    // Hoặc chỉ trích xuất dữ liệu để điền thẳng vào form CV Editor
    res.json({
      success: true,
      message: 'Trích xuất dữ liệu CV thành công!',
      data: {
        parsed: parsedData,
        fileName: req.file.originalname,
        usedAI: parsedData.usedAI,
      },
    });
  } catch (error) {
    console.error('UploadAndParseCV error:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải lên và phân tích CV.' });
  }
};

module.exports = { getMyCVs, getCVById, createCV, updateCV, deleteCV, getAllCVs, uploadAndParseCV };
