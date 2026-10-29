const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJSON, findOneBy, insert, findById } = require('../config/database');

/**
 * Tạo JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @desc    Đăng ký tài khoản (Hỗ trợ Sinh viên & Nhà tuyển dụng)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { email, password, fullName, role = 'student', companyName, companyId } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: email, mật khẩu, họ tên.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ.',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = findOneBy('users', 'email', email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký. Vui lòng dùng email khác.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    // Tạo user mới
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'student',
      fullName: fullName.trim(),
      companyId: null,
      createdAt: new Date().toISOString(),
    };
    insert('users', newUser);

    // Tạo student profile
    const studentId = uuidv4();
      const newStudent = {
        id: studentId,
        userId: userId,
        fullName: fullName.trim(),
        avatar: '',
        phone: req.body.phone || '',
        email: email.toLowerCase(),
        dateOfBirth: '',
        address: '',
        university: '',
        major: '',
        graduationYear: null,
        careerObjective: '',
        desiredPositions: [],
        desiredLocation: '',
        desiredSalary: '',
        education: [],
        skills: [],
        experiences: [],
        projects: [],
        certificates: [],
        languages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      insert('students', newStudent);

    // Tạo token
    const token = generateToken(userId);

    let responseUser = {
      id: userId,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      companyId: newUser.companyId,
    };

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        token,
        user: responseUser,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.',
    });
  }
};

/**
 * @desc    Đăng nhập
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu.',
      });
    }

    // Tìm user theo email
    const user = findOneBy('users', 'email', email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
      });
    }

    // Kiểm tra password
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const { pool } = require('../config/database');
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
      if (rows.length > 0 && (await bcrypt.compare(password, rows[0].password))) {
        user.password = rows[0].password;
        isMatch = true;
      }
    }
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
      });
    }

    // Lấy thông tin phụ thuộc theo role
    let userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName || 'Người dùng',
      companyId: user.companyId || null,
    };

    if (user.role === 'student') {
      const students = readJSON('students');
      const student = students.find((s) => s.userId === user.id);
      if (student) {
        userData.fullName = student.fullName;
        userData.studentId = student.id;
      }
    } else if (user.role === 'admin') {
      userData.fullName = 'Admin';
    }

    // Tạo token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        token,
        user: userData,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại sau.',
    });
  }
};

/**
 * @desc    Lấy thông tin user hiện tại
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;
    const fullUser = findById('users', user.id);

    let userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: fullUser?.fullName || 'Người dùng',
      companyId: fullUser?.companyId || null,
    };

    if (user.role === 'student') {
      const students = readJSON('students');
      const student = students.find((s) => s.userId === user.id);
      if (student) {
        userData.fullName = student.fullName;
        userData.studentId = student.id;
        userData.avatar = student.avatar;
      }
    } else {
      userData.fullName = 'Admin';
    }

    res.json({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
};

module.exports = { register, login, getMe };
