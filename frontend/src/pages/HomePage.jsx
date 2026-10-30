import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  ArrowRight, ArrowUpRight, Briefcase, Check, CheckCircle2, 
  MapPin, Search, Sparkles, Target, TrendingUp, Building2, RotateCw,
  ShieldCheck, Zap, Star, Flame, Layout
} from 'lucide-react';
import './home.css';

const salaryLabel = (job) => {
  const min = Number(job.salaryMin) || 0;
  const max = Number(job.salaryMax) || 0;
  const number = (value) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000);
  if (min && max) return number(min) + ' – ' + number(max) + ' triệu';
  if (min) return 'Từ ' + number(min) + ' triệu';
  if (max) return 'Đến ' + number(max) + ' triệu';
  return 'Thỏa thuận';
};

// 3D Glass Hero Showcase with live floating interactive badges
function HeroVisualShowcase() {
  return (
    <div className="hero-visual-container">
      {/* Ambient background glow orbs */}
      <div className="hero-glow-orb hero-glow-1" aria-hidden="true" />
      <div className="hero-glow-orb hero-glow-2" aria-hidden="true" />
      
      {/* Main 3D Showcase Card */}
      <div className="hero-showcase-card">
        <div className="hero-image-wrapper">
          <img 
            src="/images/hero-ai-hub.jpg" 
            alt="AICareer 3D AI Platform Hub" 
            className="hero-main-img" 
          />
          <div className="hero-image-overlay" />
        </div>

        {/* Floating Badge 1: ATS Score */}
        <div className="floating-badge badge-ats">
          <div className="badge-ats-circle">
            <span className="badge-ats-score">99</span>
            <span className="badge-ats-unit">%</span>
          </div>
          <div className="badge-ats-info">
            <strong>ATS Score Chuẩn Harvard</strong>
            <p><span className="pulse-dot" /> Tối ưu từ khóa 100%</p>
          </div>
        </div>

        {/* Floating Badge 2: AI Job Match */}
        <div className="floating-badge badge-match">
          <div className="badge-match-icon">
            <Sparkles size={20} />
          </div>
          <div className="badge-match-info">
            <strong>Gợi ý việc làm AI: 98%</strong>
            <p>15+ Lời mời phỏng vấn tuần này</p>
          </div>
          <div className="badge-match-arrow">
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Floating Chip: Tech Skills */}
        <div className="floating-skills-chip">
          <span className="skill-dot" />
          <span>React 19</span>
          <span className="skill-sep">·</span>
          <span>AI / LLM</span>
          <span className="skill-sep">·</span>
          <span>TypeScript</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, isStudent, isAdmin, isRecruiter } = useAuth();
  const navigate = useNavigate();
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setJobsError(false);
      try {
        const [jobsResult, companiesResult] = await Promise.allSettled([
          api.get('/jobs?limit=4'), 
          api.get('/companies')
        ]);
        if (!active) return;
        if (jobsResult.status === 'fulfilled' && jobsResult.value.data.success) {
          setFeaturedJobs((jobsResult.value.data.data.jobs || []).slice(0, 4));
        } else {
          setJobsError(true);
        }
        if (companiesResult.status === 'fulfilled' && companiesResult.value.data.success) {
          setCompanies((companiesResult.value.data.data.companies || []).slice(0, 6));
        }
      } catch {
        if (active) setJobsError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [refresh]);

  const workspacePath = isAdmin ? '/admin/dashboard' : isRecruiter ? '/recruiter/dashboard' : isStudent ? '/cvs' : '/register';
  const primaryLabel = isAdmin || isRecruiter ? 'Vào không gian làm việc' : isStudent ? 'Mở quản lý CV' : 'Tạo CV với AI miễn phí';
  const studentPath = (path) => isStudent ? path : user ? workspacePath : '/register';

  const steps = [
    { 
      icon: Layout, 
      number: '01',
      title: 'Thiết kế CV Chuẩn ATS 2026', 
      description: 'Hơn 12+ mẫu CV xu hướng hiện đại, chuẩn hóa phân tầng thông tin và xuất PDF vector siêu nét vượt qua mọi thuật toán lọc ATS.', 
      link: '/cv-templates', 
      action: 'Khám phá mẫu CV',
      tag: '12+ Mẫu Mới'
    },
    { 
      icon: Sparkles, 
      number: '02',
      title: 'Phân tích & Chấm điểm CV với AI', 
      description: 'Radar phân tích độ tương thích, phát hiện lỗ hổng từ khóa, nhận thang điểm chi tiết và gợi ý cải thiện bullet points chuẩn STAR.', 
      link: studentPath('/cv-analyzer'), 
      action: 'Mở phân tích AI',
      tag: 'AI Deep Scan'
    },
    { 
      icon: Target, 
      number: '03',
      title: 'Gợi ý việc làm thông minh', 
      description: 'Thuật toán kết nối trực tiếp hồ sơ với cơ hội việc làm từ 1,500+ doanh nghiệp hàng đầu, hiển thị tỷ lệ % match chính xác.', 
      link: studentPath('/recommendations'), 
      action: 'Xem việc làm phù hợp',
      tag: 'Matching 99%'
    },
  ];

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (location) params.set('location', location);
    navigate('/jobs' + (params.size ? '?' + params.toString() : ''));
  };

  return (
    <div className="home-page">
      {/* 1. HERO SECTION */}
      <section className="home-hero">
        <div className="site-container hero-layout">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="eyebrow-pulse" />
              <Sparkles size={14} className="eyebrow-icon" />
              <span>NỀN TẢNG AI CAREER THẾ HỆ MỚI 2026</span>
            </div>

            <h1 className="hero-title">
              Kiến Tạo Sự Nghiệp Đột Phá Với <br />
              <span className="hero-gradient-text">CV Chuẩn ATS & AI</span>
            </h1>

            <p className="hero-description">
              Tự động hóa xây dựng hồ sơ chuyên nghiệp theo chuẩn quốc tế Harvard & TopCV. 
              Trí tuệ nhân tạo chấm điểm năng lực, khắc phục từ khóa thiếu sót và kết nối 
              bạn trực tiếp tới những cơ hội việc làm công nghệ hấp dẫn nhất.
            </p>

            <div className="hero-actions">
              <Link to={workspacePath} className="button button-primary hero-btn-main">
                <Sparkles size={18} />
                <span>{primaryLabel}</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/cv-templates" className="button button-secondary hero-btn-secondary">
                <Flame size={17} className="flame-icon" />
                <span>12+ Mẫu CV Xu Hướng 2026</span>
                <ArrowUpRight size={17} />
              </Link>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-item">
                <ShieldCheck size={18} className="trust-icon" />
                <span>Vượt 100% bộ lọc ATS</span>
              </div>
              <div className="trust-item">
                <Zap size={18} className="trust-icon" />
                <span>Gợi ý việc làm tức thì</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} className="trust-icon" />
                <span>Hoàn toàn miễn phí</span>
              </div>
            </div>
          </div>

          <HeroVisualShowcase />
        </div>

        {/* STATS IMPACT BAR */}
        <div className="site-container">
          <div className="stats-impact-bar">
            <div className="stat-card">
              <span className="stat-number">50,000+</span>
              <span className="stat-label">Hồ sơ CV được tối ưu hóa AI</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-number">99.2%</span>
              <span className="stat-label">Tỷ lệ vượt qua vòng lọc ATS</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-number">1,500+</span>
              <span className="stat-label">Doanh nghiệp công nghệ kết nối</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-number">3.5x</span>
              <span className="stat-label">Tốc độ nhận lời mời phỏng vấn</span>
            </div>
          </div>
        </div>

        {/* SEARCH HUB */}
        <div className="site-container">
          <div className="home-search-panel">
            <div className="search-panel-heading">
              <div className="search-panel-icon">
                <Search size={22} />
              </div>
              <div>
                <h2>Tìm kiếm cơ hội việc làm mơ ước của bạn</h2>
                <p>Khám phá hàng ngàn vị trí IT, Marketing, Data và Thiết kế từ các nhà tuyển dụng hàng đầu.</p>
              </div>
            </div>
            <form className="home-search-form" onSubmit={submitSearch}>
              <label className="home-search-field">
                <Search size={19} />
                <span className="sr-only">Vị trí, kỹ năng hoặc công ty</span>
                <input 
                  value={search} 
                  onChange={event => setSearch(event.target.value)} 
                  placeholder="Vị trí công việc, kỹ năng (React, Python, AI...), hoặc công ty..." 
                />
              </label>
              <label className="home-search-location">
                <MapPin size={18} />
                <span className="sr-only">Địa điểm làm việc</span>
                <select value={location} onChange={event => setLocation(event.target.value)}>
                  <option value="">Tất cả địa điểm</option>
                  <option>Hồ Chí Minh</option>
                  <option>Hà Nội</option>
                  <option>Đà Nẵng</option>
                  <option>Remote / Từ xa</option>
                </select>
              </label>
              <button type="submit" className="button button-primary search-submit-btn">
                <span>Tìm việc ngay</span>
                <ArrowRight size={17} />
              </button>
            </form>
            <div className="popular-searches">
              <span className="popular-label"><Flame size={14} /> Từ khóa hot:</span>
              {['Frontend Developer', 'ReactJS', 'Python AI', 'Backend Node.js', 'Thực tập sinh (Intern)', 'Data Analyst'].map(term => (
                <Link key={term} to={'/jobs?search=' + encodeURIComponent(term)} className="popular-tag">
                  {term}
                  <ArrowUpRight size={12} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE-STEP AI JOURNEY */}
      <section id="how-it-works" className="site-container home-section">
        <div id="ai-tools" className="home-section-heading">
          <div>
            <span className="section-kicker">HỆ SINH THÁI AI ĐỒNG HÀNH TOÀN DIỆN</span>
            <h2>Từ một CV đẳng cấp đến lời mời phỏng vấn</h2>
          </div>
          <p>
            Mọi công cụ bạn cần để bứt phá sự nghiệp.<br />
            Đơn giản, thông minh và hoàn toàn tự động.
          </p>
        </div>

        <div className="journey-grid">
          {steps.map(({ icon: Icon, number, title, description, link, action, tag }) => (
            <article className="journey-card" key={title}>
              <div className="journey-card-top">
                <div className="journey-icon-wrap">
                  <Icon size={26} />
                </div>
                <div className="journey-badge-pill">{tag}</div>
                <span className="journey-number">{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={link} className="journey-link">
                <span>{action}</span>
                <ArrowUpRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* 3. AI CAPABILITY SHOWCASE FEATURE SECTION (NEW WOW SECTION) */}
      <section className="site-container home-section ai-feature-spotlight">
        <div className="spotlight-card">
          <div className="spotlight-content">
            <span className="section-kicker">CÔNG NGHỆ CHẤM ĐIỂM ATS ĐỘC QUYỀN</span>
            <h2>Phân Tích Sâu & Chấm Điểm CV Với Trí Tuệ Nhân Tạo</h2>
            <p>
              Không còn lo lắng CV bị loại bởi hệ thống lọc hồ sơ tự động (ATS). 
              Hệ thống AI của AICareer quét toàn bộ nội dung, chấm điểm theo tiêu chuẩn 
              tập đoàn quốc tế và gợi ý chuẩn xác từng cụm từ giúp hồ sơ của bạn nổi bật 
              giữa hàng ngàn ứng viên.
            </p>

            <div className="spotlight-features-list">
              <div className="spotlight-item">
                <div className="spotlight-icon-check"><Check size={16} /></div>
                <div>
                  <strong>Radar phân tích 5 chiều năng lực</strong>
                  <p>Kinh nghiệm, kỹ năng, dự án, học vấn và phong cách trình bày khoa học.</p>
                </div>
              </div>
              <div className="spotlight-item">
                <div className="spotlight-icon-check"><Check size={16} /></div>
                <div>
                  <strong>Gợi ý từ khóa thiếu theo JD từng việc làm</strong>
                  <p>Tự động đề xuất bổ sung các tech-stack và kỹ năng mà nhà tuyển dụng yêu cầu.</p>
                </div>
              </div>
              <div className="spotlight-item">
                <div className="spotlight-icon-check"><Check size={16} /></div>
                <div>
                  <strong>Viết lại mô tả dự án theo mô hình STAR</strong>
                  <p>Biến những đoạn văn chung chung thành các thành tích ấn tượng với số liệu đo lường.</p>
                </div>
              </div>
            </div>

            <div className="spotlight-actions">
              <Link to={studentPath('/cv-analyzer')} className="button button-primary">
                <Sparkles size={18} />
                <span>Trải nghiệm Phân tích CV ngay</span>
              </Link>
              <Link to="/cv-templates" className="button button-secondary">
                <span>Xem mẫu CV gợi ý</span>
              </Link>
            </div>
          </div>

          <div className="spotlight-media">
            <div className="spotlight-image-frame">
              <img 
                src="/images/ai-dashboard-showcase.jpg" 
                alt="AICareer Dashboard Showcase" 
                className="spotlight-img" 
              />
              <div className="spotlight-badge-floating">
                <Sparkles size={16} className="text-emerald-500" />
                <span>AI Scoring Live: <strong>99% Optimized</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED JOBS SECTION */}
      <section className="home-jobs-section">
        <div className="site-container home-section">
          <div className="home-section-heading">
            <div>
              <span className="section-kicker">CƠ HỘI ĐANG MỞ TUYỂN DỤNG</span>
              <h2>Việc Làm Nổi Bật Được AI Đề Xuất</h2>
              <p>Khám phá các vị trí công nghệ tuyển dụng nóng nhất từ các công ty uy tín.</p>
            </div>
            <Link to="/jobs" className="button button-secondary">
              <span>Xem tất cả việc làm</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="featured-jobs-grid" aria-label="Đang tải việc làm" aria-busy="true">
              {[1, 2, 3, 4].map(key => (
                <div key={key} className="job-skeleton">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : jobsError ? (
            <div className="home-empty" role="status">
              <Briefcase size={36} />
              <h3>Chưa thể tải danh sách việc làm</h3>
              <p>Hãy thử kết nối lại để xem những cơ hội mới nhất.</p>
              <button className="button button-secondary" onClick={() => setRefresh(value => value + 1)}>
                <RotateCw size={16} /> Thử lại
              </button>
            </div>
          ) : !featuredJobs.length ? (
            <div className="home-empty">
              <Briefcase size={36} />
              <h3>Cơ hội mới đang được cập nhật liên tục</h3>
              <p>Bạn có thể hoàn thiện CV ngay hôm nay để sẵn sàng ứng tuyển.</p>
              <Link to={workspacePath} className="button button-primary">
                {primaryLabel} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="featured-jobs-grid">
              {featuredJobs.map((job, index) => (
                <Link key={job.id} to={'/jobs/' + job.id} className="featured-job">
                  <div className="featured-job-top">
                    <span className={'company-monogram monogram-' + (index % 4)}>
                      {(job.company?.name || 'C').charAt(0)}
                    </span>
                    <div className="featured-job-header-info">
                      <span className="featured-company">{job.company?.name || 'Doanh nghiệp tuyển dụng'}</span>
                      <h3>{job.title}</h3>
                    </div>
                    <div className="job-open-badge">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>

                  <div className="featured-job-meta">
                    <span><MapPin size={14} />{job.location || 'Toàn quốc'}</span>
                    {job.employmentType && <span><Briefcase size={14} />{job.employmentType}</span>}
                    {job.experience && <span className="experience-tag">{job.experience}</span>}
                  </div>

                  <div className="featured-job-tags">
                    {(job.skills || ['React', 'JavaScript', 'Git']).slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="skill-pill">{skill}</span>
                    ))}
                  </div>

                  <div className="featured-job-bottom">
                    <div className="salary-pill">
                      <TrendingUp size={15} />
                      <strong>{salaryLabel(job)}</strong>
                      <small>/tháng</small>
                    </div>
                    <span className="apply-btn-label">
                      <span>Ứng tuyển ngay</span>
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. SUCCESS STORY / TESTIMONIAL */}
      <section className="site-container home-section">
        <div className="testimonial-card">
          <div className="testimonial-avatar-wrapper">
            <img 
              src="/images/candidate-linh.jpg" 
              alt="Ứng viên thành công cùng AICareer" 
              className="testimonial-avatar" 
            />
            <div className="testimonial-verified-badge">
              <Check size={14} />
            </div>
          </div>
          <div className="testimonial-content">
            <div className="testimonial-rating">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />
              ))}
              <span>Đánh giá 5.0 từ người dùng thật</span>
            </div>
            <blockquote className="testimonial-quote">
              "Sau khi sử dụng tính năng Phân tích CV bằng AI của AICareer, mình phát hiện hồ sơ thiếu nhiều từ khóa công nghệ then chốt. Sau khi chuyển sang mẫu CV Harvard và tối ưu theo gợi ý AI, mình đã nhận được 4 lời mời phỏng vấn từ các công ty công nghệ lớn chỉ trong 1 tuần!"
            </blockquote>
            <div className="testimonial-author">
              <strong>Nguyễn Hoàng Linh</strong>
              <span>Frontend Software Engineer · Sinh viên vừa tốt nghiệp</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONNECTED COMPANIES STRIP */}
      {!!companies.length && (
        <section className="site-container companies-section">
          <span className="section-kicker">KẾT NỐI VỚI HƠN 1,500+ DOANH NGHIỆP UY TÍN</span>
          <div className="company-strip">
            {companies.map(company => (
              <Link to={'/jobs?search=' + encodeURIComponent(company.name)} className="company-wordmark" key={company.id}>
                <Building2 size={22} />
                <span>{company.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. BOTTOM LUXURY CALL-TO-ACTION */}
      <section className="site-container home-bottom-section">
        <div className="home-cta">
          <div className="cta-glow-decor" aria-hidden="true" />
          <div className="cta-content">
            <span className="cta-eyebrow">
              <Sparkles size={16} /> BẮT ĐẦU HÀNH TRÌNH SỰ NGHIỆP MỚI
            </span>
            <h2>Sẵn Sàng Cho Cơ Hội Việc Làm Đột Phá Tiếp Theo?</h2>
            <p>Chỉ mất 3 phút để tạo một chiếc CV chuẩn ATS và kết nối tới hàng ngàn nhà tuyển dụng.</p>
          </div>
          <div className="cta-actions">
            <Link to={workspacePath} className="button button-light cta-btn">
              <span>{primaryLabel}</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
