const homeState = {
    movies: [],
    filteredMovies: [],
    stats: null
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loadDashboardBtn').addEventListener('click', loadDashboard);
    document.getElementById('seedAllBtn').addEventListener('click', handleSeedAll);
    document.getElementById('resetAllBtn').addEventListener('click', handleResetAll);
    document.getElementById('homeMovieSearch').addEventListener('input', MovieRecUI.debounce(handleSearchMovies, 150));
    document.getElementById('gotoUsersBtn').addEventListener('click', () => window.location.href = 'users.html');
    document.getElementById('gotoMoviesBtn').addEventListener('click', () => window.location.href = 'movies.html');
    document.getElementById('gotoRecommendBtn').addEventListener('click', () => window.location.href = 'recommend.html');
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('movieModal').addEventListener('click', (event) => {
        if (event.target.id === 'movieModal') closeModal();
    });

    loadDashboard();
});

async function loadDashboard() {
    const container = document.getElementById('movieListContainer');
    container.innerHTML = '<div class="loading-overlay" style="grid-column:1/-1;"><div class="spinner"></div><span>กำลังโหลด dashboard...</span></div>';

    try {
        const dashboard = await reloadDashboardData();
        homeState.movies = Array.isArray(dashboard.movies) ? dashboard.movies : [];
        homeState.filteredMovies = [...homeState.movies];
        homeState.stats = dashboard.stats || {};

        renderHero(dashboard);
        renderOverview(dashboard);
        renderMovieGrid();
        MovieRecUI.refreshConnectionStatus();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-state-icon">❌</div>
                <h3>โหลด dashboard ไม่ได้</h3>
                <p>${MovieRecUI.esc(error.message)}</p>
            </div>`;
        showToast(error.message, 'error');
    }
}

function renderHero({ users, movies, relationships, stats }) {
    const featured = pickFeaturedMovie(movies);
    const topGenres = normalizeTopGenres(stats, movies);
    const activeUsers = stats.activeUsers ?? users.filter((user) => (user.watchedCount || 0) + (user.likedCount || 0) > 0).length;

    document.getElementById('homeUserCount').textContent = users.length;
    document.getElementById('homeMovieCount').textContent = movies.length;
    document.getElementById('homeRelationshipCount').textContent = relationships.length;
    document.getElementById('homeActiveUsers').textContent = activeUsers;
    document.getElementById('homeMovieBadge').textContent = `${movies.length} เรื่อง`;

    const heroTitle = featured?.title || 'Movie Recommendation System';
    const heroDesc = featured
        ? `${featured.title}${featured.year ? ` (${featured.year})` : ''} เป็นหนังเด่นในฐานข้อมูลตอนนี้${featured.genre ? ` อยู่ใน genre ${featured.genre}` : ''} และสามารถใช้เป็นตัวอย่างสำหรับ demo การเชื่อม WATCHED / LIKED ได้ทันที`
        : 'ใช้ Graph Database เก็บความสัมพันธ์ระหว่าง User และ Movie เช่น WATCHED กับ LIKED เพื่อสร้างคำแนะนำที่อธิบายเหตุผลได้จริง';

    document.getElementById('heroTitle').textContent = heroTitle;
    document.getElementById('heroDesc').textContent = heroDesc;

    const heroSection = document.getElementById('heroSection');
    if (featured?.image_url) {
        heroSection.style.setProperty('--hero-image', `url('${featured.image_url}')`);
    } else {
        heroSection.style.removeProperty('--hero-image');
    }

    const summary = topGenres.length
        ? `ตอนนี้ระบบมี ${users.length} users, ${movies.length} movies, ${relationships.length} relationships และ genre เด่นคือ ${topGenres.map((item) => `${item.genre} (${item.count})`).join(', ')}`
        : `ตอนนี้ระบบมี ${users.length} users, ${movies.length} movies และ ${relationships.length} relationships`;
    document.getElementById('overviewSummary').textContent = summary;
}

function renderOverview({ movies, stats }) {
    const topGenres = normalizeTopGenres(stats, movies);
    const container = document.getElementById('topGenresList');

    if (!topGenres.length) {
        container.innerHTML = '<span class="genre-pill">ยังไม่มี genre ให้สรุป</span>';
        return;
    }

    container.innerHTML = topGenres.map((item) =>
        `<span class="genre-pill">${MovieRecUI.esc(item.genre)} <strong>${item.count}</strong></span>`
    ).join('');
}

function renderMovieGrid() {
    const container = document.getElementById('movieListContainer');
    const movies = homeState.filteredMovies;
    document.getElementById('homeMovieBadge').textContent = `${movies.length} เรื่อง`;

    if (!movies.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-state-icon">🎬</div>
                <h3>${homeState.movies.length ? 'ไม่พบหนังที่ค้นหา' : 'ยังไม่มีหนังในระบบ'}</h3>
                <p>${homeState.movies.length ? 'ลองเปลี่ยนคำค้น หรือกด reload dashboard' : 'กด Add all sample data เพื่อเติมข้อมูลสำหรับเดโม'}</p>
            </div>`;
        return;
    }

    container.innerHTML = movies.map((movie) => `
        <article class="poster-card" onclick="openMovieModal('${MovieRecUI.escJs(movie.title)}')">
            ${movie.image_url
                ? `<img src="${movie.image_url}" alt="${MovieRecUI.esc(movie.title)}">`
                : '<div class="poster-placeholder">🎬</div>'}
            <div class="poster-content">
                <div class="poster-title">${MovieRecUI.esc(movie.title)}</div>
                <div class="tag-list">
                    ${movie.genre ? `<span class="badge badge-primary">${MovieRecUI.esc(movie.genre)}</span>` : ''}
                    ${movie.year ? `<span class="badge badge-warning">${movie.year}</span>` : ''}
                    ${(movie.likedBy || 0) > 0 ? `<span class="badge badge-success">❤️ ${movie.likedBy}</span>` : ''}
                </div>
            </div>
        </article>
    `).join('');
}

function pickFeaturedMovie(movies) {
    return [...movies].sort((a, b) => ((b.likedBy || 0) + (b.watchedBy || 0)) - ((a.likedBy || 0) + (a.watchedBy || 0)))[0];
}

function normalizeTopGenres(stats, movies) {
    if (Array.isArray(stats?.topGenres) && stats.topGenres.length) return stats.topGenres;

    const counts = movies.reduce((acc, movie) => {
        const genre = movie.genre || 'Unknown';
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count }));
}

function handleSearchMovies(event) {
    const query = (event.target.value || '').trim().toLowerCase();
    homeState.filteredMovies = homeState.movies.filter((movie) =>
        !query || `${movie.title} ${movie.genre || ''} ${movie.year || ''}`.toLowerCase().includes(query)
    );
    renderMovieGrid();
}

async function handleSeedAll() {
    try {
        await seedDemoDataAPI();
        showToast('เพิ่ม sample data ทั้งระบบแล้ว', 'success');
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleResetAll() {
    if (!confirm('Reset demo data ทั้งระบบ?')) return;
    if (!confirm('ยืนยันอีกครั้ง: users, movies และ relationships จะถูกลบทั้งหมด')) return;

    try {
        await resetDemoDataAPI();
        showToast('ล้างข้อมูลเดโมทั้งหมดแล้ว', 'success');
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function openMovieModal(title) {
    const movie = homeState.movies.find((item) => item.title === title);
    if (!movie) return;

    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalMeta').innerHTML = `
        ${movie.genre ? `<span class="badge badge-primary">${MovieRecUI.esc(movie.genre)}</span>` : ''}
        ${movie.year ? `<span class="badge badge-warning">${movie.year}</span>` : ''}
        ${(movie.watchedBy || 0) > 0 ? `<span class="badge badge-primary">👁️ ${movie.watchedBy} watched</span>` : ''}
        ${(movie.likedBy || 0) > 0 ? `<span class="badge badge-success">❤️ ${movie.likedBy} liked</span>` : ''}
    `;
    document.getElementById('modalDesc').textContent =
        movie.description ||
        `หนังเรื่องนี้อยู่ใน graph database ของระบบ${movie.genre ? ` ใน genre ${movie.genre}` : ''}${movie.year ? ` และออกฉายในปี ${movie.year}` : ''}. ใช้เปิดอธิบายการเชื่อม WATCHED / LIKED และผลลัพธ์ recommendation ได้ทันที`;

    const hero = document.getElementById('modalHeroImage');
    hero.innerHTML = movie.image_url
        ? `<img src="${movie.image_url}" alt="${MovieRecUI.esc(movie.title)}" style="width:100%; height:100%; object-fit:cover;">`
        : '🎬';

    document.getElementById('movieModal').classList.add('active');
}

function closeModal() {
    document.getElementById('movieModal').classList.remove('active');
}

window.openMovieModal = openMovieModal;
