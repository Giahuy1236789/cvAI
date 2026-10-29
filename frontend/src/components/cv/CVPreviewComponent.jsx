import React from 'react';
import { 
  Phone, Mail, MapPin, Calendar, Globe, Award, Briefcase, 
  GraduationCap, Rocket, CheckCircle2, Heart, Languages, Sparkles 
} from 'lucide-react';

const themeColors = {
  blue: { primary: '#2563eb', secondary: '#1d4ed8', dark: '#1e3a8a', bgLight: '#eff6ff', text: '#1e40af', skillBg: '#dbeafe', badge: '#3b82f6', border: '#bfdbfe' },
  emerald: { primary: '#059669', secondary: '#047857', dark: '#064e3b', bgLight: '#ecfdf5', text: '#065f46', skillBg: '#d1fae5', badge: '#10b981', border: '#a7f3d0' },
  purple: { primary: '#7c3aed', secondary: '#6d28d9', dark: '#4c1d95', bgLight: '#f5f3ff', text: '#5b21b6', skillBg: '#ede9fe', badge: '#8b5cf6', border: '#ddd6fe' },
  indigo: { primary: '#4f46e5', secondary: '#4338ca', dark: '#312e81', bgLight: '#eef2ff', text: '#3730a3', skillBg: '#e0e7ff', badge: '#6366f1', border: '#c7d2fe' },
  rose: { primary: '#e11d48', secondary: '#be123c', dark: '#881337', bgLight: '#fff1f2', text: '#9f1239', skillBg: '#ffe4e6', badge: '#f43f5e', border: '#fecdd3' },
  teal: { primary: '#0d9488', secondary: '#0f766e', dark: '#134e4a', bgLight: '#f0fdfa', text: '#115e59', skillBg: '#ccfbf1', badge: '#14b8a6', border: '#99f6e4' },
  slate: { primary: '#334155', secondary: '#1e293b', dark: '#0f172a', bgLight: '#f8fafc', text: '#0f172a', skillBg: '#e2e8f0', badge: '#64748b', border: '#cbd5e1' },
  amber: { primary: '#d97706', secondary: '#b45309', dark: '#78350f', bgLight: '#fffbeb', text: '#92400e', skillBg: '#fef3c7', badge: '#f59e0b', border: '#fde68a' },
  sky: { primary: '#0284c7', secondary: '#0369a1', dark: '#0c4a6e', bgLight: '#f0f9ff', text: '#075985', skillBg: '#e0f2fe', badge: '#38bdf8', border: '#bae6fd' },
  neutral: { primary: '#18181b', secondary: '#27272a', dark: '#09090b', bgLight: '#f4f4f5', text: '#18181b', skillBg: '#e4e4e7', badge: '#52525b', border: '#d4d4d8' },
};

const CVPreviewComponent = ({ cvData, baseLayout = 'topcv', colorTheme = 'blue', innerRef }) => {
  const theme = themeColors[colorTheme] || themeColors.blue;
  const p = cvData?.personalInfo || {};

  const renderInitials = (name) => {
    if (!name) return 'CV';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div
      id="cv-preview-container"
      ref={innerRef}
      className="bg-white text-slate-800 shadow-2xl transition-all font-sans print:shadow-none print:m-0"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        fontFamily: baseLayout === 'classic' ? "'Playfair Display', Georgia, serif" : "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}
    >
      {/* ========================================================
          1. TOPCV PRO 2026 (Chuyên nghiệp 2 cột - Xu hướng hàng đầu)
         ======================================================== */}
      {baseLayout === 'topcv' ? (
        <div className="flex w-full min-h-[297mm] bg-white">
          {/* Cột trái (Sidebar 34%) */}
          <div 
            className="w-[34%] p-7 flex flex-col gap-6 border-r border-slate-100"
            style={{ backgroundColor: '#f8fafc' }}
          >
            {/* Avatar & Tên ứng viên */}
            <div className="flex flex-col items-center text-center pb-2">
              <div className="relative mb-4">
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt="Avatar"
                    className="w-32 h-32 rounded-2xl object-cover shadow-md ring-4 ring-white"
                  />
                ) : (
                  <div 
                    className="w-32 h-32 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-md ring-4 ring-white"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}
                  >
                    {renderInitials(p.fullName)}
                  </div>
                )}
                <div 
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shadow-md"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight leading-snug">
                {p.fullName || 'HỌ VÀ TÊN ỨNG VIÊN'}
              </h1>
              <span 
                className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: theme.bgLight, color: theme.text }}
              >
                {p.title || 'VỊ TRÍ ỨNG TUYỂN'}
              </span>
            </div>

            {/* Thông tin liên hệ */}
            <div className="space-y-2.5 text-xs text-slate-700 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Thông tin liên hệ</h3>
              {p.phone && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Phone className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-slate-800">{p.phone}</span>
                </div>
              )}
              {p.email && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-slate-800 truncate">{p.email}</span>
                </div>
              )}
              {p.address && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-slate-800">{p.address}</span>
                </div>
              )}
              {p.dob && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Calendar className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-slate-800">{p.dob}</span>
                </div>
              )}
              {p.website && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Globe className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-slate-800 truncate">{p.website}</span>
                </div>
              )}
            </div>

            {/* Kỹ năng chuyên môn */}
            {cvData?.skills?.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Kỹ năng cốt lõi</h3>
                <div className="flex flex-wrap gap-1.5">
                  {cvData.skills.map((sk, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: theme.bgLight, color: theme.text }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chứng chỉ & Giải thưởng */}
            {cvData?.certificates?.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Chứng chỉ</h3>
                <div className="space-y-2.5">
                  {cvData.certificates.map((cert, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="font-bold text-slate-800 flex items-start gap-1.5">
                        <Award className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: theme.primary }} />
                        <span>{cert.name}</span>
                      </div>
                      {cert.time && <div className="text-2xs text-slate-400 pl-5 mt-0.5">{cert.time}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ngôn ngữ */}
            {cvData?.languages?.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Ngoại ngữ</h3>
                <div className="space-y-1.5 text-xs">
                  {cvData.languages.map((lang, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span className="font-medium">{lang.name || lang}</span>
                      {lang.level && <span className="text-2xs font-bold text-slate-500">{lang.level}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cột phải (Nội dung chính 66%) */}
          <div className="w-[66%] p-8 flex flex-col gap-7">
            {/* Mục tiêu nghề nghiệp */}
            {cvData?.careerObjective && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Mục tiêu nghề nghiệp</h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {cvData.careerObjective}
                </p>
              </div>
            )}

            {/* Kinh nghiệm làm việc (Timeline hiện đại) */}
            {cvData?.experiences?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Kinh nghiệm làm việc</h2>
                </div>
                <div className="space-y-5 pl-2 border-l-2 border-slate-200 ml-3">
                  {cvData.experiences.map((exp, idx) => (
                    <div key={idx} className="relative pl-5">
                      <div 
                        className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs" 
                        style={{ backgroundColor: theme.primary }} 
                      />
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{exp.position}</h3>
                          <div className="text-xs font-semibold" style={{ color: theme.primary }}>{exp.company}</div>
                        </div>
                        <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                          {exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}
                        </span>
                      </div>
                      {exp.description && (
                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mt-2 space-y-1">
                          {exp.description.split('\n').map((line, i) => line.trim() ? (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="text-[10px] text-slate-400 mt-0.5">•</span>
                              <span>{line}</span>
                            </div>
                          ) : null)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dự án thực tế */}
            {cvData?.projects?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <Rocket className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Dự án tiêu biểu</h2>
                </div>
                <div className="space-y-4">
                  {cvData.projects.map((prj, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-xs font-bold text-slate-900">{prj.name}</h3>
                        <span className="text-2xs font-bold text-slate-500">{prj.startDate} – {prj.endDate}</span>
                      </div>
                      <div className="text-2xs font-semibold text-slate-600 mb-1.5">Vai trò: <span style={{ color: theme.primary }}>{prj.role}</span></div>
                      {prj.description && <p className="text-xs text-slate-600 leading-relaxed mb-2">{prj.description}</p>}
                      {prj.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {prj.technologies.map((t, i) => (
                            <span key={i} className="text-2xs font-medium px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Học vấn */}
            {cvData?.education?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.bgLight, color: theme.primary }}>
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Học vấn</h2>
                </div>
                <div className="space-y-3">
                  {cvData.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-100 pb-2.5 last:border-0">
                      <div>
                        <div className="font-bold text-slate-900">{edu.major}</div>
                        <div className="text-slate-600 font-medium">{edu.school}</div>
                        {edu.degree && <div className="text-2xs text-slate-500 mt-0.5">Xếp loại: {edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>}
                      </div>
                      <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {edu.startYear} – {edu.endYear}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : baseLayout === 'modern' ? (

        /* ========================================================
            2. MODERN TECH LEADER 2026 (Header Gradient & Glassmorphism)
           ======================================================== */
        <div className="flex flex-col w-full min-h-[297mm] bg-white">
          {/* Header Gradient siêu sang */}
          <div 
            className="p-8 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${theme.dark} 0%, ${theme.primary} 100%)` }}
          >
            <div className="relative z-10 flex items-center gap-6">
              {p.avatar ? (
                <img src={p.avatar} alt="Avatar" className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/30 shadow-2xl shrink-0" />
              ) : (
                <div className="w-28 h-28 rounded-2xl flex items-center justify-center font-black text-3xl text-white bg-white/20 backdrop-blur-md ring-4 ring-white/30 shadow-2xl shrink-0">
                  {renderInitials(p.fullName)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="inline-block px-3 py-1 rounded-full text-2xs font-black tracking-widest uppercase bg-white/20 backdrop-blur-md text-white mb-2">
                  {p.title || 'CHUYÊN VIÊN PHÁT TRIỂN'}
                </span>
                <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-sm truncate">
                  {p.fullName || 'HỌ VÀ TÊN'}
                </h1>
                <div className="flex flex-wrap gap-4 text-xs text-white/90 mt-3 font-medium">
                  {p.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{p.phone}</span>}
                  {p.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{p.email}</span>}
                  {p.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{p.address}</span>}
                  {p.website && <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{p.website}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Body 2 Cột */}
          <div className="flex flex-1 p-8 gap-8">
            {/* Cột trái 36% */}
            <div className="w-[36%] space-y-6">
              {cvData?.careerObjective && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-3" style={{ borderColor: theme.primary }}>
                    Tóm tắt mục tiêu
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">{cvData.careerObjective}</p>
                </div>
              )}

              {cvData?.skills?.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-3" style={{ borderColor: theme.primary }}>
                    Kỹ năng cốt lõi
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {cvData.skills.map((sk, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: theme.bgLight, color: theme.text }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cvData?.education?.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-3" style={{ borderColor: theme.primary }}>
                    Học vấn
                  </h2>
                  <div className="space-y-3">
                    {cvData.education.map((edu, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="font-bold text-slate-900">{edu.major}</div>
                        <div className="text-slate-600 font-medium">{edu.school}</div>
                        <div className="text-2xs text-slate-400 mt-0.5">{edu.startYear} – {edu.endYear} {edu.degree && `• ${edu.degree}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cvData?.certificates?.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-3" style={{ borderColor: theme.primary }}>
                    Chứng chỉ
                  </h2>
                  <div className="space-y-2 text-xs">
                    {cvData.certificates.map((c, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="font-bold text-slate-800">{c.name}</div>
                        {c.time && <div className="text-2xs text-slate-400 mt-0.5">{c.time}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải 64% */}
            <div className="w-[64%] space-y-7 border-l border-slate-100 pl-8">
              {cvData?.experiences?.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-4" style={{ borderColor: theme.primary }}>
                    Kinh nghiệm chuyên môn
                  </h2>
                  <div className="space-y-5">
                    {cvData.experiences.map((exp, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-xs font-extrabold text-slate-900">{exp.position}</h3>
                          <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {exp.startDate} – {exp.isCurrent ? 'Nay' : exp.endDate}
                          </span>
                        </div>
                        <div className="text-xs font-bold mb-2" style={{ color: theme.primary }}>{exp.company}</div>
                        {exp.description && (
                          <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap space-y-1">
                            {exp.description.split('\n').map((l, i) => l.trim() ? (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-slate-400">•</span>
                                <span>{l}</span>
                              </div>
                            ) : null)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cvData?.projects?.length > 0 && (
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b-2 pb-1.5 mb-4" style={{ borderColor: theme.primary }}>
                    Dự án nổi bật
                  </h2>
                  <div className="space-y-4">
                    {cvData.projects.map((prj, idx) => (
                      <div key={idx} className="border border-slate-200/70 p-3.5 rounded-2xl bg-white shadow-xs">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-xs font-extrabold text-slate-900">{prj.name}</h3>
                          <span className="text-2xs font-bold text-slate-400">{prj.startDate} – {prj.endDate}</span>
                        </div>
                        <div className="text-2xs font-semibold text-slate-500 mb-1.5">Vai trò: {prj.role}</div>
                        {prj.description && <p className="text-xs text-slate-600 leading-relaxed mb-2">{prj.description}</p>}
                        {prj.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prj.technologies.map((t, i) => (
                              <span key={i} className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : baseLayout === 'classic' ? (

        /* ========================================================
            3. HARVARD EXECUTIVE ATS 2026 (Chuẩn Quốc Tế Thanh Lịch)
           ======================================================== */
        <div className="p-10 flex flex-col w-full min-h-[297mm] bg-white text-slate-900">
          {/* Header Cổ Điển Tinh Xảo */}
          <div className="text-center pb-5 mb-6 border-b-2 border-slate-900">
            <h1 className="text-3xl font-bold uppercase tracking-widest mb-1.5 text-slate-900 font-serif">
              {p.fullName || 'NGUYỄN VĂN A'}
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-600 mb-3 font-sans">
              {p.title || 'CHUYÊN VIÊN PHÁT TRIỂN NỀN TẢNG'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600 font-sans">
              {p.phone && <span>{p.phone}</span>}
              {p.email && <span>◆ {p.email}</span>}
              {p.address && <span>◆ {p.address}</span>}
              {p.website && <span>◆ {p.website}</span>}
            </div>
          </div>

          <div className="space-y-6 font-sans">
            {cvData?.careerObjective && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-2.5 text-slate-900 font-serif">
                  Tóm tắt chuyên môn
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed text-justify">{cvData.careerObjective}</p>
              </div>
            )}

            {cvData?.experiences?.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3 text-slate-900 font-serif">
                  Kinh nghiệm làm việc
                </h2>
                <div className="space-y-4">
                  {cvData.experiences.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline text-xs">
                        <strong className="text-slate-900 text-sm font-semibold">{exp.company}</strong>
                        <span className="italic text-slate-500">{exp.startDate} – {exp.isCurrent ? 'Hiện tại' : exp.endDate}</span>
                      </div>
                      <div className="text-xs italic text-slate-700 mb-1.5">{exp.position}</div>
                      {exp.description && (
                        <div className="text-xs text-slate-700 space-y-1 pl-4 border-l border-slate-300">
                          {exp.description.split('\n').map((line, i) => line.trim() ? (
                            <p key={i}>• {line}</p>
                          ) : null)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.projects?.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3 text-slate-900 font-serif">
                  Dự án quan trọng
                </h2>
                <div className="space-y-4">
                  {cvData.projects.map((prj, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline text-xs">
                        <strong className="text-slate-900 font-semibold">{prj.name}</strong>
                        <span className="italic text-slate-500">{prj.startDate} – {prj.endDate}</span>
                      </div>
                      <div className="text-xs italic text-slate-600 mb-1">Vai trò: {prj.role}</div>
                      {prj.description && <p className="text-xs text-slate-700 leading-relaxed">{prj.description}</p>}
                      {prj.technologies?.length > 0 && (
                        <div className="text-2xs text-slate-500 mt-1 italic">
                          Công nghệ: {prj.technologies.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.education?.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3 text-slate-900 font-serif">
                  Học vấn
                </h2>
                <div className="space-y-2.5">
                  {cvData.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline text-xs">
                      <div>
                        <strong className="text-slate-900">{edu.school}</strong> – {edu.major}
                        {edu.degree && <span className="text-slate-500 ml-2">({edu.degree})</span>}
                      </div>
                      <span className="text-slate-500 italic">{edu.startYear} – {edu.endYear}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.skills?.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-2.5 text-slate-900 font-serif">
                  Kỹ năng chuyên môn
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {cvData.skills.join('  •  ')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (

        /* ========================================================
            4. STUDIO MINIMALIST 2026 (Scandinavian Clean Editorial)
           ======================================================== */
        <div className="p-10 flex flex-col w-full min-h-[297mm] bg-white text-slate-900">
          {/* Header Tối Giản Nghệ Thuật */}
          <div className="pb-6 mb-8 border-b-4 border-slate-900 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">
                {p.fullName || 'NGUYỄN VĂN A'}
              </h1>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-slate-500 mt-1" style={{ color: theme.primary }}>
                {p.title || 'PRODUCT DESIGNER / DEVELOPER'}
              </p>
            </div>
            {p.avatar && (
              <img src={p.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-sm ring-2 ring-slate-900/10" />
            )}
          </div>

          <div className="flex flex-wrap gap-5 text-xs text-slate-600 mb-8 pb-4 border-b border-slate-100 font-medium">
            {p.phone && <span>ĐT: {p.phone}</span>}
            {p.email && <span>Email: {p.email}</span>}
            {p.address && <span>Đ/c: {p.address}</span>}
            {p.website && <span>Portfolio: {p.website}</span>}
          </div>

          <div className="space-y-8">
            {cvData?.careerObjective && (
              <div className="flex">
                <div className="w-1/4 text-xs font-black uppercase tracking-widest text-slate-400">01 / TỔNG QUAN</div>
                <div className="w-3/4 text-xs text-slate-700 leading-relaxed text-justify">{cvData.careerObjective}</div>
              </div>
            )}

            {cvData?.experiences?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-black uppercase tracking-widest text-slate-400">02 / KINH NGHIỆM</div>
                <div className="w-3/4 space-y-5">
                  {cvData.experiences.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <strong className="text-xs font-black uppercase text-slate-900">{exp.position}</strong>
                        <span className="text-2xs font-bold text-slate-500">{exp.startDate} – {exp.isCurrent ? 'Nay' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-semibold mb-1" style={{ color: theme.primary }}>{exp.company}</div>
                      {exp.description && <p className="text-xs text-slate-600 leading-relaxed">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.projects?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-black uppercase tracking-widest text-slate-400">03 / DỰ ÁN</div>
                <div className="w-3/4 space-y-4">
                  {cvData.projects.map((prj, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <strong className="text-xs font-bold text-slate-900">{prj.name}</strong>
                        <span className="text-2xs text-slate-400">{prj.startDate} – {prj.endDate}</span>
                      </div>
                      <div className="text-2xs font-medium text-slate-500 mb-1">Vai trò: {prj.role}</div>
                      {prj.description && <p className="text-xs text-slate-600 leading-relaxed">{prj.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.education?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-black uppercase tracking-widest text-slate-400">04 / HỌC VẤN</div>
                <div className="w-3/4 space-y-3">
                  {cvData.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{edu.major}</span> — {edu.school}
                      </div>
                      <span className="text-2xs text-slate-400">{edu.startYear} – {edu.endYear}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData?.skills?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-black uppercase tracking-widest text-slate-400">05 / KỸ NĂNG</div>
                <div className="w-3/4 flex flex-wrap gap-1.5">
                  {cvData.skills.map((sk, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVPreviewComponent;
