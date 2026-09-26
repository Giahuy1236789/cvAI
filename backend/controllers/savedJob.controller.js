const { readJSON, findById, insert, deleteById } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Lấy danh sách việc đã lưu
 * @route   GET /api/saved-jobs
 * @access  Private (Student)
 */
const getSavedJobs = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const savedJobs = readJSON('savedJobs');
    const jobs = readJSON('jobs');
    const companies = readJSON('companies');

    const mysaved = savedJobs.filter((s) => s.studentId === student.id);

    const result = mysaved.map((saved) => {
      const job = jobs.find((j) => j.id === saved.jobId);
      const company = job ? companies.find((c) => c.id === job.companyId) : null;
      return {
        ...saved,
        job: job ? { ...job, company: company || null } : null,
      };
    });

    result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    res.json({ success: true, data: { savedJobs: result, total: result.length } });
  } catch (error) {
    console.error('GetSavedJobs error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Lưu việc làm
 * @route   POST /api/saved-jobs
 * @access  Private (Student)
 */
const saveJob = (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp jobId.' });

    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const job = findById('jobs', jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm.' });

    const savedJobs = readJSON('savedJobs');
    const existing = savedJobs.find((s) => s.studentId === student.id && s.jobId === jobId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bạn đã lưu việc làm này rồi.' });
    }

    const newSaved = {
      id: uuidv4(),
      studentId: student.id,
      jobId,
      savedAt: new Date().toISOString(),
    };

    insert('savedJobs', newSaved);

    res.status(201).json({ success: true, message: 'Đã lưu việc làm!', data: { savedJob: newSaved } });
  } catch (error) {
    console.error('SaveJob error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Bỏ lưu việc làm
 * @route   DELETE /api/saved-jobs/:jobId
 * @access  Private (Student)
 */
const unsaveJob = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const savedJobs = readJSON('savedJobs');
    const saved = savedJobs.find((s) => s.studentId === student.id && s.jobId === req.params.jobId);

    if (!saved) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy việc đã lưu.' });
    }

    deleteById('savedJobs', saved.id);

    res.json({ success: true, message: 'Đã bỏ lưu việc làm.' });
  } catch (error) {
    console.error('UnsaveJob error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Kiểm tra một job có được lưu chưa
 * @route   GET /api/saved-jobs/check/:jobId
 * @access  Private (Student)
 */
const checkSaved = (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.json({ success: true, data: { isSaved: false } });

    const savedJobs = readJSON('savedJobs');
    const isSaved = savedJobs.some((s) => s.studentId === student.id && s.jobId === req.params.jobId);

    res.json({ success: true, data: { isSaved } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getSavedJobs, saveJob, unsaveJob, checkSaved };
