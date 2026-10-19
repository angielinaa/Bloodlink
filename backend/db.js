const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

let pool;
if (dbUrl) {
  pool = mysql.createPool(dbUrl);
} else {
  const dbConfig = {
    host: process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
    user: process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'bloodlink',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Hanya aktifkan SSL jika diminta eksplisit atau terkoneksi ke provider cloud yang membutuhkan SSL
  if (process.env.MYSQL_SSL === 'true' || process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }

  pool = mysql.createPool(dbConfig);
}

// Helper function to test DB connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected successfully to MySQL database!');
    connection.release();
    return true;
  } catch (err) {
    console.warn('⚠️ Warning: MySQL Connection Error:', err.message);
    console.warn('💡 Tip: Make sure MySQL service is running on your system or update .env credentials.');
    return false;
  }
}

testConnection();

module.exports = pool;
