// ===================================================
// dashboard.js  (Update 3)
// Drives the Rooms / Today's Schedule / Upcoming /
// My Bookings / Admin tabs on dashboard.html.
// ===================================================

const user = JSON.parse(localStorage.getItem('studyspace_user'));

if (!user) {
    window.location.href = 'login.html';
}

document.getElementById('welcomeText').textContent = `Welcome, ${user.name} (${user.role})`;

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('studyspace_user');
    window.location.href = 'login.html';
});

// Only admins see the "Manage Rooms" and "Booking Requests" tabs
if (user.role === 'admin') {
    document.getElementById('adminTabItem').classList.remove('d-none');
    document.getElementById('requestsTabItem').classList.remove('d-none');
}

// Keeps the last room list fetched from the server so
// filters can be applied instantly without refetching.
let allRoomsWithStatus = [];

// Bootstrap modal instances (created once, reused)
const roomDetailsModal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
const bookRoomModal = new bootstrap.Modal(document.getElementById('bookRoomModal'));

// ---------------------------------------------------
// Small helpers
// ---------------------------------------------------
function statusBadgeClass(status) {
    if (status === 'AVAILABLE') return 'bg-success';
    if (status === 'CLASS RUNNING') return 'bg-danger';
    if (status === 'BOOKED') return 'bg-warning text-dark';
    return 'bg-secondary';
}

function scheduleBadgeClass(status) {
    if (status === 'CLASS RUNNING') return 'bg-danger';
    if (status === 'UPCOMING') return 'bg-warning text-dark';
    if (status === 'COMPLETED') return 'bg-secondary';
    if (status === 'CANCELLED') return 'bg-dark';
    if (status === 'PENDING APPROVAL') return 'bg-info text-dark';
    if (status === 'REJECTED') return 'bg-dark';
    return 'bg-secondary';
}

function formatCapacity(room) {
    return room.room_type === 'LARGE SPACE' ? '50+ Students' : `${room.capacity} Students`;
}

function formatTime(t) {
    // "14:30:00" -> "2:30 PM"
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${m} ${suffix}`;
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString();
}

// ===================================================
// ROOMS TAB - live status, filters, cards
// ===================================================

async function loadRoomsWithStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/status`);
        const data = await response.json();
        allRoomsWithStatus = data.rooms || [];
        updateSummaryCards();
        applyFiltersAndRender();
    } catch (error) {
        console.error('Could not load room status:', error);
    }
}

function updateSummaryCards() {
    const total = allRoomsWithStatus.length;
    const available = allRoomsWithStatus.filter((r) => r.live_status === 'AVAILABLE').length;
    const running = allRoomsWithStatus.filter((r) => r.live_status === 'CLASS RUNNING').length;
    const totalCapacity = allRoomsWithStatus.reduce((sum, r) => sum + Number(r.capacity), 0);

    document.getElementById('statTotalRooms').textContent = total;
    document.getElementById('statAvailable').textContent = available;
    document.getElementById('statRunning').textContent = running;
    document.getElementById('statCapacity').textContent = totalCapacity;

    // Upcoming bookings count comes from a separate endpoint (see loadUpcoming)
}

function applyFiltersAndRender() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const floor = document.getElementById('floorFilter').value;
    const type = document.getElementById('typeFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filtered = allRoomsWithStatus.filter((room) => {
        if (search && !room.room_name.toLowerCase().includes(search)) return false;
        if (floor && room.floor !== floor) return false;
        if (type && room.room_type !== type) return false;
        if (status && room.live_status !== status) return false;
        return true;
    });

    renderRoomCards(filtered);
}

['searchInput', 'floorFilter', 'typeFilter', 'statusFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('input', applyFiltersAndRender);
    document.getElementById(id).addEventListener('change', applyFiltersAndRender);
});

function renderRoomCards(rooms) {
    const container = document.getElementById('roomCardsContainer');
    container.innerHTML = '';

    if (rooms.length === 0) {
        container.innerHTML = '<p class="text-muted">No rooms match your filters.</p>';
        return;
    }

    rooms.forEach((room) => {
        const col = document.createElement('div');
        col.className = 'col-md-4';

        let extraInfo = '';
        if (room.live_status === 'CLASS RUNNING') {
            extraInfo = `
                <p class="mb-1 small"><strong>Teacher:</strong> ${room.current_teacher || '-'}</p>
                <p class="mb-1 small"><strong>Subject:</strong> ${room.current_subject || '-'}</p>
                <p class="mb-1 small">${formatTime(room.current_start_time)} - ${formatTime(room.current_end_time)}</p>
            `;
        } else if (room.next_booking) {
            extraInfo = `
                <p class="mb-1 small"><strong>Next Booking:</strong></p>
                <p class="mb-1 small">${room.next_booking.subject_name || 'Class'} (${formatDate(room.next_booking.booking_date)})</p>
                <p class="mb-1 small">${formatTime(room.next_booking.start_time)} - ${formatTime(room.next_booking.end_time)}</p>
            `;
        }

        col.innerHTML = `
            <div class="feature-card text-start h-100 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="mb-1">${room.room_name}</h5>
                    <span class="badge ${statusBadgeClass(room.live_status)}">${room.live_status}</span>
                </div>
                <p class="mb-1 small text-muted">${room.floor || ''} &middot; ${room.room_type}</p>
                <p class="mb-2 small"><strong>Capacity:</strong> ${formatCapacity(room)}</p>
                ${extraInfo}
                <div class="mt-auto d-flex gap-2 pt-2">
                    <button class="btn btn-sm btn-outline-primary flex-fill" onclick="openRoomDetails(${room.id})">Details</button>
                    <button class="btn btn-sm btn-primary flex-fill" onclick="openBookModalById(${room.id})">Book Room</button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

// ---------------------------------------------------
// Room Details modal
// ---------------------------------------------------
async function openRoomDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${id}`);
        const data = await response.json();
        const room = data.room;

        let currentInfo = '<p><em>Currently no class is running.</em></p>';
        if (room.live_status === 'CLASS RUNNING') {
            currentInfo = `
                <p><strong>Teacher:</strong> ${room.current_teacher || '-'}</p>
                <p><strong>Subject:</strong> ${room.current_subject || '-'}</p>
                <p><strong>Time:</strong> ${formatTime(room.current_start_time)} - ${formatTime(room.current_end_time)}</p>
            `;
        }

        let nextInfo = '<p><em>No upcoming booking.</em></p>';
        if (room.next_booking) {
            nextInfo = `
                <p><strong>Next Booking:</strong> ${room.next_booking.subject_name || 'Class'}
                on ${formatDate(room.next_booking.booking_date)}
                (${formatTime(room.next_booking.start_time)} - ${formatTime(room.next_booking.end_time)})</p>
            `;
        }

        document.getElementById('roomDetailsBody').innerHTML = `
            <h5>${room.room_name}</h5>
            <span class="badge ${statusBadgeClass(room.live_status)} mb-2">${room.live_status}</span>
            <p><strong>Floor:</strong> ${room.floor || '-'}</p>
            <p><strong>Room Type:</strong> ${room.room_type}</p>
            <p><strong>Capacity:</strong> ${formatCapacity(room)}</p>
            ${currentInfo}
            ${nextInfo}
        `;

        document.getElementById('detailsBookBtn').onclick = () => {
            roomDetailsModal.hide();
            openBookModal(room);
        };

        roomDetailsModal.show();
    } catch (error) {
        console.error('Could not load room details:', error);
    }
}

function openBookModalById(id) {
    const room = allRoomsWithStatus.find((r) => r.id === id);
    if (room) openBookModal(room);
}

function openBookModal(room) {
    document.getElementById('book_room_id').value = room.id;
    document.getElementById('book_room_name').textContent = `${room.room_name} (Capacity: ${formatCapacity(room)})`;
    document.getElementById('book_teacher_name').value = user.name;
    document.getElementById('book_subject_name').value = '';
    document.getElementById('book_date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('book_date').min = new Date().toISOString().slice(0, 10);
    document.getElementById('book_start_time').value = '';
    document.getElementById('book_end_time').value = '';
    document.getElementById('book_student_count').value = '';
    document.getElementById('book_purpose').value = '';
    document.getElementById('bookFormMessage').textContent = '';

    bookRoomModal.show();
}

// ---------------------------------------------------
// Book Room form submission
// ---------------------------------------------------
document.getElementById('bookRoomForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const start = document.getElementById('book_start_time').value;
    const end = document.getElementById('book_end_time').value;

    if (start >= end) {
        showMessage('bookFormMessage', 'End time must be after start time.', true);
        return;
    }

    const bookingData = {
        user_id: user.id,
        room_id: document.getElementById('book_room_id').value,
        teacher_name: document.getElementById('book_teacher_name').value.trim(),
        subject_name: document.getElementById('book_subject_name').value.trim(),
        booking_date: document.getElementById('book_date').value,
        start_time: start,
        end_time: end,
        student_count: document.getElementById('book_student_count').value,
        purpose: document.getElementById('book_purpose').value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        const data = await response.json();

        if (response.ok) {
            showMessage('bookFormMessage', data.message, false);
            setTimeout(() => {
                bookRoomModal.hide();
                loadRoomsWithStatus();
                loadTodaySchedule();
                loadUpcoming();
                loadMyBookings();
                loadPendingRequests();
            }, 800);
        } else {
            showMessage('bookFormMessage', data.message, true);
        }
    } catch (error) {
        showMessage('bookFormMessage', 'Could not connect to server.', true);
    }
});

// ===================================================
// TODAY'S SCHEDULE TAB
// ===================================================
async function loadTodaySchedule() {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/today`);
        const data = await response.json();
        const tbody = document.getElementById('todayScheduleBody');
        tbody.innerHTML = '';

        (data.bookings || []).forEach((b) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${b.room_name}</td>
                <td>${b.floor || ''}</td>
                <td>${b.room_type || ''}</td>
                <td>${b.teacher_name || ''}</td>
                <td>${b.subject_name || ''}</td>
                <td>${b.student_count || ''}</td>
                <td>${formatTime(b.start_time)}</td>
                <td>${formatTime(b.end_time)}</td>
                <td><span class="badge ${scheduleBadgeClass(b.schedule_status)}">${b.schedule_status}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Could not load today\'s schedule:', error);
    }
}

// ===================================================
// UPCOMING BOOKINGS TAB
// ===================================================
async function loadUpcoming() {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/upcoming`);
        const data = await response.json();
        const bookings = data.bookings || [];

        document.getElementById('statUpcoming').textContent = bookings.length;

        const tbody = document.getElementById('upcomingBody');
        tbody.innerHTML = '';

        bookings.forEach((b) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${b.room_name}</td>
                <td>${b.teacher_name || ''}</td>
                <td>${b.subject_name || ''}</td>
                <td>${formatDate(b.booking_date)}</td>
                <td>${formatTime(b.start_time)}</td>
                <td>${formatTime(b.end_time)}</td>
                <td>${b.student_count || ''}</td>
                <td><span class="badge bg-warning text-dark">Confirmed</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Could not load upcoming bookings:', error);
    }
}

// ===================================================
// MY BOOKINGS TAB
// ===================================================
async function loadMyBookings() {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/mine/${user.id}`);
        const data = await response.json();
        const tbody = document.getElementById('myBookingsBody');
        tbody.innerHTML = '';

        (data.bookings || []).forEach((b) => {
            const canCancel = (b.status === 'confirmed' || b.status === 'pending') && b.schedule_status !== 'COMPLETED';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${b.room_name}</td>
                <td>${b.subject_name || ''}</td>
                <td>${formatDate(b.booking_date)}</td>
                <td>${formatTime(b.start_time)}</td>
                <td>${formatTime(b.end_time)}</td>
                <td>${b.student_count || ''}</td>
                <td><span class="badge ${scheduleBadgeClass(b.schedule_status)}">${b.schedule_status}</span></td>
                <td>
                    ${canCancel
                        ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking(${b.id})">Cancel</button>`
                        : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Could not load my bookings:', error);
    }
}

async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            loadMyBookings();
            loadRoomsWithStatus();
            loadTodaySchedule();
            loadUpcoming();
            loadPendingRequests();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Could not connect to server.');
    }
}

// ===================================================
// BOOKING REQUESTS TAB (Admin, Part 4)
// ===================================================
async function loadPendingRequests() {
    if (user.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/pending`);
        const data = await response.json();
        const requests = data.bookings || [];

        const badge = document.getElementById('pendingCountBadge');
        if (requests.length > 0) {
            badge.textContent = requests.length;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }

        const tbody = document.getElementById('pendingRequestsBody');
        const noPendingMessage = document.getElementById('noPendingMessage');
        tbody.innerHTML = '';

        if (requests.length === 0) {
            noPendingMessage.classList.remove('d-none');
            return;
        }
        noPendingMessage.classList.add('d-none');

        requests.forEach((b) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${b.room_name}</td>
                <td>${b.requested_by}<br><small class="text-muted">${b.requester_email}</small></td>
                <td>${b.teacher_name || ''}</td>
                <td>${b.subject_name || ''}</td>
                <td>${formatDate(b.booking_date)}</td>
                <td>${formatTime(b.start_time)}</td>
                <td>${formatTime(b.end_time)}</td>
                <td>${b.student_count || ''}</td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="approveRequest(${b.id})">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="rejectRequest(${b.id})">Reject</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Could not load booking requests:', error);
    }
}

function refreshEverything() {
    loadRoomsWithStatus();
    loadTodaySchedule();
    loadUpcoming();
    loadMyBookings();
    loadPendingRequests();
}

async function approveRequest(id) {
    if (!confirm('Approve this booking request?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/approve`, { method: 'PUT' });
        const data = await response.json();

        if (response.ok) {
            refreshEverything();
        } else {
            alert(data.message);
            loadPendingRequests(); // refresh in case another admin already resolved it
        }
    } catch (error) {
        alert('Could not connect to server.');
    }
}

async function rejectRequest(id) {
    if (!confirm('Reject this booking request?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/reject`, { method: 'PUT' });
        const data = await response.json();

        if (response.ok) {
            refreshEverything();
        } else {
            alert(data.message);
            loadPendingRequests();
        }
    } catch (error) {
        alert('Could not connect to server.');
    }
}

// ===================================================
// ADMIN TAB - room CRUD (Update 1/2, extended)
// ===================================================
async function loadAdminRoomTable() {
    if (user.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        const data = await response.json();
        const tbody = document.getElementById('roomTableBody');
        tbody.innerHTML = '';

        (data.rooms || []).forEach((room) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.id}</td>
                <td>${room.room_name}</td>
                <td>${room.floor || ''}</td>
                <td>${room.room_type}</td>
                <td>${room.capacity}</td>
                <td>
                    <span class="badge ${room.status === 'available' ? 'bg-success' : 'bg-secondary'}">
                        ${room.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editRoom(${room.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Could not load rooms:', error);
    }
}

const addRoomForm = document.getElementById('addRoomForm');
if (addRoomForm) {
    addRoomForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const room_name = document.getElementById('room_name').value.trim();
        const room_number = document.getElementById('room_number').value.trim();
        const capacity = document.getElementById('capacity').value;
        const location = document.getElementById('location').value.trim();
        const status = document.getElementById('status').value;
        const floor = document.getElementById('floor').value;
        const room_type = document.getElementById('room_type').value;
        const editingId = document.getElementById('editingRoomId').value;

        const roomData = { room_name, room_number, capacity, location, status, floor, room_type };

        try {
            let response;
            if (editingId) {
                response = await fetch(`${API_BASE_URL}/rooms/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(roomData)
                });
            } else {
                response = await fetch(`${API_BASE_URL}/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(roomData)
                });
            }

            const data = await response.json();

            if (response.ok) {
                showMessage('roomFormMessage', data.message, false);
                addRoomForm.reset();
                document.getElementById('editingRoomId').value = '';
                document.getElementById('addRoomBtn').textContent = 'Add Room';
                loadAdminRoomTable();
                loadRoomsWithStatus();
            } else {
                showMessage('roomFormMessage', data.message, true);
            }
        } catch (error) {
            showMessage('roomFormMessage', 'Could not connect to server.', true);
        }
    });
}

async function editRoom(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        const data = await response.json();
        const room = data.rooms.find((r) => r.id === id);
        if (!room) return;

        document.getElementById('room_name').value = room.room_name;
        document.getElementById('room_number').value = room.room_number;
        document.getElementById('capacity').value = room.capacity;
        document.getElementById('location').value = room.location;
        document.getElementById('status').value = room.status;
        document.getElementById('floor').value = room.floor || '';
        document.getElementById('room_type').value = room.room_type || 'CLASSROOM';
        document.getElementById('editingRoomId').value = room.id;
        document.getElementById('addRoomBtn').textContent = 'Update Room';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Could not load room for editing:', error);
    }
}

async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            loadAdminRoomTable();
            loadRoomsWithStatus();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Could not connect to server.');
    }
}

// ---------------------------------------------------
// Initial load
// ---------------------------------------------------
loadRoomsWithStatus();
loadTodaySchedule();
loadUpcoming();
loadMyBookings();
loadAdminRoomTable();
loadPendingRequests();
