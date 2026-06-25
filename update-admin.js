require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const CONN_URI = 'mongodb://saim_db_user:saim0000@ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017/bologna?ssl=true&authSource=admin';

console.log('Connecting via direct shard URI...');

const Admin = mongoose.model('Admin', new mongoose.Schema({
  email: String,
  password: String
}));

const run = async () => {
  try {
    await mongoose.connect(CONN_URI, { serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected to MongoDB');

    // List all admins
    const admins = await Admin.find({});
    console.log('Current admins in DB:', admins.map(a => a.email));

    // Update or create the admin and reset their password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    const result = await Admin.updateOne(
      { email: 'admin@UTAMED.com' },
      { $set: { password: hash } },
      { upsert: true }
    );
    console.log('✅ Admin password has been updated/reset to password123');

    const updated = await Admin.find({});
    console.log('Updated admins:', updated.map(a => a.email));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
