// ===================================================
// db.js
// This file creates the connection between our
// Node.js backend and the MySQL database.
// ===================================================

const mysql = require('mysql2');

// ---------------------------------------------------
// IMPORTANT: Update these values to match your own
// MySQL setup before running the project.
// ---------------------------------------------------
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyspace_db',
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10
});

// Quick check to confirm the connection works
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Failed to connect to MySQL database:', err.message);
    } else {
        console.log('✅ Connected to MySQL database (studyspace_db)');
        connection.release();
    }
});

module.exports = db;
