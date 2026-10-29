const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./config/database');

const app = express();

// ===== Middleware =====
const clientUrl = process.env.CLIENT_URL;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!clientUrl || clientUrl === '*' || origin === clientUrl) return callback(null, true);
    const allowed = clientUrl.split(',').map((s) => s.trim());
    if (allowed.includes(origin) || origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Routes =====
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const jobRoutes = require('./routes/job.routes');
const companyRoutes = require('./routes/company.routes');
const cvRoutes = require('./routes/cv.routes');
const aiRoutes = require('./routes/ai.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const savedJobRoutes = require('./routes/savedJob.routes');
const adminRoutes = require('./routes/admin.routes');
const skillRoutes = require('./routes/skill.routes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/cvs', cvRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/skills', skillRoutes);

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI CV & Job System API đang hoạt động',
    timestamp: new Date().toISOString(),
  });
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại',
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server nội bộ',
  });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
initializeDatabase().then(() => app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  // Source availability must never delay API startup or application login.
  try {
    require('./services/jobs/job-sync.service').startJobSync();
  } catch (err) {
    console.warn('[Sync] Job sync startup error:', err.message);
  }
})).catch((error) => {
  console.error('MySQL connection error:', error.message);
  process.exit(1);
});

module.exports = app;
