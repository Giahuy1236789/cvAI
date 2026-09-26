import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { user, isStudent, isRecruiter, isAdmin } = useAuth();
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/cv-editor')) return null;
  const workspacePath = isAdmin ? '/admin/dashboard' : isRecruiter ? '/recruiter/dashboard' : isStudent ? '/profile' : '/register';
  return (
    <footer className="app-footer">
      <div className="site-container footer-main">
        <div className="footer-about"><Brand /><p>Bước khởi đầu tự tin cho sự nghiệp của bạn.<br />Tạo CV tốt hơn. Tìm cơ hội phù hợp hơn.</p></div>
        <div className="footer-links"><span>Khám phá</span><Link to="/jobs">Tìm việc làm <ArrowUpRight size={14} /></Link><Link to="/#how-it-works">Cách hoạt động <ArrowUpRight size={14} /></Link></div>
        <div className="footer-links"><span>{user ? 'Không gian làm việc' : 'Bắt đầu cùng AICareer'}</span><Link to={workspacePath}>{user ? 'Tài khoản của bạn' : 'Tạo tài khoản'} <ArrowUpRight size={14} /></Link>{(!user || isStudent) && <Link to={user ? '/cvs' : '/login'}>{user ? 'Quản lý CV' : 'Đăng nhập'} <ArrowUpRight size={14} /></Link>}</div>
      </div>
      <div className="site-container footer-bottom"><span>© {new Date().getFullYear()} AICareer. Đồng hành cùng sự nghiệp của bạn.</span><span>Được thiết kế cho thế hệ nhân lực mới <span className="footer-spark">✦</span></span></div>
    </footer>
  );
}
