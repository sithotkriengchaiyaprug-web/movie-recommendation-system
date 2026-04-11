const usersState = {
    users: [],
    search: '',
    editingUser: null
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    document.getElementById('editUserForm').addEventListener('submit', handleUpdateUser);
    document.getElementById('cancelUserEditBtn').addEventListener('click', clearEditUser);
    document.getElementById('refreshUsersBtn').addEventListener('click', loadUserList);
    document.getElementById('seedUsersDemoBtn').addEventListener('click', handleSampleUsers);
    document.getElementById('deleteAllUsersBtn').addEventListener('click', handleDeleteAll);
    document.getElementById('searchClearBtn').addEventListener('click', clearSearch);
    document.getElementById('userSearchInput').addEventListener('input', MovieRecUI.debounce(handleSearch, 150));

    loadUserList();
});

async function loadUserList() {
    const listEl = document.getElementById('userList');
    listEl.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>กำลังโหลด users...</span></div>';

    try {
        const users = await getUsers();
        usersState.users = Array.isArray(users) ? users : [];
        renderUsers();
        MovieRecUI.refreshConnectionStatus();
    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>โหลดข้อมูลไม่ได้</h3>
                <p>${MovieRecUI.esc(error.message)}</p>
            </div>`;
        showToast(error.message, 'error');
    }
}

function renderUsers() {
    const query = usersState.search.trim().toLowerCase();
    const filtered = usersState.users.filter((user) => {
        return !query || `${user.name} ${user.age || ''}`.toLowerCase().includes(query);
    });

    document.getElementById('userCount').textContent = usersState.users.length;
    document.getElementById('activeUsers').textContent = usersState.users.filter((user) =>
        (user.watchedCount || 0) + (user.likedCount || 0) > 0
    ).length;
    document.getElementById('userCountBadge').textContent = `${filtered.length} คน`;

    const listEl = document.getElementById('userList');
    if (!filtered.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <h3>${usersState.users.length ? 'ไม่พบ user ที่ค้นหา' : 'ยังไม่มี User'}</h3>
                <p>${usersState.users.length ? 'ลองเปลี่ยนคำค้น หรือกด Clear search' : 'เพิ่ม user คนแรกหรือกด sample users เพื่อเริ่มเดโม'}</p>
            </div>`;
        return;
    }

    listEl.innerHTML = filtered.map((user) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-icon">👤</div>
                <div>
                    <strong>${MovieRecUI.esc(user.name)}</strong>
                    ${user.age ? `<span style="color:var(--text-muted)"> (${user.age} ปี)</span>` : ''}
                    <div class="rel-tags">
                        ${(user.watchedCount || 0) > 0 ? `<span class="badge badge-primary">👁️ ดู ${user.watchedCount} เรื่อง</span>` : ''}
                        ${(user.likedCount || 0) > 0 ? `<span class="badge badge-success">❤️ ชอบ ${user.likedCount} เรื่อง</span>` : ''}
                        ${(user.watchedCount || 0) + (user.likedCount || 0) === 0 ? `<span class="badge badge-warning">ยังไม่มี activity</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-outline btn-sm" onclick="beginEditUser('${MovieRecUI.escJs(user.name)}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteUser('${MovieRecUI.escJs(user.name)}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

async function handleAddUser(event) {
    event.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const ageValue = document.getElementById('userAge').value;
    const age = ageValue ? Number(ageValue) : null;
    const btn = document.getElementById('addUserBtn');

    if (!name) {
        showToast('กรุณาใส่ชื่อ user', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังเพิ่ม...';

    try {
        await createUser(name, age);
        showToast(`เพิ่ม User "${name}" สำเร็จ`, 'success');
        event.target.reset();
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '➕ เพิ่ม User';
    }
}

function beginEditUser(name) {
    const user = usersState.users.find((item) => item.name === name);
    if (!user) return;

    usersState.editingUser = user;
    document.getElementById('editUserOriginalName').value = user.name;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserAge').value = user.age || '';
    document.getElementById('editUserName').focus();
}

function clearEditUser() {
    usersState.editingUser = null;
    document.getElementById('editUserForm').reset();
    document.getElementById('editUserOriginalName').value = '';
}

async function handleUpdateUser(event) {
    event.preventDefault();

    if (!usersState.editingUser) {
        showToast('เลือก user ที่ต้องการแก้ไขก่อน', 'warning');
        return;
    }

    const payload = {
        name: document.getElementById('editUserName').value.trim(),
        age: document.getElementById('editUserAge').value ? Number(document.getElementById('editUserAge').value) : null
    };

    if (!payload.name) {
        showToast('ชื่อ user ต้องไม่ว่าง', 'error');
        return;
    }

    const btn = document.getElementById('saveUserEditBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังบันทึก...';

    try {
        await updateUserAPI(usersState.editingUser.name, payload);
        showToast(`อัปเดต User "${payload.name}" สำเร็จ`, 'success');
        clearEditUser();
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save changes';
    }
}

async function handleDeleteUser(name) {
    if (!confirm(`ลบ "${name}" และความสัมพันธ์ทั้งหมดของ user นี้?`)) return;

    try {
        await deleteUserAPI(name);
        showToast(`ลบ "${name}" แล้ว`, 'success');
        if (usersState.editingUser?.name === name) clearEditUser();
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleDeleteAll() {
    if (!confirm('ลบ Users ทั้งหมดในระบบ?')) return;
    if (!confirm('ยืนยันอีกครั้ง: การลบนี้จะกระทบข้อมูลเดโมทั้งหมดของหน้า Users')) return;

    try {
        await deleteAllUsersAPI();
        clearEditUser();
        showToast('ลบ Users ทั้งหมดแล้ว', 'success');
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSampleUsers() {
    try {
        await addSampleUsersAPI();
        showToast('เพิ่ม Sample Users สำเร็จ', 'success');
        await loadUserList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function handleSearch(event) {
    usersState.search = event.target.value || '';
    renderUsers();
}

function clearSearch() {
    usersState.search = '';
    document.getElementById('userSearchInput').value = '';
    renderUsers();
}

window.beginEditUser = beginEditUser;
window.handleDeleteUser = handleDeleteUser;
