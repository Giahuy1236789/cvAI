import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './sliding-auth.css';

// You'll need font-awesome for icons to show.
// Make sure font-awesome is included in index.html or imported.

const LoginPage = ({ initialMode = 'login' }) => {
  const [isRightPanelActive, setIsRightPanelActive] = useState(initialMode === 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(loginEmail, loginPassword);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/recommendations');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (regPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        role: 'student'
      });
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sliding-auth-wrapper">
      <div className={`sliding-auth-container ${isRightPanelActive ? 'right-panel-active' : ''}`} id="container">
        
        {/* Sign Up Panel */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleSignUp}>
            <h1>Tạo tài khoản</h1>
            <div className="social-container">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Google"><i className="fab fa-google-plus-g"></i></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            </div>
            <span>Hoặc đăng ký bằng email</span>
            
            <input type="text" placeholder="Họ và tên" required value={regFullName} onChange={(e) => setRegFullName(e.target.value)} />
            <input type="email" placeholder="Email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            <input type="password" placeholder="Mật khẩu" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={6} />
            
            {isRightPanelActive && error && <p className="auth-error-msg">{error}</p>}
            
            <button type="submit" disabled={loading} style={{ marginTop: '15px' }}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>
        </div>

        {/* Sign In Panel */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleSignIn}>
            <h1>Đăng nhập</h1>
            <div className="social-container">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Google"><i className="fab fa-google-plus-g"></i></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            </div>
            <span>Hoặc đăng nhập bằng tài khoản</span>
            
            <input type="email" placeholder="Email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            <input type="password" placeholder="Mật khẩu" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            <a href="#">Quên mật khẩu?</a>
            
            {!isRightPanelActive && error && <p className="auth-error-msg">{error}</p>}
            
            <button type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Overlay Panel */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Đã có tài khoản?</h1>
              <p>Đăng nhập ngay để tiếp tục hành trình sự nghiệp của bạn cùng AICareer.</p>
              <button className="ghost" id="signIn" onClick={() => { setIsRightPanelActive(false); setError(''); }}>Đăng nhập</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Bắt đầu ngay!</h1>
              <p>Tạo tài khoản miễn phí để thiết kế CV chuẩn ATS và nhận gợi ý việc làm AI.</p>
              <button className="ghost" id="signUp" onClick={() => { setIsRightPanelActive(true); setError(''); }}>Đăng ký</button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LoginPage;
