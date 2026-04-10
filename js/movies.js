// js/movies.js
document.addEventListener('DOMContentLoaded', () => {
    loadMovieList();
    loadDropdowns();
    loadRelList();

    // Events
    document.getElementById('addMovieForm').addEventListener('submit', handleAddMovie);
    document.getElementById('addRelForm').addEventListener('submit', handleAddRel);
    document.getElementById('sampleMoviesBtn').addEventListener('click', handleSampleMovies);
    document.getElementById('sampleRelsBtn').addEventListener('click', handleSampleRels);
    document.getElementById('refreshMoviesBtn').addEventListener('click', refreshAll);
});

const GENRE_ICONS = {
    'Action': '🔥', 'Comedy': '😂', 'Drama': '🎭',
    'Sci-Fi': '🚀', 'Horror': '👻', 'Romance': '💕',
    'Thriller': '😱', 'Animation': '🎨'
};

// ==========================================
// 📦 Load Data
// ==========================================

async function loadMovieList() {
    const listEl = document.getElementById('movieList');

    try {
        const movies = await getMovies();
        document.getElementById('movieCountBadge').textContent = `${movies.length} เรื่อง`;

        if (movies.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎬</div>
                    <h3>ยังไม่มี Movie</h3>
                    <p>เพิ่มหนังเรื่องแรกเลย!</p>
                </div>`;
            return;
        }

        listEl.innerHTML = movies.map(movie => `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-icon">${GENRE_ICONS[movie.genre] || '🎬'}</div>
                    <div>
                        <strong>${esc(movie.title)}</strong>
                        <div class="rel-tags">
                            ${movie.genre ? `<span class="badge badge-primary">${movie.genre}</span>` : ''}
                            ${movie.year ? `<span class="badge badge-warning">${movie.year}</span>` : ''}
                            ${movie.watchedBy > 0 ? `<span class="badge badge-primary">👁️ ${movie.watchedBy} คนดู</span>` : ''}
                            ${movie.likedBy > 0 ? `<span class="badge badge-success">❤️ ${movie.likedBy} คนชอบ</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger btn-sm" onclick="handleDeleteMovie('${escJs(movie.title)}')">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>โหลดไม่ได้</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

async function loadDropdowns() {
    try {
        // Users dropdown
        const users = await getUsers();
        const userSelect = document.getElementById('relUser');
        userSelect.innerHTML = '<option value="">-- เลือก User --</option>'
            + users.map(u => `<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');

        // Movies dropdown
        const movies = await getMovies();
        const movieSelect = document.getElementById('relMovie');
        movieSelect.innerHTML = '<option value="">-- เลือก Movie --</option>'
            + movies.map(m => `<option value="${esc(m.title)}">${esc(m.title)}</option>`).join('');

    } catch (error) {
        console.error('Load dropdowns error:', error);
    }
}

async function loadRelList() {
    const listEl = document.getElementById('relList');

    try {
        const rels = await getRelationships();
        document.getElementById('relCountBadge').textContent = `${rels.length} รายการ`;

        if (rels.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔗</div>
                    <h3>ยังไม่มีความสัมพันธ์</h3>
                    <p>ลองให้ User ดูหรือชอบหนังสักเรื่อง!</p>
                </div>`;
            return;
        }

        listEl.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>👤 User</th>
                            <th>🔗 Relationship</th>
                            <th>🎬 Movie</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rels.map(rel => `
                            <tr>
                                <td><strong>${esc(rel.user)}</strong></td>
                                <td>
                                    <span class="badge ${rel.relType === 'LIKED' ? 'badge-success' : 'badge-primary'}">
                                        ${rel.relType === 'LIKED' ? '❤️' : '👁️'} ${rel.relType}
                                    </span>
                                </td>
                                <td>${esc(rel.movie)}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm"
                                        onclick="handleDeleteRel('${escJs(rel.user)}','${escJs(rel.movie)}','${rel.relType}')">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;

    } catch (error) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>โหลดไม่ได้</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

function refreshAll() {
    loadMovieList();
    loadDropdowns();
    loadRelList();
}

// ==========================================
// ✏️ Add Movie
// ==========================================

async function handleAddMovie(e) {
    e.preventDefault();

    const titleInput = document.getElementById('movieTitle');
    const genreInput = document.getElementById('movieGenre');
    const yearInput = document.getElementById('movieYear');
    const btn = document.getElementById('addMovieBtn');

    const title = titleInput.value.trim();
    const genre = genreInput.value || null;
    const year = yearInput.value ? parseInt(yearInput.value) : null;

    if (!title) {
        showToast('กรุณาใส่ชื่อหนัง', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังเพิ่ม...';

    try {
        await createMovie(title, genre, year);
        showToast(`เพิ่ม Movie "${title}" สำเร็จ! ✅`, 'success');

        titleInput.value = '';
        genreInput.value = '';
        yearInput.value = '';
        titleInput.focus();

        refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '➕ เพิ่ม Movie';
    }
}

// ==========================================
// 🔗 Add Relationship
// ==========================================

async function handleAddRel(e) {
    e.preventDefault();

    const user = document.getElementById('relUser').value;
    const type = document.getElementById('relType').value;
    const movie = document.getElementById('relMovie').value;

    if (!user || !type || !movie) {
        showToast('กรุณาเลือกข้อมูลให้ครบ', 'error');
        return;
    }

    try {
        await createRelationship(user, movie, type);
        const icon = type === 'LIKED' ? '❤️' : '👁️';
        showToast(`${icon} ${user} → ${type} → ${movie} ✅`, 'success');

        loadMovieList();
        loadRelList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==========================================
// 🗑️ Delete
// ==========================================

async function handleDeleteMovie(title) {
    if (!confirm(`ลบ "${title}"?\n(ความสัมพันธ์จะถูกลบด้วย)`)) return;

    try {
        await deleteMovieAPI(title);
        showToast(`ลบ "${title}" แล้ว 🗑️`, 'success');
        refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleDeleteRel(user, movie, type) {
    if (!confirm(`ลบ: ${user} -[${type}]-> ${movie}?`)) return;

    try {
        await deleteRelationshipAPI(user, movie, type);
        showToast('ลบความสัมพันธ์แล้ว 🗑️', 'success');
        loadMovieList();
        loadRelList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==========================================
// 🎲 Sample Data
// ==========================================

async function handleSampleMovies() {
    try {
        await addSampleMoviesAPI();
        showToast('เพิ่ม Sample Movies สำเร็จ! 🎲', 'success');
        refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSampleRels() {
    try {
        await addSampleRelationshipsAPI();
        showToast('เพิ่ม Sample Relationships สำเร็จ! 🔗', 'success');
        loadMovieList();
        loadRelList();
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