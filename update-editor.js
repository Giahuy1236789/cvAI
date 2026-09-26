const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/cv/CVEditorPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update cvData initial state
content = content.replace(
  /const \[cvData, setCvData\] = useState\(\{[\s\S]*?\}\);/,
  `const [cvData, setCvData] = useState({
    title: 'CV Lập trình viên ReactJS',
    template: 'topcv',
    personalInfo: {
      fullName: '', email: '', phone: '', address: '', title: 'Frontend Developer',
      avatar: '', dob: '', website: ''
    },
    careerObjective: '',
    education: [], experiences: [], projects: [], skills: [], certificates: [], languages: [],
    hobbies: [], activities: [], awards: [], references: []
  });`
);

// 2. Add 'topcv' to template selector
content = content.replace(
  /\['modern', 'classic', 'minimal'\]/,
  `['topcv', 'modern', 'classic', 'minimal']`
);

// 3. Add new inputs in the form
const personalInfoInputs = `
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input type="text" placeholder="Ảnh đại diện (URL)" value={cvData.personalInfo?.avatar || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, avatar: e.target.value } })} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
              <input type="text" placeholder="Ngày sinh (vd: 26/05/2000)" value={cvData.personalInfo?.dob || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, dob: e.target.value } })} className="px-3 py-2 text-sm rounded-xl border border-slate-200" />
              <input type="text" placeholder="Website / Link (vd: github.com/user)" value={cvData.personalInfo?.website || ''} onChange={(e) => setCvData({ ...cvData, personalInfo: { ...cvData.personalInfo, website: e.target.value } })} className="col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200" />
            </div>
`;
content = content.replace(
  /(<input[\s\S]*?value=\{cvData\.personalInfo\?\.title[\s\S]*?\/>)/,
  `$1${personalInfoInputs}`
);

// 4. Add TopCV Template in Preview
const topCVTemplate = `
            {cvData.template === 'topcv' ? (
              <div className="flex w-full min-h-full font-sans text-slate-800 bg-white" style={{ minHeight: '297mm' }}>
                {/* Left Column */}
                <div className="w-[35%] bg-[#eef5fc] p-6 border-r border-slate-200 flex flex-col gap-6">
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
                              {[1,2,3,4,5].map(i => <div key={i} className={\`w-2 h-2 rounded-full \${i <= 4 ? 'bg-slate-700' : 'bg-slate-300'}\`}></div>)}
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
`;
content = content.replace(
  /\{\/\* Header section based on Template \*\/\}/,
  topCVTemplate + '\n              <>{/* Header section based on Template */}'
);

content = content.replace(
  /\{\/\* Education \*\/\}[\s\S]*?\}\)\]\n\s*\}\)\}\n\s*<\/div>/,
  `$&</>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('CVEditorPage updated successfully!');
