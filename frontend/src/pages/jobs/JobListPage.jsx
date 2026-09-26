import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Briefcase, SlidersHorizontal, Sparkles, Bookmark, ArrowUpRight, ArrowRight, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatSalary, getJobicySourceUrl, isJobicyJob } from './jobPresentation';
import './jobs.css';

const JobListPage = () => {
  const { user, isStudent } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [saveError, setSaveError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = searchParams.toString();
  const activeFilters = ['location', 'experience', 'employmentType', 'salaryMin'].filter((key) => searchParams.get(key));

  useEffect(() => {
    let cancelled = false;
    setSearch(new URLSearchParams(query).get('search') || '');
    setLoading(true);
    setError('');
    api.get(`/jobs?${query}`).then((res) => {
      if (!cancelled && res.data.success) setJobs(res.data.data.jobs);
    }).catch(() => {
      if (!cancelled) setError('Chưa thể tải danh sách việc làm. Vui lòng thử lại.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query, retry]);

  useEffect(() => {
    let cancelled = false;
    if (!isStudent) { setSavedJobIds(new Set()); return; }
    api.get('/saved-jobs').then((res) => {
      if (!cancelled && res.data.success) setSavedJobIds(new Set(res.data.data.savedJobs.map((item) => item.jobId)));
    }).catch((err) => console.error('Error fetching saved jobs:', err));
    return () => { cancelled = true; };
  }, [isStudent]);

  const updateFilter = (key, value) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilter('search', search.trim());
  };

  const clearFilters = () => { setSearch(''); setSearchParams({}); };

  const handleToggleSave = async (jobId) => {
    if (!user || savingIds.has(jobId)) return;
    setSaveError('');
    setSavingIds((prev) => new Set([...prev, jobId]));
    try {
      if (savedJobIds.has(jobId)) {
        await api.delete(`/saved-jobs/${jobId}`);
        setSavedJobIds((prev) => { const next = new Set(prev); next.delete(jobId); return next; });
      } else {
        await api.post('/saved-jobs', { jobId });
        setSavedJobIds((prev) => new Set([...prev, jobId]));
      }
    } catch { setSaveError('Chưa thể cập nhật việc làm đã lưu. Vui lòng thử lại.'); }
    finally { setSavingIds((prev) => { const next = new Set(prev); next.delete(jobId); return next; }); }
  };

  return (
    <div className="jobs-page">
      <header className="jobs-heading">
        <div><p className="jobs-eyebrow">CƠ HỘI NGHỀ NGHIỆP</p><h1>Bước tiếp theo trong<br /> sự nghiệp của bạn.</h1><p>Tìm công việc IT phù hợp với kỹ năng, mục tiêu và điều bạn yêu thích.</p></div>
        <div className="jobs-heading-note"><span><Briefcase size={22} /></span><p>Một khởi đầu mới.<br /><strong>Nhiều khả năng hơn.</strong></p></div>
      </header>
      <form className="jobs-search-bar" onSubmit={handleSearchSubmit} role="search">
        <div className="jobs-search-input"><Search size={21} /><input aria-label="Từ khóa tìm việc" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vị trí, kỹ năng hoặc tên công ty" /></div>
        <div className="jobs-search-location"><MapPin size={20} /><select aria-label="Địa điểm làm việc" value={searchParams.get('location') || ''} onChange={(e) => updateFilter('location', e.target.value)}><option value="">Tất cả địa điểm</option><option value="Hà Nội">Hà Nội</option><option value="Hồ Chí Minh">Hồ Chí Minh</option><option value="Đà Nẵng">Đà Nẵng</option></select></div>
        <button className="jobs-button jobs-button-primary" type="submit">Tìm việc làm <ArrowRight size={17} /></button>
      </form>
      <div className="jobs-layout">
        <aside className="jobs-filter-column">
          <button className="jobs-mobile-filter jobs-button jobs-button-secondary" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="job-filters"><SlidersHorizontal size={17} /> Bộ lọc {activeFilters.length > 0 && `(${activeFilters.length})`}</button>
          <div id="job-filters" className={`jobs-filter-panel ${filtersOpen ? 'is-open' : ''}`}>
            <div className="jobs-panel-heading"><h2><SlidersHorizontal size={17} /> Bộ lọc tìm kiếm</h2>{query && <button onClick={clearFilters} className="jobs-text-button">Đặt lại</button>}</div>
            <div className="jobs-filter-group"><label htmlFor="job-experience">Cấp bậc kinh nghiệm</label><select id="job-experience" value={searchParams.get('experience') || ''} onChange={(e) => updateFilter('experience', e.target.value)}><option value="">Tất cả cấp bậc</option><option value="Intern">Thực tập sinh</option><option value="Fresher">Fresher / Mới tốt nghiệp</option><option value="Junior">Junior / 1–2 năm</option></select></div>
            <fieldset className="jobs-filter-group"><legend>Hình thức làm việc</legend>{[['', 'Tất cả hình thức'], ['Full-time', 'Toàn thời gian'], ['Part-time', 'Bán thời gian']].map(([value, label]) => <label className="jobs-radio" key={value}><input type="radio" name="employmentType" value={value} checked={(searchParams.get('employmentType') || '') === value} onChange={() => updateFilter('employmentType', value)} /><span>{label}</span></label>)}</fieldset>
            <div className="jobs-filter-group"><label htmlFor="job-salary">Mức lương tối thiểu</label><select id="job-salary" value={searchParams.get('salaryMin') || ''} onChange={(e) => updateFilter('salaryMin', e.target.value)}><option value="">Tất cả mức lương</option><option value="5000000">Từ 5 triệu / tháng</option><option value="10000000">Từ 10 triệu / tháng</option><option value="15000000">Từ 15 triệu / tháng</option><option value="20000000">Từ 20 triệu / tháng</option></select></div>
          </div>
          {isStudent && <div className="jobs-match-prompt"><Sparkles size={23} /><h3>Cơ hội dành riêng cho bạn</h3><p>Khám phá những việc làm phù hợp với kỹ năng trong hồ sơ của bạn.</p><Link to="/recommendations">Xem gợi ý AI <ArrowRight size={15} /></Link></div>}
        </aside>
        <section className="jobs-results" aria-label="Kết quả tìm việc" aria-busy={loading}>
          <div className="jobs-results-heading"><div><h2>{searchParams.get('search') ? `Kết quả cho “${searchParams.get('search')}”` : 'Khám phá việc làm'}</h2><p role="status">{loading ? 'Đang tìm cơ hội phù hợp…' : error ? 'Tạm thời chưa có kết quả' : `${jobs.length} cơ hội đang chờ bạn khám phá`}</p></div><span className="jobs-results-label">IT & Công nghệ</span></div>
          {!loading && !error && jobs.some(isJobicyJob) && <p className="jobs-source-notice">Tin việc làm từ <a href="https://jobicy.com" target="_blank" rel="noopener noreferrer">Jobicy</a>. Việc làm từ xa có thể giới hạn quốc gia; hãy kiểm tra khu vực được ứng tuyển và trạng thái tuyển dụng trong tin gốc.</p>}
          {activeFilters.length > 0 && <div className="jobs-active-filters">{activeFilters.map((key) => <button key={key} onClick={() => updateFilter(key, '')} aria-label={`Bỏ bộ lọc ${searchParams.get(key)}`}>{key === 'salaryMin' ? `Từ ${Number(searchParams.get(key)) / 1000000} triệu` : searchParams.get(key)}<X size={13} /></button>)}</div>}
          {saveError && <p className="jobs-inline-error" role="alert">{saveError}</p>}
          {loading ? <div className="jobs-card-list">{[1, 2, 3].map((n) => <div key={n} className="job-card jobs-skeleton"><div /><div /><div /></div>)}</div>
            : error ? <div className="jobs-empty"><Briefcase size={32} /><h3>Chưa thể tải việc làm</h3><p>{error}</p><button className="jobs-button jobs-button-primary" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>
            : jobs.length === 0 ? <div className="jobs-empty"><Search size={34} /><h3>{query ? 'Chưa tìm thấy công việc phù hợp' : 'Chưa có tin tuyển dụng để hiển thị'}</h3><p>{query ? 'Thử một từ khóa khác hoặc mở rộng bộ lọc để có thêm lựa chọn.' : 'Vui lòng quay lại khi có tin tuyển dụng được cập nhật từ nguồn.'}</p>{query && <button onClick={clearFilters} className="jobs-button jobs-button-secondary">Xóa bộ lọc</button>}</div>
            : <div className="jobs-card-list">{jobs.map((job) => <article className="job-card" key={job.id}>
              <div className="job-card-top"><div className="jobs-company-avatar" aria-hidden="true">{(job.company?.name || 'IT').slice(0, 2).toUpperCase()}</div><div className="job-card-title"><p>{job.company?.name || 'Công ty công nghệ'}</p><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3></div>{isStudent && <button className={`jobs-save-button ${savedJobIds.has(job.id) ? 'is-saved' : ''}`} onClick={() => handleToggleSave(job.id)} disabled={savingIds.has(job.id)} aria-label={savedJobIds.has(job.id) ? `Bỏ lưu ${job.title}` : `Lưu ${job.title}`} aria-pressed={savedJobIds.has(job.id)} title={savedJobIds.has(job.id) ? 'Đã lưu việc làm' : 'Lưu việc làm'}><Bookmark size={19} fill={savedJobIds.has(job.id) ? 'currentColor' : 'none'} /></button>}</div>
              <div className="job-card-meta"><span><MapPin size={15} />{job.location || 'Chưa cập nhật địa điểm'}</span>{job.experience && <span><Briefcase size={15} />{job.experience}</span>}{job.employmentType && <span>{job.employmentType}</span>}</div>
              {isJobicyJob(job) && <div className="job-source-row"><span className="job-source-badge">Nguồn: Jobicy</span>{getJobicySourceUrl(job) && <a href={getJobicySourceUrl(job)} target="_blank" rel="noopener noreferrer">Xem tin gốc <ArrowUpRight size={13} /></a>}</div>}
              {(job.skills || []).length > 0 && <div className="jobs-skill-tags">{job.skills.slice(0, 5).map((skill, index) => <span key={index}>{skill}</span>)}{job.skills.length > 5 && <span>+{job.skills.length - 5}</span>}</div>}
              <div className="job-card-footer"><p>{formatSalary(job)}</p><Link to={`/jobs/${job.id}`}>Xem chi tiết <ArrowUpRight size={17} /></Link></div>
            </article>)}</div>}
        </section>
      </div>
    </div>
  );
};

export default JobListPage;
