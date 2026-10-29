import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Sparkles, Download, Save, ArrowLeft, 
  CheckCircle, AlertCircle, UploadCloud, FileUp, Upload,
  Eye, FileText
} from 'lucide-react';
import CVPreviewComponent from '../../components/cv/CVPreviewComponent';

// Tự động scale khổ A4 vừa khít màn hình điện thoại, không bao giờ vỡ khung hay tràn mép
const ResponsiveCVWrapper = ({ children }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const width = containerRef.current.offsetWidth - 16;
      if (width < 794 && width > 0) {
        setScale(Math.max(0.35, width / 794));
      } else {
        setScale(1);
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="bg-slate-200/60 p-2 sm:p-6 rounded-3xl border border-slate-300/60 flex justify-center items-start overflow-hidden w-full"
    >
      <div 
        style={{
          width: '794px',
          minHeight: '1123px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: scale < 1 ? `calc((1123px * ${scale}) - 1123px)` : 0
        }}
        className="shrink-0 transition-transform duration-200"
      >
        {children}
      </div>
    </div>
  );
};

const CVEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const cvPreviewRef = useRef(null);
  const aiRequestRef = useRef(0);
  const fileInputRef = useRef(null);

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
  const [uploadingCV, setUploadingCV] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
        // Kiểm tra xem có CV vừa được tải lên từ kho mẫu hoặc trang danh sách không
        const cachedUpload = sessionStorage.getItem('pendingUploadedCV');
        if (cachedUpload) {
          try {
            const parsed = JSON.parse(cachedUpload);
            sessionStorage.removeItem('pendingUploadedCV');
            setCvData(parsed);
            setMessage({
              type: 'success',
              text: '✨ Đã tải lên và trích xuất thành công CV từ file của bạn! Bạn có thể chỉnh sửa và lưu lại.',
            });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error loading pending uploaded CV:', e);
          }
        }

        // Create new CV - load student profile to auto-populate
        const profRes = await api.get('/students/profile');
        const urlParams = new URLSearchParams(window.location.search);
        const initialTemplate = urlParams.get('template') || 'topcv-blue';
        
        if (profRes.data.success) {
          const student = profRes.data.data.student;
          setCvData({
            title: `CV - ${student.fullName} - ${student.desiredPositions?.[0] || 'Developer'}`,
            template: initialTemplate,
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

  // Tải lên và AI phân tích CV
  const handleCVFileUpload = async (file) => {
    if (!file) return;
    const validExtensions = /\.(pdf|docx|doc|txt|json|png|jpg|jpeg|webp)$/i;
    if (!validExtensions.test(file.name)) {
      setMessage({
        type: 'error',
        text: 'Định dạng file chưa được hỗ trợ. Vui lòng tải file PDF, Word (DOCX/DOC), TXT hoặc Ảnh CV.',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'File quá lớn (tối đa 10MB). Vui lòng chọn file nhẹ hơn.',
      });
      return;
    }

    setUploadingCV(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template', cvData.template || 'topcv');

      const res = await api.post('/cvs/upload-and-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.data?.parsed) {
        const parsed = res.data.data.parsed;
        setCvData((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          template: prev.template || 'topcv',
          personalInfo: {
            ...prev.personalInfo,
            fullName: parsed.personalInfo?.fullName || prev.personalInfo?.fullName || '',
            email: parsed.personalInfo?.email || prev.personalInfo?.email || '',
            phone: parsed.personalInfo?.phone || prev.personalInfo?.phone || '',
            address: parsed.personalInfo?.address || prev.personalInfo?.address || '',
            title: parsed.personalInfo?.title || prev.personalInfo?.title || 'Chuyên viên',
            avatar: parsed.personalInfo?.avatar || prev.personalInfo?.avatar || '',
            dob: parsed.personalInfo?.dob || prev.personalInfo?.dob || '',
            website: parsed.personalInfo?.website || prev.personalInfo?.website || '',
          },
          careerObjective: parsed.careerObjective || prev.careerObjective || '',
          skills: parsed.skills?.length ? parsed.skills : prev.skills,
          education: parsed.education?.length ? parsed.education : prev.education,
          experiences: parsed.experiences?.length ? parsed.experiences : prev.experiences,
          projects: parsed.projects?.length ? parsed.projects : prev.projects,
          certificates: parsed.certificates?.length ? parsed.certificates : prev.certificates,
          languages: parsed.languages?.length ? parsed.languages : prev.languages,
          hobbies: parsed.hobbies?.length ? parsed.hobbies : prev.hobbies,
        }));

        setMessage({
          type: 'success',
          text: `✨ Đã tải lên và trích xuất thành công CV từ file "${file.name}"! Bạn có thể xem trước mẫu CV và chỉnh sửa thông tin.`,
        });
      } else {
        throw new Error(res.data.message || 'Không thể trích xuất thông tin từ file.');
      }
    } catch (err) {
      console.error('Error uploading CV file:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tải lên và phân tích file CV.',
      });
    } finally {
      setUploadingCV(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Export PDF via native Print Dialog
  const handleExportPDF = () => {
    // Native print dialog is much better for Tailwind v4 (oklch support) 
    // and produces selectable, ATS-friendly vector PDFs instead of blurry images.
    document.title = `${cvData.title || 'CV'}.pdf`;
    window.print();
    document.title = 'AI Career'; // restore title
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-slate-500">Đang chuẩn bị trình tạo CV...</p>
      </div>
    );
  }

  const baseLayout = (cvData.template || 'topcv').split('-')[0];
  const colorTheme = (cvData.template || 'topcv').split('-')[1] || 'blue';

  const themeColors = {
    blue: { primary: '#1d4ed8', bgLight: '#eff6ff', text: '#1e3a8a', skillBg: '#dbeafe' },
    emerald: { primary: '#059669', bgLight: '#ecfdf5', text: '#064e3b', skillBg: '#d1fae5' },
    purple: { primary: '#6d28d9', bgLight: '#f5f3ff', text: '#4c1d95', skillBg: '#ede9fe' },
    indigo: { primary: '#4338ca', bgLight: '#e0e7ff', text: '#312e81', skillBg: '#e0e7ff' },
    rose: { primary: '#e11d48', bgLight: '#fff1f2', text: '#881337', skillBg: '#ffe4e6' },
    teal: { primary: '#0f766e', bgLight: '#f0fdfa', text: '#115e59', skillBg: '#ccfbf1' },
    slate: { primary: '#334155', bgLight: '#f8fafc', text: '#0f172a', skillBg: '#e2e8f0' },
    gray: { primary: '#4b5563', bgLight: '#f3f4f6', text: '#111827', skillBg: '#e5e7eb' },
    zinc: { primary: '#3f3f46', bgLight: '#f4f4f5', text: '#18181b', skillBg: '#e4e4e7' },
    sky: { primary: '#0284c7', bgLight: '#f0f9ff', text: '#0c4a6e', skillBg: '#e0f2fe' },
    neutral: { primary: '#404040', bgLight: '#f5f5f5', text: '#171717', skillBg: '#e5e5e5' },
    amber: { primary: '#d97706', bgLight: '#fffbeb', text: '#78350f', skillBg: '#fef3c7' },
  };
  const theme = themeColors[colorTheme] || themeColors.blue;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvData({
          ...cvData,
          personalInfo: { ...cvData.personalInfo, avatar: reader.result }
        });
      };
      reader.readAsDataURL(file);
    }
  };

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

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">

          {/* Nút tải lên CV */}
          <label className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50">
            <UploadCloud className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="truncate">{uploadingCV ? 'Đang đọc...' : 'Tải lên CV'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.json,image/*"
              className="hidden"
              disabled={uploadingCV}
              onChange={(e) => {
                if (e.target.files?.[0]) handleCVFileUpload(e.target.files[0]);
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={generatingAI || uploadingCV}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="truncate">{generatingAI ? 'AI đang viết...' : 'AI Viết lại'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingCV}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span className="truncate">{saving ? 'Đang lưu...' : 'Lưu CV'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={downloadingPDF || uploadingCV}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">{downloadingPDF ? 'Đang xuất...' : 'Tải PDF'}</span>
          </button>
        </div>
      </div>

      {uploadingCV && (
        <div role="status" className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm text-indigo-900 flex items-center gap-3 animate-pulse">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
          <span>Trợ lý AI đang đọc file CV và trích xuất dữ liệu (thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng)... Vui lòng đợi trong giây lát!</span>
        </div>
      )}

      {generatingAI && <p role="status" className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">ChatGPT đang viết lại mục tiêu nghề nghiệp. Vui lòng giữ trang này mở trong lúc chờ kết quả.</p>}

      {message.text && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-white p-1 rounded-2xl border border-slate-200 shadow-xs mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Soạn thảo thông tin</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem trước & Mẫu CV</span>
        </button>
      </div>

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] xl:grid-cols-[220px_1fr_1.5fr] gap-6">
        
        {/* Navigation Sidebar (Nội dung hồ sơ) */}
        <div className="hidden xl:block">
          <div className="sticky top-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 tracking-wider">Nội dung hồ sơ</h3>
            <ul className="space-y-3">
              {[
                { id: 'personalInfo', label: 'Thông tin cơ bản', num: '01' },
                { id: 'careerObjective', label: 'Định hướng nghề', num: '02' },
                { id: 'skills', label: 'Kỹ năng chuyên môn', num: '03' },
                { id: 'education', label: 'Học vấn', num: '04' },
                { id: 'experiences', label: 'Kinh nghiệm', num: '05' },
                { id: 'projects', label: 'Dự án', num: '06' },
                { id: 'certificates', label: 'Chứng chỉ', num: '07' },
                { id: 'hobbies', label: 'Sở thích', num: '08' },
              ].map((item) => (
                <li key={item.id}>
                  <button 
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`section-${item.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-indigo-600 transition-colors py-1 group w-full text-left"
                  >
                    <span className="text-slate-400 font-mono text-xs group-hover:text-indigo-400 font-bold">{item.num}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form Editor */}
        <div className={`bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6 max-h-[85vh] overflow-y-auto scroll-smooth ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Quick CV Upload Dropzone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleCVFileUpload(e.dataTransfer.files[0]);
            }}
            className={`relative overflow-hidden rounded-2xl border-2 transition-all p-4 ${
              dragOver 
                ? 'border-indigo-500 bg-indigo-50 shadow-md scale-[1.01]' 
                : 'border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-teal-50/40 hover:border-indigo-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                  {uploadingCV ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      {uploadingCV ? 'Trí tuệ nhân tạo đang trích xuất CV...' : 'Tải lên CV có sẵn để điền tự động'}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
                      AI Parser
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ <span className="font-semibold text-slate-700">PDF, Word (DOCX), TXT</span> hoặc ảnh. Kéo thả file vào đây hoặc bấm nút.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCV}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <FileUp className="w-3.5 h-3.5 text-indigo-300" />
                <span>{uploadingCV ? 'Đang trích xuất...' : 'Chọn file CV'}</span>
              </button>
            </div>
          </div>

          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Nội dung chi tiết CV
          </h2>

          {/* Personal Info */}
          <div id="section-personalInfo" className="space-y-3 pt-2">
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
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Chọn ảnh đại diện"
                />
                <div className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors pointer-events-none">
                  <span className="truncate">{cvData.personalInfo?.avatar ? 'Đã tải ảnh lên (Bấm để đổi)' : 'Tải ảnh đại diện lên...'}</span>
                </div>
              </div>
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
          <div id="section-careerObjective" className="space-y-2 pt-2">
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
          <div id="section-skills" className="space-y-2 pt-2">
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
          <div id="section-hobbies" className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-indigo-600 uppercase">Sở thích</h3>
            <input
              type="text"
              value={(cvData.hobbies || []).join(', ')}
              onChange={(e) => setCvData({ ...cvData, hobbies: e.target.value.split(',').map(h => h.trim()).filter(Boolean) })}
              placeholder="Đọc sách, Nghe nhạc, Nấu ăn... (cách nhau dấu phẩy)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
            />
          </div>

          {/* Education */}
          <div id="section-education" className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-indigo-600 uppercase">Học vấn</h3>
              <button type="button" onClick={() => setCvData({ ...cvData, education: [...(cvData.education || []), { school: '', major: '', startYear: '', endYear: '', degree: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">+ Thêm</button>
            </div>
            {(cvData.education || []).map((edu, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative mt-2">
                <button type="button" onClick={() => setCvData({ ...cvData, education: cvData.education.filter((_, i) => i !== idx) })} className="absolute top-2 right-3 text-slate-400 hover:text-rose-600 font-bold text-lg">×</button>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <input type="text" placeholder="Trường (VD: ĐH Bách Khoa)" value={edu.school} onChange={(e) => { const newEdu = [...cvData.education]; newEdu[idx].school = e.target.value; setCvData({ ...cvData, education: newEdu }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Chuyên ngành" value={edu.major} onChange={(e) => { const newEdu = [...cvData.education]; newEdu[idx].major = e.target.value; setCvData({ ...cvData, education: newEdu }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Năm bắt đầu" value={edu.startYear} onChange={(e) => { const newEdu = [...cvData.education]; newEdu[idx].startYear = e.target.value; setCvData({ ...cvData, education: newEdu }); }} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Năm kết thúc" value={edu.endYear} onChange={(e) => { const newEdu = [...cvData.education]; newEdu[idx].endYear = e.target.value; setCvData({ ...cvData, education: newEdu }); }} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Xếp loại (Giỏi, Khá...)" value={edu.degree} onChange={(e) => { const newEdu = [...cvData.education]; newEdu[idx].degree = e.target.value; setCvData({ ...cvData, education: newEdu }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Experience */}
          <div id="section-experiences" className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-indigo-600 uppercase">Kinh nghiệm làm việc</h3>
              <button type="button" onClick={() => setCvData({ ...cvData, experiences: [...(cvData.experiences || []), { company: '', position: '', startDate: '', endDate: '', isCurrent: false, description: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">+ Thêm</button>
            </div>
            {(cvData.experiences || []).map((exp, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative mt-2">
                <button type="button" onClick={() => setCvData({ ...cvData, experiences: cvData.experiences.filter((_, i) => i !== idx) })} className="absolute top-2 right-3 text-slate-400 hover:text-rose-600 font-bold text-lg">×</button>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <input type="text" placeholder="Công ty" value={exp.company} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].company = e.target.value; setCvData({ ...cvData, experiences: newExp }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Vị trí (VD: Frontend Developer)" value={exp.position} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].position = e.target.value; setCvData({ ...cvData, experiences: newExp }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Bắt đầu (VD: 01/2020)" value={exp.startDate} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].startDate = e.target.value; setCvData({ ...cvData, experiences: newExp }); }} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Kết thúc (VD: 12/2022)" value={exp.endDate} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].endDate = e.target.value; setCvData({ ...cvData, experiences: newExp }); }} disabled={exp.isCurrent} className="px-3 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-50" />
                  <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 py-1">
                    <input type="checkbox" checked={exp.isCurrent} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].isCurrent = e.target.checked; setCvData({ ...cvData, experiences: newExp }); }} className="rounded text-indigo-600" /> Hiện đang làm việc tại đây
                  </label>
                  <textarea rows={3} placeholder="Mô tả công việc và thành tựu..." value={exp.description} onChange={(e) => { const newExp = [...cvData.experiences]; newExp[idx].description = e.target.value; setCvData({ ...cvData, experiences: newExp }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div id="section-projects" className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-indigo-600 uppercase">Dự án</h3>
              <button type="button" onClick={() => setCvData({ ...cvData, projects: [...(cvData.projects || []), { name: '', role: '', startDate: '', endDate: '', description: '', technologies: [] }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">+ Thêm</button>
            </div>
            {(cvData.projects || []).map((prj, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative mt-2">
                <button type="button" onClick={() => setCvData({ ...cvData, projects: cvData.projects.filter((_, i) => i !== idx) })} className="absolute top-2 right-3 text-slate-400 hover:text-rose-600 font-bold text-lg">×</button>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <input type="text" placeholder="Tên dự án" value={prj.name} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].name = e.target.value; setCvData({ ...cvData, projects: newPrj }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Vai trò (VD: Fullstack)" value={prj.role} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].role = e.target.value; setCvData({ ...cvData, projects: newPrj }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Bắt đầu (VD: 01/2021)" value={prj.startDate} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].startDate = e.target.value; setCvData({ ...cvData, projects: newPrj }); }} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Kết thúc (VD: 06/2021)" value={prj.endDate} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].endDate = e.target.value; setCvData({ ...cvData, projects: newPrj }); }} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Công nghệ (ngăn cách bằng dấu phẩy)" value={prj.technologies?.join(', ') || ''} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].technologies = e.target.value.split(',').map(t => t.trim()).filter(Boolean); setCvData({ ...cvData, projects: newPrj }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <textarea rows={3} placeholder="Mô tả dự án..." value={prj.description} onChange={(e) => { const newPrj = [...cvData.projects]; newPrj[idx].description = e.target.value; setCvData({ ...cvData, projects: newPrj }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                </div>
              </div>
            ))}
          </div>
          {/* Certificates */}
          <div id="section-certificates" className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-indigo-600 uppercase">Chứng chỉ & Ngoại ngữ</h3>
              <button type="button" onClick={() => setCvData({ ...cvData, certificates: [...(cvData.certificates || []), { name: '', time: '' }] })} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">+ Thêm</button>
            </div>
            {(cvData.certificates || []).map((cert, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative mt-2">
                <button type="button" onClick={() => setCvData({ ...cvData, certificates: cvData.certificates.filter((_, i) => i !== idx) })} className="absolute top-2 right-3 text-slate-400 hover:text-rose-600 font-bold text-lg">×</button>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <input type="text" placeholder="Tên chứng chỉ (VD: IELTS 7.5)" value={cert.name} onChange={(e) => { const newCert = [...(cvData.certificates || [])]; newCert[idx].name = e.target.value; setCvData({ ...cvData, certificates: newCert }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                  <input type="text" placeholder="Thời gian (VD: 2023)" value={cert.time} onChange={(e) => { const newCert = [...(cvData.certificates || [])]; newCert[idx].time = e.target.value; setCvData({ ...cvData, certificates: newCert }); }} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Column: Live CV Preview Paper */}
        <div className={`flex flex-col gap-3 min-w-0 ${activeTab === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Quick Layout & Color Switcher Bar 2026 */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-none">
              <button
                type="button"
                onClick={() => setCvData({ ...cvData, template: `topcv-${colorTheme}` })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${baseLayout === 'topcv' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                TopCV Pro 2026
              </button>
              <button
                type="button"
                onClick={() => setCvData({ ...cvData, template: `modern-${colorTheme}` })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${baseLayout === 'modern' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Modern Tech
              </button>
              <button
                type="button"
                onClick={() => setCvData({ ...cvData, template: `classic-${colorTheme}` })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${baseLayout === 'classic' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Harvard ATS
              </button>
              <button
                type="button"
                onClick={() => setCvData({ ...cvData, template: `minimal-${colorTheme}` })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${baseLayout === 'minimal' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tối Giản 2026
              </button>
            </div>

            {/* Color Palette Selector */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'blue', hex: '#2563eb', label: 'Navy' },
                { id: 'emerald', hex: '#059669', label: 'Emerald' },
                { id: 'purple', hex: '#7c3aed', label: 'Purple' },
                { id: 'indigo', hex: '#4f46e5', label: 'Indigo' },
                { id: 'rose', hex: '#e11d48', label: 'Rose' },
                { id: 'teal', hex: '#0d9488', label: 'Teal' },
                { id: 'slate', hex: '#334155', label: 'Slate' },
                { id: 'amber', hex: '#d97706', label: 'Amber' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setCvData({ ...cvData, template: `${baseLayout}-${c.id}` })}
                  className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${colorTheme === c.id ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 border-white' : 'border-white opacity-70 hover:opacity-100 hover:scale-110'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <ResponsiveCVWrapper>
            <CVPreviewComponent 
              cvData={cvData} 
              baseLayout={baseLayout} 
              colorTheme={colorTheme} 
              innerRef={cvPreviewRef} 
            />
          </ResponsiveCVWrapper>
        </div>
      </div>
    </div>
  );
};

export default CVEditorPage;
