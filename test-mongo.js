const mongoose = require('mongoose');

async function testConnection(uri) {
  try {
    console.log(`Testing URI: ${uri}`);
    await mongoose.connect(uri);
    console.log("Connected successfully!");
    
    // try to do a simple write
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    await TestModel.create({ name: 'test' });
    console.log("Write successful!");
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

async function run() {
  await testConnection('mongodb://saim_db_user:saim0000@ac-pjtqp2z-shard-00-01.nmhhepz.mongodb.net:27017/bologna?ssl=true&authSource=admin');
}

run();
