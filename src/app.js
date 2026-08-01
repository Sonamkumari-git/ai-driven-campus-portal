const express = require('express');
const cors = require('cors');
const path = require('path');
const { env } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { requireApiAuth, requireAuth } = require('./middleware/auth');

function createStaticMiddleware() {
  const staticMiddleware = express.static(env.publicDir, { index: false });
  return (req, res, next) => {
    const requestedPath = req.path || '';
    const isHtml = requestedPath.toLowerCase().endsWith('.html');
    const isPublicLogin = requestedPath === '/index.html';

    if (req.method === 'GET' && isHtml && !isPublicLogin) {
      return res.redirect(requestedPath.replace(/\.html$/i, ''));
    }

    return staticMiddleware(req, res, next);
  };
}

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get('/', (req, res) => res.sendFile(path.join(env.publicDir, 'index.html')));
  app.get('/index.html', (req, res) => res.sendFile(path.join(env.publicDir, 'index.html')));

  app.use(require('./routes/pageRoutes'));
  app.use(createStaticMiddleware());

  app.use('/api', require('./routes/authRoutes'));
  app.use('/api', require('./routes/settingsRoutes'));
  app.use('/api', require('./routes/profileRoutes'));

  app.use('/api', requireApiAuth);
  app.use(['/api/students', '/api/add-student', '/api/upload-photo'], requireAuth(['director', 'hod', 'staff']));
  app.use('/api/finance', requireAuth(['director', 'accountant']), require('./routes/financeRoutes'));
  app.use('/api/expenses', requireAuth(['director', 'accountant']));
  app.use('/api/audit-logs', requireAuth(['director']));
  app.use('/api/admin', requireAuth(['director']));

  // ---- AI Engine bridge (Node <-> FastAPI) with role-scoped access -----
  app.use('/api/ai/financial-forecast', requireAuth(['director', 'accountant']));
  app.use('/api/ai/predict-risk',       requireAuth(['director', 'hod', 'accountant', 'teacher']));
  app.use('/api/ai/generate-timetable', requireAuth(['director', 'hod']));
  app.use('/api/ai/verify-face',        requireAuth(['director', 'hod', 'teacher']));
  app.use('/api', require('./routes/aiRoutes'));
  app.use('/api', require('./routes/studentRoutes'));
  app.use('/api', require('./routes/financeAliasesRoutes'));
  app.use('/api', require('./routes/noticeRoutes'));
  app.use('/api', require('./routes/staffRoutes'));
  app.use('/api', require('./routes/noteRoutes'));
  app.use('/api', require('./routes/routineRoutes'));
  app.use('/api', require('./routes/teacherAttendanceRoutes'));
  app.use('/api', require('./routes/attendanceRoutes'));
  app.use('/api', require('./routes/markRoutes'));
  app.use('/api', require('./routes/leaveRoutes'));
  app.use('/api', require('./routes/auditRoutes'));
  app.use('/api', require('./routes/miscRoutes'));

  // Student self-service (JWT-scoped: student can only access their own data)
  app.use('/api', require('./routes/studentSelfRoutes'));

  // Admin-side student management (director/hod/staff)
  app.use('/api', require('./routes/adminStudentRoutes'));

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
