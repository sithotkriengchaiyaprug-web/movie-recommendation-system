require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password123';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

const SAMPLE_USERS = [
    { name: 'Ari', age: 24 },
    { name: 'Bam', age: 28 },
    { name: 'Chai', age: 31 },
    { name: 'Dao', age: 22 },
    { name: 'Eve', age: 29 },
    { name: 'Fern', age: 26 },
    { name: 'Guy', age: 34 },
    { name: 'Hana', age: 27 },
    { name: 'Ice', age: 23 },
    { name: 'Jin', age: 30 },
    { name: 'Kai', age: 25 },
    { name: 'Lina', age: 32 },
    { name: 'Mek', age: 29 },
    { name: 'Nami', age: 21 },
    { name: 'Oat', age: 35 }
];

const SAMPLE_MOVIES = [
    { title: 'Inception', genre: 'Sci-Fi', year: 2010, description: 'A layered dream-heist that bends memory, guilt, and reality into one mission.' },
    { title: 'The Matrix', genre: 'Sci-Fi', year: 1999, description: 'A hacker discovers reality is programmable and joins a war for human freedom.' },
    { title: 'Interstellar', genre: 'Sci-Fi', year: 2014, description: 'Explorers leave Earth to search for a future home beyond a collapsing planet.' },
    { title: 'Blade Runner 2049', genre: 'Sci-Fi', year: 2017, description: 'A future detective uncovers a secret that could reshape the balance of power.' },
    { title: 'Arrival', genre: 'Sci-Fi', year: 2016, description: 'Language becomes the key to understanding visitors from another world.' },
    { title: 'Mad Max: Fury Road', genre: 'Action', year: 2015, description: 'A relentless desert chase turns survival into a rebellion.' },
    { title: 'The Dark Knight', genre: 'Action', year: 2008, description: 'Batman faces chaos embodied in a villain determined to break Gotham.' },
    { title: 'John Wick', genre: 'Action', year: 2014, description: 'A retired assassin returns with precision and fury after personal loss.' },
    { title: 'Gladiator', genre: 'Action', year: 2000, description: 'A betrayed general rises through the arena to challenge an empire.' },
    { title: 'Mission: Impossible - Fallout', genre: 'Action', year: 2018, description: 'An elite operative races to stop a global disaster caused by one failed choice.' },
    { title: 'Parasite', genre: 'Thriller', year: 2019, description: 'A clever family enters a wealthy household and sparks a tense class collision.' },
    { title: 'Gone Girl', genre: 'Thriller', year: 2014, description: 'A missing-person case turns into a performance of marriage, media, and manipulation.' },
    { title: 'Shutter Island', genre: 'Thriller', year: 2010, description: 'An investigation on an isolated island reveals something far more unstable.' },
    { title: 'Prisoners', genre: 'Thriller', year: 2013, description: 'Desperation rises when a father and a detective pursue a child abduction case.' },
    { title: 'Titanic', genre: 'Romance', year: 1997, description: 'A sweeping love story unfolds aboard a doomed luxury liner.' },
    { title: 'La La Land', genre: 'Romance', year: 2016, description: 'Two artists chase ambition and love in a musical version of Los Angeles.' },
    { title: 'Before Sunrise', genre: 'Romance', year: 1995, description: 'A chance train encounter becomes an unforgettable one-night connection.' },
    { title: 'About Time', genre: 'Romance', year: 2013, description: 'A time-travel gift is used to navigate love, family, and ordinary life.' },
    { title: 'The Grand Budapest Hotel', genre: 'Comedy', year: 2014, description: 'A concierge and his lobby boy race through a caper wrapped in elegant absurdity.' },
    { title: 'Knives Out', genre: 'Comedy', year: 2019, description: 'A sharp detective unravels a wealthy family mystery with playful precision.' },
    { title: 'Superbad', genre: 'Comedy', year: 2007, description: 'Teen friendship, panic, and one chaotic night collide before graduation.' },
    { title: 'Little Miss Sunshine', genre: 'Comedy', year: 2006, description: 'A dysfunctional family road trip becomes surprisingly tender.' },
    { title: 'Toy Story', genre: 'Animation', year: 1995, description: 'Toys come alive and learn what friendship means when humans are away.' },
    { title: 'Spider-Man: Into the Spider-Verse', genre: 'Animation', year: 2018, description: 'Multiple Spider-heroes collide in a vibrant coming-of-age adventure.' },
    { title: 'Coco', genre: 'Animation', year: 2017, description: 'Music and memory guide a boy through a dazzling land of the dead.' },
    { title: 'How to Train Your Dragon', genre: 'Animation', year: 2010, description: 'A young Viking changes his world by befriending the creature he was taught to fear.' },
    { title: 'Whiplash', genre: 'Drama', year: 2014, description: 'Talent and obsession clash inside a punishing music conservatory.' },
    { title: 'The Shawshank Redemption', genre: 'Drama', year: 1994, description: 'Hope survives decades inside prison walls.' },
    { title: 'The Social Network', genre: 'Drama', year: 2010, description: 'Ambition, betrayal, and code drive the rise of a modern empire.' },
    { title: 'Ford v Ferrari', genre: 'Drama', year: 2019, description: 'Engineers and drivers push craft and courage to beat a racing giant.' }
].map(enrichSampleMovie);

const SAMPLE_RELATIONSHIPS = [
    { user: 'Ari', movie: 'Inception', type: 'WATCHED' },
    { user: 'Ari', movie: 'Inception', type: 'LIKED' },
    { user: 'Ari', movie: 'Interstellar', type: 'WATCHED' },
    { user: 'Ari', movie: 'Interstellar', type: 'LIKED' },
    { user: 'Ari', movie: 'Arrival', type: 'WATCHED' },
    { user: 'Ari', movie: 'The Matrix', type: 'WATCHED' },
    { user: 'Bam', movie: 'The Matrix', type: 'WATCHED' },
    { user: 'Bam', movie: 'The Matrix', type: 'LIKED' },
    { user: 'Bam', movie: 'Blade Runner 2049', type: 'WATCHED' },
    { user: 'Bam', movie: 'Blade Runner 2049', type: 'LIKED' },
    { user: 'Bam', movie: 'Inception', type: 'WATCHED' },
    { user: 'Bam', movie: 'Arrival', type: 'LIKED' },
    { user: 'Chai', movie: 'Mad Max: Fury Road', type: 'WATCHED' },
    { user: 'Chai', movie: 'Mad Max: Fury Road', type: 'LIKED' },
    { user: 'Chai', movie: 'The Dark Knight', type: 'WATCHED' },
    { user: 'Chai', movie: 'The Dark Knight', type: 'LIKED' },
    { user: 'Chai', movie: 'John Wick', type: 'WATCHED' },
    { user: 'Chai', movie: 'Gladiator', type: 'LIKED' },
    { user: 'Dao', movie: 'Titanic', type: 'WATCHED' },
    { user: 'Dao', movie: 'Titanic', type: 'LIKED' },
    { user: 'Dao', movie: 'La La Land', type: 'WATCHED' },
    { user: 'Dao', movie: 'La La Land', type: 'LIKED' },
    { user: 'Dao', movie: 'About Time', type: 'WATCHED' },
    { user: 'Dao', movie: 'Before Sunrise', type: 'LIKED' },
    { user: 'Eve', movie: 'Parasite', type: 'WATCHED' },
    { user: 'Eve', movie: 'Parasite', type: 'LIKED' },
    { user: 'Eve', movie: 'Gone Girl', type: 'WATCHED' },
    { user: 'Eve', movie: 'Gone Girl', type: 'LIKED' },
    { user: 'Eve', movie: 'Prisoners', type: 'WATCHED' },
    { user: 'Eve', movie: 'Shutter Island', type: 'LIKED' },
    { user: 'Fern', movie: 'Toy Story', type: 'WATCHED' },
    { user: 'Fern', movie: 'Toy Story', type: 'LIKED' },
    { user: 'Fern', movie: 'Coco', type: 'WATCHED' },
    { user: 'Fern', movie: 'Coco', type: 'LIKED' },
    { user: 'Fern', movie: 'How to Train Your Dragon', type: 'WATCHED' },
    { user: 'Fern', movie: 'Spider-Man: Into the Spider-Verse', type: 'LIKED' },
    { user: 'Guy', movie: 'Whiplash', type: 'WATCHED' },
    { user: 'Guy', movie: 'Whiplash', type: 'LIKED' },
    { user: 'Guy', movie: 'The Social Network', type: 'WATCHED' },
    { user: 'Guy', movie: 'The Social Network', type: 'LIKED' },
    { user: 'Guy', movie: 'Ford v Ferrari', type: 'WATCHED' },
    { user: 'Guy', movie: 'The Shawshank Redemption', type: 'LIKED' },
    { user: 'Hana', movie: 'La La Land', type: 'WATCHED' },
    { user: 'Hana', movie: 'La La Land', type: 'LIKED' },
    { user: 'Hana', movie: 'The Grand Budapest Hotel', type: 'WATCHED' },
    { user: 'Hana', movie: 'The Grand Budapest Hotel', type: 'LIKED' },
    { user: 'Hana', movie: 'Knives Out', type: 'WATCHED' },
    { user: 'Hana', movie: 'Little Miss Sunshine', type: 'LIKED' },
    { user: 'Ice', movie: 'Inception', type: 'WATCHED' },
    { user: 'Ice', movie: 'Inception', type: 'LIKED' },
    { user: 'Ice', movie: 'The Matrix', type: 'WATCHED' },
    { user: 'Ice', movie: 'Mad Max: Fury Road', type: 'WATCHED' },
    { user: 'Ice', movie: 'The Dark Knight', type: 'LIKED' },
    { user: 'Ice', movie: 'John Wick', type: 'LIKED' },
    { user: 'Jin', movie: 'Parasite', type: 'WATCHED' },
    { user: 'Jin', movie: 'Parasite', type: 'LIKED' },
    { user: 'Jin', movie: 'Knives Out', type: 'WATCHED' },
    { user: 'Jin', movie: 'Knives Out', type: 'LIKED' },
    { user: 'Jin', movie: 'Gone Girl', type: 'WATCHED' },
    { user: 'Jin', movie: 'The Grand Budapest Hotel', type: 'LIKED' },
    { user: 'Kai', movie: 'Interstellar', type: 'WATCHED' },
    { user: 'Kai', movie: 'Interstellar', type: 'LIKED' },
    { user: 'Kai', movie: 'Arrival', type: 'WATCHED' },
    { user: 'Kai', movie: 'Arrival', type: 'LIKED' },
    { user: 'Kai', movie: 'Blade Runner 2049', type: 'WATCHED' },
    { user: 'Kai', movie: 'The Matrix', type: 'LIKED' },
    { user: 'Lina', movie: 'About Time', type: 'WATCHED' },
    { user: 'Lina', movie: 'About Time', type: 'LIKED' },
    { user: 'Lina', movie: 'Before Sunrise', type: 'WATCHED' },
    { user: 'Lina', movie: 'Before Sunrise', type: 'LIKED' },
    { user: 'Lina', movie: 'Titanic', type: 'WATCHED' },
    { user: 'Lina', movie: 'La La Land', type: 'LIKED' },
    { user: 'Mek', movie: 'Ford v Ferrari', type: 'WATCHED' },
    { user: 'Mek', movie: 'Ford v Ferrari', type: 'LIKED' },
    { user: 'Mek', movie: 'Whiplash', type: 'WATCHED' },
    { user: 'Mek', movie: 'Whiplash', type: 'LIKED' },
    { user: 'Mek', movie: 'Gladiator', type: 'WATCHED' },
    { user: 'Mek', movie: 'The Dark Knight', type: 'LIKED' },
    { user: 'Nami', movie: 'Spider-Man: Into the Spider-Verse', type: 'WATCHED' },
    { user: 'Nami', movie: 'Spider-Man: Into the Spider-Verse', type: 'LIKED' },
    { user: 'Nami', movie: 'Coco', type: 'WATCHED' },
    { user: 'Nami', movie: 'Coco', type: 'LIKED' },
    { user: 'Nami', movie: 'Toy Story', type: 'WATCHED' },
    { user: 'Nami', movie: 'Little Miss Sunshine', type: 'LIKED' },
    { user: 'Oat', movie: 'Mission: Impossible - Fallout', type: 'WATCHED' },
    { user: 'Oat', movie: 'Mission: Impossible - Fallout', type: 'LIKED' },
    { user: 'Oat', movie: 'Mad Max: Fury Road', type: 'WATCHED' },
    { user: 'Oat', movie: 'Mad Max: Fury Road', type: 'LIKED' },
    { user: 'Oat', movie: 'John Wick', type: 'WATCHED' },
    { user: 'Oat', movie: 'The Dark Knight', type: 'LIKED' }
];

const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value?.toNumber === 'function') return value.toNumber();
    return Number(value);
}

function encodeSvgDataUrl(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildPosterDataUrl(title, genre, year) {
    const palette = {
        Action: ['#2f0a0a', '#d62839'],
        Comedy: ['#2a1c08', '#f7b801'],
        Drama: ['#111827', '#64748b'],
        'Sci-Fi': ['#08111f', '#00b4d8'],
        Horror: ['#16090b', '#7f1d1d'],
        Romance: ['#2b1024', '#ff4d8d'],
        Thriller: ['#10141f', '#4f46e5'],
        Animation: ['#10253a', '#34d399']
    };

    const [bgA, bgB] = palette[genre] || ['#1f1f1f', '#525252'];
    const safeTitle = String(title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeGenre = String(genre || 'Movie').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeYear = year ? String(year) : 'Now Showing';
    const titleLines = safeTitle.length > 18
        ? [safeTitle.slice(0, 18), safeTitle.slice(18, 36)]
        : [safeTitle, ''];

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${bgA}"/>
                    <stop offset="100%" stop-color="${bgB}"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#bg)"/>
            <circle cx="470" cy="160" r="150" fill="rgba(255,255,255,0.08)"/>
            <circle cx="140" cy="720" r="210" fill="rgba(0,0,0,0.18)"/>
            <rect x="52" y="52" width="496" height="796" rx="32" ry="32" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
            <text x="64" y="104" fill="rgba(255,255,255,0.72)" font-family="Segoe UI, Arial, sans-serif" font-size="28" letter-spacing="4">MOVIEREC PICK</text>
            <text x="64" y="640" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700">${titleLines[0]}</text>
            ${titleLines[1] ? `<text x="64" y="708" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700">${titleLines[1]}</text>` : ''}
            <text x="64" y="784" fill="rgba(255,255,255,0.82)" font-family="Segoe UI, Arial, sans-serif" font-size="28">${safeGenre}</text>
            <text x="472" y="784" text-anchor="end" fill="rgba(255,255,255,0.82)" font-family="Segoe UI, Arial, sans-serif" font-size="28">${safeYear}</text>
        </svg>
    `.trim();

    return encodeSvgDataUrl(svg);
}

function enrichSampleMovie(movie) {
    return {
        ...movie,
        image_url: movie.image_url || buildPosterDataUrl(movie.title, movie.genre, movie.year),
        description: movie.description || `${movie.title} is part of the seeded catalog for ${movie.genre || 'Movie'} recommendations.`
    };
}

function sanitizeRelationshipType(type) {
    if (!['WATCHED', 'LIKED'].includes(type)) {
        throw new Error('Relationship type must be WATCHED or LIKED');
    }
    return type;
}

async function runQuery(query, params = {}, mode = 'READ') {
    const session = driver.session({
        database: NEO4J_DATABASE,
        defaultAccessMode: mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ
    });

    try {
        return await session.run(query, params);
    } finally {
        await session.close();
    }
}

function mapMovieRecord(record) {
    return {
        title: record.get('title'),
        genre: record.get('genre'),
        year: toNumber(record.get('year')),
        image_url: record.get('image_url'),
        description: record.get('description'),
        watchedBy: toNumber(record.get('watchedBy')) || 0,
        likedBy: toNumber(record.get('likedBy')) || 0
    };
}

app.get('/api/health', async (req, res) => {
    try {
        await runQuery('RETURN 1 AS ok');
        res.json({
            status: 'ok',
            database: 'neo4j',
            uri: NEO4J_URI
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [nodeStats, relStats, genreStats] = await Promise.all([
            runQuery(`
                MATCH (u:User)
                WITH count(u) AS users
                MATCH (m:Movie)
                RETURN users, count(m) AS movies
            `),
            runQuery(`
                MATCH (:User)-[r]->(:Movie)
                WHERE type(r) IN ['WATCHED', 'LIKED']
                RETURN count(r) AS relationships
            `),
            runQuery(`
                MATCH (m:Movie)
                WHERE m.genre IS NOT NULL
                RETURN m.genre AS genre, count(*) AS count
                ORDER BY count DESC, genre ASC
                LIMIT 5
            `)
        ]);

        const users = toNumber(nodeStats.records[0].get('users')) || 0;
        const movies = toNumber(nodeStats.records[0].get('movies')) || 0;
        const relationships = toNumber(relStats.records[0].get('relationships')) || 0;

        const activeUsersResult = await runQuery(`
            MATCH (u:User)
            OPTIONAL MATCH (u)-[r]->(:Movie)
            WHERE type(r) IN ['WATCHED', 'LIKED']
            WITH u, count(r) AS relCount
            WHERE relCount > 0
            RETURN count(u) AS activeUsers
        `);

        const activeUsers = toNumber(activeUsersResult.records[0].get('activeUsers')) || 0;

        res.json({
            users,
            movies,
            relationships,
            activeUsers,
            topGenres: genreStats.records.map((record) => ({
                genre: record.get('genre'),
                count: toNumber(record.get('count')) || 0
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await runQuery(`
            MATCH (u:User)
            OPTIONAL MATCH (u)-[w:WATCHED]->(:Movie)
            WITH u, count(w) AS watchedCount
            OPTIONAL MATCH (u)-[l:LIKED]->(:Movie)
            RETURN u.name AS name, u.age AS age, watchedCount, count(l) AS likedCount
            ORDER BY name ASC
        `);

        res.json(result.records.map((record) => ({
            name: record.get('name'),
            age: toNumber(record.get('age')),
            watchedCount: toNumber(record.get('watchedCount')) || 0,
            likedCount: toNumber(record.get('likedCount')) || 0
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/names', async (req, res) => {
    try {
        const result = await runQuery(`
            MATCH (u:User)
            RETURN u.name AS name
            ORDER BY name ASC
        `);

        res.json(result.records.map((record) => record.get('name')));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { name, age } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'User name is required' });
    }

    try {
        await runQuery(`
            MERGE (u:User {name: $name})
            SET u.age = $age
        `, { name, age: age ?? null }, 'WRITE');

        res.status(201).json({ message: 'User saved', name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:name', async (req, res) => {
    const originalName = req.params.name;
    const { name, age } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'New user name is required' });
    }

    try {
        const result = await runQuery(`
            MATCH (u:User {name: $originalName})
            SET u.name = $name, u.age = $age
            RETURN u
        `, { originalName, name, age: age ?? null }, 'WRITE');

        if (!result.records.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated', name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/users/:name', async (req, res) => {
    const originalName = req.params.name;
    const { name, age } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'New user name is required' });
    }

    try {
        const result = await runQuery(`
            MATCH (u:User {name: $originalName})
            SET u.name = $name, u.age = $age
            RETURN u
        `, { originalName, name, age: age ?? null }, 'WRITE');

        if (!result.records.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated', name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:name', async (req, res) => {
    try {
        await runQuery(`
            MATCH (u:User {name: $name})
            DETACH DELETE u
        `, { name: req.params.name }, 'WRITE');

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users', async (req, res) => {
    try {
        await runQuery(`
            MATCH (u:User)
            DETACH DELETE u
        `, {}, 'WRITE');
        res.json({ message: 'All users deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/sample', async (req, res) => {
    try {
        await runQuery(`
            UNWIND $users AS user
            MERGE (u:User {name: user.name})
            SET u.age = user.age
        `, { users: SAMPLE_USERS }, 'WRITE');
        res.json({ message: 'Sample users added', count: SAMPLE_USERS.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:name/profile', async (req, res) => {
    try {
        const profileResult = await runQuery(`
            MATCH (u:User {name: $name})
            RETURN u.name AS name, u.age AS age
        `, { name: req.params.name });

        if (!profileResult.records.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const watchedResult = await runQuery(`
            MATCH (:User {name: $name})-[:WATCHED]->(m:Movie)
            RETURN m.title AS title
            ORDER BY title ASC
        `, { name: req.params.name });

        const likedResult = await runQuery(`
            MATCH (:User {name: $name})-[:LIKED]->(m:Movie)
            RETURN m.title AS title
            ORDER BY title ASC
        `, { name: req.params.name });

        const record = profileResult.records[0];
        res.json({
            name: record.get('name'),
            age: toNumber(record.get('age')),
            watched: watchedResult.records.map((row) => row.get('title')),
            liked: likedResult.records.map((row) => row.get('title'))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/movies', async (req, res) => {
    try {
        const result = await runQuery(`
            MATCH (m:Movie)
            OPTIONAL MATCH (:User)-[w:WATCHED]->(m)
            WITH m, count(w) AS watchedBy
            OPTIONAL MATCH (:User)-[l:LIKED]->(m)
            RETURN m.title AS title, m.genre AS genre, m.year AS year,
                   m.image_url AS image_url, m.description AS description,
                   watchedBy, count(l) AS likedBy
            ORDER BY title ASC
        `);

        res.json(result.records.map(mapMovieRecord));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/movies/titles', async (req, res) => {
    try {
        const result = await runQuery(`
            MATCH (m:Movie)
            RETURN m.title AS title
            ORDER BY title ASC
        `);

        res.json(result.records.map((record) => record.get('title')));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/movies', async (req, res) => {
    const { title, genre, year, image_url, description } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Movie title is required' });
    }

    try {
        const poster = image_url || buildPosterDataUrl(title, genre, year);
        await runQuery(`
            MERGE (m:Movie {title: $title})
            SET m.genre = $genre, m.year = $year, m.image_url = $image_url, m.description = $description
        `, {
            title,
            genre: genre ?? null,
            year: year ?? null,
            image_url: poster,
            description: description ?? null
        }, 'WRITE');

        res.status(201).json({ message: 'Movie saved', title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/movies/:title', async (req, res) => {
    const originalTitle = req.params.title;
    const { title, genre, year, image_url, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'New movie title is required' });
    }

    try {
        const poster = image_url || buildPosterDataUrl(title, genre, year);
        const result = await runQuery(`
            MATCH (m:Movie {title: $originalTitle})
            SET m.title = $title, m.genre = $genre, m.year = $year,
                m.image_url = $image_url, m.description = $description
            RETURN m
        `, {
            originalTitle,
            title,
            genre: genre ?? null,
            year: year ?? null,
            image_url: poster,
            description: description ?? null
        }, 'WRITE');

        if (!result.records.length) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        res.json({ message: 'Movie updated', title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/movies/:title', async (req, res) => {
    const originalTitle = req.params.title;
    const { title, genre, year, image_url, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'New movie title is required' });
    }

    try {
        const poster = image_url || buildPosterDataUrl(title, genre, year);
        const result = await runQuery(`
            MATCH (m:Movie {title: $originalTitle})
            SET m.title = $title, m.genre = $genre, m.year = $year,
                m.image_url = $image_url, m.description = $description
            RETURN m
        `, {
            originalTitle,
            title,
            genre: genre ?? null,
            year: year ?? null,
            image_url: poster,
            description: description ?? null
        }, 'WRITE');

        if (!result.records.length) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        res.json({ message: 'Movie updated', title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/movies/:title', async (req, res) => {
    try {
        await runQuery(`
            MATCH (m:Movie {title: $title})
            DETACH DELETE m
        `, { title: req.params.title }, 'WRITE');

        res.json({ message: 'Movie deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/movies', async (req, res) => {
    try {
        await runQuery(`
            MATCH (m:Movie)
            DETACH DELETE m
        `, {}, 'WRITE');
        res.json({ message: 'All movies deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/movies/sample', async (req, res) => {
    try {
        await runQuery(`
            UNWIND $movies AS movie
            MERGE (m:Movie {title: movie.title})
            SET m.genre = movie.genre, m.year = movie.year,
                m.image_url = movie.image_url, m.description = movie.description
        `, { movies: SAMPLE_MOVIES }, 'WRITE');
        res.json({ message: 'Sample movies added', count: SAMPLE_MOVIES.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/relationships', async (req, res) => {
    try {
        const result = await runQuery(`
            MATCH (u:User)-[r]->(m:Movie)
            WHERE type(r) IN ['WATCHED', 'LIKED']
            RETURN u.name AS user, type(r) AS relType, m.title AS movie
            ORDER BY user ASC, movie ASC
        `);

        res.json(result.records.map((record) => ({
            user: record.get('user'),
            relType: record.get('relType'),
            movie: record.get('movie')
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/relationships', async (req, res) => {
    const { user, movie, type } = req.body;

    if (!user || !movie || !type) {
        return res.status(400).json({ error: 'user, movie and type are required' });
    }

    try {
        const relType = sanitizeRelationshipType(type);
        await runQuery(`
            MATCH (u:User {name: $user})
            MATCH (m:Movie {title: $movie})
            MERGE (u)-[r:${relType}]->(m)
            RETURN r
        `, { user, movie }, 'WRITE');

        res.status(201).json({ message: 'Relationship saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/relationships', async (req, res) => {
    const oldRel = req.body.oldRel || req.body;
    const newRel = {
        user: req.body.user,
        movie: req.body.movie,
        type: req.body.type
    };

    if (!oldRel.user || !oldRel.movie || !oldRel.type || !newRel.user || !newRel.movie || !newRel.type) {
        return res.status(400).json({ error: 'oldRel and new relationship data are required' });
    }

    try {
        const oldType = sanitizeRelationshipType(oldRel.type);
        const newType = sanitizeRelationshipType(newRel.type);

        await runQuery(`
            MATCH (u:User {name: $oldUser})-[r:${oldType}]->(m:Movie {title: $oldMovie})
            DELETE r
        `, { oldUser: oldRel.user, oldMovie: oldRel.movie }, 'WRITE');

        await runQuery(`
            MATCH (u:User {name: $user})
            MATCH (m:Movie {title: $movie})
            MERGE (u)-[r:${newType}]->(m)
            RETURN r
        `, { user: newRel.user, movie: newRel.movie }, 'WRITE');

        res.json({ message: 'Relationship updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/relationships', async (req, res) => {
    const oldRel = req.body.oldRel || req.body;
    const newRel = {
        user: req.body.user,
        movie: req.body.movie,
        type: req.body.type
    };

    if (!oldRel.user || !oldRel.movie || !oldRel.type || !newRel.user || !newRel.movie || !newRel.type) {
        return res.status(400).json({ error: 'oldRel and new relationship data are required' });
    }

    try {
        const oldType = sanitizeRelationshipType(oldRel.type);
        const newType = sanitizeRelationshipType(newRel.type);

        await runQuery(`
            MATCH (u:User {name: $oldUser})-[r:${oldType}]->(m:Movie {title: $oldMovie})
            DELETE r
        `, { oldUser: oldRel.user, oldMovie: oldRel.movie }, 'WRITE');

        await runQuery(`
            MATCH (u:User {name: $user})
            MATCH (m:Movie {title: $movie})
            MERGE (u)-[r:${newType}]->(m)
            RETURN r
        `, { user: newRel.user, movie: newRel.movie }, 'WRITE');

        res.json({ message: 'Relationship updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/relationships', async (req, res) => {
    const { user, movie, type } = req.body || {};

    try {
        if (!user && !movie && !type) {
            await runQuery(`
                MATCH ()-[r]->()
                WHERE type(r) IN ['WATCHED', 'LIKED']
                DELETE r
            `, {}, 'WRITE');
            return res.json({ message: 'All relationships deleted' });
        }

        const relType = sanitizeRelationshipType(type);
        await runQuery(`
            MATCH (u:User {name: $user})-[r:${relType}]->(m:Movie {title: $movie})
            DELETE r
        `, { user, movie }, 'WRITE');

        res.json({ message: 'Relationship deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/relationships/sample', async (req, res) => {
    try {
        for (const rel of SAMPLE_RELATIONSHIPS) {
            const relType = sanitizeRelationshipType(rel.type);
            await runQuery(`
                MATCH (u:User {name: $user})
                MATCH (m:Movie {title: $movie})
                MERGE (u)-[r:${relType}]->(m)
            `, { user: rel.user, movie: rel.movie }, 'WRITE');
        }

        res.json({ message: 'Sample relationships added', count: SAMPLE_RELATIONSHIPS.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recommend/:name/:method', async (req, res) => {
    const { name, method } = req.params;

    const queries = {
        collaborative: `
            MATCH (u:User {name: $name})-[:LIKED]->(:Movie)<-[:LIKED]-(other:User)-[:LIKED]->(rec:Movie)
            WHERE other.name <> $name
              AND NOT (u)-[:WATCHED|LIKED]->(rec)
            RETURN rec.title AS title,
                   rec.genre AS genre,
                   rec.year AS year,
                   rec.image_url AS image_url,
                   rec.description AS description,
                   count(DISTINCT other) AS score,
                   'Recommended because similar users also liked this movie' AS reason
            ORDER BY score DESC, title ASC
            LIMIT 10
        `,
        genre: `
            MATCH (u:User {name: $name})-[:LIKED]->(liked:Movie)
            WITH u, collect(DISTINCT liked.genre) AS genres
            UNWIND genres AS genre
            MATCH (rec:Movie {genre: genre})
            WHERE NOT (u)-[:WATCHED|LIKED]->(rec)
            RETURN rec.title AS title,
                   rec.genre AS genre,
                   rec.year AS year,
                   rec.image_url AS image_url,
                   rec.description AS description,
                   count(*) AS score,
                   'Recommended because it shares genre with movies this user liked' AS reason
            ORDER BY score DESC, title ASC
            LIMIT 10
        `,
        popular: `
            MATCH (u:User {name: $name})
            MATCH (rec:Movie)<-[l:LIKED]-(:User)
            WHERE NOT (u)-[:WATCHED|LIKED]->(rec)
            RETURN rec.title AS title,
                   rec.genre AS genre,
                   rec.year AS year,
                   rec.image_url AS image_url,
                   rec.description AS description,
                   count(l) AS score,
                   'Recommended because it is popular among users in the graph' AS reason
            ORDER BY score DESC, title ASC
            LIMIT 10
        `
    };

    if (!queries[method]) {
        return res.status(400).json({ error: 'Unknown recommendation method' });
    }

    try {
        const result = await runQuery(queries[method], { name });
        res.json(result.records.map((record) => ({
            title: record.get('title'),
            genre: record.get('genre'),
            year: toNumber(record.get('year')),
            image_url: record.get('image_url'),
            description: record.get('description'),
            score: toNumber(record.get('score')) || 0,
            reason: record.get('reason')
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.path === '/' ? 'index.html' : req.path);
    res.sendFile(filePath, (error) => {
        if (error) {
            res.status(404).send('Page not found');
        }
    });
});

app.listen(PORT, async () => {
    try {
        await driver.verifyConnectivity();
        console.log(`Movie Recommendation System running on http://localhost:${PORT}`);
        console.log(`Connected to Neo4j at ${NEO4J_URI}`);
    } catch (error) {
        console.error('Server started but Neo4j connection failed:', error.message);
        console.log(`Movie Recommendation System running on http://localhost:${PORT}`);
    }
});

process.on('SIGINT', async () => {
    await driver.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await driver.close();
    process.exit(0);
});
