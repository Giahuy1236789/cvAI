import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../workspace-pages.css';
import { 
  User, GraduationCap, Briefcase, Code, Award,
  Plus, Trash2, Save, CheckCircle, AlertCircle, Sparkles 
} from 'lucide-react';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [completion, setCompletion] = useState({ percentage: 0, missingFields: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newSkillInput, setNewSkillInput] = useState('');

  async function fetchProfileData() {
    try {
      setLoading(true);
      const [profRes, compRes, skillsRes] = await Promise.all([
        api.get('/students/profile'),
        api.get('/students/profile/completion'),
        api.get('/skills'),
      ]);

      if (profRes.data.success) setProfile(profRes.data.data.student);
      if (compRes.data.success) setCompletion(compRes.data.data);
      if (skillsRes.data.success) setAvailableSkills(skillsRes.data.data.skills);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage({ type: 'error', text: 'Không thể tải thông tin hồ sơ.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu = {
      id: 'edu_' + Date.now(),
      school: '',
      degree: '',
      major: '',
      startYear: new Date().getFullYear() - 4,
      endYear: new Date().getFullYear(),
      gpa: 0,
      description: '',
    };
    setProfile((prev) => ({ ...prev, education: [...(prev.education || []), newEdu] }));
  };

  const updateEducation = (id, field, value) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeEducation = (id) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id),
    }));
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp = {
      id: 'exp_' + Date.now(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
    };
    setProfile((prev) => ({ ...prev, experiences: [...(prev.experiences || []), newExp] }));
  };

  const updateExperience = (id, field, value) => {
    setProfile((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeExperience = (id) => {
    setProfile((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }));
  };

  // Project Handlers
  const addProject = () => {
    const newPrj = {
      id: 'prj_' + Date.now(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      description: '',
      technologies: [],
      link: '',
    };
    setProfile((prev) => ({ ...prev, projects: [...(prev.projects || []), newPrj] }));
  };

  const updateProject = (id, field, value) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeProject = (id) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  };

  // Certificate Handlers
  const addCertificate = () => {
    const newCert = {
      id: 'cert_' + Date.now(),
      name: '',
      issuer: '',
      issueDate: '',
      link: '',
    };
    setProfile((prev) => ({ ...prev, certificates: [...(prev.certificates || []), newCert] }));
  };

  const updateCertificate = (id, field, value) => {
    setProfile((prev) => ({
      ...prev,
      certificates: prev.certificates.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeCertificate = (id) => {
    setProfile((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((item) => item.id !== id),
    }));
  };

  // Language Handlers
  const addLanguage = () => {
    const newLang = {
      id: 'lang_' + Date.now(),
      language: '',
      level: '',
    };
    setProfile((prev) => ({ ...prev, languages: [...(prev.languages || []), newLang] }));
  };

  const updateLanguage = (id, field, value) => {
    setProfile((prev) => ({
      ...prev,
      languages: prev.languages.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeLanguage = (id) => {
    setProfile((prev) => ({
      ...prev,
      languages: prev.languages.filter((item) => item.id !== id),
    }));
  };

  // Skills Handlers
  const handleAddSkill = (skillName) => {
    if (!skillName.trim()) return;
    if (!(profile?.skills || []).includes(skillName.trim())) {
      setProfile((prev) => ({ ...prev, skills: [...(prev.skills || []), skillName.trim()] }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillName) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillName),
    }));
  };

  // Save Profile
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.put('/students/profile', profile);
      if (res.data.success) {
        setProfile(res.data.data.student);
        setMessage({ type: 'success', text: 'Đã lưu hồ sơ thành công!' });
        // Refresh completion
        const compRes = await api.get('/students/profile/completion');
        if (compRes.data.success) setCompletion(compRes.data.data);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu hồ sơ.' });
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-slate-500">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="workspace-page profile-page">
      <header className="workspace-heading">
        <div>
          <div className="workspace-eyebrow">Không gian cá nhân</div>
          <h1>Tạo CV (Hồ sơ gốc)</h1>
          <p>Giới thiệu năng lực, kinh nghiệm và định hướng để tìm cơ hội phù hợp hơn.</p>
        </div>
        <button type="submit" form="student-profile-form" disabled={saving} className="workspace-primary">
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </header>

      {message.text && (
        <div
          role="status"
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-layout mt-5">
        <aside className="profile-sidebar">
          <div className="workspace-panel">
            <div className="flex justify-between items-center gap-3">
              <span className="text-sm font-semibold">Hồ sơ hoàn thiện</span>
              <strong className="text-teal-700 text-lg">{completion.percentage}%</strong>
            </div>
            <div className="profile-progress" role="progressbar" aria-label="Mức độ hoàn thiện hồ sơ" aria-valuenow={completion.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${Math.min(100, Math.max(0, completion.percentage))}%` }} />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {completion.missingFields?.length > 0
                ? `Bổ sung: ${completion.missingFields.slice(0, 3).join(', ')}${completion.missingFields.length > 3 ? '…' : '.'}`
                : 'Hồ sơ đầy đủ giúp CV và gợi ý việc làm sát với bạn hơn.'}
            </p>
          </div>
          <nav className="workspace-panel profile-nav-panel" aria-label="Các phần hồ sơ">
            <div className="workspace-label">Nội dung hồ sơ</div>
            <div className="profile-nav">
              {[
                ['personal', 'Thông tin cơ bản'], ['career', 'Định hướng nghề nghiệp'],
                ['skills', 'Kỹ năng chuyên môn'], ['education', 'Học vấn'],
                ['experience', 'Kinh nghiệm'], ['projects', 'Dự án'], ['certificates', 'Chứng chỉ & ngoại ngữ'],
              ].map(([id, label], index) => (
                <a key={id} href={`#profile-${id}`}><span>0{index + 1}</span>{label}</a>
              ))}
            </div>
          </nav>
        </aside>
      <form id="student-profile-form" onSubmit={handleSave} className="profile-form">
        {/* 1. Thông tin cơ bản */}
        <section id="profile-personal" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-indigo-600" />
            Thông tin cơ bản
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={profile?.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email liên hệ</label>
              <input
                type="email"
                required
                value={profile?.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={profile?.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ngày sinh</label>
              <input
                type="date"
                value={profile?.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Địa chỉ</label>
              <input
                type="text"
                value={profile?.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Nguyễn Văn Linh, Đà Nẵng"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trường đại học / Cao đẳng</label>
              <input
                type="text"
                value={profile?.university || ''}
                onChange={(e) => handleChange('university', e.target.value)}
                placeholder="Đại học Bách Khoa..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Chuyên ngành</label>
              <input
                type="text"
                value={profile?.major || ''}
                onChange={(e) => handleChange('major', e.target.value)}
                placeholder="Công nghệ thông tin..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>
        </section>

        {/* 2. Định hướng nghề nghiệp & Kỳ vọng */}
        <section id="profile-career" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Định hướng nghề nghiệp
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mục tiêu nghề nghiệp
              </label>
              <textarea
                rows={3}
                value={profile?.careerObjective || ''}
                onChange={(e) => handleChange('careerObjective', e.target.value)}
                placeholder="Tìm kiếm cơ hội thực tập vị trí Frontend Developer để vận dụng kiến thức ReactJS..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vị trí mong muốn (cách nhau dấu phẩy)
              </label>
              <input
                type="text"
                value={(profile?.desiredPositions || []).join(', ')}
                onChange={(e) =>
                  handleChange(
                    'desiredPositions',
                    e.target.value.split(',').map((p) => p.trim()).filter(Boolean)
                  )
                }
                placeholder="Frontend Developer, ReactJS Developer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Địa điểm làm việc mong muốn
              </label>
              <input
                type="text"
                value={profile?.desiredLocation || ''}
                onChange={(e) => handleChange('desiredLocation', e.target.value)}
                placeholder="Đà Nẵng / Hà Nội / Hồ Chí Minh"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mức lương mong muốn (VNĐ)
              </label>
              <input
                type="text"
                value={profile?.desiredSalary || ''}
                onChange={(e) => handleChange('desiredSalary', e.target.value)}
                placeholder="8000000-15000000 hoặc 10000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Năm tốt nghiệp
              </label>
              <input
                type="number"
                value={profile?.graduationYear || 2025}
                onChange={(e) => handleChange('graduationYear', parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>
        </section>

        {/* 3. Kỹ năng chuyên môn */}
        <section id="profile-skills" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Code className="w-5 h-5 text-indigo-600" />
            Kỹ năng chuyên môn
          </h2>

          <div className="flex flex-wrap gap-2 mb-3">
            {(profile?.skills || []).map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100"
              >
                {skill}
                <button
                  type="button"
                  aria-label={`Xóa kỹ năng ${skill}`}
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-indigo-400 hover:text-rose-600 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(newSkillInput);
                }
              }}
              placeholder="Nhập kỹ năng mới (ví dụ: Next.js, Docker...)"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <button
              type="button"
              onClick={() => handleAddSkill(newSkillInput)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Thêm
            </button>
          </div>

          {/* Gợi ý kỹ năng phổ biến */}
          <div>
            <span className="text-xs text-slate-500 block mb-1.5">Gợi ý kỹ năng:</span>
            <div className="flex flex-wrap gap-1.5">
              {availableSkills.slice(0, 15).map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => handleAddSkill(sk.name)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  + {sk.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Học vấn */}
        <section id="profile-education" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Học vấn
            </h2>
            <button
              type="button"
              onClick={addEducation}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Thêm học vấn
            </button>
          </div>

          {!profile?.education?.length && <p className="profile-empty">Thêm trường học, chuyên ngành và kết quả học tập của bạn.</p>}
          {(profile?.education || []).map((edu) => (
            <div key={edu.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <button
                type="button"
                aria-label="Xóa học vấn"
                onClick={() => removeEducation(edu.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trường học</label>
                  <input
                    type="text"
                    value={edu.school || ''}
                    onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bằng cấp</label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    placeholder="Cử nhân / Kỹ sư"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Chuyên ngành</label>
                  <input
                    type="text"
                    value={edu.major || ''}
                    onChange={(e) => updateEducation(edu.id, 'major', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Năm bắt đầu</label>
                  <input
                    type="number"
                    value={edu.startYear || ''}
                    onChange={(e) => updateEducation(edu.id, 'startYear', parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Năm tốt nghiệp</label>
                  <input
                    type="number"
                    value={edu.endYear || ''}
                    onChange={(e) => updateEducation(edu.id, 'endYear', parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Điểm GPA</label>
                  <input
                    type="number"
                    step="0.1"
                    value={edu.gpa || ''}
                    onChange={(e) => updateEducation(edu.id, 'gpa', parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* 5. Kinh nghiệm làm việc */}
        <section id="profile-experience" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Kinh nghiệm làm việc
            </h2>
            <button
              type="button"
              onClick={addExperience}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Thêm kinh nghiệm
            </button>
          </div>

          {!profile?.experiences?.length && <p className="profile-empty">Ghi lại công việc, kỳ thực tập hoặc hoạt động đã giúp bạn tích lũy kinh nghiệm.</p>}
          {(profile?.experiences || []).map((exp) => (
            <div key={exp.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <button
                type="button"
                aria-label="Xóa kinh nghiệm"
                onClick={() => removeExperience(exp.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Công ty</label>
                  <input
                    type="text"
                    value={exp.company || ''}
                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    placeholder="FPT Software..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vị trí</label>
                  <input
                    type="text"
                    value={exp.position || ''}
                    onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                    placeholder="Frontend Intern..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={exp.startDate || ''}
                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    disabled={exp.isCurrent}
                    value={exp.endDate || ''}
                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white disabled:bg-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả công việc & Thành tựu</label>
                  <textarea
                    rows={2}
                    value={exp.description || ''}
                    onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                    placeholder="Phát triển giao diện web với ReactJS, cải thiện tốc độ tải trang..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* 6. Dự án thực tế */}
        <section id="profile-projects" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              Dự án cá nhân & nhóm
            </h2>
            <button
              type="button"
              onClick={addProject}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Thêm dự án
            </button>
          </div>

          {!profile?.projects?.length && <p className="profile-empty">Một dự án thực tế là cách tốt để thể hiện kỹ năng của bạn với nhà tuyển dụng.</p>}
          {(profile?.projects || []).map((prj) => (
            <div key={prj.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <button
                type="button"
                aria-label="Xóa dự án"
                onClick={() => removeProject(prj.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tên dự án</label>
                  <input
                    type="text"
                    value={prj.name || ''}
                    onChange={(e) => updateProject(prj.id, 'name', e.target.value)}
                    placeholder="Website thương mại điện tử..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vai trò</label>
                  <input
                    type="text"
                    value={prj.role || ''}
                    onChange={(e) => updateProject(prj.id, 'role', e.target.value)}
                    placeholder="Frontend Developer..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Công nghệ sử dụng (cách nhau dấu phẩy)</label>
                  <input
                    type="text"
                    value={(prj.technologies || []).join(', ')}
                    onChange={(e) =>
                      updateProject(
                        prj.id,
                        'technologies',
                        e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                      )
                    }
                    placeholder="ReactJS, NodeJS, Tailwind CSS"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link Demo / GitHub</label>
                  <input
                    type="url"
                    value={prj.link || ''}
                    onChange={(e) => updateProject(prj.id, 'link', e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả dự án</label>
                  <textarea
                    rows={2}
                    value={prj.description || ''}
                    onChange={(e) => updateProject(prj.id, 'description', e.target.value)}
                    placeholder="Xây dựng website bán hàng có tích hợp thanh toán..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* 7. Chứng chỉ & Ngoại ngữ */}
        <section id="profile-certificates" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-5 h-5 text-indigo-600" />
            Chứng chỉ & ngoại ngữ
          </h2>

          {/* Chứng chỉ */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700 uppercase">Chứng chỉ</span>
              <button
                type="button"
                onClick={addCertificate}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chứng chỉ
              </button>
            </div>
            {(profile?.certificates || []).map((cert) => (
              <div key={cert.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
                <button
                  type="button"
                  aria-label="Xóa chứng chỉ"
                  onClick={() => removeCertificate(cert.id)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  aria-label="Tên chứng chỉ"
                  placeholder="Tên chứng chỉ"
                  value={cert.name || ''}
                  onChange={(e) => updateCertificate(cert.id, 'name', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  aria-label="Tổ chức cấp chứng chỉ"
                  placeholder="Tổ chức cấp (freeCodeCamp...)"
                  value={cert.issuer || ''}
                  onChange={(e) => updateCertificate(cert.id, 'issuer', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
                <input
                  type="date"
                  aria-label="Ngày cấp chứng chỉ"
                  value={cert.issueDate || ''}
                  onChange={(e) => updateCertificate(cert.id, 'issueDate', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            ))}
          </div>

          {/* Ngoại ngữ */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700 uppercase">Ngoại ngữ</span>
              <button
                type="button"
                onClick={addLanguage}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm ngoại ngữ
              </button>
            </div>
            {(profile?.languages || []).map((lang) => (
              <div key={lang.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
                <button
                  type="button"
                  aria-label="Xóa ngoại ngữ"
                  onClick={() => removeLanguage(lang.id)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  aria-label="Ngoại ngữ"
                  placeholder="Tiếng Anh, Tiếng Nhật..."
                  value={lang.language || ''}
                  onChange={(e) => updateLanguage(lang.id, 'language', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  aria-label="Trình độ ngoại ngữ"
                  placeholder="Trình độ (TOEIC 650, N3...)"
                  value={lang.level || ''}
                  onChange={(e) => updateLanguage(lang.id, 'level', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Nút lưu hồ sơ cố định */}
        <div className="profile-savebar">
          <p>Nhớ lưu sau khi cập nhật thông tin.</p>
          <button
            type="submit"
            disabled={saving}
            className="workspace-primary"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default ProfilePage;
