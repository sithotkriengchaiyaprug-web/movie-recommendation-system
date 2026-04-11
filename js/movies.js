const GENRES = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Animation'];
const GENRE_ICONS = {
    Action: '🔥',
    Comedy: '😂',
    Drama: '🎭',
    'Sci-Fi': '🚀',
    Horror: '👻',
    Romance: '💖',
    Thriller: '😱',
    Animation: '🎨'
};

const moviesState = {
    movies: [],
    relationships: [],
    users: [],
    movieSearch: '',
    relSearch: '',
    genreFilter: '',
    editingMovie: null,
    editingRelationship: null
};

document.addEventListener('DOMContentLoaded', () => {
    setupGenreOptions();

    document.getElementById('addMovieForm').addEventListener('submit', handleAddMovie);
    document.getElementById('editMovieForm').addEventListener('submit', handleUpdateMovie);
    document.getElementById('cancelMovieEditBtn').addEventListener('click', clearEditMovie);
    document.getElementById('addRelForm').addEventListener('submit', handleAddRelationship);
    document.getElementById('editRelForm').addEventListener('submit', handleUpdateRelationship);
    document.getElementById('cancelRelEditBtn').addEventListener('click', clearEditRelationship);
    document.getElementById('sampleMoviesBtn').addEventListener('click', handleSampleMovies);
    document.getElementById('sampleRelsBtn').addEventListener('click', handleSampleRelationships);
    document.getElementById('seedMoviesDemoBtn').addEventListener('click', handleSeedAll);
    document.getElementById('refreshMoviesBtn').addEventListener('click', refreshAll);
    document.getElementById('movieSearchInput').addEventListener('input', MovieRecUI.debounce(handleMovieSearch, 150));
    document.getElementById('relSearchInput').addEventListener('input', MovieRecUI.debounce(handleRelSearch, 150));
    document.getElementById('movieGenreFilter').addEventListener('change', handleGenreFilter);

    refreshAll();
});

function setupGenreOptions() {
    const options = ['<option value="">-- เลือก --</option>']
        .concat(GENRES.map((genre) => `<option value="${genre}">${GENRE_ICONS[genre] || '🎬'} ${genre}</option>`))
        .join('');
    document.getElementById('movieGenre').innerHTML = options;
    document.getElementById('editMovieGenre').innerHTML = options;

    document.getElementById('movieGenreFilter').innerHTML = [
        '<option value="">ทุก genre</option>',
        ...GENRES.map((genre) => `<option value="${genre}">${genre}</option>`)
    ].join('');
}

async function refreshAll() {
    const movieList = document.getElementById('movieList');
    const relList = document.getElementById('relList');
    movieList.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>กำลังโหลด movies...</span></div>';
    relList.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>กำลังโหลด relationships...</span></div>';

    try {
        const [movies, users, relationships] = await Promise.all([
            getMovies(),
            getUsers(),
            getRelationships()
        ]);

        moviesState.movies = Array.isArray(movies) ? movies : [];
        moviesState.users = Array.isArray(users) ? users : [];
        moviesState.relationships = Array.isArray(relationships) ? relationships.map((rel) => ({
            user: rel.user,
            movie: rel.movie,
            type: rel.relType || rel.type
        })) : [];

        renderDropdowns();
        renderMovieList();
        renderRelationshipList();
        MovieRecUI.refreshConnectionStatus();
    } catch (error) {
        movieList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>โหลด movies ไม่ได้</h3><p>${MovieRecUI.esc(error.message)}</p></div>`;
        relList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>โหลด relationships ไม่ได้</h3><p>${MovieRecUI.esc(error.message)}</p></div>`;
        showToast(error.message, 'error');
    }
}

function renderDropdowns() {
    const userOptions = ['<option value="">-- เลือก User --</option>']
        .concat(moviesState.users.map((user) => `<option value="${MovieRecUI.esc(user.name)}">${MovieRecUI.esc(user.name)}</option>`))
        .join('');

    const movieOptions = ['<option value="">-- เลือก Movie --</option>']
        .concat(moviesState.movies.map((movie) => `<option value="${MovieRecUI.esc(movie.title)}">${MovieRecUI.esc(movie.title)}</option>`))
        .join('');

    document.getElementById('relUser').innerHTML = userOptions;
    document.getElementById('editRelUser').innerHTML = userOptions;
    document.getElementById('relMovie').innerHTML = movieOptions;
    document.getElementById('editRelMovie').innerHTML = movieOptions;
}

function renderMovieList() {
    const query = moviesState.movieSearch.trim().toLowerCase();
    const filtered = moviesState.movies.filter((movie) => {
        const matchesSearch = !query || `${movie.title} ${movie.genre || ''} ${movie.year || ''}`.toLowerCase().includes(query);
        const matchesGenre = !moviesState.genreFilter || movie.genre === moviesState.genreFilter;
        return matchesSearch && matchesGenre;
    });

    document.getElementById('movieCountBadge').textContent = `${filtered.length} เรื่อง`;

    const listEl = document.getElementById('movieList');
    if (!filtered.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎬</div>
                <h3>${moviesState.movies.length ? 'ไม่พบหนังที่ค้นหา' : 'ยังไม่มี Movie'}</h3>
                <p>${moviesState.movies.length ? 'ลองเปลี่ยนคำค้นหรือ genre filter' : 'เพิ่มหนังใหม่หรือกด sample movies เพื่อเริ่มเดโม'}</p>
            </div>`;
        return;
    }

    listEl.innerHTML = filtered.map((movie) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-icon">${GENRE_ICONS[movie.genre] || '🎬'}</div>
                <div>
                    <strong>${MovieRecUI.esc(movie.title)}</strong>
                    <div class="rel-tags">
                        ${movie.genre ? `<span class="badge badge-primary">${MovieRecUI.esc(movie.genre)}</span>` : ''}
                        ${movie.year ? `<span class="badge badge-warning">${movie.year}</span>` : ''}
                        ${(movie.watchedBy || 0) > 0 ? `<span class="badge badge-primary">👁️ ${movie.watchedBy} คนดู</span>` : ''}
                        ${(movie.likedBy || 0) > 0 ? `<span class="badge badge-success">❤️ ${movie.likedBy} คนชอบ</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-outline btn-sm" onclick="beginEditMovie('${MovieRecUI.escJs(movie.title)}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteMovie('${MovieRecUI.escJs(movie.title)}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function renderRelationshipList() {
    const query = moviesState.relSearch.trim().toLowerCase();
    const filtered = moviesState.relationships.filter((rel) =>
        !query || `${rel.user} ${rel.movie} ${rel.type}`.toLowerCase().includes(query)
    );

    document.getElementById('relCountBadge').textContent = `${filtered.length} รายการ`;

    const listEl = document.getElementById('relList');
    if (!filtered.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔗</div>
                <h3>${moviesState.relationships.length ? 'ไม่พบความสัมพันธ์ที่ค้นหา' : 'ยังไม่มีความสัมพันธ์'}</h3>
                <p>${moviesState.relationships.length ? 'ลองค้นหาด้วย user, movie หรือ type' : 'สร้าง WATCHED หรือ LIKED เพื่อให้ recommendation ทำงาน'}</p>
            </div>`;
        return;
    }

    listEl.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Relationship</th>
                        <th>Movie</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((rel) => `
                        <tr>
                            <td><strong>${MovieRecUI.esc(rel.user)}</strong></td>
                            <td><span class="badge ${rel.type === 'LIKED' ? 'badge-success' : 'badge-primary'}">${rel.type === 'LIKED' ? '❤️' : '👁️'} ${rel.type}</span></td>
                            <td>${MovieRecUI.esc(rel.movie)}</td>
                            <td>
                                <div class="inline-controls">
                                    <button class="btn btn-outline btn-sm" onclick="beginEditRelationship('${MovieRecUI.escJs(rel.user)}','${MovieRecUI.escJs(rel.movie)}','${rel.type}')">✏️ Edit</button>
                                    <button class="btn btn-danger btn-sm" onclick="handleDeleteRelationship('${MovieRecUI.escJs(rel.user)}','${MovieRecUI.escJs(rel.movie)}','${rel.type}')">🗑️ Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

async function handleAddMovie(event) {
    event.preventDefault();

    const title = document.getElementById('movieTitle').value.trim();
    const genre = document.getElementById('movieGenre').value || null;
    const yearValue = document.getElementById('movieYear').value;
    const year = yearValue ? Number(yearValue) : null;
    const btn = document.getElementById('addMovieBtn');

    if (!title) {
        showToast('กรุณาใส่ชื่อหนัง', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังเพิ่ม...';

    try {
        await createMovie(title, genre, year);
        showToast(`เพิ่ม Movie "${title}" สำเร็จ`, 'success');
        event.target.reset();
        document.getElementById('movieGenre').value = '';
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '➕ เพิ่ม Movie';
    }
}

function beginEditMovie(title) {
    const movie = moviesState.movies.find((item) => item.title === title);
    if (!movie) return;

    moviesState.editingMovie = movie;
    document.getElementById('editMovieOriginalTitle').value = movie.title;
    document.getElementById('editMovieTitle').value = movie.title;
    document.getElementById('editMovieGenre').value = movie.genre || '';
    document.getElementById('editMovieYear').value = movie.year || '';
}

function clearEditMovie() {
    moviesState.editingMovie = null;
    document.getElementById('editMovieForm').reset();
    document.getElementById('editMovieOriginalTitle').value = '';
}

async function handleUpdateMovie(event) {
    event.preventDefault();

    if (!moviesState.editingMovie) {
        showToast('เลือก movie ที่ต้องการแก้ไขก่อน', 'warning');
        return;
    }

    const payload = {
        title: document.getElementById('editMovieTitle').value.trim(),
        genre: document.getElementById('editMovieGenre').value || null,
        year: document.getElementById('editMovieYear').value ? Number(document.getElementById('editMovieYear').value) : null
    };

    if (!payload.title) {
        showToast('ชื่อหนังต้องไม่ว่าง', 'error');
        return;
    }

    const btn = document.getElementById('saveMovieEditBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังบันทึก...';

    try {
        await updateMovieAPI(moviesState.editingMovie.title, payload);
        showToast(`อัปเดต Movie "${payload.title}" สำเร็จ`, 'success');
        clearEditMovie();
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save changes';
    }
}

async function handleAddRelationship(event) {
    event.preventDefault();

    const user = document.getElementById('relUser').value;
    const movie = document.getElementById('relMovie').value;
    const type = document.getElementById('relType').value;

    if (!user || !movie || !type) {
        showToast('กรุณาเลือก user, movie และ type ให้ครบ', 'error');
        return;
    }

    try {
        await createRelationship(user, movie, type);
        showToast(`สร้างความสัมพันธ์ ${type} สำเร็จ`, 'success');
        event.target.reset();
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function beginEditRelationship(user, movie, type) {
    moviesState.editingRelationship = { user, movie, type };
    document.getElementById('editRelOriginal').value = `${user} -[${type}]-> ${movie}`;
    document.getElementById('editRelUser').value = user;
    document.getElementById('editRelMovie').value = movie;
    document.getElementById('editRelType').value = type;
}

function clearEditRelationship() {
    moviesState.editingRelationship = null;
    document.getElementById('editRelForm').reset();
    document.getElementById('editRelOriginal').value = '';
}

async function handleUpdateRelationship(event) {
    event.preventDefault();

    if (!moviesState.editingRelationship) {
        showToast('เลือก relationship ที่ต้องการแก้ไขก่อน', 'warning');
        return;
    }

    const updated = {
        user: document.getElementById('editRelUser').value,
        movie: document.getElementById('editRelMovie').value,
        type: document.getElementById('editRelType').value
    };

    if (!updated.user || !updated.movie || !updated.type) {
        showToast('ข้อมูล relationship ต้องครบ', 'error');
        return;
    }

    const btn = document.getElementById('saveRelEditBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังบันทึก...';

    try {
        await updateRelationshipAPI(moviesState.editingRelationship, updated);
        showToast('อัปเดต relationship สำเร็จ', 'success');
        clearEditRelationship();
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save changes';
    }
}

async function handleDeleteMovie(title) {
    if (!confirm(`ลบ "${title}" และ relationships ที่เกี่ยวข้อง?`)) return;

    try {
        await deleteMovieAPI(title);
        if (moviesState.editingMovie?.title === title) clearEditMovie();
        showToast(`ลบ "${title}" แล้ว`, 'success');
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleDeleteRelationship(user, movie, type) {
    if (!confirm(`ลบความสัมพันธ์ ${user} -[${type}]-> ${movie}?`)) return;

    try {
        await deleteRelationshipAPI(user, movie, type);
        if (moviesState.editingRelationship &&
            moviesState.editingRelationship.user === user &&
            moviesState.editingRelationship.movie === movie &&
            moviesState.editingRelationship.type === type) {
            clearEditRelationship();
        }
        showToast('ลบ relationship แล้ว', 'success');
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSampleMovies() {
    try {
        await addSampleMoviesAPI();
        showToast('เพิ่ม Sample Movies สำเร็จ', 'success');
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSampleRelationships() {
    try {
        await addSampleRelationshipsAPI();
        showToast('เพิ่ม Sample Relationships สำเร็จ', 'success');
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSeedAll() {
    try {
        await seedDemoDataAPI();
        showToast('เติม sample data ทั้งระบบแล้ว', 'success');
        await refreshAll();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function handleMovieSearch(event) {
    moviesState.movieSearch = event.target.value || '';
    renderMovieList();
}

function handleRelSearch(event) {
    moviesState.relSearch = event.target.value || '';
    renderRelationshipList();
}

function handleGenreFilter(event) {
    moviesState.genreFilter = event.target.value || '';
    renderMovieList();
}

window.beginEditMovie = beginEditMovie;
window.handleDeleteMovie = handleDeleteMovie;
window.beginEditRelationship = beginEditRelationship;
window.handleDeleteRelationship = handleDeleteRelationship;
