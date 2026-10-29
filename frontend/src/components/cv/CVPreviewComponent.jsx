import React from 'react';

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

const CVPreviewComponent = ({ cvData, baseLayout, colorTheme, innerRef }) => {
  const theme = themeColors[colorTheme] || themeColors.blue;

  return (
    <div
      id="cv-preview-container"
      ref={innerRef}
      className={`w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-2xl p-8 sm:p-12 transition-all ${
        baseLayout === 'classic'
          ? 'font-serif'
          : baseLayout === 'minimal'
          ? 'font-mono'
          : 'font-sans'
      }`}
      style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
    >
      {baseLayout === 'topcv' ? (
        <div className="flex w-full font-sans text-slate-800 bg-white" style={{ minHeight: '297mm' }}>
          {/* Left Column */}
          <div className="w-[35%] p-6 flex flex-col gap-6 stretch-h" style={{ backgroundColor: theme.primary }}>
            <div className="flex flex-col items-center text-center">
              {cvData.personalInfo?.avatar ? (
                <img src={cvData.personalInfo.avatar} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 shadow-sm mb-4" style={{ borderColor: 'white' }} />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 shadow-sm mb-4 flex items-center justify-center font-medium" style={{ borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Ảnh</div>
              )}
              <h1 className="text-xl font-bold leading-tight uppercase text-white">{cvData.personalInfo?.fullName || 'NGUYỄN VĂN A'}</h1>
              <p className="text-sm font-semibold mt-1 text-white/90">{cvData.personalInfo?.title || 'VỊ TRÍ ỨNG TUYỂN'}</p>
            </div>

            <div className="space-y-2 text-xs text-white/90">
              {cvData.personalInfo?.phone && <div className="flex gap-2"><span className="w-4 text-center">📞</span><span>{cvData.personalInfo.phone}</span></div>}
              {cvData.personalInfo?.email && <div className="flex gap-2"><span className="w-4 text-center">✉️</span><span className="truncate">{cvData.personalInfo.email}</span></div>}
              {cvData.personalInfo?.address && <div className="flex gap-2"><span className="w-4 text-center">🏠</span><span>{cvData.personalInfo.address}</span></div>}
              {cvData.personalInfo?.dob && <div className="flex gap-2"><span className="w-4 text-center">🎂</span><span>{cvData.personalInfo.dob}</span></div>}
              {cvData.personalInfo?.website && <div className="flex gap-2"><span className="w-4 text-center">🔗</span><span className="truncate">{cvData.personalInfo.website}</span></div>}
            </div>

            {cvData.careerObjective && (
              <div>
                <h3 className="text-sm font-bold uppercase border-b border-white/30 pb-1 mb-3 text-white">Mục tiêu nghề nghiệp</h3>
                <p className="text-xs text-white/90 text-justify whitespace-pre-wrap">{cvData.careerObjective}</p>
              </div>
            )}

            {cvData.skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase border-b border-white/30 pb-1 mb-3 text-white">Kỹ năng</h3>
                <div className="space-y-3">
                  {cvData.skills.map((sk, idx) => (
                    <div key={idx}>
                      <div className="text-xs font-medium text-white mb-1">{sk}</div>
                      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <div className="h-full rounded-full bg-white" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.hobbies?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase border-b border-white/30 pb-1 mb-3 text-white">Sở thích</h3>
                <ul className="text-xs text-white/90 space-y-1 list-disc list-inside">
                  {cvData.hobbies.map((hb, idx) => (
                    <li key={idx}>{hb}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="w-[65%] bg-white p-6 flex flex-col gap-6">
            {cvData.education?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase flex items-center gap-2 mb-3" style={{ color: theme.primary }}>
                  <span className="text-lg">🎓</span>Học vấn
                </h3>
                <div className="space-y-4">
                  {cvData.education.map((edu, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <strong style={{ color: theme.text }}>{edu.major}</strong>
                        <span className="text-slate-500 font-medium">{edu.startYear}{(edu.startYear && edu.endYear) ? ' - ' : ''}{edu.endYear}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 mb-1">{edu.school}</div>
                      {edu.degree && <ul className="text-xs text-slate-700 space-y-0.5">
                        <li className="flex gap-2"><span className="text-[10px] opacity-50 mt-0.5">•</span>Xếp loại: {edu.degree}</li>
                        {edu.gpa && <li className="flex gap-2"><span className="text-[10px] opacity-50 mt-0.5">•</span>GPA: {edu.gpa}</li>}
                      </ul>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.experiences?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase flex items-center gap-2 mb-3" style={{ color: theme.primary }}>
                  <span className="text-lg">💼</span>Kinh nghiệm làm việc
                </h3>
                <div className="space-y-4">
                  {cvData.experiences.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <strong style={{ color: theme.text }}>{exp.position}</strong>
                        <span className="text-slate-500 font-medium">{exp.startDate}{(exp.startDate && (exp.endDate || exp.isCurrent)) ? ' - ' : ''}{exp.isCurrent ? 'Nay' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 mb-1">{exp.company}</div>
                      {exp.description && (
                        <div className="text-xs text-slate-700 whitespace-pre-wrap pl-3 border-l-2" style={{ borderColor: theme.bgLight }}>
                          {exp.description.split('\n').map((line, i) => line.trim() ? <div key={i} className="flex gap-2"><span className="text-[10px] opacity-50 mt-0.5">•</span><span className="flex-1">{line}</span></div> : null)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.projects?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase flex items-center gap-2 mb-3" style={{ color: theme.primary }}>
                  <span className="text-lg">🚀</span>Dự án
                </h3>
                <div className="space-y-4">
                  {cvData.projects.map((prj, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <strong style={{ color: theme.text }}>{prj.role}</strong>
                        <span className="text-slate-500 font-medium">{prj.startDate}{(prj.startDate && prj.endDate) ? ' - ' : ''}{prj.endDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 mb-1">{prj.name}</div>
                      {prj.description && (
                        <div className="text-xs text-slate-700 whitespace-pre-wrap pl-3 border-l-2" style={{ borderColor: theme.bgLight }}>
                          {prj.description.split('\n').map((line, i) => line.trim() ? <div key={i} className="flex gap-2"><span className="text-[10px] opacity-50 mt-0.5">•</span><span className="flex-1">{line}</span></div> : null)}
                        </div>
                      )}
                      {prj.technologies?.length > 0 && (
                        <div className="text-2xs text-slate-500 mt-1 italic pl-3">
                          Công nghệ: {prj.technologies.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.certificates?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase flex items-center gap-2 mb-3" style={{ color: theme.primary }}>
                  <span className="text-lg">📜</span>Chứng chỉ
                </h3>
                <div className="space-y-3">
                  {cvData.certificates.map((cert, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <strong style={{ color: theme.text }} className="flex-1 pr-4">{cert.name}</strong>
                      <span className="text-slate-500 font-medium whitespace-nowrap">{cert.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : baseLayout === 'classic' ? (
        <div className="flex flex-col w-full bg-white text-slate-900" style={{ minHeight: '297mm' }}>
          {/* Classic Header */}
          <div className="text-center pb-6 mb-6 border-b-2 border-slate-900">
            {cvData.personalInfo?.avatar && (
              <img src={cvData.personalInfo.avatar} alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border border-slate-300 shadow-sm" />
            )}
            <h1 className="text-4xl font-bold uppercase tracking-widest mb-2" style={{ color: theme.text }}>{cvData.personalInfo?.fullName || 'NGUYỄN VĂN A'}</h1>
            <p className="text-lg italic text-slate-700">{cvData.personalInfo?.title}</p>
            <div className="flex flex-wrap justify-center gap-2 text-xs mt-3 text-slate-600">
              {cvData.personalInfo?.phone && <span>{cvData.personalInfo.phone}</span>}
              {cvData.personalInfo?.email && <span>| {cvData.personalInfo.email}</span>}
              {cvData.personalInfo?.address && <span>| {cvData.personalInfo.address}</span>}
              {cvData.personalInfo?.website && <span>| {cvData.personalInfo.website}</span>}
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Objective */}
            {cvData.careerObjective && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Mục tiêu nghề nghiệp</h3>
                <p className="text-xs text-justify leading-relaxed">{cvData.careerObjective}</p>
              </div>
            )}
            
            {/* Education */}
            {cvData.education?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Học vấn</h3>
                <div className="space-y-4">
                  {cvData.education.map((edu, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <strong className="text-sm text-slate-900">{edu.school}</strong>
                        <span className="text-xs italic text-slate-600">{edu.startYear} - {edu.endYear}</span>
                      </div>
                      <div className="text-xs font-semibold mb-1 text-slate-700">{edu.major}</div>
                      <div className="text-xs text-slate-600">Xếp loại: {edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {cvData.experiences?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Kinh nghiệm làm việc</h3>
                <div className="space-y-5">
                  {cvData.experiences.map((exp, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <strong className="text-sm text-slate-900">{exp.company}</strong>
                        <span className="text-xs italic text-slate-600">{exp.startDate} - {exp.isCurrent ? 'Nay' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-semibold italic mb-1 text-slate-700">{exp.position}</div>
                      {exp.description && (
                        <ul className="text-xs list-disc list-outside ml-4 space-y-1 text-slate-700">
                          {exp.description.split('\n').map((line, idx) => line.trim() ? <li key={idx}>{line}</li> : null)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {cvData.projects?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Dự án</h3>
                <div className="space-y-5">
                  {cvData.projects.map((prj, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <strong className="text-sm text-slate-900">{prj.name}</strong>
                        <span className="text-xs italic text-slate-600">{prj.startDate} - {prj.endDate}</span>
                      </div>
                      <div className="text-xs font-semibold italic mb-1 text-slate-700">{prj.role}</div>
                      {prj.description && (
                        <ul className="text-xs list-disc list-outside ml-4 space-y-1 text-slate-700 mb-1">
                          {prj.description.split('\n').map((line, idx) => line.trim() ? <li key={idx}>{line}</li> : null)}
                        </ul>
                      )}
                      {prj.technologies?.length > 0 && <div className="text-xs italic text-slate-600">Công nghệ: {prj.technologies.join(', ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills & Certs */}
            <div className="grid grid-cols-2 gap-8">
              {cvData.skills?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Kỹ năng</h3>
                  <ul className="text-xs list-disc list-outside ml-4 space-y-1 text-slate-700">
                    {cvData.skills.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {cvData.certificates?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-3" style={{ color: theme.text }}>Chứng chỉ</h3>
                  <ul className="text-xs list-disc list-outside ml-4 space-y-1 text-slate-700">
                    {cvData.certificates.map((c, i) => <li key={i}><strong>{c.name}</strong> - {c.time}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : baseLayout === 'modern' ? (
        <div className="flex flex-col w-full font-sans bg-white shadow-xl overflow-hidden" style={{ minHeight: '297mm' }}>
          {/* Modern Header */}
          <div className="flex px-10 py-12 gap-8 items-center text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.text})` }}>
            {cvData.personalInfo?.avatar && (
              <img src={cvData.personalInfo.avatar} alt="Avatar" className="w-36 h-36 rounded-2xl object-cover border-4 shadow-2xl transform rotate-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
            )}
            <div className="flex-1">
              <h1 className="text-5xl font-black uppercase tracking-tight mb-2 text-white shadow-sm">{cvData.personalInfo?.fullName || 'NGUYỄN VĂN A'}</h1>
              <p className="text-xl text-white/90 font-medium tracking-widest uppercase">{cvData.personalInfo?.title}</p>
            </div>
          </div>
          
          <div className="flex flex-1">
            {/* Left Col */}
            <div className="w-[32%] p-8 bg-slate-50 border-r border-slate-100 flex flex-col gap-8">
              <div className="space-y-4 text-xs text-slate-700 font-medium">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: theme.primary }}>Liên hệ</h3>
                {cvData.personalInfo?.phone && <div className="flex items-center gap-3"><span className="flex items-center justify-center w-7 h-7 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>📞</span>{cvData.personalInfo.phone}</div>}
                {cvData.personalInfo?.email && <div className="flex items-center gap-3"><span className="flex items-center justify-center w-7 h-7 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>✉️</span><span className="truncate">{cvData.personalInfo.email}</span></div>}
                {cvData.personalInfo?.address && <div className="flex items-center gap-3"><span className="flex items-center justify-center w-7 h-7 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>🏠</span>{cvData.personalInfo.address}</div>}
                {cvData.personalInfo?.website && <div className="flex items-center gap-3"><span className="flex items-center justify-center w-7 h-7 rounded-lg text-white" style={{ backgroundColor: theme.primary }}>🔗</span><span className="truncate">{cvData.personalInfo.website}</span></div>}
              </div>

              {cvData.skills?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: theme.primary }}>Kỹ năng</h3>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.map((sk, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: theme.skillBg, color: theme.text }}>{sk}</span>
                    ))}
                  </div>
                </div>
              )}

              {cvData.certificates?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: theme.primary }}>Chứng chỉ</h3>
                  <div className="space-y-3">
                    {cvData.certificates.map((cert, i) => (
                      <div key={i} className="text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="font-bold text-slate-800 mb-0.5">{cert.name}</div>
                        <div className="text-slate-500 font-medium">{cert.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {cvData.hobbies?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: theme.primary }}>Sở thích</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                     {cvData.hobbies.map((hb, i) => (
                       <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600">{hb}</span>
                     ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col */}
            <div className="w-[68%] p-8 flex flex-col gap-8 bg-white">
              {cvData.careerObjective && (
                <div>
                  <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-4" style={{ color: theme.text }}>
                    <span className="w-8 h-1 rounded-full" style={{ backgroundColor: theme.primary }}></span> Mục tiêu
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed text-justify font-medium">{cvData.careerObjective}</p>
                </div>
              )}

              {cvData.experiences?.length > 0 && (
                <div>
                  <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-5" style={{ color: theme.text }}>
                    <span className="w-8 h-1 rounded-full" style={{ backgroundColor: theme.primary }}></span> Kinh nghiệm
                  </h3>
                  <div className="space-y-6">
                    {cvData.experiences.map((exp, i) => (
                      <div key={i} className="relative pl-6 border-l-2" style={{ borderColor: theme.skillBg }}>
                        <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                        <div className="flex justify-between items-start mb-1">
                          <strong className="text-base text-slate-900 font-black">{exp.position}</strong>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{exp.startDate} - {exp.isCurrent ? 'Nay' : exp.endDate}</span>
                        </div>
                        <div className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: theme.primary }}>{exp.company}</div>
                        {exp.description && <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cvData.education?.length > 0 && (
                <div>
                  <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-5" style={{ color: theme.text }}>
                    <span className="w-8 h-1 rounded-full" style={{ backgroundColor: theme.primary }}></span> Học vấn
                  </h3>
                  <div className="space-y-6">
                    {cvData.education.map((edu, i) => (
                      <div key={i} className="relative pl-6 border-l-2" style={{ borderColor: theme.skillBg }}>
                        <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                        <div className="flex justify-between items-start mb-1">
                          <strong className="text-base text-slate-900 font-black">{edu.major}</strong>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{edu.startYear} - {edu.endYear}</span>
                        </div>
                        <div className="text-sm font-bold mb-1 uppercase tracking-wide" style={{ color: theme.primary }}>{edu.school}</div>
                        <div className="text-xs text-slate-600 font-medium">Xếp loại: {edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cvData.projects?.length > 0 && (
                <div>
                  <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-5" style={{ color: theme.text }}>
                    <span className="w-8 h-1 rounded-full" style={{ backgroundColor: theme.primary }}></span> Dự án
                  </h3>
                  <div className="space-y-6">
                    {cvData.projects.map((prj, i) => (
                      <div key={i} className="relative pl-6 border-l-2" style={{ borderColor: theme.skillBg }}>
                        <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                        <div className="flex justify-between items-start mb-1">
                          <strong className="text-base text-slate-900 font-black">{prj.name}</strong>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{prj.startDate} - {prj.endDate}</span>
                        </div>
                        <div className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: theme.primary }}>Vai trò: {prj.role}</div>
                        {prj.description && <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium mb-2">{prj.description}</p>}
                        {prj.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {prj.technologies.map((tech, idx) => (
                              <span key={idx} className="px-2 py-0.5 border border-slate-200 rounded text-2xs text-slate-500 font-bold bg-slate-50">{tech}</span>
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
      ) : (
        <div className="flex flex-col w-full font-mono bg-white text-slate-800" style={{ minHeight: '297mm' }}>
          {/* Minimal Header */}
          <div className="pb-8 mb-8" style={{ borderBottom: `4px solid ${theme.primary}` }}>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2" style={{ color: theme.text }}>{cvData.personalInfo?.fullName || 'NGUYỄN VĂN A'}</h1>
                <p className="text-xl font-bold tracking-widest uppercase" style={{ color: theme.primary }}>{cvData.personalInfo?.title}</p>
              </div>
              {cvData.personalInfo?.avatar && (
                <img src={cvData.personalInfo.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover grayscale" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-6 text-xs mt-6 text-slate-600 font-medium">
              {cvData.personalInfo?.phone && <div className="flex items-center gap-1">P. <span className="text-slate-900">{cvData.personalInfo.phone}</span></div>}
              {cvData.personalInfo?.email && <div className="flex items-center gap-1">E. <span className="text-slate-900">{cvData.personalInfo.email}</span></div>}
              {cvData.personalInfo?.address && <div className="flex items-center gap-1">A. <span className="text-slate-900">{cvData.personalInfo.address}</span></div>}
              {cvData.personalInfo?.website && <div className="flex items-center gap-1">W. <span className="text-slate-900">{cvData.personalInfo.website}</span></div>}
            </div>
          </div>

          <div className="space-y-10">
            {cvData.careerObjective && (
              <div className="flex">
                <div className="w-1/4 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Hồ sơ</div>
                <div className="w-3/4 text-sm leading-relaxed text-slate-700 text-justify">{cvData.careerObjective}</div>
              </div>
            )}

            {cvData.experiences?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Kinh nghiệm</div>
                <div className="w-3/4 space-y-6">
                  {cvData.experiences.map((exp, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <strong className="text-sm text-slate-900 uppercase tracking-wide">{exp.position}</strong>
                        <span className="text-xs font-bold" style={{ color: theme.primary }}>{exp.startDate} - {exp.isCurrent ? 'Nay' : exp.endDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mb-2">{exp.company}</div>
                      {exp.description && <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.education?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Học vấn</div>
                <div className="w-3/4 space-y-6">
                  {cvData.education.map((edu, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <strong className="text-sm text-slate-900 uppercase tracking-wide">{edu.major}</strong>
                        <span className="text-xs font-bold" style={{ color: theme.primary }}>{edu.startYear} - {edu.endYear}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mb-1">{edu.school}</div>
                      <div className="text-xs text-slate-600">Xếp loại: {edu.degree} {edu.gpa && `| GPA: ${edu.gpa}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cvData.projects?.length > 0 && (
              <div className="flex">
                <div className="w-1/4 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Dự án</div>
                <div className="w-3/4 space-y-6">
                  {cvData.projects.map((prj, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <strong className="text-sm text-slate-900 uppercase tracking-wide">{prj.name}</strong>
                        <span className="text-xs font-bold" style={{ color: theme.primary }}>{prj.startDate} - {prj.endDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mb-2">Vai trò: {prj.role}</div>
                      {prj.description && <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mb-2">{prj.description}</p>}
                      {prj.technologies?.length > 0 && <div className="text-xs text-slate-400">Tech: {prj.technologies.join(', ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-8">
              {cvData.skills?.length > 0 && (
                <div className="flex-1 flex">
                  <div className="w-1/2 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Kỹ năng</div>
                  <div className="w-1/2">
                    <ul className="text-xs text-slate-700 space-y-1">
                      {cvData.skills.map((s, i) => <li key={i}>- {s}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              {cvData.certificates?.length > 0 && (
                <div className="flex-1 flex">
                  <div className="w-1/2 text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Chứng chỉ</div>
                  <div className="w-1/2">
                    <ul className="text-xs text-slate-700 space-y-2">
                      {cvData.certificates.map((c, i) => <li key={i}><strong className="block text-slate-900">{c.name}</strong>{c.time}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVPreviewComponent;
