import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FileText, Plus, Edit, Trash2, Search, ArrowRight, AlertCircle, UploadCloud } from 'lucide-react';
import '../workspace-pages.css';

const CVListPage = () => {
  const navigate = useNavigate();
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => { fetchCVs(); }, []);

  async function fetchCVs() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/cvs');
      if (res.data.success) setCvs(res.data.data.cvs);
    } catch (err) {
      console.error('Error fetching CVs:', err);
      setError('Không thể tải danh sách CV. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const handleUploadCV = async (file) => {
    if (!file) return;
    const validExtensions = /\.(pdf|docx|doc|txt|json|png|jpg|jpeg|webp)$/i;
    if (!validExtensions.test(file.name)) {
      setError('Định dạng file chưa được hỗ trợ. Vui lòng tải file PDF, Word (DOCX/DOC), TXT hoặc Ảnh CV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File quá lớn (tối đa 10MB).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('saveToDb', 'true');
      formData.append('template', 'topcv-blue');

      const res = await api.post('/cvs/upload-and-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.data?.cv) {
        navigate(`/cv-editor/${res.data.data.cv.id}`);
      } else if (res.data.success && res.data.data?.parsed) {
        sessionStorage.setItem('pendingUploadedCV', JSON.stringify(res.data.data.parsed));
        navigate('/cv-editor');
      } else {
        throw new Error(res.data.message || 'Không thể trích xuất CV.');
      }
    } catch (err) {
      console.error('Error uploading CV in list page:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi tải lên và phân tích CV.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa CV này không?')) return;
    try {
      const res = await api.delete(`/cvs/${id}`);
      if (res.data.success) setCvs((prev) => prev.filter((cv) => cv.id !== id));
    } catch (err) {
      console.error('Error deleting CV:', err);
      setError('Không thể xóa CV. Vui lòng thử lại.');
    }
  };

  const filtered = cvs.filter((cv) =>
    `${cv.title || ''} ${Array.isArray(cv.skills) ? cv.skills.join(' ') : (cv.skills || '')}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
  ).sort((a, b) => sort === 'name'
    ? (a.title || '').localeCompare(b.title || '', 'vi')
    : (new Date(b.updatedAt).getTime() || 0) - (new Date(a.updatedAt).getTime() || 0));

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <div className="workspace-eyebrow">Hồ sơ ứng tuyển</div>
          <h1>CV của bạn</h1>
          <p>Quản lý và hoàn thiện từng phiên bản CV cho cơ hội tiếp theo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="workspace-secondary flex items-center gap-1.5 cursor-pointer">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>{uploading ? 'Đang trích xuất CV...' : 'Tải lên CV'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.json,image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadCV(e.target.files[0]);
              }}
            />
          </label>
          <Link to="/cv-templates" className="workspace-primary"><Plus className="w-4 h-4" />Tạo CV mới</Link>
        </div>
      </header>

      {error && <div className="workspace-alert" role="alert"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="cv-toolbar">
        <div className="text-sm font-semibold text-slate-700">Tất cả CV <span className="ml-2 text-xs font-medium text-slate-400">{loading ? '…' : cvs.length}</span></div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <label className="cv-search">
            <Search className="w-4 h-4 shrink-0" />
            <input aria-label="Tìm CV theo tên hoặc kỹ năng" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên CV hoặc kỹ năng..." />
          </label>
          <select aria-label="Sắp xếp CV" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Cập nhật gần nhất</option>
            <option value="name">Tên CV: A – Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="cv-grid" role="status" aria-label="Đang tải danh sách CV">
          {[1, 2, 3].map((n) => <div key={n} className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
      ) : error && cvs.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><AlertCircle className="w-7 h-7" /></div>
          <h2>Chưa thể tải danh sách CV</h2>
          <p>Hãy tải lại để tiếp tục chỉnh sửa hồ sơ ứng tuyển của bạn.</p>
          <button type="button" className="workspace-primary" onClick={fetchCVs}>Thử lại</button>
        </div>
      ) : cvs.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><FileText className="w-7 h-7" /></div>
          <h2>Bắt đầu với CV đầu tiên</h2>
          <p>Tải lên file CV có sẵn để AI trích xuất thông tin, hoặc bắt đầu từ mẫu chuẩn ATS.</p>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <label className="workspace-secondary flex items-center gap-1.5 cursor-pointer">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>{uploading ? 'Đang đọc CV...' : 'Tải lên CV có sẵn'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.json,image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadCV(e.target.files[0]);
                }}
              />
            </label>
            <Link to="/cv-templates" className="workspace-primary">Chọn mẫu & tạo mới<ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="mt-5"><Link to="/profile" className="text-xs font-medium text-slate-500 hover:text-teal-700">Cập nhật hồ sơ cá nhân trước</Link></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><Search className="w-7 h-7" /></div>
          <h2>Không tìm thấy CV phù hợp</h2>
          <p>Thử một tên hoặc kỹ năng khác để tìm lại CV của bạn.</p>
          <button type="button" className="workspace-secondary" onClick={() => setSearch('')}>Xóa tìm kiếm</button>
        </div>
      ) : (
        <div className="cv-grid">
          {filtered.map((cv) => (
            <article key={cv.id} className="cv-card">
              <div className="cv-card-top">
                <div className="cv-document-icon"><FileText className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-700">Mẫu {cv.template || 'Modern'}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {cv.updatedAt ? `Cập nhật ${new Date(cv.updatedAt).toLocaleDateString('vi-VN')}` : 'Chưa có ngày cập nhật'}
                  </div>
                </div>
              </div>
              <div className="cv-card-content">
                <h2><Link to={`/cv-editor/${cv.id}`}>{cv.title || 'CV chưa đặt tên'}</Link></h2>
                <p className="cv-card-summary line-clamp-3">{cv.careerObjective || 'Bổ sung mục tiêu nghề nghiệp để nhà tuyển dụng hiểu rõ định hướng của bạn.'}</p>
                <div className="cv-card-tags">
                  {Array.isArray(cv.skills) ? (
                    <>
                      {cv.skills.slice(0, 4).map((skill, index) => <span key={index}>{skill}</span>)}
                      {cv.skills.length > 4 && <span>+{cv.skills.length - 4} kỹ năng</span>}
                    </>
                  ) : cv.skills ? <span>{cv.skills}</span> : null}
                </div>
              </div>
              <div className="cv-card-actions">
                <Link to={`/cv-editor/${cv.id}`} className="workspace-secondary"><Edit className="w-3.5 h-3.5" />Chỉnh sửa CV</Link>
                <button type="button" onClick={() => handleDelete(cv.id)} aria-label={`Xóa ${cv.title || 'CV chưa đặt tên'}`} title="Xóa CV"><Trash2 className="w-4 h-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default CVListPage;
