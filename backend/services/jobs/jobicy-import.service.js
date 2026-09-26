const { v4: uuidv4 } = require('uuid');
const {
  readJSON, persistJobImport, claimJobSync, finishJobSync,
} = require('../../config/database');

const JOBICY_API_URL = 'https://jobicy.com/api/v2/remote-jobs';
const MIN_IMPORT_INTERVAL_MS = 60 * 60 * 1000;

const MOCK_JOBS = [
  {
    id: 'mock-jobicy-frontend', jobSlug: 'mock-frontend-engineer',
    url: 'https://jobicy.com/jobs/mock-frontend-engineer/',
    jobTitle: 'Frontend Engineer (Mock)', companyName: 'Mock Remote Labs',
    jobGeo: 'Worldwide', jobLevel: 'junior', jobType: 'full-time',
    jobTags: ['JavaScript', 'React'],
    jobDescription: '<p>Build accessible remote interfaces with React.</p>',
    pubDate: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'mock-jobicy-data', jobSlug: 'mock-data-engineer',
    url: 'https://jobicy.com/jobs/mock-data-engineer/',
    jobTitle: 'Data Engineer (Mock)', companyName: 'Mock Remote Labs',
    jobGeo: 'Europe / Remote', jobLevel: 'mid', jobType: 'contract',
    jobTags: ['Python', 'SQL'],
    jobDescription: '<p>Design reliable data pipelines for remote teams.</p>',
    pubDate: '2026-09-02T00:00:00.000Z',
  },
];

const SKILL_PATTERNS = [
  ['JavaScript', /\bjavascript\b|\bnode\.?(?:js)?\b/i],
  ['TypeScript', /\btypescript\b/i],
  ['React', /\breact(?:js)?\b/i],
  ['Vue.js', /\bvue(?:\.js)?\b/i],
  ['Angular', /\bangular\b/i],
  ['HTML/CSS', /\bhtml\b|\bcss\b|\btailwind\b/i],
  ['Python', /\bpython\b/i],
  ['Java', /\bjava\b/i],
  ['PHP', /\bphp\b|\blaravel\b/i],
  ['C#/.NET', /\bc#\b|\.net\b/i],
  ['SQL', /\bsql\b|\bmysql\b|\bpostgres(?:ql)?\b/i],
  ['MongoDB', /\bmongodb\b/i],
  ['Docker', /\bdocker\b/i],
  ['Git', /\bgit(?:hub|lab)?\b/i],
  ['AWS', /\baws\b|amazon web services/i],
  ['Figma', /\bfigma\b/i],
];

const decodeHtml = (value = '') => String(value)
  .replace(/<\s*br\s*\/?\s*>/gi, '\n')
  .replace(/<\/?p[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\n\s*\n\s*\n+/g, '\n\n')
  .replace(/[ \t]{2,}/g, ' ')
  .trim();

const normalizeExperience = (value = '') => {
  const text = String(value).toLowerCase();
  if (/intern|internship|student/.test(text)) return 'Intern';
  if (/fresher|entry|graduate/.test(text)) return 'Fresher';
  if (/junior/.test(text)) return 'Junior';
  if (/senior|lead|manager/.test(text)) return 'Senior';
  if (/mid|middle/.test(text)) return 'Middle';
  return 'Không yêu cầu';
};

const normalizeEmploymentType = (value) => {
  const text = Array.isArray(value) ? value.join(' / ') : String(value || '');
  if (/full.?time/i.test(text)) return 'Full-time';
  if (/part.?time/i.test(text)) return 'Part-time';
  if (/contract/i.test(text)) return 'Contract';
  if (/intern/i.test(text)) return 'Internship';
  return text || 'Remote';
};

const extractSkills = (...values) => {
  const text = values.filter(Boolean).join(' ');
  const taggedSkills = values
    .filter(Array.isArray)
    .flat()
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
  const detected = SKILL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return [...new Set([...taggedSkills, ...detected])].slice(0, 12);
};

const buildCompany = (job) => ({
  id: uuidv4(),
  name: String(job.companyName || job.company || 'Nhà tuyển dụng Jobicy').trim(),
  logo: job.companyLogo || '',
  description: 'Nhà tuyển dụng được đồng bộ từ Jobicy Public Jobs API.',
  address: job.jobGeo || job.jobLocation || 'Remote',
  website: job.companyUrl || 'https://jobicy.com',
  email: '',
  industry: job.jobIndustry || 'Remote work',
  size: '',
  createdAt: new Date().toISOString(),
});

const findOrCreateCompany = (externalJob, newCompanies) => {
  const companyName = String(externalJob.companyName || externalJob.company || 'Nhà tuyển dụng Jobicy').trim();
  const normalizedName = companyName.toLowerCase();
  const existing = [...readJSON('companies'), ...newCompanies].find((company) => String(company.name || '').trim().toLowerCase() === normalizedName);
  if (existing) return existing;

  const company = buildCompany(externalJob);
  newCompanies.push(company);
  return company;
};

const toIsoDate = (value) => {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizeJob = (externalJob, companyId) => {
  const externalId = String(externalJob.id || externalJob.jobSlug || externalJob.url || '').trim();
  const sourceUrl = String(externalJob.url || externalJob.jobUrl || '').trim();
  const description = decodeHtml(externalJob.jobDescription || externalJob.description || externalJob.jobExcerpt || 'Chưa có mô tả chi tiết từ nguồn.');
  const title = decodeHtml(externalJob.jobTitle || externalJob.title || 'Vị trí tuyển dụng');
  const tags = externalJob.jobTags || externalJob.tags || [];

  return {
    externalId,
    sourceUrl,
    job: {
      companyId,
      title,
      description,
      location: String(externalJob.jobGeo || externalJob.jobLocation || externalJob.location || 'Remote').trim(),
      salaryMin: 0,
      salaryMax: 0,
      experience: normalizeExperience(externalJob.jobLevel || externalJob.experience),
      employmentType: normalizeEmploymentType(externalJob.jobType || externalJob.type),
      skills: extractSkills(title, description, tags),
      education: '',
      benefits: [],
      deadline: null,
      status: 'active',
      source: 'Jobicy',
      sourceUrl,
      externalId,
      lastSyncedAt: new Date().toISOString(),
      createdAt: toIsoDate(externalJob.pubDate || externalJob.createdAt),
      updatedAt: new Date().toISOString(),
    },
  };
};

const importJobicyJobs = async ({ count = 20 } = {}) => {
  const safeCount = Math.max(1, Math.min(Number.parseInt(count, 10) || 20, 50));
  const claim = await claimJobSync('Jobicy', MIN_IMPORT_INTERVAL_MS);
  if (!claim.allowed) {
    const error = new Error(`Vui lòng chờ ${Math.ceil(claim.retryAfterSeconds / 60)} phút trước khi đồng bộ lại Jobicy.`);
    error.code = 'IMPORT_RATE_LIMIT';
    error.retryAfterSeconds = claim.retryAfterSeconds;
    throw error;
  }

  try {
    let externalJobs;
    if (String(process.env.JOBICY_MOCK).trim().toLowerCase() === 'true') {
      externalJobs = MOCK_JOBS.slice(0, safeCount);
    } else {
      let response;
      try {
        response = await fetch(`${JOBICY_API_URL}?count=${safeCount}&industry=engineering`);
      } catch (_) {
        const error = new Error('Không thể kết nối Jobicy Public API.');
        error.code = 'JOB_SOURCE_UNAVAILABLE';
        throw error;
      }
      if (!response.ok) {
        const error = new Error(`Jobicy Public API trả về mã ${response.status}.`);
        error.code = 'JOB_SOURCE_UNAVAILABLE';
        throw error;
      }
      const payload = await response.json();
      externalJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    }

    const existingJobs = readJSON('jobs');
    const newCompanies = [];
    const jobs = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    for (const externalJob of externalJobs) {
      const company = findOrCreateCompany(externalJob, newCompanies);
      const { externalId, sourceUrl, job } = normalizeJob(externalJob, company.id);
      if (!externalId || !sourceUrl) { skipped += 1; continue; }
      const existing = existingJobs.find((item) =>
        (item.source === 'Jobicy' && item.externalId === externalId) || item.sourceUrl === sourceUrl
      );
      jobs.push({ id: existing?.id || uuidv4(), ...job });
      if (existing) updated += 1;
      else inserted += 1;
    }

    await persistJobImport({ companies: newCompanies, jobs });
    const summary = {
      source: 'Jobicy', importedAt: new Date().toISOString(), received: externalJobs.length, inserted, updated, skipped,
    };
    await finishJobSync('Jobicy', { success: true, summary });
    return summary;
  } catch (error) {
    await finishJobSync('Jobicy', { success: false, error: error.code });
    throw error;
  }
};

module.exports = { importJobicyJobs };
