import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, Building2, Briefcase, FileText, Send, 
  TrendingUp, Sparkles, CheckCircle2, Clock, XCircle 
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-slate-500">Đang tải số liệu thống kê...</p>
      </div>
    );
  }

  const { overview, applicationStats, popularJobs, popularSkills } = stats || {};

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl flex justify-between items-center">
        <div>
          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider rounded-full">
            Admin Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Bảng điều khiển & Thống kê hệ thống
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tổng quan dữ liệu sinh viên, việc làm và hoạt động ứng tuyển
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase">Sinh viên</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{overview?.totalStudents || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase">Công ty</span>
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{overview?.totalCompanies || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase">Việc làm</span>
            <Briefcase className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{overview?.totalJobs || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase">Bản CV</span>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{overview?.totalCVs || 0}</div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Popular Skills */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Kỹ năng phổ biến nhất của sinh viên
          </h2>

          <div className="space-y-2.5">
            {popularSkills?.length > 0 ? (
              popularSkills.map((sk, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{sk.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {sk.count} sinh viên
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa có dữ liệu thống kê kỹ năng</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
