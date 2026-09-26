import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileText,
  Lightbulb,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import '../workspace-pages.css';

const EmptyMessage = ({ children }) => (
  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-500">{children}</p>
);

const readScore = (value) => typeof value === 'number' && Number.isFinite(value)
  && value >= 0 && value <= 100 ? value : null;

const CVAnalyzerPage = () => {
  const [cvs, setCvs] = useState([]);
  const [loadingCVs, setLoadingCVs] = useState(true);
  const [cvReloadKey, setCVReloadKey] = useState(0);
  const [cvError, setCVError] = useState('');
  const [inputMode, setInputMode] = useState('saved');
  const [selectedCVId, setSelectedCVId] = useState('');
  const [manualText, setManualText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analyzedSource, setAnalyzedSource] = useState('');
  const [analysisNote, setAnalysisNote] = useState('');
  const [error, setError] = useState('');
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const analysisRequestRef = useRef(0);
  const submissionLockRef = useRef(false);
  const retryUntilRef = useRef(0);

  useEffect(() => () => { analysisRequestRef.current += 1; }, []);

  useEffect(() => {
    if (!retryUntil) return;
    const updateRemainingTime = () => {
      const remaining = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRetrySeconds(remaining);
      if (remaining === 0) clearInterval(timer);
    };
    const timer = setInterval(updateRemainingTime, 1000);
    updateRemainingTime();
    document.addEventListener('visibilitychange', updateRemainingTime);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', updateRemainingTime);
    };
  }, [retryUntil]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/cvs', { signal: controller.signal }).then((res) => {
      if (!res.data.success) throw new Error('Không thể tải danh sách CV.');
      const savedCVs = res.data.data.cvs || [];
      setCvs(savedCVs);
      setSelectedCVId((current) => savedCVs.some((cv) => cv.id === current) ? current : savedCVs[0]?.id || '');
      if (savedCVs.length === 0) setInputMode('manual');
    }).catch((fetchError) => {
      if (controller.signal.aborted) return;
      console.error('Error fetching CVs:', fetchError);
      setCVError('Không thể tải CV đã lưu. Bạn có thể thử lại hoặc dán nội dung CV để tiếp tục.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingCVs(false);
    });
    return () => controller.abort();
  }, [cvReloadKey]);

  const clearAnalysis = () => {
    setResult(null);
    setAnalysisNote('');
  };

  const selectedCV = cvs.find((cv) => cv.id === selectedCVId);
  const canAnalyze = inputMode === 'saved' ? Boolean(selectedCVId) && !loadingCVs && !cvError : Boolean(manualText.trim());

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (submissionLockRef.current || analyzing || !canAnalyze || Date.now() < retryUntilRef.current) return;
    submissionLockRef.current = true;
    const requestId = ++analysisRequestRef.current;
    clearAnalysis();
    setError('');
    setAnalyzing(true);
    setAnalyzedSource(inputMode === 'saved' ? selectedCV?.title || 'CV đã lưu' : 'Nội dung CV đã dán');

    try {
      const payload = inputMode === 'saved' ? { cvId: selectedCVId } : { cvContent: manualText.trim() };
      const res = await api.post('/ai/analyze-cv', payload);
      if (requestId !== analysisRequestRef.current) return;
      if (!res.data.success || !res.data.data) {
        throw Object.assign(new Error(res.data.message || 'AI chưa trả về kết quả phân tích. Vui lòng thử lại.'), { response: res });
      }
      setResult(res.data.data);
      setAnalysisNote(res.data.note || '');
    } catch (requestError) {
      if (requestId !== analysisRequestRef.current) return;
      console.error('Error analyzing CV:', requestError);
      setError(requestError.response?.data?.message || requestError.message || 'Có lỗi xảy ra khi AI phân tích CV. Vui lòng thử lại.');
      const retryAfterSeconds = requestError.response?.data?.retryAfterSeconds;
      const delay = typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
        && retryAfterSeconds > 0 ? retryAfterSeconds : 0;
      const deadline = delay ? Date.now() + delay * 1000 : 0;
      retryUntilRef.current = deadline;
      setRetryUntil(deadline);
      setRetrySeconds(Math.ceil(delay));
    } finally {
      submissionLockRef.current = false;
      if (requestId === analysisRequestRef.current) setAnalyzing(false);
    }
  };

  const strengths = result?.strengths || [];
  const weaknesses = result?.weaknesses || [];
  const suggestions = result?.suggestions || [];
  const missingSkills = result?.missingSkills || [];
  const actionPlan = result?.actionPlan || [];
  const cvScore = readScore(result?.cvScore);
  const categoryScores = [
    { label: 'Kỹ năng', value: readScore(result?.skillScore) },
    { label: 'Kinh nghiệm', value: readScore(result?.experienceScore) },
    { label: 'Dự án', value: readScore(result?.projectScore) },
    { label: 'Học vấn', value: readScore(result?.educationScore) },
  ].filter((score) => score.value !== null);

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <div className="workspace-eyebrow flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />Trợ lý nghề nghiệp AI</div>
          <h1>Phân tích CV bằng AI</h1>
          <p>Hiểu điểm mạnh của CV, tìm phần cần bổ sung và nhận các bước cải thiện cụ thể trước khi ứng tuyển.</p>
        </div>
        <Link to="/cvs" className="workspace-secondary"><FileText className="w-4 h-4" />CV của tôi</Link>
      </header>

      <div className="workspace-split">
        <section className="workspace-panel min-w-0" aria-labelledby="analyzer-input-heading">
          <div className="mb-6">
            <h2 id="analyzer-input-heading">1. Chọn nội dung cần phân tích</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sử dụng một CV đã lưu hoặc dán nội dung CV của bạn.</p>
          </div>

          <form onSubmit={handleAnalyze} aria-busy={analyzing}>
            <fieldset disabled={analyzing} className="min-w-0 space-y-5">
              <legend className="sr-only">Nguồn nội dung CV</legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5" role="group" aria-label="Chọn nguồn CV">
                {[
                  { value: 'saved', label: 'CV đã lưu', icon: FileText },
                  { value: 'manual', label: 'Dán nội dung', icon: FileSearch },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={inputMode === value}
                    onClick={() => { if (inputMode !== value) { setInputMode(value); clearAnalysis(); } }}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${inputMode === value ? 'bg-white text-teal-800 shadow-xs ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />{label}
                  </button>
                ))}
              </div>

              {inputMode === 'saved' ? (
                loadingCVs ? (
                  <div role="status" className="flex items-center gap-2 rounded-lg bg-slate-50 p-5 text-sm text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" />Đang tải CV đã lưu...</div>
                ) : cvError ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p role="alert">{cvError}</p>
                    <button type="button" onClick={() => { setLoadingCVs(true); setCVError(''); setCVReloadKey((key) => key + 1); }} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-4"><RefreshCw className="w-3.5 h-3.5" />Tải lại danh sách CV</button>
                  </div>
                ) : cvs.length > 0 ? (
                  <div>
                    <label htmlFor="analysis-cv" className="mb-2 block text-sm font-semibold text-slate-700">CV cần phân tích</label>
                    <select
                      id="analysis-cv"
                      value={selectedCVId}
                      onChange={(event) => { setSelectedCVId(event.target.value); clearAnalysis(); }}
                      className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      {cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.title || 'CV chưa đặt tên'}</option>)}
                    </select>
                    {selectedCV && (
                      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Kỹ năng trong CV</p>
                        {selectedCV.skills?.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">{selectedCV.skills.slice(0, 6).map((skill, index) => <span key={index} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">{skill}</span>)}{selectedCV.skills.length > 6 && <span className="px-2 py-1 text-xs text-slate-500">+{selectedCV.skills.length - 6}</span>}</div>
                        ) : <p className="mt-2 text-sm text-slate-500">CV chưa có kỹ năng được liệt kê.</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm leading-6 text-slate-500">
                    <p>Bạn chưa có CV đã lưu. Chọn “Dán nội dung” để phân tích một CV có sẵn.</p>
                    <Link to="/cv-editor" className="mt-3 inline-flex items-center gap-2 font-semibold text-teal-700">Tạo CV đầu tiên<ArrowRight className="w-3.5 h-3.5" /></Link>
                  </div>
                )
              ) : (
                <div>
                  <label htmlFor="analysis-content" className="mb-2 block text-sm font-semibold text-slate-700">Nội dung CV</label>
                  <textarea
                    id="analysis-content"
                    rows={8}
                    value={manualText}
                    onChange={(event) => { setManualText(event.target.value); clearAnalysis(); }}
                    placeholder="Dán mục tiêu nghề nghiệp, kỹ năng, kinh nghiệm, dự án và học vấn của bạn..."
                    aria-describedby="analysis-content-hint"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm leading-7 outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                  <p id="analysis-content-hint" className="mt-2 text-xs leading-5 text-slate-500">Nội dung càng đầy đủ, gợi ý cải thiện càng sát với hồ sơ của bạn.</p>
                </div>
              )}

              {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700"><AlertTriangle className="mt-1 w-4 h-4 shrink-0" /><p>{error}</p></div>}
              {retrySeconds > 0 && <p role="status" className="text-sm leading-6 text-slate-600">Vui lòng chờ {retrySeconds} giây trước khi thử phân tích lại.</p>}

              <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">2. Nhận đánh giá và kế hoạch cải thiện</p>
                <button type="submit" disabled={analyzing || !canAnalyze || retrySeconds > 0} className="workspace-primary">
                  {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {analyzing ? 'AI đang phân tích...' : retrySeconds > 0 ? `Thử lại sau ${retrySeconds} giây` : 'Phân tích CV bằng AI'}
                </button>
              </div>
            </fieldset>
            {analyzing && <p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-sm leading-6 text-teal-800">ChatGPT đang đọc CV và chuẩn bị đánh giá. Vui lòng giữ trang này mở trong lúc chờ kết quả.</p>}
          </form>
        </section>

        <aside className="workspace-aside">
          <div className="workspace-panel">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Sparkles className="w-5 h-5" /></div>
            <h2>AI giúp bạn cải thiện gì?</h2>
            <ul className="mt-4 space-y-4">
              {[
                ['Đánh giá tổng quan', 'Điểm số cho kỹ năng, kinh nghiệm, dự án và học vấn.'],
                ['Nhìn rõ điểm cần sửa', 'Nhận diện thông tin còn thiếu và kỹ năng nên bổ sung.'],
                ['Biết bước tiếp theo', 'Các việc nên ưu tiên để hoàn thiện CV trước khi ứng tuyển.'],
              ].map(([title, description]) => <li key={title} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-teal-600" /><div><h3 className="text-xs font-semibold text-slate-700">{title}</h3><p className="mt-1">{description}</p></div></li>)}
            </ul>
          </div>
        </aside>
      </div>

      {result && (
        <section className="mt-8 space-y-5" aria-labelledby="analysis-results-heading">
          <div>
            <div className="workspace-eyebrow">Kết quả từ AI</div>
            <h2 id="analysis-results-heading" className="text-xl font-bold tracking-tight text-slate-800">Đánh giá CV của bạn</h2>
            <p className="mt-2 break-words text-sm text-slate-500">{analyzedSource}</p>
          </div>
          {analysisNote && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">{analysisNote}</div>}

          <div className="workspace-panel">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {cvScore !== null && <div className="shrink-0 rounded-xl border border-teal-100 bg-teal-50 px-6 py-5 text-center text-teal-800"><span className="text-xs font-semibold">Điểm CV tổng thể</span><div className="mt-2"><strong className="text-4xl font-bold tracking-tight">{cvScore}</strong><span className="ml-1 text-sm text-teal-600">/100</span></div></div>}
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-700" />Đánh giá tổng quan</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{result.overallFeedback || 'AI đã hoàn tất phân tích nội dung CV của bạn.'}</p>
              </div>
            </div>
            {categoryScores.length > 0 && <div className="mt-6 grid grid-cols-2 gap-5 border-t border-slate-100 pt-5 lg:grid-cols-4">{categoryScores.map((score) => <div key={score.label}><div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs"><span className="text-slate-500">{score.label}</span><strong className="font-semibold text-slate-700">{score.value}/100</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-teal-600" style={{ width: `${score.value}%` }} /></div></div>)}</div>}
          </div>

          {actionPlan.length > 0 && (
            <div className="workspace-panel">
              <h2 className="mb-4 flex items-center gap-2"><ListChecks className="w-4 h-4 text-teal-700" />Việc cần cải thiện trước</h2>
              <ol className="space-y-3">
                {actionPlan.map((item, index) => (
                  <li key={index} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-teal-700 ring-1 ring-slate-200">{index + 1}</span>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold leading-6 text-slate-800">{item.action}</p>{item.priority && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Ưu tiên: {item.priority}</span>}</div>{item.expectedImpact && <p className="mt-2 leading-6 text-slate-500">Kết quả mong đợi: {item.expectedImpact}</p>}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="workspace-panel space-y-4">
              <h2 className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Điểm mạnh đã có</h2>
              {strengths.length > 0 ? <ul className="list-disc space-y-2.5 pl-4 text-sm leading-6 text-slate-600 marker:text-emerald-500">{strengths.map((item, index) => <li key={index}>{item}</li>)}</ul> : <EmptyMessage>AI chưa xác định được điểm mạnh rõ ràng từ nội dung hiện tại.</EmptyMessage>}
            </div>
            <div className="workspace-panel space-y-4">
              <h2 className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />CV còn thiếu hoặc chưa rõ</h2>
              {weaknesses.length > 0 ? <ul className="list-disc space-y-2.5 pl-4 text-sm leading-6 text-slate-600 marker:text-amber-500">{weaknesses.map((item, index) => <li key={index}>{item}</li>)}</ul> : <EmptyMessage>AI chưa phát hiện phần thiếu rõ rệt trong CV này.</EmptyMessage>}
            </div>
            <div className="workspace-panel space-y-4">
              <h2 className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Gợi ý chỉnh sửa CV</h2>
              {suggestions.length > 0 ? <ul className="list-disc space-y-2.5 pl-4 text-sm leading-6 text-slate-600 marker:text-teal-600">{suggestions.map((item, index) => <li key={index}>{item}</li>)}</ul> : <EmptyMessage>AI chưa có gợi ý bổ sung.</EmptyMessage>}
            </div>
            <div className="workspace-panel space-y-4">
              <h2 className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-teal-600" />Kỹ năng nên bổ sung</h2>
              {missingSkills.length > 0 ? <div className="flex flex-wrap gap-2">{missingSkills.map((skill, index) => <span key={index} className="rounded-md border border-teal-100 bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-800">{skill}</span>)}</div> : <EmptyMessage>Chưa có kỹ năng cần bổ sung rõ ràng từ CV hiện tại.</EmptyMessage>}
            </div>
          </div>
          <div className="flex justify-end"><Link to={inputMode === 'saved' && selectedCVId ? `/cv-editor/${selectedCVId}` : '/cv-editor'} className="workspace-secondary">{inputMode === 'saved' ? 'Chỉnh sửa CV theo gợi ý' : 'Tạo CV mới'}<ArrowRight className="w-4 h-4" /></Link></div>
        </section>
      )}
    </div>
  );
};

export default CVAnalyzerPage;
