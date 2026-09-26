const { readJSON, findById, insert, updateById } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Admin Dashboard - Thống kê tổng quan
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
const getStats = (req, res) => {
  try {
    const students = readJSON('students');
    const companies = readJSON('companies');
    const jobs = readJSON('jobs');
    const cvs = readJSON('cvs');
    // Kỹ năng phổ biến
    const skillCount = {};
    students.forEach((s) => {
      (s.skills || []).forEach((skill) => {
        skillCount[skill] = (skillCount[skill] || 0) + 1;
      });
    });

    const popularSkills = Object.entries(skillCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents: students.length,
          totalCompanies: companies.length,
          totalJobs: jobs.filter((j) => !j.status || j.status === 'active').length,
          totalCVs: cvs.length,
        },
        popularSkills,
      },
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const getUsers = (req, res) => {
  try {
    const users = readJSON('users');
    const companies = readJSON('companies');
    const result = users.map(({ password, ...user }) => {
      const company = user.companyId ? companies.find((item) => item.id === user.companyId) : null;
      return { ...user, company: company ? { id: company.id, name: company.name } : null };
    });
    res.json({ success: true, data: { users: result, total: result.length } });
  } catch (error) {
    console.error('GetUsers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

const updateUserRole = (req, res) => {
  try {
    const validRoles = ['student', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ.' });
    }

    const targetUser = findById('users', req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự thay đổi quyền của chính mình.' });
    }

    // A user demoted to Student must have a profile to use student features.
    if (role === 'student') {
      const hasProfile = readJSON('students').some((student) => student.userId === targetUser.id);
      if (!hasProfile) {
        insert('students', {
          id: uuidv4(), userId: targetUser.id, fullName: targetUser.fullName || 'Sinh viên',
          avatar: '', phone: '', email: targetUser.email, dateOfBirth: '', address: '',
          university: '', major: '', graduationYear: null, careerObjective: '',
          desiredPositions: [], desiredLocation: '', desiredSalary: '', education: [], skills: [],
          experiences: [], projects: [], certificates: [], languages: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
    }

    const updated = updateById('users', targetUser.id, {
      role,
      companyId: null,
    });
    const company = updated.companyId ? findById('companies', updated.companyId) : null;
    const { password, ...safeUser } = updated;
    res.json({
      success: true,
      message: 'Cập nhật quyền tài khoản thành công.',
      data: { user: { ...safeUser, company: company ? { id: company.id, name: company.name } : null } },
    });
  } catch (error) {
    console.error('UpdateUserRole error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getStats, getUsers, updateUserRole };
