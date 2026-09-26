import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JobListPage from './pages/jobs/JobListPage';
import JobDetailPage from './pages/jobs/JobDetailPage';

// Student Pages
import ProfilePage from './pages/student/ProfilePage';
import CVListPage from './pages/cv/CVListPage';
import CVEditorPage from './pages/cv/CVEditorPage';
import CVAnalyzerPage from './pages/cv/CVAnalyzerPage';
import RecommendationPage from './pages/recommendations/RecommendationPage';
import SavedJobsPage from './pages/saved/SavedJobsPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import JobManagementPage from './pages/admin/JobManagementPage';
import CompanyManagementPage from './pages/admin/CompanyManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';

function ScrollToPage() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToPage />
        <div className="app-shell flex flex-col min-h-screen text-slate-900">
          <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
          <Navbar />
          <main id="main-content" className="app-main flex-1" tabIndex={-1}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/jobs" element={<JobListPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />

              {/* Student Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/cvs" element={<CVListPage />} />
                <Route path="/cv-editor" element={<CVEditorPage />} />
                <Route path="/cv-editor/:id" element={<CVEditorPage />} />
                <Route path="/cv-analyzer" element={<CVAnalyzerPage />} />
                <Route path="/recommendations" element={<RecommendationPage />} />
                <Route path="/saved-jobs" element={<SavedJobsPage />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/jobs" element={<JobManagementPage />} />
                <Route path="/admin/companies" element={<CompanyManagementPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
