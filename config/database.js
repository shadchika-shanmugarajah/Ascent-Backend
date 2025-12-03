const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  server: process.env.DB_SERVER || 'DESKTOP-CRPKTQP\SQLEXPRESS02',
  database: process.env.DB_DATABASE || 'StudentRegistration',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    // Use Windows Authentication if user/password are empty
    trustedConnection: !process.env.DB_USER || process.env.DB_USER === '',
    // Enable named pipes for local connections
    enableNamedPipe: true
  }
};

// Add user/password only if provided (SQL Server Authentication)
if (process.env.DB_USER && process.env.DB_USER !== '') {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD || '';
}

// Only add port if explicitly set (for TCP/IP connections)
// If no port, it will try named pipes first
if (process.env.DB_PORT && process.env.DB_PORT !== '') {
  config.port = parseInt(process.env.DB_PORT);
}

let pool = null;

const getPool = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

const closePool = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

module.exports = {
  getPool,
  closePool,
  sql
};

