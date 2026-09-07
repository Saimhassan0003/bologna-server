require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const CONN_URI = process.env.DB_URI || 'mongodb://saim_db_user:saim0000@ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017/bologna?ssl=true&authSource=admin';

console.log('Connecting to database...');

const Admin = mongoose.model('Admin', new mongoose.Schema({
  email: String,
  password: String
}));

const run = async () => {
  try {
    await mongoose.connect(CONN_URI, { serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected to MongoDB');

    // List all admins before update
    const admins = await Admin.find({});
    console.log('Current admins in DB:', admins.map(a => a.email));

    // Update the admin credentials (change email and password)
    const newEmail = 'admissions@studentportal.com';
    const newPassword = 'Student Portal@2026$$';

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // If there is an existing admin, update it. If not, upsert it.
    const result = await Admin.updateOne(
      {}, // matches the first admin record (or you can match by existing admin@studentportal.com)
      { $set: { email: newEmail, password: hash } },
      { upsert: true }
    );
    console.log(`✅ Admin login updated. Email set to: "${newEmail}"`);

    const updated = await Admin.find({});
    console.log('Updated admins in DB:', updated.map(a => a.email));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
