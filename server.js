require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const optionRoutes = require('./routes/options');
const centreRoutes = require('./routes/centres');
const logRoutes = require('./routes/logs');
const postalRoutes = require('./routes/postalRequests');
const { startExpirationJob } = require('./cron/expirationJob');

const app = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body) console.log('Body:', req.body);
  next();
});
app.use('/uploads', express.static(uploadsDir)); // Serve files publicly

// Database Connection — with auto-reconnect options for Atlas
const mongooseOpts = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  maxPoolSize: 10,
};

if (!process.env.DB_URI) {
  console.error('[ENV ERROR] DB_URI is missing from .env file!');
} else {
  console.log('[ENV OK] DB_URI is loaded from .env');
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI, mongooseOpts);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB initial connection error details:', err);
    // Retry after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Attempting to reconnect...');
  setTimeout(connectDB, 3000);
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected successfully');
});
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error details:', err);
});

connectDB();

// Test SMTP connection at startup
const emailService = require('./utils/emailService');
if (emailService.verifySMTPConnection) {
  emailService.verifySMTPConnection();
}

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/options', optionRoutes);
app.use('/api/centres', centreRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/postal-requests', postalRoutes);
console.log('Routes registered');

// Start cron background task
startExpirationJob();

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
