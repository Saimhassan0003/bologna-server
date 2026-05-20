require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const optionRoutes = require('./routes/options');

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

// Database Connection
mongoose.connect(process.env.DB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/options', optionRoutes);
console.log('Routes registered');

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
