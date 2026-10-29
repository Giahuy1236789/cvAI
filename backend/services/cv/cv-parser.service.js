const mammoth = require('mammoth');
const { parseCVDocument } = require('../ai/gemini.service');

/**
 * Trích xuất văn bản thô từ file tải lên (PDF, DOCX, TXT, JSON...)
 */
const extractTextFromFile = async (file) => {
  if (!file || !file.buffer) return '';

  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  const mime = (file.mimetype || '').toLowerCase();

  // 1. PDF
  if (ext === 'pdf' || mime.includes('pdf')) {
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      await parser.destroy().catch(() => {});
      if (result) {
        if (typeof result === 'string') return result;
        if (result.text) return result.text;
        if (Array.isArray(result.pages)) {
          return result.pages.map((p) => p.text || '').join('\n');
        }
      }
    } catch (pdfErr) {
      console.warn('PDFParse warning:', pdfErr.message);
    }
  }

  // 2. Word (DOCX)
  if (ext === 'docx' || mime.includes('wordprocessingml') || mime.includes('docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value || '';
    } catch (docxErr) {
      console.warn('Mammoth docx warning:', docxErr.message);
    }
  }

  // 3. Text, JSON, Markdown
  if (['txt', 'json', 'md', 'csv'].includes(ext) || mime.includes('text') || mime.includes('json')) {
    try {
      return file.buffer.toString('utf-8');
    } catch (txtErr) {
      console.warn('Text buffer decode warning:', txtErr.message);
    }
  }

  return '';
};

/**
 * Phân tích quy tắc dự phòng khi AI không khả dụng hoặc rate limit
 */
const heuristicFallbackParse = (text, originalName = '') => {
  const content = String(text || '').trim();
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Email regex
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Phone regex
  const phoneMatch = content.match(/(?:(?:\+84|0)[1-9][0-9]{8,9})\b/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Website / Portfolio / GitHub
  const webMatch = content.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com|[a-zA-Z0-9-]+\.(?:io|com|dev|me))\/[^\s,]+/i);
  const website = webMatch ? webMatch[0] : '';

  // Full Name detection (first 1-3 lines usually)
  let fullName = '';
  let jobTitle = '';
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      if (!fullName && line.length > 2 && line.length < 40 && !line.includes('@') && !line.includes('http') && !/\d{4}/.test(line)) {
        fullName = line;
      } else if (fullName && !jobTitle && line.length < 50 && !line.includes('@') && !line.includes('http')) {
        jobTitle = line;
        break;
      }
    }
  }

  // Common Skills Scanner
  const COMMON_SKILLS = [
    'JavaScript', 'TypeScript', 'React', 'ReactJS', 'Node.js', 'NodeJS', 'Express',
    'HTML', 'CSS', 'Tailwind', 'TailwindCSS', 'Bootstrap', 'Vue', 'VueJS', 'Angular',
    'Python', 'Django', 'Flask', 'Java', 'Spring', 'Spring Boot', 'PHP', 'Laravel',
    'C#', '.NET', 'C++', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
    'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Linux', 'RESTful API', 'GraphQL',
    'Figma', 'UI/UX', 'Agile', 'Scrum', 'OOP', 'Next.js'
  ];
  const detectedSkills = COMMON_SKILLS.filter((sk) => {
    const regex = new RegExp(`\\b${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(content);
  });

  const baseTitle = originalName.replace(/\.[^/.]+$/, '').trim();

  return {
    title: fullName ? `CV - ${fullName} - ${jobTitle || 'Developer'}` : (baseTitle || 'CV của tôi'),
    fullName: fullName || 'Ứng viên',
    jobTitle: jobTitle || 'Chuyên viên phần mềm',
    email,
    phone,
    address: '',
    dob: '',
    website,
    careerObjective: lines.slice(2, 6).join(' ').slice(0, 300) || 'Mong muốn tìm kiếm cơ hội việc làm phù hợp để phát huy thế mạnh và kỹ năng.',
    skills: detectedSkills.length > 0 ? detectedSkills : ['Giao tiếp', 'Làm việc nhóm', 'Giải quyết vấn đề'],
    education: [],
    experiences: [],
    projects: [],
    certificates: [],
    languages: ['Tiếng Việt'],
    hobbies: []
  };
};

/**
 * Trích xuất và chuẩn hóa CV từ file tải lên
 */
const parseCVFile = async (file) => {
  if (!file) throw new Error('Không có file tải lên.');

  const textContent = await extractTextFromFile(file);
  const mimeType = file.mimetype || 'application/octet-stream';
  const originalName = file.originalname || 'CV';

  let parsed = null;
  let usedAI = false;

  // Thử dùng Gemini AI nếu có nội dung hoặc file
  try {
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType.includes('pdf') || originalName.toLowerCase().endsWith('.pdf');

    const canSendInline = isImage || isPdf;
    const hasText = Boolean(textContent && textContent.trim().length > 20);

    if (hasText || canSendInline) {
      const aiResult = await parseCVDocument({
        textContent: hasText ? textContent : '',
        fileData: canSendInline ? file.buffer : null,
        mimeType: canSendInline ? mimeType : null,
      });

      if (aiResult?.success && aiResult.data) {
        parsed = aiResult.data;
        usedAI = true;
      }
    }
  } catch (aiErr) {
    console.warn('[CVParser] Gemini AI parse warning:', aiErr.message);
  }

  // Nếu AI chưa ra kết quả, dùng heuristic parse
  const fallback = heuristicFallbackParse(textContent, originalName);
  if (!parsed) {
    parsed = fallback;
  } else {
    // Kết hợp thông tin nếu AI thiếu một vài trường cơ bản
    if (!parsed.email && fallback.email) parsed.email = fallback.email;
    if (!parsed.phone && fallback.phone) parsed.phone = fallback.phone;
    if (!parsed.fullName && fallback.fullName) parsed.fullName = fallback.fullName;
    if ((!parsed.skills || parsed.skills.length === 0) && fallback.skills.length > 0) {
      parsed.skills = fallback.skills;
    }
  }

  // Định dạng chuẩn xác theo form CV Editor
  const formattedCV = {
    title: parsed.title || `CV - ${parsed.fullName || 'Ứng viên'}`,
    template: 'topcv',
    personalInfo: {
      fullName: parsed.fullName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      address: parsed.address || '',
      title: parsed.jobTitle || 'Chuyên viên',
      avatar: '',
      dob: parsed.dob || '',
      website: parsed.website || ''
    },
    careerObjective: parsed.careerObjective || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    education: Array.isArray(parsed.education) ? parsed.education.map((e) => ({
      school: e.school || '',
      major: e.major || '',
      startYear: String(e.startYear || ''),
      endYear: String(e.endYear || ''),
      degree: e.degree || ''
    })) : [],
    experiences: Array.isArray(parsed.experiences) ? parsed.experiences.map((exp) => ({
      company: exp.company || '',
      position: exp.position || '',
      startDate: String(exp.startDate || ''),
      endDate: String(exp.endDate || ''),
      isCurrent: Boolean(exp.isCurrent),
      description: exp.description || ''
    })) : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects.map((p) => ({
      name: p.name || '',
      role: p.role || '',
      startDate: String(p.startDate || ''),
      endDate: String(p.endDate || ''),
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      description: p.description || ''
    })) : [],
    certificates: Array.isArray(parsed.certificates) ? parsed.certificates.map((c) => ({
      name: typeof c === 'string' ? c : (c.name || ''),
      time: typeof c === 'string' ? '' : (c.time || '')
    })) : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    hobbies: Array.isArray(parsed.hobbies) ? parsed.hobbies : [],
    usedAI
  };

  return formattedCV;
};

module.exports = {
  extractTextFromFile,
  heuristicFallbackParse,
  parseCVFile
};
