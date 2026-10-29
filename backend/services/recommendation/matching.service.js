/**
 * Recommendation Service - Tính toán mức độ phù hợp giữa sinh viên và việc làm
 *
 * Công thức:
 * Final Score = Skill Match × 50% + Location Match × 20% + Experience Match × 15%
 *             + Career Interest × 10% + Salary Match × 5% (+ VN Priority Bonus)
 */

/**
 * Chuẩn hóa chuỗi để so sánh (lowercase, trim)
 */
const normalize = (str) => (str || '').toLowerCase().trim();

/**
 * Danh sách từ khóa nhận diện các địa điểm tại Việt Nam
 */
const VN_LOCATION_KEYWORDS = [
  'hà nội', 'ha noi', 'hanoi',
  'hồ chí minh', 'ho chi minh', 'hcm', 'tp.hcm', 'tp. hồ chí minh', 'sài gòn', 'saigon',
  'đà nẵng', 'da nang',
  'cần thơ', 'can tho',
  'hải phòng', 'hai phong',
  'bình dương', 'binh duong',
  'đồng nai', 'dong nai',
  'huế', 'hue',
  'quảng nam', 'quang nam',
  'bà rịa', 'vũng tàu',
  'nha trang', 'khánh hòa',
  'việt nam', 'vietnam', 'vn',
  'toàn quốc',
];

/**
 * Kiểm tra xem công việc hoặc địa điểm có ở Việt Nam hay không
 */
const isVietnamLocation = (location) => {
  if (!location) return false;
  const loc = normalize(location);
  return VN_LOCATION_KEYWORDS.some((kw) => loc.includes(kw));
};

/**
 * Tính Skill Match Score (0-100)
 * Dựa trên % kỹ năng của sinh viên match với kỹ năng yêu cầu
 */
const calcSkillMatch = (studentSkills, jobSkills) => {
  if (!jobSkills || jobSkills.length === 0) return 40;
  if (!studentSkills || studentSkills.length === 0) return 0;

  const studentSkillsNorm = studentSkills.map(normalize);
  const jobSkillsNorm = jobSkills.map(normalize);

  const matched = jobSkillsNorm.filter((js) =>
    studentSkillsNorm.some((ss) => ss.includes(js) || js.includes(ss))
  );

  return Math.round((matched.length / jobSkillsNorm.length) * 100);
};

/**
 * Tính Experience Match Score (0-100)
 */
const calcExperienceMatch = (studentExperiences, jobExperience) => {
  const expMap = {
    'intern': 0,
    'fresher': 1,
    'junior': 2,
    'middle': 3,
    'senior': 4,
  };

  const jobLevel = expMap[normalize(jobExperience)] ?? 1;

  // Số năm kinh nghiệm thực tế của sinh viên
  let totalMonths = 0;
  (studentExperiences || []).forEach((exp) => {
    if (exp.startDate) {
      const start = new Date(exp.startDate);
      const end = exp.isCurrent ? new Date() : new Date(exp.endDate || new Date());
      const months = Math.max(0, (end - start) / (1000 * 60 * 60 * 24 * 30));
      totalMonths += months;
    }
  });

  const studentYears = totalMonths / 12;

  // Tính level của sinh viên dựa trên kinh nghiệm
  let studentLevel;
  if (studentYears === 0) studentLevel = 0;
  else if (studentYears < 0.5) studentLevel = 0; // intern
  else if (studentYears < 1.5) studentLevel = 1; // fresher
  else if (studentYears < 3) studentLevel = 2;   // junior
  else if (studentYears < 5) studentLevel = 3;   // middle
  else studentLevel = 4;                          // senior

  // Tính điểm: bằng level = 100, mỗi bậc chênh = -20
  const diff = Math.abs(studentLevel - jobLevel);
  return Math.max(0, 100 - diff * 25);
};

/**
 * Tính Location Match Score (0-100) - Ưu tiên Việt Nam
 */
const calcLocationMatch = (studentLocation, jobLocation) => {
  if (!jobLocation) return 40;

  const sl = normalize(studentLocation);
  const jl = normalize(jobLocation);

  // Khớp chính xác hoặc chứa tên địa điểm mong muốn (ví dụ: "Đà Nẵng", "Hà Nội")
  if (sl && (sl === jl || sl.includes(jl) || jl.includes(sl))) return 100;

  const jobIsVN = isVietnamLocation(jobLocation);
  const studentIsVN = !sl || isVietnamLocation(studentLocation);

  if (studentIsVN) {
    // Cùng ở Việt Nam (khác tỉnh/thành)
    if (jobIsVN) return 90;
    // Công việc Remote / Toàn quốc / Linh hoạt
    if (jl.includes('remote') || jl.includes('toàn quốc') || jl.includes('anywhere') || jl.includes('worldwide')) {
      return 75;
    }
    // Công việc cố định tại nước ngoài (Ba Lan, Mỹ, Anh...)
    return 10;
  }

  // Nếu ứng viên chọn đích danh nước ngoài
  if (jl.includes('remote') || jl.includes('anywhere') || jl.includes('worldwide')) return 75;
  return 20;
};

/**
 * Tính Salary Match Score (0-100)
 */
const calcSalaryMatch = (studentSalary, jobSalaryMin, jobSalaryMax) => {
  if (!studentSalary) return 50;

  let stuMin, stuMax;
  if (typeof studentSalary === 'string' && studentSalary.includes('-')) {
    [stuMin, stuMax] = studentSalary.split('-').map((s) => parseInt(s.trim()));
  } else {
    stuMin = stuMax = parseInt(studentSalary);
  }

  if (!stuMin || !stuMax) return 50;

  // Kiểm tra overlap
  const overlapMin = Math.max(stuMin, jobSalaryMin || 0);
  const overlapMax = Math.min(stuMax, jobSalaryMax || Infinity);

  if (overlapMin <= overlapMax) {
    // Có overlap
    const overlapRange = overlapMax - overlapMin;
    const stuRange = stuMax - stuMin;
    const jobRange = (jobSalaryMax || jobSalaryMin) - (jobSalaryMin || 0);
    const totalRange = Math.max(stuRange, jobRange, 1);
    return Math.min(100, Math.round(50 + (overlapRange / totalRange) * 50));
  }

  // Không có overlap - job trả thấp hơn mong muốn
  if (jobSalaryMax && jobSalaryMax < stuMin) {
    const gap = stuMin - jobSalaryMax;
    return Math.max(0, Math.round(50 - (gap / stuMin) * 100));
  }

  return 30;
};

/**
 * Tính Career Interest Score (0-100)
 * Dựa trên vị trí mong muốn của sinh viên vs job title
 */
const calcCareerInterest = (desiredPositions, jobTitle) => {
  if (!desiredPositions || desiredPositions.length === 0) return 50;
  if (!jobTitle) return 50;

  const jt = normalize(jobTitle);
  const matched = desiredPositions.some((pos) => {
    const p = normalize(pos);
    return jt.includes(p) || p.includes(jt) ||
           // Keyword matching
           jt.split(' ').some((word) => p.includes(word) && word.length > 3);
  });

  return matched ? 100 : 30;
};

/**
 * Tính Final Match Score giữa sinh viên và job
 */
const calculateMatchScore = (student, job) => {
  const skillScore = calcSkillMatch(student.skills, job.skills);
  const expScore = calcExperienceMatch(student.experiences, job.experience);
  const locScore = calcLocationMatch(student.desiredLocation, job.location);
  const salScore = calcSalaryMatch(student.desiredSalary, job.salaryMin, job.salaryMax);
  const interestScore = calcCareerInterest(student.desiredPositions, job.title);

  const isVN = isVietnamLocation(job.location);

  const finalScore = Math.min(100, Math.round(
    skillScore * 0.50 +
    locScore * 0.20 +
    expScore * 0.15 +
    interestScore * 0.10 +
    salScore * 0.05 +
    (isVN ? 5 : 0)
  ));

  // Tính matched/missing skills
  const studentSkillsNorm = (student.skills || []).map(normalize);
  const jobSkillsNorm = (job.skills || []).map(normalize);

  const matchedSkills = (job.skills || []).filter((js) =>
    studentSkillsNorm.some((ss) => ss.includes(normalize(js)) || normalize(js).includes(ss))
  );

  const missingSkills = (job.skills || []).filter(
    (js) => !studentSkillsNorm.some((ss) => ss.includes(normalize(js)) || normalize(js).includes(ss))
  );

  // Lý do đề xuất
  const reasons = [];
  if (matchedSkills.length > 0) reasons.push(`Có ${matchedSkills.length}/${job.skills?.length || 0} kỹ năng phù hợp`);
  if (isVN) reasons.push('Việc làm tại Việt Nam');
  if (locScore === 100) reasons.push('Địa điểm làm việc phù hợp');
  if (interestScore === 100) reasons.push('Đúng vị trí công việc mong muốn');
  if (salScore >= 80) reasons.push('Mức lương phù hợp với kỳ vọng');

  return {
    finalScore,
    breakdown: {
      skillScore,
      experienceScore: expScore,
      locationScore: locScore,
      salaryScore: salScore,
      interestScore,
    },
    matchedSkills,
    missingSkills,
    reasons,
    locationMatch: locScore >= 85,
    salaryMatch: salScore >= 70,
    isVN,
  };
};

module.exports = { calculateMatchScore, isVietnamLocation, VN_LOCATION_KEYWORDS };
