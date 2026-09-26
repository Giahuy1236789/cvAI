import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  FileText, Sparkles, Download, Save, ArrowLeft, 
  Palette, Eye, Layout, CheckCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CVEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const cvPreviewRef = useRef(null);
  const aiRequestRef = useRef(0);

  const [cvData, setCvData] = useState({
    title: 'CV Lập trình viên ReactJS',
    template: 'topcv',
    personalInfo: {
      fullName: '', email: '', phone: '', address: '', title: 'Frontend Developer',
      avatar: '', dob: '', website: ''
    },
    careerObjective: '',
    education: [], experiences: [], projects: [], skills: [], certificates: [], languages: [],
    hobbies: [], activities: [], awards: [], references: []
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchInitialData();
    return () => { aiRequestRef.current += 1; };
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setGeneratingAI(false);
      if (id) {
        // Edit existing CV
        const res = await api.get(`/cvs/${id}`);
        if (res.data.success) {
          setCvData(res.data.data.cv);
        }
      } else {
        // Create new CV - load student profile to auto-populate
        const profRes = await api.get('/students/profile');
        if (profRes.data.success) {
          const student = profRes.data.data.student;
          setCvData({
            title: `CV - ${student.fullName} - ${student.desiredPositions?.[0] || 'Developer'}`,
            template: 'topcv',
            personalInfo: {
              fullName: student.fullName || '',
              email: student.email || '',
              phone: student.phone || '',
              address: student.address || '',
              title: student.desiredPositions?.[0] || 'Software Engineer',
              avatar: student.avatar || '',
              dob: student.dateOfBirth || '',
              website: ''
            },
            careerObjective: student.careerObjective || '',
            education: student.education || [],
            experiences: student.experiences || [],
            projects: student.projects || [],
            skills: student.skills || [],
            certificates: student.certificates || [],
            languages: student.languages || [],
            hobbies: student.hobbies || [],
            activities: student.activities || [],
            awards: student.awards || [],
            references: student.references || []
          });
        }
      }
    } catch (err) {
      console.error('Error fetching CV data:', err);
    } finally {
      setLoading(false);
    }
  };

  // AI Content Generation & Optimization
  const handleAIGenerate = async () => {
    if (generatingAI) return;
    const requestId = ++aiRequestRef.current;
    setGeneratingAI(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.post('/ai/generate-cv', { section: 'careerObjective' });
      if (requestId !== aiRequestRef.current) return;
      if (!res.data.success || !res.data.data?.careerObjective) {
        throw new Error(res.data.message || 'AI chưa trả về nội dung CV. Vui lòng thử lại.');
      }
      const aiData = res.data.data;
      setCvData((prev) => ({
        ...prev,
        careerObjective: aiData.careerObjective,
      }));
      setMessage({
        type: 'success',
        text: '✨ AI đã viết lại mục tiêu nghề nghiệp của bạn!',
      });
    } catch (err) {
      if (requestId !== aiRequestRef.current) return;
      console.error('Error generating AI content:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'AI chưa thể viết lại nội dung CV. Vui lòng thử lại.' });
    } finally {
      if (requestId === aiRequestRef.current) setGeneratingAI(false);
    }
  };

  // Save CV
  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (id) {
        const res = await api.put(`/cvs/${id}`, cvData);
        if (res.data.success) {
          setMessage({ type: 'success', text: 'Đã lưu thay đổi CV thành công!' });
        }
      } else {
        const res = await api.post('/cvs', cvData);
        if (res.data.success) {
          setMessage({ type: 'success', text: 'Tạo CV mới thành công!' });
          navigate(`/cv-editor/${res.data.data.cv.id}`);
        }
      }
    } catch (err) {
      console.error('Error saving CV:', err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu CV.' });
    } finally {
      setSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!cvPreviewRef.current) return;
    setDownloadingPDF(true);

    try {
      const element = cvPreviewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${cvData.title || 'CV'}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Không thể xuất file PDF.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-slate-500">Đang chuẩn bị trình tạo CV...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/cvs" className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <input
              type="text"
              value={cvData.title}
              onChange={(e) => setCvData({ ...cvData, title: e.target.value })}
              className="text-lg sm:text-xl font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 outline-hidden px-1"
              placeholder="Tên bản CV"
            />
            <span className="text-xs text-slate-400 block px-1">Chỉnh sửa trực quan & Tự động lưu</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Template Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {['topcv', 'modern', 'classic', 'minimal'].map((tmpl) => (
              <button
                key={tmpl}
                onClick={() => setCvData({ ...cvData, template: tmpl })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors ${
                  cvData.template === tmpl ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                {tmpl}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={generatingAI}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{generatingAI ? 'AI đang viết...' : 'AI Viết lại'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu CV'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPDF ? 'Đang xuất PDF...' : 'Tải PDF'}</span>
          </button>
        </div>
      </div>

      {generatingAI && <p role="status" className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">ChatGPT đang viết lại mục tiêu nghề nghiệp. Vui lòng giữ trang này mở trong lúc chờ kết quả.</p>}

      {message.text && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Editor (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6 max-h-[85vh] overflow-y-auto">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Nội dung chi tiết CV
          </h2>

          {/* Personal Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase">Thông tin cá nhân</h3>
            <input
              type="text"
              placeholder="Họ và tên"
              value={cvData.personalInfo?.fullName || ''}
              onChange={(e) =>
                setCvData({
                  ...cvData,
                  personalInfo: { ...cvData.personalInfo, fullName: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
            <input
              type="text"
              placeholder="Vị trí ứng tuyển (vd: Frontend Developer)"
              value={cvData.personalInfo?.title || ''}
              onChange={(e) =>
                setCvData({
                  ...cvData,
                  personalInfo: { ...cvData.personalInfo, title: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input type="text" placeholder="Ảnh đại diện (URL)" value={cvData.personalInfo?.avatar || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, avatar: e.target.value } })} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
              <input type="text" placeholder="Ngày sinh (vd: 26/05/2000)" value={cvData.personalInfo?.dob || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, dob: e.target.value } })} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
              <input type="text" placeholder="Website / Link (vd: github.com/user)" value={cvData.personalInfo?.website || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, website: e.target.value } })} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="Email"
                value={cvData.personalInfo?.email || ''}
                onChange={(e) =>
                  setCvData({
                    ...cvData,
                    personalInfo: { ...cvData.personalInfo, email: e.target.value },
                  })
                }
                className="px-3 py-2 text-sm rounded-xl border border-slate-200"
              />
              <input
                type="tel"
                placeholder="Số điện thoại"
                value={cvData.personalInfo?.phone || ''}
                onChange={(e) =>
                  setCvData({
                    ...cvData,
                    personalInfo: { ...cvData.personalInfo, phone: e.target.value },
                  })
                }
                className="px-3 py-2 text-sm rounded-xl border border-slate-200"
              />
            </div>
            <input
              type="text"
              placeholder="Địa chỉ (Đà Nẵng, Việt Nam)"
              value={cvData.personalInfo?.address || ''}
              onChange={(e) =>
                setCvData({
                  ...cvData,
                  personalInfo: { ...cvData.personalInfo, address: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
          </div>

          {/* Career Objective */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-indigo-600 uppercase">Mục tiêu nghề nghiệp</h3>
            <textarea
              rows={3}
              value={cvData.careerObjective || ''}
              onChange={(e) => setCvData({ ...cvData, careerObjective: e.target.value })}
              placeholder="Tóm tắt mục tiêu và giá trị bạn mang lại..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-indigo-600 uppercase">Kỹ năng</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(cvData.skills || []).map((sk, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg flex items-center gap-1"
                >
                  {sk}
                  <button
                    type="button"
                    onClick={() =>
                      setCvData({ ...cvData, skills: cvData.skills.filter((s) => s !== sk) })
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSkill.trim()) {
                      setCvData({ ...cvData, skills: [...cvData.skills, newSkill.trim()] });
                      setNewSkill('');
                    }
                  }
                }}
                placeholder="Thêm kỹ năng..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSkill.trim()) {
                    setCvData({ ...cvData, skills: [...cvData.skills, newSkill.trim()] });
                    setNewSkill('');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* Hobbies */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-indigo-600 uppercase">Sở thích</h3>
            <input
              type="text"
              value={(cvData.hobbies || []).join(', ')}
              onChange={(e) => setCvData({ ...cvData, hobbies: e.target.value.split(',').map(h => h.trim()).filter(Boolean) })}
              placeholder="Đọc sách, Nghe nhạc, Nấu ăn... (cách nhau dấu phẩy)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
          </div>
        </div>

        {/* Right Column: Live CV Preview Paper (7 cols) */}
        <div className="lg:col-span-7 bg-slate-200/60 p-4 sm:p-6 rounded-3xl border border-slate-300/60 flex justify-center overflow-x-auto">
          <div
            ref={cvPreviewRef}
            className={`w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-2xl p-8 sm:p-12 transition-all ${
              cvData.template === 'classic'
                ? 'font-serif'
                : cvData.template === 'minimal'
                ? 'font-mono'
                : 'font-sans'
            }`}
            style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
          >
            
            {cvData.template === 'topcv' ? (
              <div className="flex w-full font-sans text-slate-800 bg-white" style={{ minHeight: '297mm' }}>
                {/* Left Column */}
                <div className="w-[35%] bg-[#eef5fc] p-6 border-r border-slate-200 flex flex-col gap-6 stretch-h">
                  <div className="flex flex-col items-center text-center">
                    {cvData.personalInfo?.avatar ? (
                      <img src={cvData.personalInfo.avatar} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-sm mb-4" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-slate-300 border-4 border-white shadow-sm mb-4 flex items-center justify-center text-slate-500">Ảnh</div>
                    )}
                    <h1 className="text-xl font-bold text-slate-900 leading-tight uppercase">{cvData.personalInfo?.fullName || 'NGUYỄN VĂN A'}</h1>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{cvData.personalInfo?.title || 'VỊ TRÍ ỨNG TUYỂN'}</p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    {cvData.personalInfo?.dob && <div className="flex gap-2"><span className="w-4 text-center">📅</span><span>{cvData.personalInfo.dob}</span></div>}
                    {cvData.personalInfo?.phone && <div className="flex gap-2"><span className="w-4 text-center">📞</span><span>{cvData.personalInfo.phone}</span></div>}
                    {cvData.personalInfo?.email && <div className="flex gap-2"><span className="w-4 text-center">✉️</span><span>{cvData.personalInfo.email}</span></div>}
                    {cvData.personalInfo?.address && <div className="flex gap-2"><span className="w-4 text-center">🏠</span><span>{cvData.personalInfo.address}</span></div>}
                    {cvData.personalInfo?.website && <div className="flex gap-2"><span className="w-4 text-center">🔗</span><span>{cvData.personalInfo.website}</span></div>}
                  </div>

                  {cvData.skills?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-300 pb-1 mb-3">Kỹ năng</h3>
                      <div className="space-y-2">
                        {cvData.skills.map((sk, idx) => (
                          <div key={idx} className="text-xs text-slate-700 font-medium flex items-center justify-between">
                            <span>{sk}</span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= 4 ? 'bg-slate-700' : 'bg-slate-300'}`}></div>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="w-[65%] bg-white p-6 flex flex-col gap-6">
                  {cvData.careerObjective && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-4 bg-[#2c405a] inline-block"></span>Mục tiêu nghề nghiệp
                      </h3>
                      <p className="text-xs text-slate-700 text-justify whitespace-pre-wrap">{cvData.careerObjective}</p>
                    </div>
                  )}

                  {cvData.education?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-4 bg-[#2c405a] inline-block"></span>Học vấn
                      </h3>
                      <div className="space-y-3">
                        {cvData.education.map((edu, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="w-24 shrink-0 text-xs text-slate-500">{edu.startYear} - {edu.endYear}</div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{edu.school} | {edu.major}</div>
                              <div className="text-xs text-slate-700">Xếp loại: {edu.degree}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cvData.experiences?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-4 bg-[#2c405a] inline-block"></span>Kinh nghiệm làm việc
                      </h3>
                      <div className="space-y-4">
                        {cvData.experiences.map((exp, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="w-24 shrink-0 text-xs text-slate-500">{exp.startDate} - {exp.isCurrent ? 'Nay' : exp.endDate}</div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-slate-900">{exp.company} | {exp.position}</div>
                              <div className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{exp.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cvData.projects?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-4 bg-[#2c405a] inline-block"></span>Dự án
                      </h3>
                      <div className="space-y-4">
                        {cvData.projects.map((prj, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="w-24 shrink-0 text-xs text-slate-500">{prj.startDate} - {prj.endDate}</div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-slate-900">{prj.name} | {prj.role}</div>
                              <div className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{prj.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (

              <>{/* Header section based on Template */}
            <div
              className={`pb-6 mb-6 border-b ${
                cvData.template === 'modern'
                  ? 'border-indigo-600 bg-gradient-to-r from-indigo-50 to-transparent -mx-8 -mt-8 p-8 mb-6'
                  : 'border-slate-300'
              }`}
            >
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                {cvData.personalInfo?.fullName || 'NGUYỄN VĂN AN'}
              </h1>
              <p className="text-base font-semibold text-indigo-600 mt-1">
                {cvData.personalInfo?.title || 'FRONTEND DEVELOPER'}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-3">
                {cvData.personalInfo?.email && <div>📧 {cvData.personalInfo.email}</div>}
                {cvData.personalInfo?.phone && <div>📞 {cvData.personalInfo.phone}</div>}
                {cvData.personalInfo?.address && <div>📍 {cvData.personalInfo.address}</div>}
              </div>
            </div>

            {/* Career Objective */}
            {cvData.careerObjective && (
              <div className="mb-6 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  Mục tiêu nghề nghiệp
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 text-justify">
                  {cvData.careerObjective}
                </p>
              </div>
            )}

            {/* Skills */}
            {Array.isArray(cvData.skills) && cvData.skills.length > 0 && (
              <div className="mb-6 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  Kỹ năng chuyên môn
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {cvData.skills.map((sk, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs rounded-sm font-medium">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {cvData.experiences?.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  Kinh nghiệm làm việc
                </h3>
                {cvData.experiences.map((exp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-900">
                      <span>{exp.position} - {exp.company}</span>
                      <span className="text-slate-500 font-normal">
                        {exp.startDate} ~ {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {cvData.projects?.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  Dự án thực tế
                </h3>
                {cvData.projects.map((prj, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-900">
                      <span>{prj.name} ({prj.role})</span>
                      <span className="text-slate-500 font-normal">{prj.startDate}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{prj.description}</p>
                    {prj.technologies?.length > 0 && (
                      <div className="text-2xs text-slate-500">
                        <strong>Công nghệ:</strong> {prj.technologies.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {cvData.education?.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                  Học vấn
                </h3>
                {cvData.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <strong className="text-slate-900">{edu.school}</strong>
                      <div className="text-slate-600">{edu.degree} - {edu.major} (GPA: {edu.gpa})</div>
                    </div>
                    <span className="text-slate-500">{edu.startYear} - {edu.endYear}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default CVEditorPage;
