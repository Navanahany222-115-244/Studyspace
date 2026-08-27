// ===================================================
// register.js
// Handles the student registration form submission.
// ===================================================

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('registerMessage', data.message + ' Redirecting to login...', false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showMessage('registerMessage', data.message, true);
        }
    } catch (error) {
        showMessage('registerMessage', 'Could not connect to server. Is the backend running?', true);
    }
});
