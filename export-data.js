// Export data from local MongoDB to JSON files for backup or import to Atlas
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Admin = require('./models/Admin');
const Application = require('./models/Application');

const exportData = async () => {
  try {
    // Connect to local MongoDB
    await mongoose.connect('mongodb://localhost:27017/bologna');
    console.log('Connected to local MongoDB...');

    // Export Admins
    const admins = await Admin.find({});
    fs.writeFileSync(
      path.join(__dirname, 'backup-admins.json'),
      JSON.stringify(admins, null, 2)
    );
    console.log(`Exported ${admins.length} admin(s) to backup-admins.json`);

    // Export Applications
    const applications = await Application.find({});
    fs.writeFileSync(
      path.join(__dirname, 'backup-applications.json'),
      JSON.stringify(applications, null, 2)
    );
    console.log(`Exported ${applications.length} application(s) to backup-applications.json`);

    mongoose.connection.close();
    console.log('Export complete!');
  } catch (err) {
    console.error('Export error:', err);
    process.exit(1);
  }
};

exportData();
