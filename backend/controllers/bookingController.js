// ===================================================
// bookingController.js
// Handles creating bookings (with capacity + overlap
// validation), viewing schedules, cancelling, and
// (Part 4) admin approve/reject of booking requests.
//
// Booking status values:
//   'pending'   - student request, waiting for admin
//   'confirmed' - approved (or booked directly by admin)
//   'rejected'  - admin rejected the request
//   'cancelled' - the requester cancelled it themselves
//
// Only 'confirmed' bookings count for room live status,
// Today's Schedule, Upcoming Bookings, and overlap checks.
// ===================================================

const db = require('../db');

// Formats a Date as "YYYY-MM-DD" using LOCAL time (see roomController.js
// for why toISOString() would be wrong here).
function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ---------------------------------------------------
// Works out a booking's display status for a schedule
// table: UPCOMING, CLASS RUNNING, or COMPLETED.
// (Only meaningful for 'confirmed' bookings - callers
// check pending/rejected/cancelled separately.)
// ---------------------------------------------------
function computeScheduleStatus(booking) {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowTime = now.toTimeString().slice(0, 8);
    const bDateStr = toLocalDateStr(booking.booking_date);

    if (bDateStr > todayStr) return 'UPCOMING';
    if (bDateStr < todayStr) return 'COMPLETED';

    // Same day - compare times
    if (booking.start_time <= nowTime && booking.end_time > nowTime) return 'CLASS RUNNING';
    if (booking.start_time > nowTime) return 'UPCOMING';
    return 'COMPLETED';
}

// A single place that decides what "status" to show for any
// booking, in any table (My Bookings, Booking Requests, etc).
function displayStatusFor(booking) {
    if (booking.status === 'pending') return 'PENDING APPROVAL';
    if (booking.status === 'rejected') return 'REJECTED';
    if (booking.status === 'cancelled') return 'CANCELLED';
    return computeScheduleStatus(booking); // 'confirmed' -> UPCOMING/CLASS RUNNING/COMPLETED
}

// ---------------------------------------------------
// POST /api/bookings
// Create a new booking. Validates:
//   1. All required fields are present
//   2. Student count does not exceed room capacity
//      (skipped for LARGE SPACE rooms like Gallery 1/2)
//   3. No overlapping CONFIRMED booking already exists
//      for the same room on the same date
//
// Admin bookings are confirmed immediately (they already
// walked through the same checks). Student bookings go
// in as 'pending' until an admin approves them.
// ---------------------------------------------------
exports.createBooking = (req, res) => {
    const {
        user_id,
        room_id,
        teacher_name,
        subject_name,
        booking_date,
        start_time,
        end_time,
        student_count,
        purpose
    } = req.body;

    if (!user_id || !room_id || !booking_date || !start_time || !end_time) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    if (start_time >= end_time) {
        return res.status(400).json({ message: 'End time must be after start time.' });
    }

    // Step 1: look up the requesting user's role
    db.query('SELECT role FROM users WHERE id = ?', [user_id], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const requesterRole = userResults[0].role;

        // Step 2: look up the room to check capacity + type
        db.query('SELECT * FROM rooms WHERE id = ?', [room_id], (err, roomResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error.', error: err.message });
            }
            if (roomResults.length === 0) {
                return res.status(404).json({ message: 'Room not found.' });
            }

            const room = roomResults[0];

            // Step 3: capacity validation (Gallery / Large Spaces can take 50+)
            if (room.room_type !== 'LARGE SPACE' && student_count > room.capacity) {
                return res.status(400).json({
                    message: `Booking cannot be completed. This room can accommodate a maximum of ${room.capacity} students.`
                });
            }

            // Step 4: overlap validation against other CONFIRMED bookings
            const overlapQuery = `
                SELECT * FROM bookings
                WHERE room_id = ?
                  AND booking_date = ?
                  AND status = 'confirmed'
                  AND start_time < ?
                  AND end_time > ?
            `;
            // A new booking (start,end) overlaps an existing one (s,e) when:
            // existing.start_time < new.end_time AND existing.end_time > new.start_time
            db.query(overlapQuery, [room_id, booking_date, end_time, start_time], (err, overlapResults) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error.', error: err.message });
                }

                if (overlapResults.length > 0) {
                    return res.status(400).json({ message: 'Room is already booked during this time.' });
                }

                // Step 5: all checks passed - create the booking.
                // Admins get instant confirmation; students need approval.
                const initialStatus = requesterRole === 'admin' ? 'confirmed' : 'pending';

                const insertQuery = `
                    INSERT INTO bookings
                        (user_id, room_id, booking_date, start_time, end_time, purpose, teacher_name, subject_name, student_count, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const values = [
                    user_id, room_id, booking_date, start_time, end_time,
                    purpose || '', teacher_name || '', subject_name || '', student_count || null,
                    initialStatus
                ];

                db.query(insertQuery, values, (err, result) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error.', error: err.message });
                    }

                    const message = initialStatus === 'confirmed'
                        ? 'Room booked successfully!'
                        : 'Booking request submitted! Waiting for admin approval.';

                    return res.status(201).json({ message, bookingId: result.insertId, status: initialStatus });
                });
            });
        });
    });
};

// ---------------------------------------------------
// GET /api/bookings - all bookings (admin overview)
// Includes who requested each booking.
// ---------------------------------------------------
exports.getAllBookings = (req, res) => {
    const query = `
        SELECT b.*, r.room_name, r.floor, u.name AS requested_by, u.email AS requester_email
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.user_id = u.id
        ORDER BY b.booking_date DESC, b.start_time DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        return res.status(200).json({ bookings: results });
    });
};

// ---------------------------------------------------
// GET /api/bookings/pending - booking requests waiting
// for admin approval (Part 4)
// ---------------------------------------------------
exports.getPendingBookings = (req, res) => {
    const query = `
        SELECT b.*, r.room_name, r.floor, r.capacity, r.room_type,
               u.name AS requested_by, u.email AS requester_email
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'pending'
        ORDER BY b.booking_date ASC, b.start_time ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        return res.status(200).json({ bookings: results });
    });
};

// ---------------------------------------------------
// PUT /api/bookings/:id/approve - admin approves a
// pending request (Part 4). Re-checks for overlap
// against confirmed bookings, in case another request
// for the same slot was approved first.
// ---------------------------------------------------
exports.approveBooking = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM bookings WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const booking = results[0];

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: `This booking is already ${booking.status}.` });
        }

        const overlapQuery = `
            SELECT * FROM bookings
            WHERE room_id = ?
              AND booking_date = ?
              AND status = 'confirmed'
              AND id != ?
              AND start_time < ?
              AND end_time > ?
        `;
        db.query(
            overlapQuery,
            [booking.room_id, booking.booking_date, id, booking.end_time, booking.start_time],
            (err, overlapResults) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error.', error: err.message });
                }

                if (overlapResults.length > 0) {
                    return res.status(400).json({
                        message: 'Cannot approve - this room now has a confirmed booking for an overlapping time. Please reject this request instead.'
                    });
                }

                db.query(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`, [id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error.', error: err.message });
                    }
                    return res.status(200).json({ message: 'Booking approved and confirmed.' });
                });
            }
        );
    });
};

// ---------------------------------------------------
// PUT /api/bookings/:id/reject - admin rejects a
// pending request (Part 4)
// ---------------------------------------------------
exports.rejectBooking = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM bookings WHERE id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        if (results[0].status !== 'pending') {
            return res.status(400).json({ message: `This booking is already ${results[0].status}.` });
        }

        db.query(`UPDATE bookings SET status = 'rejected' WHERE id = ?`, [id], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database error.', error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Booking not found.' });
            }
            return res.status(200).json({ message: 'Booking request rejected.' });
        });
    });
};

// ---------------------------------------------------
// GET /api/bookings/today - today's schedule
// (confirmed bookings only)
// ---------------------------------------------------
exports.getTodayBookings = (req, res) => {
    const query = `
        SELECT b.*, r.room_name, r.floor, r.room_type
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.booking_date = CURDATE() AND b.status = 'confirmed'
        ORDER BY b.start_time ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }

        const bookingsWithStatus = results.map((b) => ({
            ...b,
            schedule_status: computeScheduleStatus(b)
        }));

        return res.status(200).json({ bookings: bookingsWithStatus });
    });
};

// ---------------------------------------------------
// GET /api/bookings/upcoming - upcoming bookings
// (today's remaining bookings + all future dates,
// confirmed only)
// ---------------------------------------------------
exports.getUpcomingBookings = (req, res) => {
    const query = `
        SELECT b.*, r.room_name, r.floor
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.status = 'confirmed'
          AND (
                b.booking_date > CURDATE()
                OR (b.booking_date = CURDATE() AND b.start_time > CURTIME())
              )
        ORDER BY b.booking_date ASC, b.start_time ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        return res.status(200).json({ bookings: results });
    });
};

// ---------------------------------------------------
// GET /api/bookings/mine/:userId - "My Bookings"
// (shows pending / confirmed / rejected / cancelled)
// ---------------------------------------------------
exports.getMyBookings = (req, res) => {
    const { userId } = req.params;

    const query = `
        SELECT b.*, r.room_name, r.floor
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.user_id = ?
        ORDER BY b.booking_date DESC, b.start_time DESC
    `;
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }

        const bookingsWithStatus = results.map((b) => ({
            ...b,
            schedule_status: displayStatusFor(b)
        }));

        return res.status(200).json({ bookings: bookingsWithStatus });
    });
};

// ---------------------------------------------------
// DELETE /api/bookings/:id - cancel a booking
// (kept in the database as status='cancelled' so it
// no longer blocks that time slot, but history stays)
// ---------------------------------------------------
exports.cancelBooking = (req, res) => {
    const { id } = req.params;

    const query = `UPDATE bookings SET status = 'cancelled' WHERE id = ?`;
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        return res.status(200).json({ message: 'Booking cancelled successfully.' });
    });
};
