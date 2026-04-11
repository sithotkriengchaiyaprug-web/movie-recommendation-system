const RECOMMEND_GENRE_ICONS = {
    Action: '🔥',
    Comedy: '😂',
    Drama: '🎭',
    'Sci-Fi': '🚀',
    Horror: '👻',
    Romance: '💖',
    Thriller: '😱',
    Animation: '🎨'
};

const recommendState = {
    users: [],
    profile: null
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('recUser').addEventListener('change', loadProfile);
    document.getElementById('recMethod').addEventListener('change', renderSummaryPanel);
    document.getElementById('recBtn').addEventListener('click', handleRecommend);
    document.getElementById('refreshRecommendBtn').addEventListener('click', loadUserDropdown);

    loadUserDropdown();
});

async function loadUserDropdown() {
    try {
        const users = await getUsers();
        recommendState.users = Array.isArray(users) ? users : [];
        const select = document.getElementById('recUser');
        select.innerHTML = '<option value="">-- เลือก User --</option>' +
            recommendState.users.map((user) => `<option value="${MovieRecUI.esc(user.name)}">${MovieRecUI.esc(user.name)}</option>`).join('');
        renderSummaryPanel();
        MovieRecUI.refreshConnectionStatus();
    } catch (error) {
        showToast(`โหลด users ไม่ได้: ${error.message}`, 'error');
    }
}

async function loadProfile() {
    const name = document.getElementById('recUser').value;
    const card = document.getElementById('userProfileCard');
    const el = document.getElementById('userProfile');

    if (!name) {
        recommendState.profile = null;
        card.style.display = 'none';
        renderSummaryPanel();
        return;
    }

    try {
        const profile = await getUserProfile(name);
        recommendState.profile = profile;

        const watched = (profile.watched || []).filter(Boolean);
        const liked = (profile.liked || []).filter(Boolean);

        card.style.display = 'block';
        el.innerHTML = `
            <h3 style="margin:0 0 0.85rem;">👤 ${MovieRecUI.esc(profile.name)} ${profile.age ? `<span style="color:var(--text-muted); font-weight:400;">(${profile.age} ปี)</span>` : ''}</h3>
            <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
                <div class="mini-stat">
                    <div class="mini-stat-number">${watched.length}</div>
                    <div class="mini-stat-label">WATCHED</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-number">${liked.length}</div>
                    <div class="mini-stat-label">LIKED</div>
                </div>
            </div>
            ${watched.length ? `
                <div style="margin-bottom:1rem;">
                    <strong style="font-size:0.9rem;">👁️ ดูแล้ว</strong>
                    <div class="tag-list">${watched.map((movie) => `<span class="badge badge-primary">${MovieRecUI.esc(movie)}</span>`).join('')}</div>
                </div>
            ` : ''}
            ${liked.length ? `
                <div>
                    <strong style="font-size:0.9rem;">❤️ ชอบ</strong>
                    <div class="tag-list">${liked.map((movie) => `<span class="badge badge-success">${MovieRecUI.esc(movie)}</span>`).join('')}</div>
                </div>
            ` : ''}
            ${!watched.length && !liked.length ? `
                <div class="section-note">
                    User นี้ยังไม่มี activity ใน graph ควรไปหน้า <a href="movies.html">Movies</a> แล้วสร้าง WATCHED / LIKED ก่อน
                </div>
            ` : ''}
        `;

        renderSummaryPanel();
    } catch (error) {
        recommendState.profile = null;
        card.style.display = 'none';
        renderSummaryPanel();
        showToast(error.message, 'error');
    }
}

function renderSummaryPanel() {
    const method = document.getElementById('recMethod').value;
    const profile = recommendState.profile;
    const el = document.getElementById('recommendSummary');

    if (!profile) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🕸️</div>
                <h3>รอเลือก User</h3>
                <p>เมื่อเลือก user แล้ว ระบบจะสรุปว่ามีข้อมูลพอสำหรับ recommendation แบบไหนบ้าง</p>
            </div>`;
        return;
    }

    const watched = (profile.watched || []).filter(Boolean);
    const liked = (profile.liked || []).filter(Boolean);
    const readiness = {
        collaborative: liked.length > 0 ? 'พร้อมใช้ collaborative เพราะมีประวัติ liked แล้ว' : 'ควรมี LIKED อย่างน้อย 1 เรื่องเพื่อให้ collaborative แม่นขึ้น',
        genre: liked.length > 0 ? 'พร้อมใช้ genre-based เพราะระบบดูจากหนังที่ user ชอบ' : 'genre-based ยังบาง เพราะ user ยังไม่มี LIKED',
        popular: watched.length > 0 || liked.length > 0 ? 'popular ใช้ได้ทันที และจะตัดเรื่องที่ user เคยดูออก' : 'popular ใช้ได้แม้ยังไม่มี activity'
    };

    const methodLabels = {
        collaborative: '👥 Collaborative filtering',
        genre: '🎭 Genre-based',
        popular: '🔥 Popular'
    };

    el.innerHTML = `
        <h3 style="margin-top:0;">${methodLabels[method]}</h3>
        <div class="section-note" style="margin-top:0.75rem;">
            ${readiness[method]}
        </div>
        <div class="tag-list">
            <span class="badge badge-primary">WATCHED ${watched.length}</span>
            <span class="badge badge-success">LIKED ${liked.length}</span>
        </div>
    `;
}

async function handleRecommend() {
    const name = document.getElementById('recUser').value;
    const method = document.getElementById('recMethod').value;
    const btn = document.getElementById('recBtn');
    const resultsCard = document.getElementById('resultsCard');
    const resultsEl = document.getElementById('recResults');

    if (!name) {
        showToast('กรุณาเลือก user ก่อน', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังวิเคราะห์...';
    resultsCard.style.display = 'block';
    resultsEl.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>กำลังวิเคราะห์ graph...</span></div>';

    try {
        const results = await getRecommendation(name, method);
        displayResults(Array.isArray(results) ? results : [], method);
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>เกิดข้อผิดพลาด</h3>
                <p>${MovieRecUI.esc(error.message)}</p>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '📊 แนะนำเลย';
    }
}

function buildReason(item, method, profile) {
    const likedCount = (profile?.liked || []).filter(Boolean).length;
    const watchedCount = (profile?.watched || []).filter(Boolean).length;

    if (item.reason) return item.reason;

    if (method === 'collaborative') {
        return likedCount
            ? `แนะนำเพราะ user นี้มีหนังที่ชอบคล้ายกับผู้ใช้อื่นในกราฟ และเรื่องนี้ยังไม่อยู่ในรายการที่ดูแล้ว`
            : 'แนะนำจาก user ที่มีพฤติกรรมใกล้เคียงกันในกราฟ';
    }

    if (method === 'genre') {
        return item.genre
            ? `แนะนำเพราะอยู่ใน genre ${item.genre} ซึ่งสอดคล้องกับหนังที่ user กดชอบไว้`
            : 'แนะนำจาก genre ของหนังที่ user ชอบ';
    }

    return watchedCount || likedCount
        ? 'แนะนำเพราะเป็นหนังยอดนิยมในระบบและ user คนนี้ยังไม่เคยดู'
        : 'แนะนำจากความนิยมรวมของผู้ใช้ในระบบ';
}

function displayResults(results, method) {
    const container = document.getElementById('recResults');
    document.getElementById('resultCount').textContent = `${results.length} เรื่อง`;

    if (!results.length) {
        const messages = {
            collaborative: 'ยังไม่พบผลลัพธ์จาก collaborative ลองเพิ่ม LIKED ให้ user นี้ก่อน',
            genre: 'ยังไม่พบผลลัพธ์จาก genre-based ลองเพิ่มหนังที่ user ชอบพร้อม genre ให้มากขึ้น',
            popular: 'ไม่พบหนังยอดนิยมที่ user ยังไม่เคยดู'
        };

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🤷</div>
                <h3>ไม่มีผลลัพธ์</h3>
                <p>${messages[method] || 'ลองเพิ่มข้อมูลใน graph ก่อน'}</p>
            </div>`;
        return;
    }

    const maxScore = Math.max(...results.map((item) => Number(item.score) || 0), 1);
    const methodBadge = {
        collaborative: '👥 Collaborative',
        genre: '🎭 Genre-based',
        popular: '🔥 Popular'
    }[method];

    container.innerHTML = `
        <div class="toolbar" style="margin-bottom:1rem;">
            <span class="badge badge-primary">${methodBadge}</span>
        </div>
        <div class="rec-results">
            ${results.map((item, index) => {
                const score = Number(item.score) || 0;
                const pct = Math.max(10, Math.round((score / maxScore) * 100));
                return `
                    <div class="rec-card">
                        <div style="display:flex; justify-content:space-between; gap:1rem; align-items:flex-start;">
                            <div>
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.35rem;">อันดับ #${index + 1}</div>
                                <div class="rec-card-title">${RECOMMEND_GENRE_ICONS[item.genre] || '🎬'} ${MovieRecUI.esc(item.title)}</div>
                            </div>
                            <div class="rec-score">${pct}%</div>
                        </div>
                        <div class="rec-card-meta">
                            ${item.genre ? `<span class="badge badge-primary">${MovieRecUI.esc(item.genre)}</span>` : ''}
                            ${item.year ? `<span class="badge badge-warning">${item.year}</span>` : ''}
                            <span class="badge badge-success">Score ${score}</span>
                        </div>
                        <div class="rec-reason">💡 ${MovieRecUI.esc(buildReason(item, method, recommendState.profile))}</div>
                        <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%"></div></div>
                    </div>
                `;
            }).join('')}
        </div>`;

    showToast(`พบ ${results.length} เรื่องที่น่าแนะนำ`, 'success');
}
