import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Briefcase, Plus, Edit, Trash2, Building2, MapPin, DollarSign, CheckCircle2, Download, RefreshCw, X } from 'lucide-react';

const JobManagementPage = () => {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    companyId: '',
    description: '',
    location: 'Đà Nẵng',
    salaryMin: 10000000,
    salaryMax: 20000000,
    experience: 'Fresher',
    employmentType: 'Full-time',
    skills: 'ReactJS, JavaScript',
    deadline: '2025-12-31',
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, compsRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/companies'),
      ]);
      if (jobsRes.data.success) setJobs(jobsRes.data.data.jobs);
      if (compsRes.data.success) {
        setCompanies(compsRes.data.data.companies);
        if (compsRes.data.data.companies.length > 0 && !formData.companyId) {
          setFormData((prev) => ({ ...prev, companyId: compsRes.data.data.companies[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching admin jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      companyId: companies[0]?.id || '',
      description: '',
      location: 'Đà Nẵng',
      salaryMin: 10000000,
      salaryMax: 20000000,
      experience: 'Fresher',
      employmentType: 'Full-time',
      skills: 'ReactJS, JavaScript',
      deadline: '2025-12-31',
      status: 'active',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      companyId: job.companyId,
      description: job.description,
      location: job.location,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experience: job.experience,
      employmentType: job.employmentType,
      skills: (job.skills || []).join(', '),
      deadline: job.deadline,
      status: job.status || 'active',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin tuyển dụng này?')) return;
    try {
      const res = await api.delete(`/jobs/${id}`);
      if (res.data.success) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  };

  const handleImportPublicJobs = async () => {
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await api.post('/jobs/import/jobicy', { count: 20 });
      if (res.data.success) {
        setImportMessage({ type: 'success', text: res.data.message });
        fetchData();
      }
    } catch (err) {
      setImportMessage({ type: 'error', text: err.response?.data?.message || 'Không thể đồng bộ việc làm lúc này.' });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      salaryMin: Number(formData.salaryMin),
      salaryMax: Number(formData.salaryMax),
      skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (editingJob) {
        const res = await api.put(`/jobs/${editingJob.id}`, payload);
        if (res.data.success) {
          fetchData();
          setModalOpen(false);
        }
      } else {
        const res = await api.post('/jobs', payload);
        if (res.data.success) {
          fetchData();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Quản lý việc làm tuyển dụng
          </h1>
          <p className="text-slate-500 text-sm mt-1">Đăng tin, chỉnh sửa và quản lý tin tuyển dụng trên hệ thống</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={handleImportPublicJobs}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{importing ? 'Đang đồng bộ...' : 'Đồng bộ việc làm'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm việc làm mới</span>
          </button>
        </div>
      </div>

      {importMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${importMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <div className="font-semibold">{importMessage.text}</div>
          {importMessage.type === 'success' && <p className="mt-1 text-xs opacity-80">Nguồn: Jobicy Public API. Tin đã lưu link nguồn gốc để đối chiếu.</p>}
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse"></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tiêu đề việc làm</th>
                  <th className="px-6 py-4">Công ty</th>
                  <th className="px-6 py-4">Địa điểm</th>
                  <th className="px-6 py-4">Mức lương</th>
                  <th className="px-6 py-4">Cấp bậc</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{job.title}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{job.company?.name || '---'}</div>
                      {job.source && <div className="mt-1 text-xs font-medium text-indigo-600">Nguồn: {job.source}</div>}
                    </td>
                    <td className="px-6 py-4">{job.location}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">
                      {job.salaryMin || job.salaryMax
                        ? `${(job.salaryMin / 1000000).toFixed(0)} - ${(job.salaryMax / 1000000).toFixed(0)} Tr`
                        : 'Thỏa thuận'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {job.experience}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(job)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                        title="Sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingJob ? 'Chỉnh sửa việc làm' : 'Thêm tin tuyển dụng mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu đề việc làm</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Frontend Developer (ReactJS)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Công ty</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Đà Nẵng"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lương tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lương tối đa (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kinh nghiệm</label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                  >
                    <option value="Intern">Intern</option>
                    <option value="Fresher">Fresher</option>
                    <option value="Junior">Junior</option>
                    <option value="Middle">Middle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại hình</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kỹ năng yêu cầu (cách nhau dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="ReactJS, JavaScript, Git, HTML, CSS"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả công việc</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả trách nhiệm công việc..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Lưu việc làm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagementPage;
