import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Sparkles, Layout, ChevronRight, UploadCloud, 
  FileUp, AlertCircle, Eye, X, Palette, CheckCircle2, ShieldCheck, 
  Flame, Zap, Compass, Award
} from 'lucide-react';
import api from '../../services/api';
import CVPreviewComponent from '../../components/cv/CVPreviewComponent';

// 12+ Mẫu CV Xu Hướng 2026 Đỉnh Cao
const TEMPLATES = [
  { 
    id: 'topcv-blue', 
    name: 'TopCV Executive Pro 2026', 
    layout: 'topcv', 
    category: 'Tiêu chuẩn', 
    desc: 'Bố cục 2 cột tiêu chuẩn điều hành cấp cao. Sidebar phân cấp thông tin khoa học kết hợp timeline kinh nghiệm tinh gọn.', 
    color: 'blue', 
    badge: 'TOP 1 XU HƯỚNG 🔥',
    isTrending: true
  },
  { 
    id: 'modern-indigo', 
    name: 'Tech Leader & Architect 2026', 
    layout: 'modern', 
    category: 'Hiện đại', 
    desc: 'Header chuyển sắc công nghệ cao, layout 2 cột hiện đại tối ưu hóa hiển thị tech stack và dự án triệu users.', 
    color: 'indigo', 
    badge: 'HOT 2026 ⚡',
    isTrending: true
  },
  { 
    id: 'classic-slate', 
    name: 'Harvard Executive ATS 2026', 
    layout: 'classic', 
    category: 'Chuẩn ATS', 
    desc: 'Font chữ cổ điển sang trọng, cấu trúc 1 cột chuẩn Harvard vượt qua 100% bộ lọc ATS của các tập đoàn đa quốc gia.', 
    color: 'slate', 
    badge: 'CHUẨN ATS 100%',
    isTrending: true
  },
  { 
    id: 'minimal-sky', 
    name: 'Nordic Clean Editorial 2026', 
    layout: 'minimal', 
    category: 'Tối giản', 
    desc: 'Phong cách biên tập Bắc Âu tối giản, phân cấp typography số hóa 01, 02 sang trọng cho các vị trí quản lý và sáng tạo.', 
    color: 'sky', 
    badge: 'MỚI NHẤT',
    isTrending: true
  },
  { 
    id: 'topcv-emerald', 
    name: 'Emerald Tech Master 2026', 
    layout: 'topcv', 
    category: 'Tiêu chuẩn', 
    desc: 'Sắc ngọc lục bảo biểu trưng cho sự thịnh vượng và năng lượng tích cực. Phù hợp cho Developer, PM và Data Specialist.', 
    color: 'emerald', 
    badge: 'PHỔ BIẾN',
    isTrending: false
  },
  { 
    id: 'modern-rose', 
    name: 'Marketing & Art Director', 
    layout: 'modern', 
    category: 'Hiện đại', 
    desc: 'Gam màu Rose Gold quý phái kết hợp đường nét thanh thoát, tạo dấu ấn thị giác độc đáo cho ứng viên ngành Sáng tạo & Media.', 
    color: 'rose', 
    badge: 'CREATIVE',
    isTrending: false
  },
  { 
    id: 'topcv-purple', 
    name: 'Creative Lavender Pro', 
    layout: 'topcv', 
    category: 'Tiêu chuẩn', 
    desc: 'Bản phối tím công nghệ thời thượng. Làm bật nổi các thành tích, giải thưởng và dự án nghiên cứu then chốt.', 
    color: 'purple', 
    badge: '',
    isTrending: false
  },
  { 
    id: 'modern-teal', 
    name: 'Fintech & Banking Innovator', 
    layout: 'modern', 
    category: 'Hiện đại', 
    desc: 'Thiết kế hiện đại chuẩn quốc tế dành riêng cho chuyên gia tài chính, phân tích nghiệp vụ (BA) và ngân hàng số.', 
    color: 'teal', 
    badge: 'PREMIUM',
    isTrending: false
  },
  { 
    id: 'classic-amber', 
    name: 'Oxford Academic & Scholar', 
    layout: 'classic', 
    category: 'Chuẩn ATS', 
    desc: 'Được tinh chỉnh theo chuẩn học thuật châu Âu, tối ưu cho nghiên cứu sinh, ứng tuyển học bổng hoặc giảng viên.', 
    color: 'amber', 
    badge: 'ACADEMIC',
    isTrending: false
  },
  { 
    id: 'minimal-neutral', 
    name: 'Cyber Midnight Developer', 
    layout: 'minimal', 
    category: 'Tối giản', 
    desc: 'Thiết kế tối giản tông đen nhám sang trọng, thể hiện phong thái tự tin và năng lực giải quyết vấn đề vượt trội.', 
    color: 'neutral', 
    badge: 'PRO DEV',
    isTrending: false
  },
  { 
    id: 'classic-neutral', 
    name: 'Wall Street Senior Consultant', 
    layout: 'classic', 
    category: 'Chuẩn ATS', 
    desc: 'Phong thái cố vấn cấp cao với sự chuẩn xác đến từng milimet, thu hút các quỹ đầu tư mạo hiểm và công ty tư vấn.', 
    color: 'neutral', 
    badge: '',
    isTrending: false
  },
  { 
    id: 'minimal-emerald', 
    name: 'Eco Modernist Portfolio', 
    layout: 'minimal', 
    category: 'Tối giản', 
    desc: 'Sự hòa quyện giữa không gian trắng tinh khôi và điểm nhấn xanh mạ thanh lịch, làm nổi bật lộ trình thăng tiến.', 
    color: 'emerald', 
    badge: 'THANH LỊCH',
    isTrending: false
  },
];

const CATEGORIES = ['Tất cả', 'Xu hướng 2026 🔥', 'Tiêu chuẩn', 'Hiện đại', 'Chuẩn ATS', 'Tối giản'];

// Dữ liệu mẫu chuẩn 2026 giàu thực tế cho thumbnail và preview modal
const previewData = {
  personalInfo: { 
    fullName: 'HOÀNG GIA HUY', 
    title: 'SENIOR TECH LEAD & ARCHITECT', 
    phone: '0987 654 321', 
    email: 'giahuy.tech@gmail.com', 
    address: 'Quận 1, TP. Hồ Chí Minh',
    website: 'giahuy.dev',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' 
  },
  skills: ['React & Next.js', 'System Architecture', 'Node.js & Go', 'Tailwind CSS', 'TypeScript', 'Cloud & DevOps', 'AI Prompt Eng'],
  careerObjective: 'Hơn 5+ năm kinh nghiệm kiến tạo các hệ thống công nghệ phục vụ hàng triệu người dùng. Mục tiêu trở thành Head of Engineering tại các tập đoàn tiên phong về giải pháp AI và Chuyển đổi số.',
  experiences: [
    { 
      position: 'Senior Lead Engineer', 
      company: 'Tech Corp Vietnam', 
      startDate: '2023', 
      isCurrent: true, 
      description: 'Lãnh đạo đội ngũ kỹ sư 12 người xây dựng hệ thống Microservices chịu tải cao.\nTối ưu hiệu năng tăng 45% tốc độ tải trang và tiết kiệm 30% chi phí hạ tầng Cloud.' 
    },
    { 
      position: 'Fullstack Developer', 
      company: 'Global Digital Solutions', 
      startDate: '2021', 
      endDate: '2023', 
      description: 'Phát triển các ứng dụng Fintech cốt lõi phục vụ 500k người dùng hoạt động thường nhật.' 
    }
  ],
  education: [
    { 
      school: 'Đại Học Bách Khoa TP.HCM', 
      major: 'Kỹ Thuật Phần Mềm & Trí Tuệ Nhân Tạo', 
      startYear: '2017', 
      endYear: '2021', 
      degree: 'Xuất sắc' 
    }
  ],
  projects: [
    { 
      name: 'Nền Tảng AI Career & Tuyển Dụng Thông Minh', 
      role: 'Project Lead & Solution Architect', 
      startDate: '03/2024', 
      endDate: '10/2024',
      description: 'Tích hợp AI phân tích CV tự động và thuật toán matching công việc chuẩn xác 96%.',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'OpenAI API']
    }
  ],
  certificates: [
    { name: 'AWS Certified Solutions Architect', time: '2024' },
    { name: 'Google Cloud Professional Cloud Architect', time: '2023' }
  ],
  languages: [
    { name: 'Tiếng Anh', level: 'IELTS 7.5' },
    { name: 'Tiếng Nhật', level: 'N3' }
  ]
};

// Component Thumbnail chuẩn A4 tự căn chỉnh tỉ lệ 100% không bị lệch mép hay khoảng xám trống
const CVCardThumbnail = ({ layout, color, cvData }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.36);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const width = containerRef.current.offsetWidth;
      if (width > 0) {
        // Chiều rộng A4 chuẩn là 794px (~210mm ở 96 DPI)
        setScale(width / 794);
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
      className="relative w-full aspect-[210/297] rounded-2xl overflow-hidden bg-white shadow-inner flex items-start justify-center border border-slate-100"
    >
      <div 
        style={{
          width: '794px',
          height: '1123px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
        className="shrink-0 transition-transform duration-300"
      >
        <CVPreviewComponent 
          cvData={cvData} 
          baseLayout={layout} 
          colorTheme={color} 
        />
      </div>
    </div>
  );
};

// Component xem trước phóng to tự động căn chỉnh tỉ lệ cho điện thoại và máy tính
const ModalPreviewWrapper = ({ cvData, layout, color }) => {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const updateScale = () => {
      const availableWidth = wrapperRef.current.offsetWidth - 24;
      if (availableWidth > 0) {
        setScale(Math.min(1, Math.max(0.35, availableWidth / 794)));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="w-full flex justify-center items-start overflow-hidden">
      <div 
        style={{
          width: '794px',
          minHeight: '1123px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: scale < 1 ? `calc((1123px * ${scale}) - 1123px)` : 0
        }}
        className="shadow-2xl rounded-sm overflow-hidden border border-slate-300/80 bg-white shrink-0 transition-transform duration-200"
      >
        <CVPreviewComponent 
          cvData={cvData} 
          baseLayout={layout} 
          colorTheme={color} 
        />
      </div>
    </div>
  );
};

const CVTemplatesPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Quick Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    template: null,
    selectedColor: 'blue'
  });

  const filteredTemplates = activeCategory === 'Tất cả' 
    ? TEMPLATES 
    : activeCategory === 'Xu hướng 2026 🔥'
      ? TEMPLATES.filter(t => t.isTrending)
      : TEMPLATES.filter(t => t.category === activeCategory);

  const handleSelect = (tmpl, customColor = null) => {
    const color = customColor || tmpl.color;
    // Chuyển hướng sang CV Editor với template id chuẩn layout-color
    navigate(`/cv-editor?template=${tmpl.layout}-${color}`);
  };

  const openPreviewModal = (e, tmpl) => {
    e.stopPropagation();
    setPreviewModal({
      isOpen: true,
      template: tmpl,
      selectedColor: tmpl.color
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      template: null,
      selectedColor: 'blue'
    });
  };

  const handleUploadCV = async (file) => {
    if (!file) return;
    const validExtensions = /\.(pdf|docx|doc|txt|json|png|jpg|jpeg|webp)$/i;
    if (!validExtensions.test(file.name)) {
      setUploadError('Định dạng file chưa được hỗ trợ. Vui lòng tải file PDF, Word (DOCX/DOC), TXT hoặc Ảnh CV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File vượt quá kích thước 10MB.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template', 'topcv-blue');

      const res = await api.post('/cvs/upload-and-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.data?.parsed) {
        sessionStorage.setItem('pendingUploadedCV', JSON.stringify(res.data.data.parsed));
        navigate('/cv-editor?template=topcv-blue');
      } else {
        throw new Error(res.data.message || 'Không thể trích xuất nội dung file.');
      }
    } catch (err) {
      console.error('Error uploading CV in templates page:', err);
      setUploadError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tải lên và phân tích CV.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const colorPaletteOptions = [
    { key: 'blue', label: 'Navy Blue', hex: '#2563eb' },
    { key: 'emerald', label: 'Emerald Green', hex: '#059669' },
    { key: 'purple', label: 'Lavender Purple', hex: '#7c3aed' },
    { key: 'indigo', label: 'Indigo Tech', hex: '#4f46e5' },
    { key: 'rose', label: 'Rose Gold', hex: '#e11d48' },
    { key: 'teal', label: 'Teal Modern', hex: '#0d9488' },
    { key: 'slate', label: 'Slate Minimal', hex: '#334155' },
    { key: 'amber', label: 'Amber Warm', hex: '#d97706' },
  ];

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* Background Decor 2026 */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-50/80 via-purple-50/40 to-transparent pointer-events-none" />
      <div className="absolute top-12 left-1/4 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-[450px] h-[450px] bg-purple-200/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/cvs" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Quản lý CV</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Chuẩn ATS • Tải PDF Vector Miễn Phí</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 shadow-xs">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
              BỘ SƯU TẬP MẪU CV 2026 ĐẲNG CẤP
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Mẫu CV Hiện Đại <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">Đẹp Nhất 2026</span>
          </h1>

          <p className="max-w-2xl text-slate-600 text-base sm:text-lg leading-relaxed">
            Thiết kế bứt phá theo tiêu chuẩn thẩm mỹ mới nhất 2026. Tối ưu hóa phân tầng thị giác, hiển thị sắc nét chuẩn A4 và chinh phục mọi thuật toán lọc CV (ATS) toàn cầu.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Chuẩn hệ thống ATS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
              <Palette className="w-3.5 h-3.5 text-purple-600" /> Đổi màu sắc thời thượng
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Tự động điền dữ liệu bằng AI
            </span>
          </div>

          {/* Quick CV Upload Card */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleUploadCV(e.dataTransfer.files[0]);
            }}
            className={`w-full max-w-3xl rounded-3xl border-2 transition-all p-6 backdrop-blur-md ${
              dragOver 
                ? 'border-indigo-500 bg-indigo-50/80 shadow-2xl scale-[1.01]' 
                : 'border-dashed border-indigo-200/90 bg-white/90 shadow-xl shadow-indigo-500/5 hover:border-indigo-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-white border-t-transparent" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {uploading ? 'Trí tuệ nhân tạo đang phân tích CV...' : 'Bạn đã có sẵn file CV cũ?'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase tracking-wider">
                      AI Import
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
                    Tải lên file <strong className="text-slate-800">PDF, Word (DOCX) hoặc TXT</strong>. AI trích xuất tức thì và chuyển đổi sang thiết kế 2026 chỉ sau 3 giây!
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.json,image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUploadCV(e.target.files[0]);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>{uploading ? 'Đang trích xuất...' : 'Tải lên CV ngay'}</span>
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 pt-4 w-full overflow-x-auto pb-2 scrollbar-none sm:justify-center px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid 2026 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7 sm:gap-8">
          {filteredTemplates.map((tmpl) => (
            <div 
              key={tmpl.id}
              className="group relative bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/15 hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
              onClick={() => handleSelect(tmpl)}
            >
              {/* Thumbnail Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100/80">
                <CVCardThumbnail 
                  layout={tmpl.layout} 
                  color={tmpl.color} 
                  cvData={previewData} 
                />

                {/* Badge góc trên */}
                {tmpl.badge && (
                  <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <span className={`px-2.5 py-1 rounded-full text-2xs font-black text-white shadow-md tracking-wider uppercase ${
                      tmpl.badge.includes('TOP') || tmpl.badge.includes('HOT') 
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500' 
                        : tmpl.badge.includes('ATS') 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                          : tmpl.badge.includes('PRO') 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                            : 'bg-slate-800'
                    }`}>
                      {tmpl.badge}
                    </span>
                  </div>
                )}

                {/* Overlay Action Buttons on Hover */}
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-4">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(tmpl);
                    }}
                    className="w-full max-w-[190px] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dùng mẫu này</span>
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => openPreviewModal(e, tmpl)}
                    className="w-full max-w-[190px] py-2.5 px-4 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-bold text-xs shadow-md flex items-center justify-center gap-2 transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Xem trước chi tiết</span>
                  </button>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="pt-4 pb-2 px-2 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                  {tmpl.desc}
                </p>

                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <span className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5 text-indigo-600" /> Sẵn sàng tạo
                  </span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Layout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy mẫu phù hợp</h3>
            <p className="text-sm text-slate-500 mt-1">Vui lòng chọn danh mục khác để khám phá kho mẫu CV 2026.</p>
          </div>
        )}

      </div>

      {/* ========================================================
          QUICK PREVIEW & COLOR SWITCHER MODAL (2026 Interactive)
         ======================================================== */}
      {previewModal.isOpen && previewModal.template && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closePreviewModal}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    {previewModal.template.name}
                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-indigo-200 uppercase">
                      {previewModal.template.category}
                    </span>
                  </h2>
                  <p className="text-2xs text-slate-400">Xem trước chuẩn khổ in A4 (210 × 297 mm)</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={closePreviewModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Control Bar (Color Switcher) */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Tùy biến bảng màu 2026:</span>
                <div className="flex items-center gap-1.5 ml-1">
                  {colorPaletteOptions.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      title={c.label}
                      onClick={() => setPreviewModal(prev => ({ ...prev, selectedColor: c.key }))}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        previewModal.selectedColor === c.key 
                          ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 border-white' 
                          : 'border-white/60 hover:scale-110 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelect(previewModal.template, previewModal.selectedColor)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Dùng mẫu này ngay</span>
                </button>
              </div>
            </div>

            {/* Modal A4 Preview Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-100/70 flex justify-center">
              <ModalPreviewWrapper 
                cvData={previewData} 
                layout={previewModal.template.layout} 
                color={previewModal.selectedColor} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CVTemplatesPage;
