import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const roleLabels = { student: 'Sinh viên', admin: 'Quản trị viên' };
const roleClasses = {
  student: 'bg-blue-50 text-blue-700',
  admin: 'bg-rose-50 text-rose-700',
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, companiesRes] = await Promise.all([api.get('/admin/users'), api.get('/companies')]);
      if (usersRes.data.success) setUsers(usersRes.data.data.users);
      if (companiesRes.data.success) setCompanies(companiesRes.data.data.companies);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveRole = async (account, role, companyId = account.companyId) => {
    setError('');
    setSavingId(account.id);
    try {
      const res = await api.put(`/admin/users/${account.id}/role`, { role, companyId: companyId || null });
      if (res.data.success) {
        setUsers((previous) => previous.map((item) => item.id === account.id ? res.data.data.user : item));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật quyền.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-rose-600" /> Quản lý phân quyền
          </h1>
          <p className="text-slate-500 text-sm mt-1">Nâng hoặc hạ quyền tài khoản trong hệ thống.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-rose-600">{users.length}</span>
          <span className="text-xs text-slate-400 block">Tài khoản</span>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4">Quyền hiện tại</th>
                  <th className="px-6 py-4 text-right">Thay đổi quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => {
                  const isCurrentUser = account.id === currentUser?.id;
                  const disabled = isCurrentUser || savingId === account.id;
                  return (
                    <tr key={account.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{account.fullName || 'Người dùng'}</div>
                        <div className="text-xs text-slate-400">{account.email}</div>
                        {isCurrentUser && <div className="text-xs text-amber-600 mt-1">Tài khoản đang đăng nhập</div>}
                      </td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${roleClasses[account.role]}`}>{roleLabels[account.role]}</span></td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={account.role}
                          disabled={disabled}
                          onChange={(event) => saveRole(account, event.target.value)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <option value="student">Sinh viên</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
