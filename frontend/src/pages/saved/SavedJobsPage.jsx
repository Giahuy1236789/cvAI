import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Bookmark, Building2, MapPin, DollarSign, Trash2, ArrowRight } from 'lucide-react';

const SavedJobsPage = () => {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/saved-jobs');
      if (res.data.success) {
        setSavedJobs(res.data.data.savedJobs);
      }
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId) => {
    try {
      const res = await api.delete(`/saved-jobs/${jobId}`);
      if (res.data.success) {
        setSavedJobs((prev) => prev.filter((item) => item.jobId !== jobId));
      }
    } catch (err) {
      console.error('Error removing saved job:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-7 h-7 text-amber-500 fill-amber-500" />
            Việc làm đã lưu
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Danh sách các cơ hội nghề nghiệp bạn đang quan tâm và theo dõi
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-amber-600">{savedJobs.length}</span>
          <span className="text-xs text-slate-400 block">Việc đã lưu</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse p-6"></div>
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">Chưa có việc làm nào được lưu</h3>
          <p className="text-sm text-slate-500">Hãy nhấn biểu tượng dấu trang ở các tin tuyển dụng để lưu lại.</p>
          <Link to="/jobs" className="inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
            Khám phá việc làm ngay →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <Link
                  to={`/jobs/${item.job?.id}`}
                  className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  {item.job?.title || 'Việc làm'}
                </Link>

                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{item.job?.company?.name || 'Công ty Công nghệ'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.job?.location}</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-emerald-700">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {((item.job?.salaryMin || 0) / 1000000).toFixed(0)} - {((item.job?.salaryMax || 0) / 1000000).toFixed(0)} Triệu VNĐ
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleUnsave(item.jobId)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Bỏ lưu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link
                  to={`/jobs/${item.job?.id}`}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobsPage;
