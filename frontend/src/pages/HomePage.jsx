import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowRight, ArrowUpRight, Briefcase, Check, CheckCircle2, FileText, MapPin, Search, Sparkles, Target, TrendingUp, Building2, RotateCw } from 'lucide-react';
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

function CareerPreview() {
  return <div className="career-preview" aria-label="Minh họa hồ sơ, phân tích CV và gợi ý việc làm">
    <div className="preview-orbit" aria-hidden="true" />
    <div className="preview-spark preview-spark-one" aria-hidden="true">✦</div>
    <div className="preview-spark preview-spark-two" aria-hidden="true">✦</div>
    <div className="preview-document">
      <div className="preview-document-bar"><span><span className="status-dot" /> Hồ sơ sự nghiệp</span><span>CV mẫu</span></div>
      <div className="preview-person"><span className="preview-avatar">GH<span><Check size={11} /></span></span><div><h3>Gia Huy</h3><p>Frontend Developer</p><span className="preview-location"><MapPin size={12} /> Hồ Chí Minh, Việt Nam</span></div></div>
      <div className="preview-section"><span className="preview-label">GIỚI THIỆU</span><p>Biến ý tưởng thành những trải nghiệm số dễ dùng, chỉn chu và có ý nghĩa.</p></div>
      <div className="preview-section"><span className="preview-label">KỸ NĂNG NỔI BẬT</span><div className="preview-skills">{['React', 'JavaScript', 'UI / UX', 'Figma'].map(skill => <span key={skill}>{skill}</span>)}</div></div>
      <div className="preview-section"><span className="preview-label">HÀNH TRÌNH CỦA BẠN</span><div className="preview-timeline"><span /><div><strong>Sẵn sàng cho cơ hội đầu tiên</strong><p>Học vấn, dự án và kỹ năng trong một hồ sơ.</p></div></div></div>
      <div className="preview-document-footer"><FileText size={14} /> Một hồ sơ. Nhiều cơ hội.<CheckCircle2 size={15} /></div>
    </div>
    <div className="preview-insight"><span className="preview-insight-icon"><Sparkles size={19} /></span><div><strong>Để AI hỗ trợ bạn</strong><p>CV rõ ràng, thế mạnh nổi bật</p></div><span className="preview-insight-check"><Check size={13} /></span></div>
    <div className="preview-match"><span className="preview-match-icon"><Target size={19} /></span><div><strong>Tìm đúng cơ hội</strong><p>Gợi ý dựa trên kỹ năng của bạn</p></div><ArrowUpRight size={18} /></div>
    <span className="preview-caption">Hồ sơ minh họa · Trải nghiệm cùng AICareer</span>
  </div>;
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
      const [jobsResult, companiesResult] = await Promise.allSettled([api.get('/jobs?limit=4'), api.get('/companies')]);
      if (!active) return;
      if (jobsResult.status === 'fulfilled' && jobsResult.value.data.success) {
        setFeaturedJobs((jobsResult.value.data.data.jobs || []).slice(0, 4));
      } else {
        setJobsError(true);
      }
      if (companiesResult.status === 'fulfilled' && companiesResult.value.data.success) {
        setCompanies((companiesResult.value.data.data.companies || []).slice(0, 5));
      }
      setLoading(false);
    };
    fetchData();
    return () => { active = false; };
  }, [refresh]);

  const workspacePath = isAdmin ? '/admin/dashboard' : isRecruiter ? '/recruiter/dashboard' : isStudent ? '/cvs' : '/register';
  const primaryLabel = isAdmin || isRecruiter ? 'Vào không gian làm việc' : isStudent ? 'Mở CV của tôi' : 'Tạo CV của bạn';
  const studentPath = (path) => isStudent ? path : user ? workspacePath : '/register';
  const steps = [
    { icon: FileText, title: 'Tạo & tối ưu CV với AI', description: 'Tập hợp học vấn, kỹ năng và dự án thành CV chuyên nghiệp. Nhờ AI gợi ý cách viết rõ ràng hơn.', link: studentPath('/cvs'), action: 'Tạo CV với AI' },
    { icon: Sparkles, title: 'Phân tích CV bằng AI', description: 'Nhận điểm đánh giá, điểm mạnh, kỹ năng còn thiếu và gợi ý cụ thể để cải thiện CV.', link: studentPath('/cv-analyzer'), action: 'Mở phân tích CV AI' },
    { icon: Target, title: 'Gợi ý việc làm bằng AI', description: 'Khám phá công việc phù hợp với hồ sơ, hiểu lý do được gợi ý và cách chuẩn bị trước khi ứng tuyển.', link: studentPath('/recommendations'), action: 'Xem gợi ý việc làm AI' },
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
      <section className="home-hero">
        <div className="site-container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={13} /> TRỢ LÝ AI CHO CV & SỰ NGHIỆP CỦA BẠN</div>
            <h1>Một CV tốt.<br />Một cơ hội mới.<br /><span>Một tương lai của bạn.</span></h1>
            <p className="hero-description">Tự tin bước vào thị trường việc làm với CV chuyên nghiệp và những cơ hội phù hợp. Để AI đồng hành cùng bạn từ bước đầu tiên.</p>
            <div className="hero-actions"><Link to={workspacePath} className="button button-primary">{primaryLabel}<ArrowUpRight size={18} /></Link><Link to={isStudent ? '/recommendations' : '/#ai-tools'} className="hero-secondary"><Sparkles size={16} />{isStudent ? 'Gợi ý việc làm AI' : 'Khám phá công cụ AI'}<ArrowRight size={17} /></Link></div>
            <div className="hero-reassurance"><span><CheckCircle2 size={15} /> Dễ dàng bắt đầu</span><span><CheckCircle2 size={15} /> Dành cho sinh viên & người mới đi làm</span></div>
          </div>
          <CareerPreview />
        </div>
        <div className="site-container">
          <div className="home-search-panel">
            <div className="search-panel-heading"><span className="search-panel-icon"><Search size={20} /></span><div><h2>Cơ hội tiếp theo của bạn là gì?</h2><p>Tìm theo vị trí, kỹ năng hoặc công ty bạn yêu thích.</p></div></div>
            <form className="home-search-form" onSubmit={submitSearch}>
              <label className="home-search-field"><Search size={19} /><span className="sr-only">Vị trí, kỹ năng hoặc công ty</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Vị trí, kỹ năng hoặc công ty..." /></label>
              <label className="home-search-location"><MapPin size={18} /><span className="sr-only">Địa điểm làm việc</span><select value={location} onChange={event => setLocation(event.target.value)}><option value="">Tất cả địa điểm</option><option>Hồ Chí Minh</option><option>Hà Nội</option><option>Đà Nẵng</option></select></label>
              <button type="submit" className="button button-primary">Tìm việc làm <ArrowRight size={17} /></button>
            </form>
            <div className="popular-searches"><span>Thử tìm:</span>{['Frontend', 'React', 'Backend', 'Intern'].map(term => <Link key={term} to={'/jobs?search=' + encodeURIComponent(term)}>{term}<ArrowUpRight size={12} /></Link>)}</div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="site-container home-section">
        <div id="ai-tools" className="home-section-heading"><div><span className="section-kicker">BỘ CÔNG CỤ AI DÀNH CHO BẠN</span><h2>Từ một CV tốt đến<br className="mobile-break" /> công việc phù hợp.</h2></div><p>Tạo CV, phân tích và tìm việc.<br />AI đồng hành trong từng bước.</p></div>
        <div className="journey-grid">{steps.map(({ icon: Icon, title, description, link, action }, index) => <article className={'journey-card journey-card-' + index} key={title}><div className="journey-card-top"><span className="journey-icon"><Icon size={23} /></span><span className="journey-number">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p><Link to={link}>{action}<ArrowUpRight size={17} /></Link></article>)}</div>
      </section>

      <section className="home-jobs-section"><div className="site-container home-section">
        <div className="home-section-heading"><div><span className="section-kicker">CƠ HỘI ĐANG CHỜ BẠN</span><h2>Mở cánh cửa sự nghiệp</h2><p>Những vị trí để bạn học hỏi, đóng góp và phát triển.</p></div><Link to="/jobs" className="button button-secondary">Tất cả việc làm <ArrowUpRight size={16} /></Link></div>
        {loading ? <div className="featured-jobs-grid" aria-label="Đang tải việc làm" aria-busy="true">{[1, 2, 3, 4].map(key => <div key={key} className="job-skeleton"><span /><span /><span /></div>)}</div> : jobsError ? <div className="home-empty" role="status"><Briefcase size={30} /><h3>Chưa thể tải việc làm</h3><p>Hãy thử kết nối lại để xem những cơ hội mới nhất.</p><button className="button button-secondary" onClick={() => setRefresh(value => value + 1)}><RotateCw size={16} /> Thử lại</button></div> : !featuredJobs.length ? <div className="home-empty"><Briefcase size={30} /><h3>Cơ hội mới đang được cập nhật</h3><p>Bạn có thể hoàn thiện CV để sẵn sàng ứng tuyển.</p><Link to={workspacePath} className="button button-primary">{primaryLabel}<ArrowRight size={16} /></Link></div> : <div className="featured-jobs-grid">{featuredJobs.map((job, index) => <Link key={job.id} to={'/jobs/' + job.id} className="featured-job">
          <div className="featured-job-top"><span className={'company-monogram monogram-' + index}>{(job.company?.name || 'C').charAt(0)}</span><div><span className="featured-company">{job.company?.name || 'Doanh nghiệp tuyển dụng'}</span><h3>{job.title}</h3></div><ArrowUpRight size={20} className="job-open-icon" /></div>
          <div className="featured-job-meta"><span><MapPin size={14} />{job.location || 'Đang cập nhật'}</span>{job.employmentType && <span><Briefcase size={14} />{job.employmentType}</span>}</div>
          <div className="featured-job-tags">{job.experience && <span className="experience-tag">{job.experience}</span>}{(job.skills || []).slice(0, 3).map((skill, idx) => <span key={idx}>{skill}</span>)}</div>
          <div className="featured-job-bottom"><span><TrendingUp size={15} />{salaryLabel(job)}<small> / tháng</small></span><span>Xem cơ hội <ArrowRight size={14} /></span></div>
        </Link>)}</div>}
      </div></section>

      {!!companies.length && <section className="site-container companies-section"><span className="section-kicker">KẾT NỐI VỚI CÁC DOANH NGHIỆP</span><div className="company-strip">{companies.map(company => <Link to={'/jobs?search=' + encodeURIComponent(company.name)} className="company-wordmark" key={company.id}><Building2 size={22} /><span>{company.name}</span></Link>)}</div></section>}

      <section className="site-container home-bottom-section"><div className="home-cta"><div><span className="cta-eyebrow"><Sparkles size={15} /> VIẾT TIẾP HÀNH TRÌNH CỦA BẠN</span><h2>Cơ hội tốt bắt đầu<br />từ một bước nhỏ.</h2><p>Chuẩn bị hồ sơ hôm nay. Tự tin đón cơ hội ngày mai.</p></div><Link to={workspacePath} className="button button-light">{primaryLabel}<ArrowUpRight size={18} /></Link><span className="cta-decoration" aria-hidden="true">✦</span></div></section>
    </div>
  );
}
