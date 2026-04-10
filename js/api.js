// js/api.js
// ==========================================
// 🔌 API Layer — ยิง request ไป Backend
// ==========================================

const API_BASE = 'http://localhost:4000/api';

// ==========================================
// 🔧 Helper Function
// ==========================================

async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// ==========================================
// 🏠 Health & Stats
// ==========================================

async function testConnection() {
    try {
        const data = await apiFetch('/health');
        return data.status === 'ok';
    } catch {
        return false;
    }
}

async function getStats() {
    return apiFetch('/stats');
}

// ==========================================
// 👤 Users
// ==========================================

async function getUsers() {
    return apiFetch('/users');
}

async function getUserNames() {
    return apiFetch('/users/names');
}

async function createUser(name, age) {
    return apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name, age })
    });
}

async function deleteUserAPI(name) {
    return apiFetch(`/users/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    });
}

async function deleteAllUsersAPI() {
    return apiFetch('/users', {
        method: 'DELETE'
    });
}

async function addSampleUsersAPI() {
    return apiFetch('/users/sample', {
        method: 'POST'
    });
}

// ==========================================
// 🎬 Movies
// ==========================================

async function getMovies() {
    return apiFetch('/movies');
}

async function getMovieTitles() {
    return apiFetch('/movies/titles');
}

async function createMovie(title, genre, year) {
    return apiFetch('/movies', {
        method: 'POST',
        body: JSON.stringify({ title, genre, year })
    });
}

async function deleteMovieAPI(title) {
    return apiFetch(`/movies/${encodeURIComponent(title)}`, {
        method: 'DELETE'
    });
}

async function addSampleMoviesAPI() {
    return apiFetch('/movies/sample', {
        method: 'POST'
    });
}

// ==========================================
// 🔗 Relationships
// ==========================================

async function getRelationships() {
    return apiFetch('/relationships');
}

async function createRelationship(user, movie, type) {
    return apiFetch('/relationships', {
        method: 'POST',
        body: JSON.stringify({ user, movie, type })
    });
}

async function deleteRelationshipAPI(user, movie, type) {
    return apiFetch('/relationships', {
        method: 'DELETE',
        body: JSON.stringify({ user, movie, type })
    });
}

async function addSampleRelationshipsAPI() {
    return apiFetch('/relationships/sample', {
        method: 'POST'
    });
}

// ==========================================
// 📊 Recommendations
// ==========================================

async function getUserProfile(name) {
    return apiFetch(`/users/${encodeURIComponent(name)}/profile`);
}

async function getRecommendation(name, method) {
    return apiFetch(`/recommend/${encodeURIComponent(name)}/${method}`);
}