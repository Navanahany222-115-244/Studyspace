// ===================================================
// roomRoutes.js
// Defines the API endpoints for study room management
// and (Update 3) live room status.
// ===================================================

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// GET /api/rooms - view all rooms (admin management table)
router.get('/', roomController.getAllRooms);

// GET /api/rooms/status - all active rooms with live status
// IMPORTANT: this must be defined BEFORE /:id, otherwise
// Express would think "status" is a room id.
router.get('/status', roomController.getRoomsWithStatus);

// GET /api/rooms/:id - one room's full details + live status
router.get('/:id', roomController.getRoomById);

// POST /api/rooms - add a new room
router.post('/', roomController.addRoom);

// PUT /api/rooms/:id - update a room
router.put('/:id', roomController.updateRoom);

// DELETE /api/rooms/:id - delete a room
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
