const mysql = require('mysql2');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'bologna_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return dates as strings to avoid TZ conversion issues
  dateStrings:        false,
  timezone:           '+00:00'
});

// Expose the promise-based API so all consumers can use async/await
const promisePool = pool.promise();

// Verify the pool can connect at startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('[MySQL] Connection error:', err.message);
    console.error('[MySQL] Make sure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are set in .env');
    return;
  }
  console.log('[MySQL] Connected successfully to database:', process.env.DB_NAME || 'bologna_db');
  connection.release();
});

module.exports = promisePool;
