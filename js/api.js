const API_BASE = window.MOVIEREC_API_BASE || 'http://localhost:4000/api';

async function apiFetch(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = payload?.error || payload?.message || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return payload;
}

async function tryApiVariants(variants, fallbackMessage) {
    let lastError = null;

    for (const variant of variants) {
        try {
            return await apiFetch(variant.endpoint, variant.options);
        } catch (error) {
            lastError = error;
            const unsupported = /404|405|Cannot|not found|unsupported/i.test(error.message);
            if (!unsupported) throw error;
        }
    }

    throw lastError || new Error(fallbackMessage);
}

async function testConnection() {
    try {
        const data = await apiFetch('/health');
        return data?.status === 'ok' || data?.ok === true;
    } catch {
        return false;
    }
}

async function getStats() {
    try {
        return await apiFetch('/stats');
    } catch {
        const [users, movies, relationships] = await Promise.all([
            getUsers(),
            getMovies(),
            getRelationships()
        ]);

        const genreCounts = movies.reduce((acc, movie) => {
            const genre = movie.genre || 'Unknown';
            acc[genre] = (acc[genre] || 0) + 1;
            return acc;
        }, {});

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));

        const activeUsers = users.filter((user) => (user.watchedCount || 0) + (user.likedCount || 0) > 0).length;

        return {
            users: users.length,
            movies: movies.length,
            relationships: relationships.length,
            activeUsers,
            topGenres
        };
    }
}

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

async function updateUserAPI(originalName, payload) {
    try {
        return await tryApiVariants([
            {
                endpoint: `/users/${encodeURIComponent(originalName)}`,
                options: { method: 'PUT', body: JSON.stringify(payload) }
            },
            {
                endpoint: `/users/${encodeURIComponent(originalName)}`,
                options: { method: 'PATCH', body: JSON.stringify(payload) }
            }
        ], 'Backend does not provide update user endpoint');
    } catch {
        const relationships = await getRelationships();
        const affected = relationships.filter((rel) => rel.user === originalName);

        for (const rel of affected) {
            await deleteRelationshipAPI(rel.user, rel.movie, rel.relType || rel.type);
        }

        await deleteUserAPI(originalName);
        await createUser(payload.name, payload.age);

        for (const rel of affected) {
            await createRelationship(payload.name, rel.movie, rel.relType || rel.type);
        }

        return { ok: true, fallback: true };
    }
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

async function updateMovieAPI(originalTitle, payload) {
    try {
        return await tryApiVariants([
            {
                endpoint: `/movies/${encodeURIComponent(originalTitle)}`,
                options: { method: 'PUT', body: JSON.stringify(payload) }
            },
            {
                endpoint: `/movies/${encodeURIComponent(originalTitle)}`,
                options: { method: 'PATCH', body: JSON.stringify(payload) }
            }
        ], 'Backend does not provide update movie endpoint');
    } catch {
        const relationships = await getRelationships();
        const affected = relationships.filter((rel) => rel.movie === originalTitle);

        for (const rel of affected) {
            await deleteRelationshipAPI(rel.user, rel.movie, rel.relType || rel.type);
        }

        await deleteMovieAPI(originalTitle);
        await createMovie(payload.title, payload.genre, payload.year);

        for (const rel of affected) {
            await createRelationship(rel.user, payload.title, rel.relType || rel.type);
        }

        return { ok: true, fallback: true };
    }
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

async function updateRelationshipAPI(oldRel, newRel) {
    try {
        return await tryApiVariants([
            {
                endpoint: '/relationships',
                options: { method: 'PUT', body: JSON.stringify({ ...oldRel, ...newRel, oldRel }) }
            },
            {
                endpoint: '/relationships',
                options: { method: 'PATCH', body: JSON.stringify({ ...oldRel, ...newRel, oldRel }) }
            }
        ], 'Backend does not provide relationship update endpoint');
    } catch {
        await deleteRelationshipAPI(oldRel.user, oldRel.movie, oldRel.type);
        return createRelationship(newRel.user, newRel.movie, newRel.type);
    }
}

async function addSampleRelationshipsAPI() {
    return apiFetch('/relationships/sample', {
        method: 'POST'
    });
}

async function getUserProfile(name) {
    return apiFetch(`/users/${encodeURIComponent(name)}/profile`);
}

async function getRecommendation(name, method) {
    return apiFetch(`/recommend/${encodeURIComponent(name)}/${method}`);
}

async function deleteAllRelationshipsAPI() {
    try {
        return await apiFetch('/relationships', {
            method: 'DELETE'
        });
    } catch {
        const relationships = await getRelationships();
        for (const rel of relationships) {
            await deleteRelationshipAPI(rel.user, rel.movie, rel.relType || rel.type);
        }
        return { deleted: relationships.length };
    }
}

async function deleteAllMoviesAPI() {
    try {
        return await apiFetch('/movies', {
            method: 'DELETE'
        });
    } catch {
        const movies = await getMovies();
        for (const movie of movies) {
            await deleteMovieAPI(movie.title);
        }
        return { deleted: movies.length };
    }
}

async function resetDemoDataAPI() {
    await deleteAllRelationshipsAPI();
    await deleteAllMoviesAPI();
    await deleteAllUsersAPI();
    return { ok: true };
}

async function seedDemoDataAPI() {
    await addSampleUsersAPI();
    await addSampleMoviesAPI();
    await addSampleRelationshipsAPI();
    return { ok: true };
}

async function reloadDashboardData() {
    const [stats, users, movies, relationships, connected] = await Promise.all([
        getStats(),
        getUsers(),
        getMovies(),
        getRelationships(),
        testConnection()
    ]);

    return { stats, users, movies, relationships, connected };
}
