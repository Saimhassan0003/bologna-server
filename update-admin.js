require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Use direct connection to the shards — bypasses SRV/TXT DNS lookup entirely
// Shards resolved via: nslookup -type=SRV _mongodb._tcp.cluster0.nmhhepz.mongodb.net
const DIRECT_URI = 'mongodb://ac-pjtqp2z-shard-00-00.nmhhepz.mongodb.net:27017,ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017,ac-pjtqp2z-shard-00-02.nmhhepz.mongodb.net:27017/bologna?authSource=admin&replicaSet=atlas-nkpd0p-shard-0&ssl=true&retryWrites=true&w=majority';

// Fallback: try to extract credentials from env DB_URI
const SRV_URI = process.env.DB_URI || '';
const credMatch = SRV_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
const username = credMatch ? credMatch[1] : '';
const password = credMatch ? credMatch[2] : '';
const dbName = SRV_URI.includes('/bologna') ? 'bologna' : 'test';

const CONN_URI = username
  ? `mongodb://${username}:${password}@ac-pjtqp2z-shard-00-00.nmhhepz.mongodb.net:27017,ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017,ac-pjtqp2z-shard-00-02.nmhhepz.mongodb.net:27017/${dbName}?authSource=admin&replicaSet=atlas-nkpd0p-shard-0&ssl=true&retryWrites=true&w=majority`
  : DIRECT_URI;

console.log('Connecting via direct shard URIs...');
console.log('Username:', username || '(not found, check .env)');

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

    // Update old email to new email
    const result = await Admin.updateOne(
      { email: { $in: ['admin@ibes.com', 'admin@UTAMED.com', 'admin@UTAMED.com'] } },
      { $set: { email: 'admin@UTAMED.com' } }
    );

    if (result.matchedCount === 0) {
      console.log('⚠️  No admin found. Creating new admin...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      await Admin.create({ email: 'admin@UTAMED.com', password: hash });
      console.log('✅ Created new admin: admin@UTAMED.com / password123');
    } else {
      console.log('✅ Admin email updated to admin@UTAMED.com');
      console.log('   Matched:', result.matchedCount, '| Modified:', result.modifiedCount);
    }

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
