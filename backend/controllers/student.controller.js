const { readJSON, findOneBy, findBy, updateById, findById } = require('../config/database');

/**
 * @desc    Lấy profile sinh viên hiện tại
 * @route   GET /api/students/profile
 * @access  Private (Student)
 */
const getProfile = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ sinh viên.',
      });
    }

    res.json({
      success: true,
      data: { student },
    });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Cập nhật profile sinh viên
 * @route   PUT /api/students/profile
 * @access  Private (Student)
 */
const updateProfile = (req, res) => {
  try {
    const students = readJSON('students');
    const studentIndex = students.findIndex((s) => s.userId === req.user.id);

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ sinh viên.',
      });
    }

    // Các trường được phép cập nhật
    const allowedFields = [
      'fullName', 'avatar', 'phone', 'email', 'dateOfBirth', 'address',
      'university', 'major', 'graduationYear', 'careerObjective',
      'desiredPositions', 'desiredLocation', 'desiredSalary',
      'education', 'skills', 'experiences', 'projects', 'certificates', 'languages',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    updates.updatedAt = new Date().toISOString();

    const { writeJSON } = require('../config/database');
    students[studentIndex] = { ...students[studentIndex], ...updates };
    writeJSON('students', students);

    res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!',
      data: { student: students[studentIndex] },
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Tính % hoàn thiện hồ sơ
 * @route   GET /api/students/profile/completion
 * @access  Private (Student)
 */
const getProfileCompletion = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    const fields = [
      { name: 'Họ tên', filled: !!student.fullName },
      { name: 'Số điện thoại', filled: !!student.phone },
      { name: 'Ngày sinh', filled: !!student.dateOfBirth },
      { name: 'Địa chỉ', filled: !!student.address },
      { name: 'Trường đại học', filled: !!student.university },
      { name: 'Chuyên ngành', filled: !!student.major },
      { name: 'Năm tốt nghiệp', filled: !!student.graduationYear },
      { name: 'Mục tiêu nghề nghiệp', filled: !!student.careerObjective },
      { name: 'Vị trí mong muốn', filled: student.desiredPositions && student.desiredPositions.length > 0 },
      { name: 'Địa điểm mong muốn', filled: !!student.desiredLocation },
      { name: 'Học vấn', filled: student.education && student.education.length > 0 },
      { name: 'Kỹ năng', filled: student.skills && student.skills.length > 0 },
      { name: 'Kinh nghiệm', filled: student.experiences && student.experiences.length > 0 },
      { name: 'Dự án', filled: student.projects && student.projects.length > 0 },
    ];

    const filledCount = fields.filter((f) => f.filled).length;
    const percentage = Math.round((filledCount / fields.length) * 100);

    const missingFields = fields.filter((f) => !f.filled).map((f) => f.name);

    res.json({
      success: true,
      data: {
        percentage,
        filledCount,
        totalFields: fields.length,
        missingFields,
      },
    });
  } catch (error) {
    console.error('GetProfileCompletion error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Admin - Lấy danh sách tất cả sinh viên
 * @route   GET /api/students
 * @access  Private (Admin)
 */
const getAllStudents = (req, res) => {
  try {
    const students = readJSON('students');
    const users = readJSON('users');

    const studentsWithEmail = students.map((s) => {
      const user = users.find((u) => u.id === s.userId);
      return {
        ...s,
        email: user ? user.email : s.email,
      };
    });

    res.json({
      success: true,
      data: { students: studentsWithEmail, total: studentsWithEmail.length },
    });
  } catch (error) {
    console.error('GetAllStudents error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Admin - Lấy thông tin một sinh viên
 * @route   GET /api/students/:id
 * @access  Private (Admin)
 */
const getStudentById = (req, res) => {
  try {
    const student = findById('students', req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
    }

    res.json({ success: true, data: { student } });
  } catch (error) {
    console.error('GetStudentById error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getProfile, updateProfile, getProfileCompletion, getAllStudents, getStudentById };
