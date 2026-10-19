const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PRIVATE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQLURL;

let pool;
if (dbUrl) {
  const urlWithParams = dbUrl.includes('multipleStatements=true')
    ? dbUrl
    : `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}multipleStatements=true`;
  pool = mysql.createPool(urlWithParams);
} else {
  const dbConfig = {
    host: process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
    user: process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'bloodlink',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  };

  // Hanya aktifkan SSL jika diminta eksplisit atau terkoneksi ke provider cloud yang membutuhkan SSL
  if (process.env.MYSQL_SSL === 'true' || process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }

  pool = mysql.createPool(dbConfig);
}

// Helper function to test DB connection and auto-initialize schema if missing
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected successfully to MySQL database!');

    // Cek apakah tabel users sudah ada
    try {
      const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
      if (tables.length === 0) {
        console.log('⏳ Tabel users belum ada di database. Menjalankan auto-inisialisasi dari schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await connection.query(sql);
          console.log('✅ Auto-inisialisasi berhasil! Database schema & data awal telah dipasang.');
        }
      } else {
        console.log('✅ Database schema siap (tabel users sudah ada).');
      }
    } catch (migErr) {
      console.warn('⚠️ Peringatan saat inisialisasi schema database:', migErr.message);
    }

    connection.release();
    return true;
  } catch (err) {
    console.warn('⚠️ Warning: MySQL Connection Error:', err.message);
    console.warn('💡 Tip: Pastikan environment variable MySQL (MYSQL_URL atau MYSQLHOST dsb) sudah diatur di Railway.');
    return false;
  }
}

testConnection();

module.exports = pool;
