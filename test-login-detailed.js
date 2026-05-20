require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('./models/Admin');

const testLogin = async () => {
  try {
    console.log('Starting test...');
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    console.log('DB_URI:', process.env.DB_URI);

    // Connect to DB
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');

    // Find admin
    const admin = await Admin.findOne({ email: 'admin@ibes.com' });
    console.log('Admin found:', !!admin);

    if (!admin) {
      console.log('Admin not found!');
      mongoose.connection.close();
      return;
    }

    // Check password
    console.log('Admin password hash:', admin.password);
    const isMatch = await bcrypt.compare('password123', admin.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password does not match');
      mongoose.connection.close();
      return;
    }

    // Sign token
    console.log('About to sign token...');
    const payload = { admin: { id: admin.id } };
    console.log('Payload:', payload);
    console.log('Secret exists:', !!process.env.JWT_SECRET);
    console.log('Secret length:', process.env.JWT_SECRET?.length);

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Token signed successfully');
    console.log('Token:', token);

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

testLogin();
