// js/recommend.js
document.addEventListener('DOMContentLoaded', () => {
    loadUserDropdown();

    document.getElementById('recUser').addEventListener('change', loadProfile);
    document.getElementById('recBtn').addEventListener('click', handleRecommend);
});

const GENRE_ICONS = {
    'Action': '🔥', 'Comedy': '😂', 'Drama': '🎭',
    'Sci-Fi': '🚀', 'Horror': '👻', 'Romance': '💕',
    'Thriller': '😱', 'Animation': '🎨'
};

// ==========================================
// 📦 Load
// ==========================================

async function loadUserDropdown() {
    try {
        const users = await getUsers();
        const select = document.getElementById('recUser');
        select.innerHTML = '<option value="">-- เลือก User --</option>'
            + users.map(u => `<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');
    } catch (error) {
        showToast(`โหลด Users ไม่ได้: ${error.message}`, 'error');
    }
}

async function loadProfile() {
    const name = document.getElementById('recUser').value;
    const card = document.getElementById('userProfileCard');
    const el = document.getElementById('userProfile');

    if (!name) {
        card.style.display = 'none';
        return;
    }

    try {
        const user = await getUserProfile(name);

        const watched = (user.watched || []).filter(m => m);
        const liked = (user.liked || []).filter(m => m);

        card.style.display = 'block';
        el.innerHTML = `
            <h3 style="margin-bottom:0.75rem;">
                👤 ${esc(user.name)}
                ${user.age ? `<span style="color:var(--text-muted);font-weight:normal"> (${user.age} ปี)</span>` : ''}
            </h3>

            <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                <div class="mini-stat">
                    <div class="mini-stat-number">${watched.length}</div>
                    <div class="mini-stat-label">👁️ Watched</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-number">${liked.length}</div>
                    <div class="mini-stat-label">❤️ Liked</div>
                </div>
            </div>

            ${watched.length > 0 ? `
                <div style="margin-bottom:0.75rem;">
                    <strong style="font-size:0.85rem; color:var(--text-muted);">👁️ ดูแล้ว:</strong>
                    <div class="rel-tags" style="margin-top:0.25rem;">
                        ${watched.map(m => `<span class="badge badge-primary">${esc(m)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${liked.length > 0 ? `
                <div>
                    <strong style="font-size:0.85rem; color:var(--text-muted);">❤️ ชอบ:</strong>
                    <div class="rel-tags" style="margin-top:0.25rem;">
                        ${liked.map(m => `<span class="badge badge-success">${esc(m)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${watched.length === 0 && liked.length === 0 ? `
                <p style="color:var(--text-muted); font-size:0.9rem;">
                    ⚠️ User นี้ยังไม่มีประวัติ — ไป
                    <a href="movies.html" style="color:var(--primary)">Movie Page</a>
                    เพื่อเพิ่มความสัมพันธ์ก่อน
                </p>
            ` : ''}
        `;
    } catch (error) {
        card.style.display = 'none';
        console.error('Load profile error:', error);
    }
}

// ==========================================
// 🧠 Recommendation
// ==========================================

async function handleRecommend() {
    const name = document.getElementById('recUser').value;
    const method = document.getElementById('recMethod').value;
    const btn = document.getElementById('recBtn');
    const resultsCard = document.getElementById('resultsCard');
    const resultsEl = document.getElementById('recResults');

    if (!name) {
        showToast('กรุณาเลือก User ก่อน!', 'error');
        return;
    }

    // Loading
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังวิเคราะห์...';
    resultsCard.style.display = 'block';
    resultsEl.innerHTML = `
        <div class="loading-overlay">
            <div class="spinner"></div>
            <span>กำลังวิเคราะห์ Graph...</span>
        </div>`;

    try {
        const results = await getRecommendation(name, method);
        displayResults(results, method);
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>เกิดข้อผิดพลาด</h3>
                <p>${error.message}</p>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📊 แนะนำเลย!';
    }
}

function displayResults(results, method) {
    const container = document.getElementById('recResults');
    const countEl = document.getElementById('resultCount');

    countEl.textContent = `${results.length} เรื่อง`;

    if (results.length === 0) {
        const msgs = {
            collaborative: 'ไม่พบหนังจาก Collaborative — ลองให้ User มี LIKED เพิ่ม',
            genre: 'ไม่พบหนังจาก Genre ที่ชอบ — ลอง LIKED หนังที่มี Genre ก่อน',
            popular: 'ดูหนังทั้งหมดแล้ว! 🎉'
        };

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🤷</div>
                <h3>ไม่มีผลลัพธ์</h3>
                <p>${msgs[method] || 'ลองเพิ่มข้อมูล'}</p>
            </div>`;
        return;
    }

    const methodLabels = {
        collaborative: '👥 Collaborative',
        genre: '🎭 Genre-Based',
        popular: '🔥 Popular'
    };

    const maxScore = Math.max(...results.map(r => r.score), 1);

    container.innerHTML = `
        <div style="margin-bottom:1rem;">
            <span class="badge badge-primary">${methodLabels[method]}</span>
        </div>
        <div class="rec-results">
            ${results.map((item, i) => {
        const pct = Math.round((item.score / maxScore) * 100);
        return `
                    <div class="rec-card">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div>
                                <div style="font-size:0.75rem; color:var(--text-dark); margin-bottom:0.25rem;">#${i + 1}</div>
                                <div class="rec-card-title">
                                    ${GENRE_ICONS[item.genre] || '🎬'} ${esc(item.title)}
                                </div>
                            </div>
                            <div class="rec-score">${pct}%</div>
                        </div>

                        <div class="rec-card-meta">
                            ${item.genre ? `<span class="badge badge-primary">${item.genre}</span>` : ''}
                            ${item.year ? `<span class="badge badge-warning">${item.year}</span>` : ''}
                            <span class="badge badge-success">Score: ${item.score}</span>
                        </div>

                        <div class="rec-reason">💡 ${esc(item.reason)}</div>

                        <div class="score-bar">
                            <div class="score-bar-fill" style="width:${pct}%"></div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>`;

    showToast(`พบ ${results.length} เรื่องที่น่าจะชอบ! 🎬`, 'success');
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