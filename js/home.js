// js/home.js
document.addEventListener('DOMContentLoaded', async () => {
    await checkConnection();
    await loadStats();
});

async function checkConnection() {
    const statusEl = document.getElementById('connStatus');
    const textEl = document.getElementById('connText');

    try {
        const connected = await testConnection();
        if (connected) {
            statusEl.className = 'connection-status status-connected';
            textEl.textContent = 'Connected';
            showToast('เชื่อมต่อ Backend สำเร็จ ✅', 'success');
        } else {
            throw new Error('fail');
        }
    } catch {
        statusEl.className = 'connection-status status-disconnected';
        textEl.textContent = 'Disconnected';
        showToast('เชื่อมต่อ Backend ไม่ได้ ❌ — ตรวจสอบว่า Backend รันอยู่', 'error');
    }
}

async function loadStats() {
    try {
        const stats = await getStats();
        document.getElementById('totalUsers').textContent = stats.users;
        document.getElementById('totalMovies').textContent = stats.movies;
        document.getElementById('totalWatched').textContent = stats.watched;
        document.getElementById('totalLiked').textContent = stats.liked;
    } catch {
        ['totalUsers', 'totalMovies', 'totalWatched', 'totalLiked']
            .forEach(id => document.getElementById(id).textContent = '0');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('open');
}