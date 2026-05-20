const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
  console.log('===LOGIN ENDPOINT CALLED===');
  const { email, password } = req.body;
  console.log('Login attempt:', { email, jwtSecretExists: !!process.env.JWT_SECRET });

  try {
    const admin = await Admin.findOne({ email });
    console.log('Admin found:', !!admin);
    
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      admin: {
        id: admin.id
      }
    };

    console.log('Signing token with secret:', !!process.env.JWT_SECRET);
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Token signed successfully');
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
