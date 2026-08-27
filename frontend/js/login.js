// ===================================================
// login.js
// Handles the login form submission for both
// students and admin.
// ===================================================

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save logged-in user info so the dashboard page can use it
            localStorage.setItem('studyspace_user', JSON.stringify(data.user));

            showMessage('loginMessage', `Welcome, ${data.user.name}! Redirecting...`, false);

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage('loginMessage', data.message, true);
        }
    } catch (error) {
        showMessage('loginMessage', 'Could not connect to server. Is the backend running?', true);
    }
});
