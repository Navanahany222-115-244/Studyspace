-- ===================================================
-- StudySpace - Database Creation Script (Update 3)
-- This is the ONLY database file you need.
--
-- Just run this whole file in MySQL Workbench (or the
-- mysql command line). It will:
--   1. Create the database and tables (safe to re-run)
--   2. Clear old rooms/bookings and load the real
--      MU building room list
--   3. Insert a few demo bookings so you can show
--      Available / Class Running / Booked / Completed
--
-- Note: re-running this file will reset the ROOMS and
-- BOOKINGS tables back to the demo data, but it will
-- NOT delete your registered user accounts.
-- ===================================================

CREATE DATABASE IF NOT EXISTS studyspace_db;
USE studyspace_db;

-- ---------------------------------------------------
-- Table: users  (unchanged since Update 1)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'   -- 'student' or 'admin'
);

-- ---------------------------------------------------
-- Table: rooms  (extended in Update 3)
-- floor / room_type / is_active are new columns.
-- room_number / location / status are kept from
-- Update 1/2 so the existing admin form still works.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'available'
);

-- If "rooms" already existed from an earlier update, these add the
-- new Update 3 columns. Safe to re-run (IF NOT EXISTS skips them
-- if they're already there). Needs MySQL 8.0.29 or newer.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor VARCHAR(50) NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'CLASSROOM';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

-- ---------------------------------------------------
-- Table: bookings  (extended in Update 3)
-- teacher_name / subject_name / student_count are new.
-- status is now 'confirmed' or 'cancelled'.
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Same idea for "bookings" - adds the new Update 3 columns if missing.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS teacher_name VARCHAR(100) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100) NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_count INT NULL;
ALTER TABLE bookings MODIFY status VARCHAR(20) NOT NULL DEFAULT 'confirmed';

-- Note: The default Admin account is created by running
-- "node seed.js" inside the backend folder, so its
-- password is bcrypt-hashed instead of stored as plain text.


-- ===================================================
-- SEED ROOMS
-- Only the rooms that actually exist and are bookable
-- in the MU building. Run this section fresh each time
-- you want to reset the room list (it clears rooms and
-- bookings first so IDs stay in sync).
-- ===================================================

DELETE FROM bookings;
DELETE FROM rooms;
ALTER TABLE rooms AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;

INSERT INTO rooms (room_name, room_number, capacity, location, status, floor, room_type, is_active) VALUES
-- 2nd Floor
('MU 205', 'MU-205', 50, '2nd Floor', 'available', '2nd Floor', 'CLASSROOM', 1),

-- Ground / Lower Area
('EEE1 Lab', 'EEE1', 50, 'Ground/Lower', 'available', 'Ground/Lower', 'LAB', 1),
('EEE2 Lab', 'EEE2', 50, 'Ground/Lower', 'available', 'Ground/Lower', 'LAB', 1),

-- 3rd Floor Labs
('MU 301', 'MU-301', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),
('MU 306', 'MU-306', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),
('MU 307', 'MU-307', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),
('MU 309', 'MU-309', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),
('MU 310', 'MU-310', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),
('MU 311', 'MU-311', 50, '3rd Floor', 'available', '3rd Floor', 'LAB', 1),

-- 4th Floor (MU 407 is a LAB, the rest are classrooms)
('MU 401', 'MU-401', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 402', 'MU-402', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 403', 'MU-403', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 404', 'MU-404', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 405', 'MU-405', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 406', 'MU-406', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 407', 'MU-407', 50, '4th Floor', 'available', '4th Floor', 'LAB', 1),
('MU 408', 'MU-408', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 409', 'MU-409', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),
('MU 410', 'MU-410', 50, '4th Floor', 'available', '4th Floor', 'CLASSROOM', 1),

-- 5th Floor
('MU 501', 'MU-501', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 502', 'MU-502', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 503', 'MU-503', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 504', 'MU-504', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 505', 'MU-505', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 506', 'MU-506', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 507', 'MU-507', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 508', 'MU-508', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),
('MU 509', 'MU-509', 50, '5th Floor', 'available', '5th Floor', 'CLASSROOM', 1),

-- Large Spaces (capacity stored as 100 for validation; UI shows "50+ Students")
('Gallery 1', 'GAL-1', 100, 'Large Spaces', 'available', 'Large Spaces', 'LARGE SPACE', 1),
('Gallery 2', 'GAL-2', 100, 'Large Spaces', 'available', 'Large Spaces', 'LARGE SPACE', 1),

-- Extension Rooms
('Extension 1', 'EXT-1', 50, 'Extension', 'available', 'Extension', 'CLASSROOM', 1),
('Extension 2', 'EXT-2', 50, 'Extension', 'available', 'Extension', 'CLASSROOM', 1),
('Extension 3', 'EXT-3', 50, 'Extension', 'available', 'Extension', 'CLASSROOM', 1),
('Extension 4', 'EXT-4', 50, 'Extension', 'available', 'Extension', 'CLASSROOM', 1),
('Extension 5', 'EXT-5', 50, 'Extension', 'available', 'Extension', 'CLASSROOM', 1);


-- ===================================================
-- SEED DEMO BOOKINGS
-- These use NOW()/CURDATE() so they always demo
-- correctly no matter what day/time you run this.
-- Needs at least one user in the "users" table -
-- run "node seed.js" BEFORE this section so the
-- admin account (used as the booking owner) exists.
-- ===================================================

-- 1. CLASS RUNNING right now -> MU 402
INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, teacher_name, subject_name, student_count, purpose, status)
SELECT u.id, r.id, CURDATE(), TIME(NOW() - INTERVAL 30 MINUTE), TIME(NOW() + INTERVAL 90 MINUTE),
       'Dr. Rahman', 'Database Systems', 45, 'Regular Class', 'confirmed'
FROM users u, rooms r
WHERE u.role = 'admin' AND r.room_name = 'MU 402'
LIMIT 1;

-- 2. CLASS RUNNING right now -> MU 407 (Lab example)
INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, teacher_name, subject_name, student_count, purpose, status)
SELECT u.id, r.id, CURDATE(), TIME(NOW() - INTERVAL 15 MINUTE), TIME(NOW() + INTERVAL 45 MINUTE),
       'Dr. Karim', 'Computer Networks', 40, 'Lab Session', 'confirmed'
FROM users u, rooms r
WHERE u.role = 'admin' AND r.room_name = 'MU 407'
LIMIT 1;

-- 3. Future BOOKED later today -> MU 501
INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, teacher_name, subject_name, student_count, purpose, status)
SELECT u.id, r.id, CURDATE(), TIME(NOW() + INTERVAL 3 HOUR), TIME(NOW() + INTERVAL 4 HOUR),
       'Dr. Sultana', 'Data Structures', 48, 'Extra Class', 'confirmed'
FROM users u, rooms r
WHERE u.role = 'admin' AND r.room_name = 'MU 501'
LIMIT 1;

-- 4. COMPLETED booking earlier today -> MU 401
INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, teacher_name, subject_name, student_count, purpose, status)
SELECT u.id, r.id, CURDATE(), TIME(NOW() - INTERVAL 4 HOUR), TIME(NOW() - INTERVAL 2 HOUR),
       'Dr. Hasan', 'Operating Systems', 42, 'Regular Class', 'confirmed'
FROM users u, rooms r
WHERE u.role = 'admin' AND r.room_name = 'MU 401'
LIMIT 1;

-- 5. Advance booking for tomorrow -> Gallery 1 (50+ students)
INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, teacher_name, subject_name, student_count, purpose, status)
SELECT u.id, r.id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '12:00:00',
       'Dr. Farhana', 'Orientation Session', 80, 'Department Seminar', 'confirmed'
FROM users u, rooms r
WHERE u.role = 'admin' AND r.room_name = 'Gallery 1'
LIMIT 1;

-- MU 205, EEE1 Lab, EEE2 Lab, Extension 1-5, and most other rooms
-- intentionally have NO booking, so they demo as AVAILABLE.
