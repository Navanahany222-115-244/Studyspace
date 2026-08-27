// ===================================================
// roomController.js
// Add / View / Update / Delete for study rooms
// (Update 1/2), plus live status computation for
// Update 3 (Available / Booked / Class Running).
// ===================================================

const db = require('../db');

// Formats a Date as "YYYY-MM-DD" using LOCAL time (not UTC).
// Using toISOString() here would shift the date near midnight
// in timezones behind UTC, which would break "today" checks.
function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ---------------------------------------------------
// GET all rooms (used by admin room management table)
// ---------------------------------------------------
exports.getAllRooms = (req, res) => {
    const query = 'SELECT * FROM rooms ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        return res.status(200).json({ rooms: results });
    });
};

// ---------------------------------------------------
// ADD a new room (admin only)
// ---------------------------------------------------
exports.addRoom = (req, res) => {
    const { room_name, room_number, capacity, location, status, floor, room_type } = req.body;

    if (!room_name || !room_number || !capacity) {
        return res.status(400).json({ message: 'Room name, number and capacity are required.' });
    }

    const query = `
        INSERT INTO rooms (room_name, room_number, capacity, location, status, floor, room_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const values = [
        room_name,
        room_number,
        capacity,
        location || '',
        status || 'available',
        floor || '',
        room_type || 'CLASSROOM'
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        return res.status(201).json({ message: 'Room added successfully!', roomId: result.insertId });
    });
};

// ---------------------------------------------------
// UPDATE an existing room (admin only)
// ---------------------------------------------------
exports.updateRoom = (req, res) => {
    const { id } = req.params;
    const { room_name, room_number, capacity, location, status, floor, room_type } = req.body;

    const query = `
        UPDATE rooms
        SET room_name = ?, room_number = ?, capacity = ?, location = ?, status = ?, floor = ?, room_type = ?
        WHERE id = ?
    `;
    const values = [room_name, room_number, capacity, location, status, floor, room_type, id];

    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        return res.status(200).json({ message: 'Room updated successfully!' });
    });
};

// ---------------------------------------------------
// DELETE a room (admin only)
// ---------------------------------------------------
exports.deleteRoom = (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM rooms WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        return res.status(200).json({ message: 'Room deleted successfully!' });
    });
};

// ---------------------------------------------------
// Helper: work out a room's LIVE status right now.
// Returns one of: AVAILABLE, BOOKED, CLASS RUNNING
// along with the current teacher/subject (if running)
// and the next upcoming booking (if any).
// ---------------------------------------------------
function computeRoomStatus(todaysBookings, nextBooking) {
    const now = new Date();
    const nowTime = now.toTimeString().slice(0, 8); // "HH:MM:SS"

    // Is there a booking for TODAY that is happening right now?
    const runningNow = todaysBookings.find(
        (b) => b.start_time <= nowTime && b.end_time > nowTime
    );

    if (runningNow) {
        return {
            live_status: 'CLASS RUNNING',
            current_teacher: runningNow.teacher_name,
            current_subject: runningNow.subject_name,
            current_start_time: runningNow.start_time,
            current_end_time: runningNow.end_time,
            next_booking: nextBooking || null
        };
    }

    // Is there a booking for TODAY that hasn't started yet, or a future one?
    if (nextBooking) {
        return {
            live_status: 'BOOKED',
            current_teacher: null,
            current_subject: null,
            next_booking: nextBooking
        };
    }

    return {
        live_status: 'AVAILABLE',
        current_teacher: null,
        current_subject: null,
        next_booking: null
    };
}

// Groups all upcoming bookings for one room and figures out
// which of them (if any) is today's, and which is the very
// next one coming up.
function buildStatusInfoForRoom(roomId, allBookings) {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowTime = now.toTimeString().slice(0, 8);

    const roomBookings = allBookings.filter((b) => b.room_id === roomId);

    const todaysBookings = roomBookings.filter(
        (b) => toLocalDateStr(b.booking_date) === todayStr
    );

    const upcoming = roomBookings.find((b) => {
        const bDateStr = toLocalDateStr(b.booking_date);
        if (bDateStr > todayStr) return true;
        if (bDateStr === todayStr && b.start_time > nowTime) return true;
        return false;
    });

    const nextBooking = upcoming
        ? {
              booking_date: upcoming.booking_date,
              subject_name: upcoming.subject_name,
              teacher_name: upcoming.teacher_name,
              start_time: upcoming.start_time,
              end_time: upcoming.end_time
          }
        : null;

    return computeRoomStatus(todaysBookings, nextBooking);
}

// ---------------------------------------------------
// GET /api/rooms/status
// Returns every active room together with its live
// status, used by the dashboard room cards.
// ---------------------------------------------------
exports.getRoomsWithStatus = (req, res) => {
    const roomsQuery = 'SELECT * FROM rooms WHERE is_active = 1 ORDER BY id ASC';

    db.query(roomsQuery, (err, rooms) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }

        // Grab every confirmed booking from today onward in one query,
        // then group it by room in JavaScript (simpler than SQL for beginners).
        const bookingsQuery = `
            SELECT * FROM bookings
            WHERE status = 'confirmed' AND booking_date >= CURDATE()
            ORDER BY booking_date ASC, start_time ASC
        `;

        db.query(bookingsQuery, (err, bookings) => {
            if (err) {
                return res.status(500).json({ message: 'Database error.', error: err.message });
            }

            const roomsWithStatus = rooms.map((room) => {
                const statusInfo = buildStatusInfoForRoom(room.id, bookings);
                return { ...room, ...statusInfo };
            });

            return res.status(200).json({ rooms: roomsWithStatus });
        });
    });
};

// ---------------------------------------------------
// GET /api/rooms/:id
// Full details for a single room, including live
// status - used by the "Room Details" modal.
// ---------------------------------------------------
exports.getRoomById = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM rooms WHERE id = ?', [id], (err, roomResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error.', error: err.message });
        }
        if (roomResults.length === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        const room = roomResults[0];

        const bookingsQuery = `
            SELECT * FROM bookings
            WHERE room_id = ? AND status = 'confirmed' AND booking_date >= CURDATE()
            ORDER BY booking_date ASC, start_time ASC
        `;

        db.query(bookingsQuery, [id], (err, bookings) => {
            if (err) {
                return res.status(500).json({ message: 'Database error.', error: err.message });
            }

            const statusInfo = buildStatusInfoForRoom(room.id, bookings);
            return res.status(200).json({ room: { ...room, ...statusInfo } });
        });
    });
};
