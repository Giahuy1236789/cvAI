const { v4: uuidv4 } = require('uuid');
const { persistJobImport, finishJobSync } = require('../../config/database');

const COMPANIES = [
  {
    name: 'Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Viettel.svg',
    description: 'Tập đoàn Viễn thông và Công nghệ Thông tin lớn nhất Việt Nam.',
    address: 'Lô D26, Khu đô thị mới Cầu Giấy, Phường Yên Hòa, Quận Cầu Giấy, Hà Nội',
    website: 'https://viettel.com.vn',
    industry: 'Viễn thông, Công nghệ thông tin',
    size: '10000+',
  },
  {
    name: 'Công ty Cổ phần FPT (FPT Corporation)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/FPT_logo_2010.svg/1200px-FPT_logo_2010.svg.png',
    description: 'Tập đoàn công nghệ thông tin lớn nhất Việt Nam với nhiều mảng kinh doanh cốt lõi.',
    address: 'Số 10 Phạm Văn Bạch, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    website: 'https://fpt.com.vn',
    industry: 'Công nghệ thông tin',
    size: '10000+',
  },
  {
    name: 'Công ty Cổ phần VNG (VNG Corporation)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/VNG_Logo.png/1200px-VNG_Logo.png',
    description: 'Kỳ lân công nghệ đầu tiên của Việt Nam, chuyên về trò chơi trực tuyến, nền tảng kết nối, thanh toán điện tử.',
    address: 'Z06 Đường số 13, Phường Tân Thuận Đông, Quận 7, TP. HCM',
    website: 'https://vng.com.vn',
    industry: 'Công nghệ, Game, Internet',
    size: '1000-5000',
  },
  {
    name: 'Công ty Cổ phần Dịch vụ Di động Trực tuyến (MoMo)',
    logo: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
    description: 'Siêu ứng dụng thanh toán số 1 tại Việt Nam, kỳ lân công nghệ Fintech.',
    address: 'Tòa nhà Phú Mỹ Hưng, Số 8 Hoàng Văn Thái, Quận 7, TP. HCM',
    website: 'https://momo.vn',
    industry: 'Fintech',
    size: '1000-5000',
  },
  {
    name: 'Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/VNPT_Logo.svg/1200px-VNPT_Logo.svg.png',
    description: 'Một trong những tập đoàn viễn thông và công nghệ thông tin lớn nhất Việt Nam.',
    address: 'Tòa nhà VNPT, số 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội',
    website: 'https://vnpt.com.vn',
    industry: 'Viễn thông',
    size: '10000+',
  },
  {
    name: 'Tiki',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Logo_Tiki_2023.png/1200px-Logo_Tiki_2023.png',
    description: 'Nền tảng thương mại điện tử hàng đầu tại Việt Nam.',
    address: 'Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. HCM',
    website: 'https://tiki.vn',
    industry: 'Thương mại điện tử',
    size: '1000-5000',
  }
];

const JOB_TEMPLATES = [
  {
    title: 'Kỹ sư Phần mềm (Java/Spring Boot)',
    description: 'Tham gia phát triển các hệ thống lõi quy mô lớn của công ty. Yêu cầu thành thạo Java, Spring Boot, Microservices, và cơ sở dữ liệu quan hệ (MySQL/PostgreSQL). Có kinh nghiệm làm việc với hệ thống high-traffic là một lợi thế.',
    salaryMin: 20000000,
    salaryMax: 40000000,
    skills: ['Java', 'Spring Boot', 'MySQL', 'Microservices', 'SQL'],
    experience: 'Middle',
  },
  {
    title: 'Chuyên viên Phát triển Frontend (ReactJS)',
    description: 'Xây dựng giao diện người dùng tương tác cao cho siêu ứng dụng. Yêu cầu nắm vững JavaScript/TypeScript, ReactJS, Redux, và các kỹ năng tối ưu hiệu năng Frontend. Chấp nhận ứng viên fresher có nền tảng tốt.',
    salaryMin: 15000000,
    salaryMax: 25000000,
    skills: ['React', 'JavaScript', 'TypeScript', 'HTML/CSS'],
    experience: 'Junior',
  },
  {
    title: 'Data Engineer / Kỹ sư Dữ liệu',
    description: 'Thiết kế và xây dựng Data Warehouse/Data Lake. Xử lý khối lượng dữ liệu khổng lồ hàng ngày. Yêu cầu thành thạo Python, SQL, Spark, Hadoop và các công cụ phân tích dữ liệu.',
    salaryMin: 25000000,
    salaryMax: 50000000,
    skills: ['Python', 'SQL', 'Spark', 'Hadoop', 'AWS'],
    experience: 'Senior',
  },
  {
    title: 'Chuyên gia Trí tuệ Nhân tạo (AI/NLP)',
    description: 'Nghiên cứu và ứng dụng các mô hình ngôn ngữ lớn (LLM), xử lý ngôn ngữ tự nhiên (NLP) vào sản phẩm thực tế. Yêu cầu bằng Thạc sĩ/Tiến sĩ hoặc kinh nghiệm tương đương, thành thạo Python, PyTorch/TensorFlow.',
    salaryMin: 30000000,
    salaryMax: 70000000,
    skills: ['Python', 'AI', 'NLP', 'PyTorch', 'TensorFlow'],
    experience: 'Senior',
  },
  {
    title: 'Business Analyst (BA) - Khối Tài chính',
    description: 'Phân tích yêu cầu nghiệp vụ, phối hợp với đội dev để xây dựng tính năng cho sản phẩm tài chính. Yêu cầu có kiến thức về UI/UX cơ bản, biết sử dụng Figma, kỹ năng giao tiếp tốt.',
    salaryMin: 18000000,
    salaryMax: 30000000,
    skills: ['Business Analysis', 'Figma', 'SQL', 'Giao tiếp'],
    experience: 'Middle',
  },
  {
    title: 'Kỹ sư DevOps',
    description: 'Vận hành, tối ưu hóa hạ tầng server và quy trình CI/CD. Quản lý hệ thống với hàng ngàn server. Yêu cầu kinh nghiệm với Docker, Kubernetes, Jenkins, Linux, và AWS/GCP.',
    salaryMin: 25000000,
    salaryMax: 50000000,
    skills: ['Docker', 'Kubernetes', 'Jenkins', 'Linux', 'AWS'],
    experience: 'Middle',
  },
  {
    title: 'Kỹ sư Bảo mật Thông tin (Security Engineer)',
    description: 'Đánh giá an toàn thông tin, pentest hệ thống, ứng phó sự cố bảo mật. Hiểu biết sâu về OWASP, có các chứng chỉ như CEH, CISSP là lợi thế lớn.',
    salaryMin: 30000000,
    salaryMax: 60000000,
    skills: ['Security', 'Pentest', 'CEH', 'Network', 'OWASP'],
    experience: 'Middle',
  },
  {
    title: 'Thực tập sinh Lập trình (Node.js)',
    description: 'Được đào tạo và tham gia dự án thực tế. Không yêu cầu kinh nghiệm, chỉ cần nắm vững kiến thức cơ bản về lập trình web, Javascript và tư duy logic tốt.',
    salaryMin: 4000000,
    salaryMax: 8000000,
    skills: ['JavaScript', 'Node.js', 'HTML/CSS', 'Git'],
    experience: 'Intern',
  }
];

const importMockVnJobs = async () => {
  try {
    const dbCompanies = [];
    const dbJobs = [];
    
    // Create companies
    COMPANIES.forEach((compData) => {
      const company = {
        id: uuidv4(),
        name: compData.name,
        logo: compData.logo,
        description: compData.description,
        address: compData.address,
        website: compData.website,
        email: '',
        industry: compData.industry,
        size: compData.size,
        createdAt: new Date().toISOString(),
      };
      dbCompanies.push(company);
      
      // Generate 2-4 jobs for each company
      const numJobs = Math.floor(Math.random() * 3) + 2; 
      
      // Randomly pick templates
      const shuffledTemplates = JOB_TEMPLATES.sort(() => 0.5 - Math.random()).slice(0, numJobs);
      
      shuffledTemplates.forEach((template, index) => {
        const jobId = uuidv4();
        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(now.getDate() + 30); // 30 days deadline
        
        dbJobs.push({
          id: jobId,
          companyId: company.id,
          title: template.title,
          description: template.description,
          location: compData.address.includes('TP. HCM') || compData.address.includes('Hồ Chí Minh') ? 'TP. Hồ Chí Minh' : 'Hà Nội',
          salaryMin: template.salaryMin,
          salaryMax: template.salaryMax,
          salaryCurrency: 'VND',
          salaryPeriod: 'Tháng',
          experience: template.experience,
          employmentType: template.experience === 'Intern' ? 'Internship' : 'Full-time',
          skills: template.skills,
          education: template.experience === 'Intern' ? 'Sinh viên' : 'Cử nhân Đại học',
          benefits: ['Thưởng tháng 13', 'Bảo hiểm PVI', 'Review lương 2 lần/năm', 'Môi trường trẻ trung'],
          deadline: deadline.toISOString().slice(0, 19).replace('T', ' '),
          status: 'active',
          source: 'MockVN',
          sourceUrl: 'https://doanai.local/mock-jobs/' + jobId,
          externalId: `mock-vn-${company.id.substring(0,6)}-${index}`,
          lastSyncedAt: now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      });
    });

    await persistJobImport({ companies: dbCompanies, jobs: dbJobs });
    const summary = {
      source: 'MockVN', importedAt: new Date().toISOString(), received: dbJobs.length, inserted: dbJobs.length, updated: 0, skipped: 0,
    };
    await finishJobSync('MockVN', { success: true, summary });
    return summary;
  } catch (error) {
    await finishJobSync('MockVN', { success: false, error: error.code || 'UNKNOWN' });
    throw error;
  }
};

module.exports = { importMockVnJobs };
