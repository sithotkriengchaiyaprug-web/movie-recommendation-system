// js/users.js
document.addEventListener('DOMContentLoaded', () => {
    loadUserList();

    // Event Listeners
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    document.getElementById('sampleUsersBtn').addEventListener('click', handleSampleUsers);
    document.getElementById('refreshUsersBtn').addEventListener('click', loadUserList);
    document.getElementById('deleteAllUsersBtn').addEventListener('click', handleDeleteAll);
});

// ==========================================
// 📦 Load Users
// ==========================================

async function loadUserList() {
    const listEl = document.getElementById('userList');

    try {
        const users = await getUsers();

        // อัพเดทสถิติ
        document.getElementById('userCount').textContent = users.length;
        document.getElementById('userCountBadge').textContent = `${users.length} คน`;

        const activeCount = users.filter(u => u.watchedCount > 0 || u.likedCount > 0).length;
        document.getElementById('activeUsers').textContent = activeCount;

        // Empty state
        if (users.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <h3>ยังไม่มี User</h3>
                    <p>เพิ่ม User คนแรกด้านบนเลย!</p>
                </div>`;
            return;
        }

        // Render list
        listEl.innerHTML = users.map(user => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-icon">👤</div>
                    <div>
                        <strong>${esc(user.name)}</strong>
                        ${user.age ? `<span style="color:var(--text-muted);font-size:0.8rem"> (${user.age} ปี)</span>` : ''}
                        <div class="rel-tags">
                            ${user.watchedCount > 0 ? `<span class="badge badge-primary">👁️ ดู ${user.watchedCount} เรื่อง</span>` : ''}
                            ${user.likedCount > 0 ? `<span class="badge badge-success">❤️ ชอบ ${user.likedCount} เรื่อง</span>` : ''}
                            ${user.watchedCount === 0 && user.likedCount === 0 ? `<span class="badge badge-warning">🆕 ยังไม่มีกิจกรรม</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteUser('${escJs(user.name)}')">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>โหลดข้อมูลไม่ได้</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

// ==========================================
// ✏️ Add User
// ==========================================

async function handleAddUser(e) {
    e.preventDefault();

    const nameInput = document.getElementById('userName');
    const ageInput = document.getElementById('userAge');
    const btn = document.getElementById('addUserBtn');

    const name = nameInput.value.trim();
    const age = ageInput.value ? parseInt(ageInput.value) : null;

    if (!name) {
        showToast('กรุณาใส่ชื่อ User', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังเพิ่ม...';

    try {
        await createUser(name, age);
        showToast(`เพิ่ม User "${name}" สำเร็จ! ✅`, 'success');

        nameInput.value = '';
        ageInput.value = '';
        nameInput.focus();

        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '➕ เพิ่ม User';
    }
}

// ==========================================
// 🗑️ Delete User
// ==========================================

async function handleDeleteUser(name) {
    if (!confirm(`คุณแน่ใจว่าจะลบ "${name}"?\n(ความสัมพันธ์ทั้งหมดจะถูกลบด้วย)`)) return;

    try {
        await deleteUserAPI(name);
        showToast(`ลบ "${name}" แล้ว 🗑️`, 'success');
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleDeleteAll() {
    if (!confirm('⚠️ ลบ Users ทั้งหมด?')) return;
    if (!confirm('🔥 ยืนยันอีกครั้ง!')) return;

    try {
        await deleteAllUsersAPI();
        showToast('ลบ Users ทั้งหมดแล้ว! 🗑️', 'success');
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==========================================
// 🎲 Sample Data
// ==========================================

async function handleSampleUsers() {
    try {
        await addSampleUsersAPI();
        showToast('เพิ่ม Sample Users สำเร็จ! 🎲', 'success');
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==========================================
// 🔧 Utilities
// ==========================================

function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function escJs(text) {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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