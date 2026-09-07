require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// ─── Initialize MySQL connection pool ─────────────────────────────────────────
// Importing db.js triggers the pool creation and logs connection status.
require('./config/db');

const authRoutes      = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const optionRoutes    = require('./routes/options');
const centreRoutes    = require('./routes/centres');
const logRoutes       = require('./routes/logs');
const postalRoutes    = require('./routes/postalRequests');
const { startExpirationJob } = require('./cron/expirationJob');

const app = express();

// ─── Ensure uploads folder exists ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body) console.log('Body:', req.body);
  next();
});
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded files publicly

// ─── Validate required MySQL env variables ────────────────────────────────────
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingEnv  = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`[ENV WARNING] Missing env variables: ${missingEnv.join(', ')}`);
} else {
  console.log('[ENV OK] All required environment variables are loaded.');
}

// ─── Test SMTP connection at startup ─────────────────────────────────────────
const emailService = require('./utils/emailService');
if (emailService.verifySMTPConnection) {
  emailService.verifySMTPConnection();
}

// ─── Routes ───────────────────────────────────────────────────────────────────
console.log('Registering routes...');
app.use('/api/auth',          authRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/options',       optionRoutes);
app.use('/api/centres',       centreRoutes);
app.use('/api/logs',          logRoutes);
app.use('/api/postal-requests', postalRoutes);
console.log('Routes registered');

// ─── Start background expiration cron ────────────────────────────────────────
startExpirationJob();

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
