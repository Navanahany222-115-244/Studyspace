// ===================================================
// main.js
// Small shared helper used by other JS files.
// ===================================================

// Displays a message inside a given element (used for
// showing success or error messages under forms).
function showMessage(elementId, text, isError = false) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.style.color = isError ? '#d9534f' : '#28a745';
}
