import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight, Sparkles, Briefcase, FileText, Bookmark, Send, User, LogOut, Menu, X, LayoutDashboard, Building2, Users } from 'lucide-react';

export const Brand = () => (
  <Link to="/" className="brand" aria-label="AICareer — Trang chủ">
    <span className="brand-mark"><Sparkles size={21} strokeWidth={2} /></span>
    <span>AI<span className="brand-accent">Career</span><span className="brand-dot">.</span></span>
  </Link>
);

const Navbar = () => {
  const { user, logout, isStudent, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const links = isStudent ? [
    ['/jobs', Briefcase, 'Tìm việc làm'], ['/recommendations', Sparkles, 'Gợi ý việc làm AI'],
    ['/cvs', FileText, 'CV của tôi'], ['/cv-analyzer', Sparkles, 'Phân tích CV AI'],
    ['/saved-jobs', Bookmark, 'Đã lưu'], ['/profile', User, 'Tạo CV ngay'],
  ] : isAdmin ? [
    ['/admin/dashboard', LayoutDashboard, 'Tổng quan'], ['/admin/jobs', Briefcase, 'Việc làm'],
    ['/admin/companies', Building2, 'Công ty'], ['/admin/users', Users, 'Tài khoản'],
  ] : [['/jobs', Briefcase, 'Tìm việc làm'], ['/register', FileText, 'Tạo CV với AI']];
  const roleLabel = isAdmin ? 'Quản trị viên' : 'Không gian của bạn';
  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Tài khoản';
  const renderLink = ([path, Icon, label]) => (
    <NavLink key={path} to={path} onClick={() => setMobileMenuOpen(false)}
      className={({ isActive }) => 'nav-link' + (isActive || (path === '/cvs' && location.pathname.startsWith('/cv-editor')) ? ' is-active' : '')}>
      <Icon size={16} /><span>{label}</span>
    </NavLink>
  );

  return (
    <header className="app-navbar">
      <div className="site-container navbar-top">
        <Brand />
        {!user && <nav className="public-nav" aria-label="Điều hướng chính">{links.map(renderLink)}<Link className="nav-link" to="/#ai-tools"><Sparkles size={16} />Công cụ AI</Link></nav>}
        {user && <span className="navbar-workspace-label">{roleLabel}</span>}
        <div className="navbar-actions">
          {user ? <>
            <div className="nav-account"><span className="user-avatar">{displayName.charAt(0).toUpperCase()}</span><span>{displayName}</span></div>
            <button className="icon-button logout-button" type="button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={18} /></button>
          </> : <><Link to="/login" className="nav-signin">Đăng nhập</Link><Link to="/register" className="button button-primary nav-signup">Bắt đầu ngay <ArrowUpRight size={16} /></Link></>}
          <button className="icon-button mobile-menu-toggle" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {user && <nav className="workspace-nav" aria-label="Điều hướng không gian làm việc"><div className="site-container workspace-nav-inner">{links.map(renderLink)}</div></nav>}
      {mobileMenuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Điều hướng trên điện thoại">
        {links.map(renderLink)}
        {!user && <><Link to="/#ai-tools" onClick={() => setMobileMenuOpen(false)} className="nav-link"><Sparkles size={16} />Công cụ AI</Link><div className="mobile-auth-actions"><Link to="/login" onClick={() => setMobileMenuOpen(false)} className="button button-secondary">Đăng nhập</Link><Link to="/register" onClick={() => setMobileMenuOpen(false)} className="button button-primary">Đăng ký</Link></div></>}
      </nav>}
    </header>
  );
};

export default Navbar;
