import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Layout, ChevronRight, UploadCloud, FileUp, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import CVPreviewComponent from '../../components/cv/CVPreviewComponent';

const TEMPLATES = [
  { id: 'topcv-blue', name: 'Tiêu chuẩn', layout: 'topcv', category: 'Tiêu chuẩn', image: '/templates/topcv.jpg', desc: 'Mẫu CV ngắn gọn với bố cục rõ ràng, giúp nhà tuyển dụng nắm bắt ngay được những thông tin quan trọng.', color: 'blue', badge: 'PHỔ BIẾN' },
  { id: 'topcv-green', name: 'Chuyên môn hoá', layout: 'topcv', category: 'Tiêu chuẩn', image: '/templates/topcv.jpg', desc: 'Mẫu CV phù hợp cho ứng viên đã có nhiều kinh nghiệm trong nghề. Trình bày các nhiệm vụ và thành tích bản thân đã đạt được.', color: 'emerald', badge: '' },
  { id: 'topcv-purple', name: 'Tinh gọn', layout: 'topcv', category: 'Tiêu chuẩn', image: '/templates/topcv.jpg', desc: 'Mẫu CV xin việc đơn giản nhưng vẫn hiện đại và theo kịp xu hướng. Điểm nhấn là kinh nghiệm làm việc.', color: 'purple', badge: '' },
  { id: 'modern-indigo', name: 'Sáng tạo', layout: 'modern', category: 'Hiện đại', image: '/templates/modern.jpg', desc: 'Mẫu CV đột phá - tận dụng màu sắc và hình ảnh để làm nổi bật. Phù hợp với ngành nghề Sáng tạo - Nghệ thuật.', color: 'indigo', badge: 'HOT' },
  { id: 'modern-rose', name: 'Nổi bật', layout: 'modern', category: 'Hiện đại', image: '/templates/modern.jpg', desc: 'Bố cục độc đáo giúp CV của bạn không thể bị nhầm lẫn trong hàng ngàn hồ sơ khác.', color: 'rose', badge: '' },
  { id: 'modern-emerald', name: 'Thanh lịch', layout: 'modern', category: 'Hiện đại', image: '/templates/modern.jpg', desc: 'Sự kết hợp giữa hiện đại và sự tinh tế, mang lại cảm giác cực kỳ chuyên nghiệp và đáng tin cậy.', color: 'teal', badge: '' },
  { id: 'classic-serif', name: 'Truyền thống', layout: 'classic', category: 'Cổ điển', image: '/templates/classic.jpg', desc: 'Mẫu CV đơn giản - làm nổi bật thế mạnh của ứng viên. Phù hợp với người đã có nhiều kinh nghiệm.', color: 'slate', badge: 'CHUẨN ATS' },
  { id: 'classic-mono', name: 'Học thuật', layout: 'classic', category: 'Cổ điển', image: '/templates/classic.jpg', desc: 'Thiết kế theo chuẩn của các trường đại học hàng đầu, tập trung 100% vào nội dung nghiên cứu và kinh nghiệm.', color: 'gray', badge: '' },
  { id: 'classic-elegant', name: 'Trang trọng', layout: 'classic', category: 'Cổ điển', image: '/templates/classic.jpg', desc: 'Mẫu CV xin việc truyền thống với thiết kế tối giản và đề cao sự chuyên nghiệp. Phù hợp với Kinh tế - Ngân hàng.', color: 'zinc', badge: '' },
  { id: 'minimal-light', name: 'Hiện đại (Sáng)', layout: 'minimal', category: 'Tối giản', image: '/templates/minimal.jpg', desc: 'Phong cách tối giản hóa giúp người đọc tập trung vào năng lực của bạn thay vì bị xao nhãng.', color: 'sky', badge: 'MỚI' },
  { id: 'minimal-dark', name: 'Hiện đại (Tối)', layout: 'minimal', category: 'Tối giản', image: '/templates/minimal.jpg', desc: 'Chế độ Dark Mode cá tính, sang trọng và thu hút ánh nhìn ngay từ giây đầu tiên.', color: 'neutral', badge: 'PRO' },
  { id: 'minimal-colorful', name: 'Trẻ trung', layout: 'minimal', category: 'Tối giản', image: '/templates/minimal.jpg', desc: 'Mẫu CV tối giản kết hợp với các dải màu tươi sáng, lan tỏa năng lượng tích cực.', color: 'amber', badge: '' },
];

const CATEGORIES = ['Tất cả', 'Tiêu chuẩn', 'Hiện đại', 'Cổ điển', 'Tối giản'];

const previewData = {
  personalInfo: { fullName: 'GIA HUY', title: 'FRONTEND DEV', phone: '0987654321', email: 'huy@gmail.com', avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
  skills: ['ReactJS', 'Tailwind', 'NodeJS', 'Figma'],
  careerObjective: 'Trở thành Senior Frontend Developer trong 3 năm tới, đóng góp vào các sản phẩm triệu người dùng.',
  experiences: [{ position: 'Frontend Dev', company: 'Tech Corp', startDate: '01/2022', isCurrent: true, description: 'Phát triển UI/UX với ReactJS' }],
  education: [{ school: 'Đại Học Bách Khoa', major: 'CNTT', startYear: '2019', endYear: '2023', degree: 'Giỏi' }],
  projects: [{ name: 'E-Commerce Platform', role: 'Fullstack', startDate: '06/2023', endDate: '12/2023' }]
};

const CVTemplatesPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [hoveredId, setHoveredId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const filteredTemplates = activeCategory === 'Tất cả' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleSelect = (id) => {
    navigate(`/cv-editor?template=${id}`);
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
        // Lưu dữ liệu vào sessionStorage để trang CV Editor tự động lấy ra
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

  return (
    <div className="relative min-h-screen bg-[#fafcff] overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-50 via-purple-50/50 to-transparent z-0 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl z-0 pointer-events-none" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl z-0 pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          <Link to="/cvs" className="self-start sm:self-auto flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Quản lý CV</span>
          </Link>
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200/50">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-800 tracking-wide uppercase">Cập nhật 2026</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
            Khám phá kho <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Mẫu CV Đỉnh Cao</span>
          </h1>
          
          <p className="max-w-2xl text-slate-600 text-base sm:text-lg leading-relaxed">
            Hơn 12+ mẫu thiết kế đạt chuẩn ATS, được tối ưu hóa cho từng ngành nghề. Chọn một phong cách phản chiếu đúng cá tính của bạn và sẵn sàng chinh phục nhà tuyển dụng.
          </p>

          {/* Quick CV Upload Card */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleUploadCV(e.dataTransfer.files[0]);
            }}
            className={`w-full max-w-3xl rounded-3xl border-2 transition-all p-6 backdrop-blur-sm ${
              dragOver 
                ? 'border-indigo-500 bg-indigo-50 shadow-xl scale-[1.01]' 
                : 'border-dashed border-indigo-200/90 bg-white/80 shadow-md shadow-indigo-500/5 hover:border-indigo-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-white border-t-transparent" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {uploading ? 'Trí tuệ nhân tạo đang phân tích CV...' : 'Bạn đã có sẵn file CV riêng?'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase tracking-wider">
                      AI Import
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
                    Tải lên file <strong className="text-slate-800">PDF, Word (DOCX) hoặc TXT</strong>. AI sẽ tự động đọc, trích xuất toàn bộ thông tin và chuyển thẳng vào mẫu CV chỉ sau 3 giây!
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
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105"
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

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
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

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredTemplates.map((tmpl) => (
            <div 
              key={tmpl.id}
              className="group relative bg-white rounded-3xl p-3 border border-slate-200 shadow-xs hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
              onMouseEnter={() => setHoveredId(tmpl.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(tmpl.id)}
            >
              {/* Image Container */}
              <div className="relative aspect-[1/1.4] rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
                <div 
                  className={`absolute top-0 left-0 origin-top-left pointer-events-none transition-transform duration-700 ${hoveredId === tmpl.id ? 'scale-[0.32]' : 'scale-[0.3]'}`}
                  style={{ width: '210mm', height: '297mm' }}
                >
                  <CVPreviewComponent 
                    cvData={previewData} 
                    baseLayout={tmpl.layout} 
                    colorTheme={tmpl.color} 
                  />
                </div>
                
                {/* Overlay on hover */}
                <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center ${hoveredId === tmpl.id ? 'opacity-100' : 'opacity-0'}`}>
                  <button className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-xl transform transition-transform duration-300 hover:scale-105">
                    Tạo CV Ngay
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Badges */}
                {tmpl.badge && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`px-3 py-1 rounded-full text-xs font-black text-white shadow-md
                      ${tmpl.badge === 'HOT' ? 'bg-rose-500' : 
                        tmpl.badge === 'MỚI' ? 'bg-emerald-500' : 
                        tmpl.badge === 'PRO' ? 'bg-indigo-600' : 'bg-amber-500'}
                    `}>
                      {tmpl.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="pt-5 pb-3 px-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{tmpl.name}</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-2xs font-bold uppercase tracking-wider
                    ${tmpl.category === 'Tiêu chuẩn' ? 'bg-blue-50 text-blue-700' :
                      tmpl.category === 'Hiện đại' ? 'bg-purple-50 text-purple-700' :
                      tmpl.category === 'Cổ điển' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}
                  `}>
                    {tmpl.category}
                  </span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">{tmpl.desc}</p>
                
                {/* Active Indicator */}
                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <Check className={`w-4 h-4 mr-1.5 transition-transform duration-300 ${hoveredId === tmpl.id ? 'scale-110' : 'scale-0'}`} />
                  <span className={hoveredId === tmpl.id ? 'opacity-100' : 'opacity-0'}>Nhấn để chọn mẫu này</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Layout className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Không tìm thấy mẫu CV</h3>
            <p className="text-slate-500 mt-2">Vui lòng thử chọn một danh mục khác.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CVTemplatesPage;
