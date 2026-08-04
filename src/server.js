require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const { sequelize } = require('./models');
const { seedDefaults } = require('./seeders/seed');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api', apiLimiter);

// --- Installation guard ---
// Some hosts (e.g. a traditional .env-file setup) configure the app via a
// backend/.env file; others (e.g. cPanel's Node.js App Selector) inject
// environment variables directly into the process with no .env file ever
// touching disk. Checking for DB_NAME being set covers both cases correctly
// — checking only for a literal .env file would incorrectly report "not
// installed" on cPanel-style hosting even when fully configured.
const isConfigured = Boolean(process.env.DB_NAME);
app.get('/api/install/status', (req, res) => {
  res.json({ installed: isConfigured });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Serve uploaded employee photos. Mounted under /api so it rides the same
// reverse-proxy path (/api) already configured for Vite (dev) and Nginx (prod)
// — no extra proxy rules needed.
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'HRManager 5.0' }));

// --- Serve the built frontend from the same app, when present ---
// This matters for hosting setups (like cPanel's Node.js App Selector) that
// give you a single Node app per subdomain slot rather than a separate
// static file server — so the built React app is copied into backend/public
// and served directly here. Purely local development (Vite's own dev
// server on a different port) is unaffected: this block only activates if
// that folder actually exists.
const FRONTEND_DIST = path.join(__dirname, '..', 'public');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next(); // let API 404s stay JSON, below
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✔ Database connection established');
    await sequelize.sync(); // for production, prefer running migrations explicitly — see docs
    await seedDefaults(); // safe to re-run every start — only creates what's missing
    app.listen(PORT, () => {
      console.log(`🚀 HRManager 5.0 API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('✘ Unable to start server:', err.message);
    console.error('  Have you run the installation wizard? -> npm run install-wizard');
    process.exit(1);
  }
}

start();

module.exports = app;
