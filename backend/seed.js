// ===================================================
// seed.js
// Run this ONCE (node seed.js) after setting up the
// database to create the default Admin account.
// It hashes the password before saving it, so the
// real password is never stored as plain text.
// ===================================================

const bcrypt = require('bcryptjs');
const db = require('./db');

const adminName = 'System Admin';
const adminEmail = 'admin@studyspace.com';
const adminPassword = 'admin123'; // you can change this before running

bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [adminEmail], (err, results) => {
        if (err) {
            console.error('Database error:', err.message);
            return;
        }

        if (results.length > 0) {
            console.log('ℹ️ Admin account already exists. Nothing to do.');
            process.exit();
        }

        const insertQuery = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'admin')
        `;

        db.query(insertQuery, [adminName, adminEmail, hashedPassword], (err) => {
            if (err) {
                console.error('Error creating admin account:', err.message);
            } else {
                console.log('✅ Admin account created successfully!');
                console.log('   Email: admin@studyspace.com');
                console.log('   Password: admin123');
            }
            process.exit();
        });
    });
});
