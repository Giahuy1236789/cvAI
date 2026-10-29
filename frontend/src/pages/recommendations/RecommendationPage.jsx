import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../../services/recommendations';
import { 
  Sparkles, MapPin, DollarSign, CheckCircle2,
  XCircle, ArrowRight, AlertCircle, User, Briefcase, RefreshCw
} from 'lucide-react';
import '../workspace-pages.css';
import api from '../../services/api';

const RecommendationPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [overallAdvice, setOverallAdvice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiError, setAiError] = useState('');
  const [minScore, setMinScore] = useState(0);
  const lifecycleRef = useRef(null);
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');

  const isJobInVietnam = (job) => {
    if (job?.isVN !== undefined) return Boolean(job.isVN);
    const loc = (job?.location || '').toLowerCase();
    return ['hà nội', 'hồ chí minh', 'hcm', 'đà nẵng', 'cần thơ', 'hải phòng', 'bình dương', 'đồng nai', 'huế', 'việt nam', 'vietnam', 'toàn quốc'].some((k) => loc.includes(k));
  };

  useEffect(() => {
    const lifecycle = { active: true, fetching: false, analyzing: false };
    lifecycleRef.current = lifecycle;
    fetchRecommendations(lifecycle);
    
    // Fetch CVs
    api.get('/cvs').then(res => {
      if (lifecycle.active && res.data.success) {
        setCvs(res.data.data.cvs || []);
      }
    }).catch(err => console.error('Error fetching CVs:', err));
    
    return () => { lifecycle.active = false; };
  }, [selectedCvId]);

  function applyRecommendations(data) {
    setRecommendations(data.recommendations);
    setStudentProfile(data.studentProfile);
    setAiAvailable(data.aiAvailable === true);
    setOverallAdvice(data.aiAvailable === true ? data.overallAdvice || '' : '');
    setAiError(!data.aiAvailable && !data.aiLoading && data.recommendations.length > 0
      ? data.overallAdvice || 'AI chưa thể hoàn tất phân tích. Bạn có thể thử lại.'
      : '');
  }

  async function fetchRecommendations(lifecycle = lifecycleRef.current) {
    if (!lifecycle?.active || lifecycle.fetching) return;
    lifecycle.fetching = true;
    try {
      setLoading(true);
      setError('');
      setAiError('');
      const res = await getRecommendations({ fast: true, cvId: selectedCvId });
      if (!lifecycle.active) return;
      if (!res.data.success) throw new Error(res.data.message || 'Không thể tải gợi ý việc làm lúc này.');
      applyRecommendations(res.data.data);
      setAiLoading(false);
      if (res.data.data.aiLoading) {
        setAiError('AI chưa chạy tự động để tránh dùng quota ngoài ý muốn. Bấm “Phân tích bằng AI” khi bạn cần nhận xét chi tiết.');
      }
    } catch (err) {
      if (!lifecycle.active) return;
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tải gợi ý việc làm lúc này.');
    } finally {
      lifecycle.fetching = false;
      if (lifecycle.active) setLoading(false);
    }
  }

  async function loadDetailedAIRecommendations(lifecycle = lifecycleRef.current) {
    if (!lifecycle?.active || lifecycle.analyzing) return;
    lifecycle.analyzing = true;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await getRecommendations({ cvId: selectedCvId });
      if (!lifecycle.active) return;
      if (!res.data.success) throw new Error(res.data.message || 'AI chưa thể hoàn tất phân tích. Bạn có thể thử lại.');
      applyRecommendations(res.data.data);
    } catch (err) {
      if (!lifecycle.active) return;
      // The quick shortlist remains usable even if the local model is busy.
      console.error('Error loading detailed AI recommendations:', err);
      setAiAvailable(false);
      setOverallAdvice('');
      setAiError(err.response?.data?.message || 'AI chưa thể hoàn tất phân tích. Bạn có thể thử lại.');
    } finally {
      lifecycle.analyzing = false;
      if (lifecycle.active) setAiLoading(false);
    }
  }

  const filtered = recommendations.filter((item) => {
    const matchScore = item.finalScore >= minScore;
    const matchLoc = locationFilter === 'all' || (locationFilter === 'vn' && (item.isVN || isJobInVietnam(item.job)));
    return matchScore && matchLoc;
  });
  const strongMatches = recommendations.filter((item) => item.finalScore >= 70).length;
  const aiResultCount = recommendations.filter((item) => item.aiRecommendation === true).length;
  const formatSalary = (job) => {
    const min = Number(job.salaryMin) || 0;
    const max = Number(job.salaryMax) || 0;
    if (!min && !max) return 'Lương thỏa thuận';
    if (!max) return `Từ ${(min / 1000000).toLocaleString('vi-VN')} triệu`;
    if (!min) return `Đến ${(max / 1000000).toLocaleString('vi-VN')} triệu`;
    return `${(min / 1000000).toLocaleString('vi-VN')} – ${(max / 1000000).toLocaleString('vi-VN')} triệu`;
  };

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <div className="workspace-eyebrow">AI Matching · Gợi ý dành riêng cho bạn</div>
          <h1>Gợi ý việc làm bằng AI</h1>
          <p>Khám phá việc làm theo kỹ năng và định hướng. Hiểu rõ điểm mạnh của bạn trước khi ứng tuyển.</p>
        </div>
        <Link to="/profile" className="workspace-secondary"><User className="w-4 h-4" />Cập nhật hồ sơ</Link>
      </header>

      {!loading && !error && recommendations.length > 0 && (
        <a href="#recommendation-ai-panel" className="mb-5 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900 min-[901px]:hidden">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{aiLoading ? 'AI đang phân tích — bạn có thể xem trước các việc làm.' : aiError || !aiAvailable ? 'AI chưa hoàn tất. Xem trạng thái và thử lại.' : 'Đã có đánh giá AI. Xem phân tích dành cho bạn.'}</span>
          <ArrowRight className="w-4 h-4 shrink-0 ml-auto" />
        </a>
      )}

      {cvs.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <label htmlFor="cv-selector-rec" style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            CV cần phân tích
          </label>
          <select 
            id="cv-selector-rec" 
            value={selectedCvId} 
            onChange={(e) => setSelectedCvId(e.target.value)}
            style={{ width: '100%', maxWidth: '500px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '10px', fontSize: '14px', backgroundColor: '#fff' }}
          >
            <option value="">-- Mặc định (Hồ sơ gốc) --</option>
            {cvs.map(cv => (
              <option key={cv.id} value={cv.id}>{cv.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="workspace-split">
        <div className="min-w-0">
          <div className="match-toolbar">
            <h2 className="text-sm font-semibold text-slate-700">{loading ? 'Đang tìm cơ hội...' : `${filtered.length} việc làm phù hợp`}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="match-filters" role="group" aria-label="Bộ lọc khu vực">
                <button type="button" onClick={() => setLocationFilter('all')} aria-pressed={locationFilter === 'all'}>Tất cả ({recommendations.length})</button>
                <button type="button" onClick={() => setLocationFilter('vn')} aria-pressed={locationFilter === 'vn'}>🇻🇳 Việt Nam</button>
              </div>
              <div className="match-filters" role="group" aria-label="Điểm phù hợp tối thiểu">
                {[{ label: 'Mọi điểm', value: 0 }, { label: 'Từ 50%', value: 50 }, { label: 'Từ 70%', value: 70 }].map((filter) => (
                  <button key={filter.value} type="button" onClick={() => setMinScore(filter.value)} aria-pressed={minScore === filter.value}>{filter.label}</button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4" role="status" aria-label="Đang tải gợi ý việc làm">
              {[1, 2, 3].map((n) => <div key={n} className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
            </div>
          ) : error && recommendations.length === 0 ? (
            <div className="workspace-empty" role="alert">
              <div className="workspace-empty-icon"><AlertCircle className="w-7 h-7" /></div>
              <h2>Chưa thể tải gợi ý việc làm</h2>
              <p>{error}</p>
              <button type="button" onClick={() => fetchRecommendations()} className="workspace-primary">Thử lại</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="workspace-empty">
              <div className="workspace-empty-icon"><Briefcase className="w-7 h-7" /></div>
              <h2>{recommendations.length ? 'Chưa có việc làm đạt mức điểm này' : 'Chưa tìm thấy cơ hội phù hợp'}</h2>
              <p>Thử giảm bộ lọc điểm hoặc bổ sung kỹ năng và vị trí mong muốn vào hồ sơ.</p>
              <div className="flex flex-wrap justify-center gap-3">
                {minScore > 0 && <button type="button" onClick={() => setMinScore(0)} className="workspace-primary">Xem tất cả gợi ý</button>}
                <Link to="/profile" className="workspace-secondary">Cập nhật hồ sơ<ArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((item) => (
                <article key={item.job.id} className="match-card">
                  <div className="match-card-heading">
                    <div className="min-w-0">
                      <h2><Link to={`/jobs/${item.job.id}`}>{item.job.title}</Link></h2>
                      <p className="match-company">{item.job.company?.name || 'Nhà tuyển dụng'}</p>
                      <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.aiRecommendation === true ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                        {item.aiRecommendation === true ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {item.aiRecommendation === true ? 'AI đánh giá' : 'Đối chiếu hồ sơ'}
                      </span>
                    </div>
                    <div className="match-score" data-level={item.finalScore < 50 ? 'low' : 'good'}>
                      <strong>{item.finalScore}%</strong><span>phù hợp</span>
                    </div>
                  </div>
                  <div className="match-meta">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.job.location || 'Chưa cập nhật'}
                      {(item.isVN || isJobInVietnam(item.job)) && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                          Việt Nam
                        </span>
                      )}
                    </span>
                    <span className="text-teal-700 font-medium"><DollarSign className="w-3.5 h-3.5" />{formatSalary(item.job)}</span>
                    {item.job.experience && <span><Briefcase className="w-3.5 h-3.5" />{item.job.experience}</span>}
                  </div>
                  <div className="match-skills">
                    <div>
                      <h3><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />Kỹ năng đáp ứng · {item.matchedSkills?.length || 0}</h3>
                      <div className="match-tags">
                        {item.matchedSkills?.length ? item.matchedSkills.map((skill, index) => <span key={index}>{skill}</span>) : <p className="text-xs text-slate-400">Chưa có kỹ năng trùng khớp.</p>}
                      </div>
                    </div>
                    <div>
                      <h3><XCircle className="w-3.5 h-3.5 text-amber-600" />Cần bổ sung · {item.missingSkills?.length || 0}</h3>
                      <div className="match-tags missing">
                        {item.missingSkills?.length ? item.missingSkills.map((skill, index) => <span key={index}>{skill}</span>) : <p className="text-xs text-teal-700">Bạn đáp ứng các kỹ năng được đối chiếu.</p>}
                      </div>
                    </div>
                  </div>
                  {item.preparationSteps?.length > 0 && (
                    <details className="match-details">
                      <summary>Gợi ý chuẩn bị trước khi ứng tuyển</summary>
                      <ol>{item.preparationSteps.map((step, index) => <li key={index}>{step}</li>)}</ol>
                    </details>
                  )}
                  <div className="match-footer">
                    <p>{item.reasons?.length ? item.reasons.join(' · ') : 'Xem chi tiết để tìm hiểu yêu cầu và quyền lợi.'}</p>
                    <Link to={`/jobs/${item.job.id}`} className="workspace-primary">Xem công việc<ArrowRight className="w-4 h-4" /></Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="workspace-aside">
          <section id="recommendation-ai-panel" className="workspace-panel">
            <h2 className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-teal-700" />Phân tích AI</h2>
            {loading ? <p>Đang đối chiếu hồ sơ của bạn với các cơ hội việc làm.</p> : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                <p className="font-medium">{error}</p>
                <button type="button" onClick={() => fetchRecommendations()} className="workspace-secondary mt-2 text-xs">Thử lại</button>
              </div>
            ) : recommendations.length === 0 ? (
              <p>Chưa có việc làm để AI phân tích. Hãy bổ sung hồ sơ hoặc quay lại khi có cơ hội mới.</p>
            ) : aiLoading ? (
              <>
                <div className="match-status" role="status"><RefreshCw className="w-4 h-4 shrink-0 animate-spin" />AI đang phân tích từng việc làm...</div>
                <p>Bạn có thể xem trước kết quả đối chiếu hồ sơ. AI có thể cần vài phút ở lần chạy đầu hoặc khi máy đang bận.</p>
              </>
            ) : aiError || !aiAvailable || aiResultCount === 0 ? (
              <>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                  <strong className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />Chưa có phân tích từ AI</strong>
                  <div className="mt-2">{aiError || 'AI chưa trả về đánh giá cho các việc làm này.'}</div>
                </div>
                <p>Danh sách hiện tại được đối chiếu theo hồ sơ. Điểm và lý do có thể thay đổi khi AI hoàn tất đánh giá.</p>
                <button type="button" onClick={() => loadDetailedAIRecommendations()} className="workspace-secondary"><Sparkles className="w-4 h-4" />Phân tích bằng AI</button>
              </>
            ) : (
              <>
                <div className="match-status" role="status"><CheckCircle2 className="w-4 h-4 shrink-0" />AI đã đánh giá {aiResultCount}/{recommendations.length} việc làm</div>
                <p>{overallAdvice || 'Xem đánh giá, kỹ năng cần bổ sung và gợi ý chuẩn bị trong từng việc làm.'}</p>
                {aiResultCount < recommendations.length && <p>Các việc làm chưa có đánh giá từ AI vẫn hiển thị kết quả đối chiếu hồ sơ.</p>}
              </>
            )}
            {!loading && !error && <div className="match-summary"><span>Cơ hội có độ phù hợp từ 70%</span><strong>{strongMatches}</strong></div>}
          </section>
          <section className="workspace-panel">
            <h2>Định hướng của bạn</h2>
            <div className="mt-5 space-y-4">
              <div>
                <div className="workspace-label">Vị trí mong muốn</div>
                <p className="mt-1">{studentProfile?.desiredPositions?.join(', ') || 'Chưa cập nhật vị trí'}</p>
              </div>
              <div>
                <div className="workspace-label">Địa điểm</div>
                <p className="mt-1">{studentProfile?.desiredLocation || 'Chưa cập nhật địa điểm'}</p>
              </div>
              <div>
                <div className="workspace-label">Kỹ năng của bạn</div>
                <div className="match-tags mt-2">
                  {studentProfile?.skills?.length ? (
                    <>{studentProfile.skills.slice(0, 6).map((skill, index) => <span key={index}>{skill}</span>)}{studentProfile.skills.length > 6 && <span>+{studentProfile.skills.length - 6}</span>}</>
                  ) : <p>Thêm kỹ năng để nhận gợi ý sát hơn.</p>}
                </div>
              </div>
            </div>
            <Link to="/profile" className="workspace-secondary">Chỉnh sửa định hướng<ArrowRight className="w-3.5 h-3.5" /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RecommendationPage;
