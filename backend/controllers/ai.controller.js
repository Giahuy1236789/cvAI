const { generateCVContent, analyzeCV, improveCV, GEMINI_MODEL } = require('../services/ai/gemini.service');
const { createGeminiError, sendGeminiError } = require('../services/ai/gemini.errors');
const { readJSON, findById, insert } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const requireAIData = (result) => {
  if (!result?.success || !result.data) {
    throw createGeminiError('GEMINI_INVALID_RESPONSE', 'Gemini did not return a successful result.');
  }
  return result.data;
};

/**
 * @desc    Tạo nội dung CV bằng AI
 * @route   POST /api/ai/generate-cv
 * @access  Private (Student)
 */
const generateCV = async (req, res) => {
  try {
    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });

    const data = requireAIData(await generateCVContent(student, { section: req.body?.section }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('GenerateCV error:', error);
    if (sendGeminiError(res, error)) return;
    res.status(500).json({ success: false, message: 'Lỗi khi tạo CV bằng AI.' });
  }
};

/**
 * @desc    Phân tích CV bằng AI
 * @route   POST /api/ai/analyze-cv
 * @access  Private (Student)
 */
const analyzeCVController = async (req, res) => {
  try {
    const { cvId, cvContent } = req.body;
    let contentToAnalyze = cvContent;
    let selectedCV = null;

    if (cvId) {
      const cv = findById('cvs', cvId);
      if (!cv) return res.status(404).json({ success: false, message: 'Không tìm thấy CV.' });
      selectedCV = cv;

      contentToAnalyze = `
Họ tên: ${cv.personalInfo?.fullName || ''}
Email: ${cv.personalInfo?.email || ''}
Mục tiêu: ${cv.careerObjective || ''}
Kỹ năng: ${(cv.skills || []).join(', ')}
Kinh nghiệm: ${(cv.experiences || []).map((e) => `${e.position} tại ${e.company}: ${e.description}`).join('\n')}
Dự án: ${(cv.projects || []).map((p) => `${p.name}: ${p.description}`).join('\n')}
Học vấn: ${(cv.education || []).map((e) => `${e.degree} ${e.major} - ${e.school}`).join('\n')}
      `;
    }

    if (!contentToAnalyze) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung CV hoặc ID CV.' });
    }

    const students = readJSON('students');
    const student = students.find((s) => s.userId === req.user.id);

    // Reuse only analyses made by the current Gemini model for this CV revision.
    if (student && selectedCV) {
      const cvUpdatedAt = new Date(selectedCV.updatedAt || selectedCV.createdAt || 0).getTime();
      const recentAnalysis = readJSON('cvAnalysis')
        .filter((record) => record.studentId === student.id && record.cvId === cvId && record.analysis)
        .filter((record) => record.analysis._provider === 'gemini' && record.analysis._model === GEMINI_MODEL)
        .filter((record) => new Date(record.createdAt || 0).getTime() >= cvUpdatedAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (recentAnalysis) {
        const { _provider, _model, ...analysis } = recentAnalysis.analysis;
        return res.json({
          success: true,
          data: analysis,
          cached: true,
          note: 'Đang hiển thị bản phân tích gần nhất của CV này. Hãy cập nhật CV nếu bạn muốn AI phân tích lại.',
        });
      }
    }

    const data = requireAIData(await analyzeCV(contentToAnalyze));

    if (student) {
      insert('cvAnalysis', {
        id: uuidv4(),
        studentId: student.id,
        cvId: cvId || null,
        analysis: { ...data, _provider: 'gemini', _model: GEMINI_MODEL },
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('AnalyzeCV error:', error);
    if (sendGeminiError(res, error)) return;
    res.status(500).json({ success: false, message: 'Lỗi khi phân tích CV.' });
  }
};

/**
 * @desc    Gợi ý cải thiện CV
 * @route   POST /api/ai/improve-cv
 * @access  Private (Student)
 */
const improveCVController = async (req, res) => {
  try {
    const { cvId, jobDescription } = req.body;
    const cv = findById('cvs', cvId);
    if (!cv) return res.status(404).json({ success: false, message: 'Không tìm thấy CV.' });

    const cvContent = `
Kỹ năng: ${(cv.skills || []).join(', ')}
Kinh nghiệm: ${(cv.experiences || []).map((e) => `${e.position}: ${e.description}`).join('\n')}
Dự án: ${(cv.projects || []).map((p) => `${p.name}: ${p.description}`).join('\n')}
    `;

    const data = requireAIData(await improveCV(cvContent, jobDescription));
    res.json({ success: true, data });
  } catch (error) {
    console.error('ImproveCV error:', error);
    if (sendGeminiError(res, error)) return;
    res.status(500).json({ success: false, message: 'Lỗi khi gợi ý cải thiện CV.' });
  }
};

module.exports = { generateCV, analyzeCVController, improveCVController };
