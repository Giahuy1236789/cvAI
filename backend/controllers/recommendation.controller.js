const { readJSON, findById } = require('../config/database');
const { calculateMatchScore, isVietnamLocation } = require('../services/recommendation/matching.service');
const { recommendJobsWithAI } = require('../services/ai/gemini.service');
const { createGeminiError, isGeminiError } = require('../services/ai/gemini.errors');
const { isPublicJob } = require('../services/jobs/job-visibility');

const MAX_AI_CANDIDATES = 12;
const RECOMMENDATION_CACHE_MS = 5 * 60 * 1000;
const recommendationCache = new Map();
const FALLBACK_ADVICE = 'AI tạm thời chưa tạo được nhận xét. Kết quả hiện tại được tính theo kỹ năng và nguyện vọng trong hồ sơ của bạn; đây chưa phải đánh giá của AI.';

const createCacheKey = (student, jobs, cvId = '') => JSON.stringify({
  studentId: student.id,
  cvId: cvId || '',
  skills: student.skills || [],
  experiences: student.experiences || [],
  projects: student.projects || [],
  desiredPositions: student.desiredPositions || [],
  desiredLocation: student.desiredLocation || '',
  desiredSalary: student.desiredSalary || '',
  careerObjective: student.careerObjective || '',
  jobs: jobs.map((job) => `${job.id}:${job.updatedAt || job.createdAt || ''}`),
});

const profileForResponse = (student) => ({
  skills: student.skills,
  desiredPositions: student.desiredPositions,
  desiredLocation: student.desiredLocation,
});

const resolveStudentWithCv = (student, cvId) => {
  if (!cvId) return student;
  const cvs = readJSON('cvs');
  const cv = cvs.find((c) => c.id === cvId && c.studentId === student.id);
  if (!cv) return student;

  const cvSkills = Array.isArray(cv.skills)
    ? cv.skills.map((s) => {
        if (!s) return '';
        if (typeof s === 'string') return s.trim();
        return (s.name || s.skill || s.title || '').trim();
      }).filter(Boolean)
    : [];

  return {
    ...student,
    skills: cvSkills.length > 0 ? cvSkills : (student.skills || []),
    experiences: Array.isArray(cv.experiences) && cv.experiences.length > 0 ? cv.experiences : (student.experiences || []),
    projects: Array.isArray(cv.projects) && cv.projects.length > 0 ? cv.projects : (student.projects || []),
    careerObjective: cv.careerObjective || cv.summary || student.careerObjective || '',
  };
};

const preparationFromMatch = (match) => match.missingSkills.length > 0
  ? [`Ôn tập hoặc bổ sung: ${match.missingSkills.join(', ')}.`]
  : ['Rà soát CV và chuẩn bị ví dụ cụ thể cho các dự án liên quan.'];

const getFallbackRecommendations = (student, jobs, companies) => jobs.map((job) => {
  const company = companies.find((c) => c.id === job.companyId);
  const match = calculateMatchScore(student, job);
  return {
    job: { ...job, company: company || null },
    ...match,
    preparationSteps: preparationFromMatch(match),
    aiRecommendation: false,
    isVN: isVietnamLocation(job.location),
  };
});

/**
 * @desc    Lấy danh sách việc làm phù hợp
 * @route   GET /api/recommendations
 * @access  Private (Student)
 */
const getRecommendations = async (req, res) => {
  try {
    const students = readJSON('students');
    const baseStudent = students.find((s) => s.userId === req.user.id);
    if (!baseStudent) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const student = resolveStudentWithCv(baseStudent, req.query.cvId);

    const jobs = readJSON('jobs').filter((job) => isPublicJob(job));
    const companies = readJSON('companies');

    if (jobs.length === 0) {
      return res.json({
        success: true,
        data: { recommendations: [], overallAdvice: 'Chưa có tin tuyển dụng để AI phân tích.', total: 0, aiAvailable: true, studentProfile: profileForResponse(student) },
      });
    }

    const cacheKey = createCacheKey(student, jobs, req.query.cvId);
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < RECOMMENDATION_CACHE_MS) {
      return res.json({ success: true, data: { ...cached.data, cached: true } });
    }

    // Select candidates by profile matching before requesting AI explanations.
    // Ưu tiên công việc tại Việt Nam, sau đó sắp xếp theo điểm matching cao nhất.
    const shortlisted = jobs
      .map((job) => ({
        job,
        quickMatch: calculateMatchScore(student, job),
        isVN: isVietnamLocation(job.location),
      }))
      .sort((a, b) => {
        if (a.isVN !== b.isVN) return a.isVN ? -1 : 1;
        return b.quickMatch.finalScore - a.quickMatch.finalScore;
      })
      .slice(0, MAX_AI_CANDIDATES);
    const jobsForAI = shortlisted.map(({ job }) => job);

    // The page calls this mode first so students see useful jobs immediately.
    // The browser then requests the detailed AI explanation in the background.
    if (req.query.mode === 'fast') {
      const recommendations = getFallbackRecommendations(student, jobsForAI, companies)
        .sort((a, b) => {
          if (a.isVN !== b.isVN) return a.isVN ? -1 : 1;
          return b.finalScore - a.finalScore;
        });
      return res.json({
        success: true,
        data: {
          recommendations,
          overallAdvice: 'Đang lọc nhanh theo hồ sơ và ưu tiên việc làm tại Việt Nam. AI sẽ bổ sung nhận xét chi tiết khi bạn bấm phân tích.',
          aiAvailable: false,
          aiLoading: true,
          total: recommendations.length,
          studentProfile: profileForResponse(student),
        },
      });
    }

    let recommendations;
    let aiResult;
    try {
      aiResult = await recommendJobsWithAI(student, jobsForAI);
      if (!Array.isArray(aiResult?.recommendations)) {
        throw createGeminiError('GEMINI_INVALID_RESPONSE', 'Gemini returned no recommendations array.');
      }
    } catch (error) {
      if (!isGeminiError(error)) throw error;
      recommendations = getFallbackRecommendations(student, jobsForAI, companies)
        .sort((a, b) => {
          if (a.isVN !== b.isVN) return a.isVN ? -1 : 1;
          return b.finalScore - a.finalScore;
        });
      return res.json({
        success: true,
        data: {
          recommendations,
          overallAdvice: FALLBACK_ADVICE,
          total: recommendations.length,
          aiAvailable: false,
          aiLoading: false,
          studentProfile: profileForResponse(student),
        },
      });
    }
    const aiByJobId = new Map(aiResult.recommendations.map((item) => [String(item.jobId), item]));
    recommendations = shortlisted.map(({ job, quickMatch, isVN }) => {
      const ai = aiByJobId.get(String(job.id));
      const company = companies.find((c) => c.id === job.companyId);
      if (!ai) {
        return {
          job: { ...job, company: company || null },
          ...quickMatch,
          preparationSteps: preparationFromMatch(quickMatch),
          aiRecommendation: false,
          isVN,
        };
      }
      return {
        job: { ...job, company: company || null },
        finalScore: ai.score,
        matchedSkills: ai.matchedSkills,
        missingSkills: ai.missingSkills,
        reasons: isVN ? ['Việc làm tại Việt Nam', ai.reason] : [ai.reason],
        preparationSteps: ai.preparationSteps,
        aiRecommendation: true,
        isVN,
      };
    });

    // Sắp xếp ưu tiên việc làm Việt Nam rồi đến điểm giảm dần
    recommendations.sort((a, b) => {
      if (a.isVN !== b.isVN) return a.isVN ? -1 : 1;
      return b.finalScore - a.finalScore;
    });
    const aiAvailable = recommendations.some((item) => item.aiRecommendation);

    const responseData = {
      success: true,
      data: {
        recommendations,
        overallAdvice: aiAvailable ? aiResult.overallAdvice : FALLBACK_ADVICE,
        aiAvailable,
        aiLoading: false,
        total: recommendations.length,
        studentProfile: profileForResponse(student),
      },
    };
    if (aiAvailable) {
      if (recommendationCache.size >= 30) recommendationCache.clear();
      recommendationCache.set(cacheKey, { createdAt: Date.now(), data: responseData.data });
    }
    res.json(responseData);
  } catch (error) {
    console.error('GetRecommendations error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * @desc    Lấy chi tiết matching cho một job
 * @route   GET /api/recommendations/:jobId
 * @access  Private (Student)
 */
const getJobRecommendation = async (req, res) => {
  try {
    const students = readJSON('students');
    const baseStudent = students.find((s) => s.userId === req.user.id);
    if (!baseStudent) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const student = resolveStudentWithCv(baseStudent, req.query.cvId);

    const job = findById('jobs', req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm.' });
    if (!isPublicJob(job)) return res.status(410).json({ success: false, message: 'Tin tuyển dụng này không còn hiển thị.' });

    const company = findById('companies', job.companyId);
    if (req.query.mode === 'fast') {
      const [fallback] = getFallbackRecommendations(student, [job], company ? [company] : []);
      return res.json({
        success: true,
        data: {
          ...fallback,
          aiAvailable: false,
          aiLoading: false,
          overallAdvice: 'Đây là kết quả đối chiếu nhanh. Chọn phân tích AI nếu bạn cần nhận xét chi tiết.',
        },
      });
    }

    let match;
    let overallAdvice;
    try {
      const aiResult = await recommendJobsWithAI(student, [job]);
      match = Array.isArray(aiResult?.recommendations)
        ? aiResult.recommendations.find((item) => String(item.jobId) === String(job.id))
        : null;
      if (!match) {
        throw createGeminiError('GEMINI_INVALID_RESPONSE', `AI recommendation missing for job ${job.id}`);
      }
      overallAdvice = aiResult.overallAdvice;
    } catch (error) {
      if (!isGeminiError(error)) throw error;
      const [fallback] = getFallbackRecommendations(student, [job], company ? [company] : []);
      return res.json({
        success: true,
        data: { ...fallback, aiAvailable: false, aiLoading: false, overallAdvice: FALLBACK_ADVICE },
      });
    }

    res.json({
      success: true,
      data: {
        job: { ...job, company: company || null },
        finalScore: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        reasons: [match.reason],
        preparationSteps: match.preparationSteps,
        aiRecommendation: true,
        aiAvailable: true,
        aiLoading: false,
        overallAdvice,
      },
    });
  } catch (error) {
    console.error('GetJobRecommendation error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getRecommendations, getJobRecommendation };
