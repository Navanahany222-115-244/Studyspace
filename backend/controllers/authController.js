// ===================================================
// authController.js
// Contains the logic for student registration and
// login for both students and admin.
// ===================================================

const bcrypt = require('bcryptjs');
const db = require('../db');

// ---------------------------------------------------
// REGISTER a new student
// ---------------------------------------------------
exports.registerUser = (req, res) => {
    const { name, email, password } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please fill in all fields.' });
    }

    // 2. Check if email already exists
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // 3. Hash the password before saving
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: 'Error while securing password.' });
            }

            const insertQuery = `
                INSERT INTO users (name, email, password, role)
                VALUES (?, ?, ?, 'student')
            `;

            db.query(insertQuery, [name, email, hashedPassword], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error.', error: err.message });
                }

                return res.status(201).json({ message: 'Registration successful! You can now log in.' });
            });
        });
    });
};

// ---------------------------------------------------
// LOGIN (works for both student and admin)
// ---------------------------------------------------
exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: 'Error verifying password.' });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            // Login successful - send back basic user info (never send the password)
            return res.status(200).json({
                message: 'Login successful!',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    });
};
