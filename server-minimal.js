require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(express.json());

// Database Connection
console.log('Connecting to DB:', process.env.DB_URI);
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB connection error:', err.message));

// Auth route - minimal version
app.post('/api/auth/login', async (req, res) => {
  console.log('[LOGIN] Request received');
  console.log('[LOGIN] Body:', req.body);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('[LOGIN] Missing email or password');
      return res.status(400).json({ message: 'Missing credentials' });
    }
    
    console.log('[LOGIN] Attempting authentication for:', email);
    
    // For testing, just return success
    const token = 'test-token-12345';
    console.log('[LOGIN] Returning token');
    return res.json({ token });
    
  } catch (err) {
    console.error('[LOGIN] Error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
