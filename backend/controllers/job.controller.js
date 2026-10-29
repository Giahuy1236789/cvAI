const { readJSON, findById, findOneBy, insert, updateById, deleteById, getJobSyncState } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { importJobicyJobs } = require('../services/jobs/jobicy-import.service');
const { importMockVnJobs } = require('../services/jobs/vn-mock-import.service');
const { isPublicJob } = require('../services/jobs/job-visibility');

/**
 * @desc    Lấy danh sách việc làm (có filter)
 * @route   GET /api/jobs
 * @access  Public
 */
const getJobs = (req, res) => {
  try {
    let jobs = readJSON('jobs');
    const companies = readJSON('companies');

    // Filter: chỉ lấy jobs active
    jobs = jobs.filter((job) => isPublicJob(job));

    // Gắn thông tin công ty
    jobs = jobs.map((job) => {
      const company = companies.find((c) => c.id === job.companyId);
      return { ...job, company: company || null };
    });

    // Filter theo query params
    const { search, location, experience, employmentType, salaryMin, salaryMax, skills } = req.query;

    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.company && j.company.name.toLowerCase().includes(q)) ||
          j.description.toLowerCase().includes(q)
      );
    }

    if (location) {
      jobs = jobs.filter((j) => j.location.toLowerCase().includes(location.toLowerCase()));
    }

    if (experience) {
      jobs = jobs.filter((j) => j.experience === experience);
    }

    if (employmentType) {
      jobs = jobs.filter((j) => j.employmentType === employmentType);
    }

    if (salaryMin) {
      jobs = jobs.filter((j) => j.salaryMax >= parseInt(salaryMin));
    }

    if (salaryMax) {
      jobs = jobs.filter((j) => j.salaryMin <= parseInt(salaryMax));
    }

    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim().toLowerCase());
      jobs = jobs.filter((j) =>
        j.skills.some((s) => skillList.includes(s.toLowerCase()))
      );
    }

    // Lọc theo CV (Nếu có truyền cvId)
    const { cvId } = req.query;
    if (cvId && req.user) {
      const students = readJSON('students');
      const student = students.find((s) => s.userId === req.user.id);
      
      const cvs = readJSON('cvs');
      const cv = student ? cvs.find(c => c.id === cvId && c.studentId === student.id) : null;
      
      if (cv) {
        const { calculateMatchScore } = require('../services/recommendation/matching.service');
        const studentProfile = {
          skills: (cv.skills || []).map(s => s.name || s),
          experiences: cv.experiences || [],
          careerObjective: cv.careerObjective || ''
        };
        jobs = jobs.map(job => ({
          ...job,
          _matchScore: calculateMatchScore(studentProfile, job).finalScore
        })).sort((a, b) => b._matchScore - a._matchScore);
      } else {
        jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } else {
      // Sắp xếp mới nhất lên đầu mặc định
      jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({
      success: true,
      data: { jobs, total: jobs.length },
    });
  } catch (error) {
    console.error('GetJobs error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Lấy danh sách việc làm của riêng Công ty (Recruiter)
 * @route   GET /api/jobs/company/my-jobs
 * @access  Private (Recruiter / Admin)
 */
const getMyCompanyJobs = (req, res) => {
  try {
    const jobs = readJSON('jobs');
    const companies = readJSON('companies');
    const applications = readJSON('applications');

    let companyId = req.user.companyId;
    if (req.user.role === 'admin' && req.query.companyId) {
      companyId = req.query.companyId;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản chưa được liên kết với công ty nào.',
      });
    }

    const company = findById('companies', companyId);
    let myJobs = jobs.filter((j) => j.companyId === companyId);

    // Gắn số lượng ứng viên đã nộp vào từng job
    myJobs = myJobs.map((j) => {
      const applyCount = applications.filter((a) => a.jobId === j.id).length;
      return {
        ...j,
        company: company || null,
        applicantCount: applyCount,
      };
    });

    myJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: { jobs: myJobs, total: myJobs.length, company },
    });
  } catch (error) {
    console.error('GetMyCompanyJobs error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Lấy chi tiết một việc làm
 * @route   GET /api/jobs/:id
 * @access  Public
 */
const getJobById = (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm.' });
    }

    if (!isPublicJob(job)) return res.status(410).json({ success: false, message: 'Tin tuyển dụng này không còn hiển thị. Vui lòng chọn tin mới trong danh sách việc làm.' });

    const company = findById('companies', job.companyId);

    res.json({
      success: true,
      data: { job: { ...job, company: company || null } },
    });
  } catch (error) {
    console.error('GetJobById error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Tạo việc làm mới (Admin / Recruiter)
 * @route   POST /api/jobs
 * @access  Private (Admin, Recruiter)
 */
const createJob = (req, res) => {
  try {
    let {
      companyId, title, description, location, salaryMin, salaryMax,
      experience, employmentType, skills, education, benefits, deadline,
    } = req.body;

    if (!companyId || !title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc.',
      });
    }

    const company = findById('companies', companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Công ty không tồn tại.' });
    }

    const newJob = {
      id: uuidv4(),
      companyId,
      title,
      description,
      location,
      salaryMin: parseInt(salaryMin) || 0,
      salaryMax: parseInt(salaryMax) || 0,
      experience: experience || 'Fresher',
      employmentType: employmentType || 'Full-time',
      skills: skills || [],
      education: education || '',
      benefits: benefits || [],
      deadline: deadline || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    insert('jobs', newJob);

    res.status(201).json({
      success: true,
      message: 'Tạo việc làm thành công!',
      data: { job: newJob },
    });
  } catch (error) {
    console.error('CreateJob error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Cập nhật việc làm (Admin / Recruiter)
 * @route   PUT /api/jobs/:id
 * @access  Private (Admin, Recruiter)
 */
const updateJob = (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm.' });
    }

    const allowedFields = [
      'title', 'description', 'location', 'salaryMin', 'salaryMax',
      'experience', 'employmentType', 'skills', 'education', 'benefits',
      'deadline', 'status', 'companyId',
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    updates.updatedAt = new Date().toISOString();

    const updated = updateById('jobs', req.params.id, updates);

    res.json({
      success: true,
      message: 'Cập nhật việc làm thành công!',
      data: { job: updated },
    });
  } catch (error) {
    console.error('UpdateJob error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Xóa việc làm (Admin / Recruiter)
 * @route   DELETE /api/jobs/:id
 * @access  Private (Admin, Recruiter)
 */
const deleteJob = (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm.' });
    }

    deleteById('jobs', req.params.id);
    res.json({ success: true, message: 'Xóa việc làm thành công!' });
  } catch (error) {
    console.error('DeleteJob error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Đồng bộ tin việc làm từ nguồn công khai được phép sử dụng
 * @route   POST /api/jobs/import/jobicy
 * @access  Private (Admin)
 */
const importPublicJobs = async (req, res) => {
  try {
    const [resultJobicy, resultVn] = await Promise.all([
      importJobicyJobs({ count: req.body?.count }),
      importMockVnJobs()
    ]);
    
    const totalInserted = resultJobicy.inserted + resultVn.inserted;
    const totalUpdated = resultJobicy.updated + resultVn.updated;

    res.json({
      success: true,
      message: `Đã đồng bộ ${totalInserted} tin mới và cập nhật ${totalUpdated} tin từ Jobicy và Top công ty VN.`,
      data: { jobicy: resultJobicy, vnMock: resultVn },
    });
  } catch (error) {
    console.error('Import public jobs error:', error.message);
    if (error.code === 'IMPORT_RATE_LIMIT') {
      if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds));
      return res.status(429).json({ success: false, message: error.message, retryAfterSeconds: error.retryAfterSeconds });
    }
    if (error.code === 'JOB_SOURCE_UNAVAILABLE') {
      return res.status(503).json({ success: false, message: 'Không thể kết nối nguồn việc làm Jobicy. Hãy kiểm tra mạng rồi thử lại.' });
    }
    res.status(500).json({ success: false, message: 'Không thể đồng bộ việc làm lúc này.' });
  }
};

const getImportStatus = async (req, res) => {
  try {
    const hours = Number(process.env.JOB_SYNC_INTERVAL_HOURS);
    const intervalHours = Number.isFinite(hours) && hours > 0 ? Math.max(1, Math.min(hours, 168)) : 6;
    res.json({ success: true, data: {
      ...await getJobSyncState(),
      enabled: String(process.env.JOB_SYNC_ENABLED || '').toLowerCase() !== 'false',
      intervalHours,
      visibleJobs: readJSON('jobs').filter((job) => job.source === 'Jobicy' && isPublicJob(job)).length,
    } });
  } catch (_) {
    res.status(503).json({ success: false, message: 'Chưa đọc được trạng thái đồng bộ việc làm.' });
  }
};

module.exports = { getJobs, getMyCompanyJobs, getJobById, createJob, updateJob, deleteJob, importPublicJobs, getImportStatus };
