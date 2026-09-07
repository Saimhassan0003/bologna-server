const mongoose = require('mongoose');

async function testConnection() {
  const uri = 'mongodb://saim_db_user:saim0000@ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017/admin?ssl=true&authSource=admin';
  try {
    await mongoose.connect(uri);
    console.log("Connected successfully!");
    
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.command({ replSetGetStatus: 1 });
    console.log("Replica Set Name:", result.set);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

testConnection();
