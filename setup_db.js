const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'bologna_db',
      multipleStatements: true
    });
    console.log('Connected to bologna_db.');
    
    const sqlPath = path.join(__dirname, 'database', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await connection.query(sql);
    console.log('Schema imported successfully.');
    
    await connection.end();
  } catch (err) {
    console.error('Failed:', err);
  }
}
setup();
