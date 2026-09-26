import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Briefcase, Calendar, Bookmark, Send, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, ExternalLink, X } from 'lucide-react';
import api from '../../services/api';
import { getRecommendations } from '../../services/recommendations';
import { useAuth } from '../../context/AuthContext';
import { formatSalary, formatDeadline, formatSyncedAt, getJobicySourceUrl, isJobicyJob } from './jobPresentation';
import './jobs.css';

const scoreParts = [
  ['skillScore', 'Kỹ năng (60%)'],
  ['experienceScore', 'Kinh nghiệm (15%)'],
  ['locationScore', 'Địa điểm (10%)'],
  ['salaryScore', 'Mức lương (10%)'],
];

const JobDetailPage = () => {
  const { id } = useParams();
  const { user, isStudent } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [matchData, setMatchData] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const imported = isJobicyJob(job);
  const sourceUrl = getJobicySourceUrl(job);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setJob(null);
    api.get(`/jobs/${id}`).then((res) => {
      if (!cancelled && res.data.success) setJob(res.data.data.job);
    }).catch((err) => {
      if (!cancelled && err.response?.status !== 404) setLoadError('Chưa thể tải thông tin việc làm. Vui lòng thử lại.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, retry]);

  useEffect(() => {
    let cancelled = false;
    setMatchData(null);
    setIsSaved(false);
    setSaveError('');
    if (!isStudent) { setMatchLoading(false); return; }
    setMatchLoading(true);
    getRecommendations({ jobId: id, fast: true }).then((res) => {
      if (!cancelled && res.data.success) setMatchData(res.data.data);
    }).catch(() => {
      // Keep the AI panel visible with an unavailable state if analysis fails.
    }).finally(() => { if (!cancelled) setMatchLoading(false); });
    api.get(`/saved-jobs/check/${id}`).then((res) => {
      if (!cancelled && res.data.success) setIsSaved(res.data.data.isSaved);
    }).catch(() => { if (!cancelled) setSaveError('Chưa thể kiểm tra trạng thái lưu việc làm.'); });
    return () => { cancelled = true; };
  }, [id, isStudent, user?.id]);

  const handleToggleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      if (isSaved) await api.delete(`/saved-jobs/${id}`);
      else await api.post('/saved-jobs', { jobId: id });
      setIsSaved(!isSaved);
    } catch { setSaveError('Chưa thể cập nhật việc làm đã lưu. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="jobs-page" aria-busy="true"><p className="jobs-back-link" role="status">Đang tải thông tin việc làm…</p><div className="job-card jobs-skeleton"><div /><div /><div /></div></div>;

  if (!job) return <div className="jobs-page"><div className="jobs-empty"><Briefcase size={34} /><h1>{loadError ? 'Chưa thể tải việc làm' : 'Không tìm thấy việc làm này'}</h1><p>{loadError || 'Tin tuyển dụng có thể đã được gỡ. Khám phá thêm những cơ hội khác.'}</p>{loadError && <button className="jobs-button jobs-button-primary" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>}<Link to="/jobs" className="jobs-button jobs-button-secondary">Quay lại danh sách việc làm</Link></div></div>;

  const companyName = job.company?.name || 'Công ty công nghệ';
  const companyInitials = companyName.slice(0, 2).toUpperCase();
  const matchScore = Number(matchData?.finalScore);
  const hasMatchScore = matchData?.finalScore != null && Number.isFinite(matchScore);

  return (
    <div className="jobs-page">
      <Link to="/jobs" className="jobs-back-link"><ArrowLeft size={15} /> Tất cả việc làm</Link>
      <header className="job-detail-hero">
        <div className="job-detail-identity">
          <div className="jobs-company-avatar" aria-hidden="true">{companyInitials}</div>
          <div><p>{companyName}</p><h1>{job.title}</h1><div className="job-card-meta"><span><MapPin size={15} />{job.location || 'Chưa cập nhật địa điểm'}</span>{job.experience && <span><Briefcase size={15} />{job.experience}</span>}{job.employmentType && <span>{job.employmentType}</span>}</div></div>
        </div>
        {imported && <div className="job-source-details"><div className="job-source-row"><span className="job-source-badge">Nguồn: Jobicy</span>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Xem tin gốc <ExternalLink size={14} /></a>}</div><p>Đồng bộ gần nhất: {formatSyncedAt(job.lastSyncedAt)}</p><p>Khu vực ứng tuyển theo nguồn: <strong>{job.location || 'Chưa được nguồn cung cấp'}</strong>. Xem tin gốc để kiểm tra điều kiện cư trú và trạng thái tuyển dụng.</p></div>}
      </header>

      <div className="job-detail-grid">
        <div className="job-detail-main">
          {isStudent && <section className="job-match-card" aria-labelledby="job-match-title" aria-busy={matchLoading}>
            <div className="job-match-heading"><Sparkles size={25} /><div><h2 id="job-match-title">AI · Độ phù hợp với bạn</h2><p>{matchLoading ? 'AI đang phân tích hồ sơ và yêu cầu của vị trí này. Lần chạy đầu hoặc khi máy đang bận có thể cần vài phút…' : matchData?.aiRecommendation ? 'Nhận xét AI dựa trên hồ sơ và yêu cầu tuyển dụng.' : matchData ? 'Điểm đối chiếu hồ sơ dự phòng. Nhận xét AI hiện chưa khả dụng.' : 'Phân tích AI tạm thời chưa khả dụng. Bạn vẫn có thể xem và ứng tuyển việc làm.'}</p></div>{hasMatchScore && <strong className="job-match-score">{matchScore}%</strong>}</div>
            {matchData && <>
              {hasMatchScore && <p className="job-match-verdict">{matchScore >= 75 ? 'Rất phù hợp với hồ sơ của bạn' : matchScore >= 50 ? 'Phù hợp một phần — xem thêm các kỹ năng cần bổ sung' : 'Tham khảo các kỹ năng cần bổ sung trước khi ứng tuyển'}</p>}
              {matchData.reasons?.length > 0 && <div className="job-match-reasons">{matchData.reasons.map((reason, index) => <p key={index}>{reason}</p>)}</div>}
              {matchData.breakdown && <div className="job-match-breakdown">{scoreParts.filter(([key]) => matchData.breakdown[key] != null).map(([key, label]) => <div key={key}><p><span>{label}</span><strong>{matchData.breakdown[key]}%</strong></p><div className="job-match-track"><span style={{ width: `${Math.min(100, Math.max(0, Number(matchData.breakdown[key]) || 0))}%` }} /></div></div>)}</div>}
              <div className="job-match-skills">
                <div><h3>Kỹ năng đã đáp ứng ({matchData.matchedSkills?.length || 0})</h3>{matchData.matchedSkills?.length > 0 ? <div className="jobs-skill-tags">{matchData.matchedSkills.map((skill, index) => <span key={index}>{skill}</span>)}</div> : <p>Chưa có kỹ năng trùng khớp trong hồ sơ.</p>}</div>
                <div><h3>Kỹ năng cần bổ sung ({matchData.missingSkills?.length || 0})</h3>{matchData.missingSkills?.length > 0 ? <div className="jobs-skill-tags">{matchData.missingSkills.map((skill, index) => <span key={index}>{skill}</span>)}</div> : <p>Không có kỹ năng cần bổ sung trong kết quả phân tích.</p>}</div>
              </div>
              {matchData.preparationSteps?.length > 0 && <div className="job-match-preparation"><h3>Chuẩn bị cho cơ hội này</h3><ul className="job-benefits">{matchData.preparationSteps.map((step, index) => <li key={index}><CheckCircle2 size={15} /><span>{step}</span></li>)}</ul></div>}
            </>}
            <Link to="/recommendations" className="job-source-link">Khám phá việc làm AI gợi ý <ArrowRight size={15} /></Link>
          </section>}

          <article className="job-detail-content">
            <section><h2>Mô tả công việc</h2><div className="job-description">{job.description || 'Nhà tuyển dụng chưa bổ sung mô tả chi tiết.'}</div>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="job-source-link">Xem tin gốc từ Jobicy<ExternalLink size={15} /></a>}</section>
            <section><h2>Kỹ năng & yêu cầu chuyên môn</h2>{job.skills?.length > 0 ? <div className="jobs-skill-tags">{job.skills.map((skill, index) => <span key={index}>{skill}</span>)}</div> : <p className="job-description">Xem yêu cầu chi tiết trong mô tả công việc.</p>}</section>
            {job.benefits?.length > 0 && <section><h2>Quyền lợi & đãi ngộ</h2><ul className="job-benefits">{job.benefits.map((benefit, index) => <li key={index}><CheckCircle2 size={16} /><span>{benefit}</span></li>)}</ul></section>}
          </article>
        </div>

        <aside className="job-detail-sidebar" aria-label="Ứng tuyển và thông tin công ty">
          <section className="job-apply-card" aria-label="Ứng tuyển việc làm">
            <p>Mức lương</p><h2 className="job-salary">{formatSalary(job)}</h2>
            <p className="job-deadline"><Calendar size={15} />Hạn nộp: {imported && !job.deadline ? 'Xem tại nguồn' : formatDeadline(job.deadline)}</p>
            {saveError && <p className="jobs-inline-error" role="alert">{saveError}</p>}
            {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="jobs-button jobs-button-primary">Ứng tuyển tại trang gốc <ExternalLink size={16} /></a> : <p className="jobs-inline-error">Liên kết tin gốc chưa khả dụng.</p>}
            <p className="job-apply-note">Bạn sẽ chuyển sang trang gốc để xem hướng dẫn và gửi hồ sơ.</p>
            {isStudent && <button type="button" onClick={handleToggleSave} disabled={saving} aria-pressed={isSaved} className="jobs-button jobs-button-secondary"><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'Đã lưu việc làm' : 'Lưu việc làm'}</button>}
          </section>
          <section className="job-company-card"><h2>Về công ty</h2><div className="job-company-name"><div className="jobs-company-avatar" aria-hidden="true">{companyInitials}</div><div><h3>{companyName}</h3>{job.company?.industry && <p>{job.company.industry}</p>}</div></div>{job.company?.description && <p className="job-company-description">{job.company.description}</p>}<dl><div><dt>Quy mô</dt><dd>{job.company?.size || 'Chưa cập nhật'}</dd></div><div><dt>Trụ sở</dt><dd>{job.company?.address || 'Chưa cập nhật'}</dd></div>{job.company?.website && <div><dt>Website</dt><dd><a href={job.company.website} target="_blank" rel="noopener noreferrer">{job.company.website}</a></dd></div>}</dl></section>
        </aside>
      </div>
    </div>
  );
};

export default JobDetailPage;
