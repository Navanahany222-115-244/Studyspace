// ===================================================
// server.js
// Main entry point for the StudySpace backend server.
// ===================================================

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route files
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = 3000;

// ---------------------------------------------------
// Middleware
// ---------------------------------------------------
app.use(cors());               // Allow frontend to call this API
app.use(express.json());      // Parse JSON request bodies

// ---------------------------------------------------
// Serve the frontend folder as static files
// This lets us open the site at http://localhost:3000
// ---------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------------------------------------------------
// API Routes
// ---------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Simple test route to confirm the API is running
app.get('/api/test', (req, res) => {
    res.json({ message: 'StudySpace API is working!' });
});

// ---------------------------------------------------
// Start the server
// ---------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 StudySpace server running at http://localhost:${PORT}`);
});
