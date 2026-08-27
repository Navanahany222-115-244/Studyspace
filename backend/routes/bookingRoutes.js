// ===================================================
// bookingRoutes.js
// Defines the API endpoints for room bookings,
// including (Part 4) admin approve/reject.
// ===================================================

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings/today - today's schedule
// GET /api/bookings/upcoming - upcoming bookings
// GET /api/bookings/pending - booking requests awaiting approval
// GET /api/bookings/mine/:userId - a user's own bookings
// (all defined before "/" and "/:id" so Express doesn't confuse routes)
router.get('/today', bookingController.getTodayBookings);
router.get('/upcoming', bookingController.getUpcomingBookings);
router.get('/pending', bookingController.getPendingBookings);
router.get('/mine/:userId', bookingController.getMyBookings);

// GET /api/bookings - all bookings (admin overview)
router.get('/', bookingController.getAllBookings);

// POST /api/bookings - create a new booking (student -> pending, admin -> confirmed)
router.post('/', bookingController.createBooking);

// PUT /api/bookings/:id/approve - admin approves a pending request
router.put('/:id/approve', bookingController.approveBooking);

// PUT /api/bookings/:id/reject - admin rejects a pending request
router.put('/:id/reject', bookingController.rejectBooking);

// DELETE /api/bookings/:id - cancel a booking
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
