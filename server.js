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
    { name: 'Alice', age: 24 },
    { name: 'Bob', age: 28 },
    { name: 'Charlie', age: 31 },
    { name: 'Diana', age: 22 },
    { name: 'Ethan', age: 29 }
];

const SAMPLE_MOVIES = [
    { title: 'Inception', genre: 'Sci-Fi', year: 2010 },
    { title: 'The Matrix', genre: 'Sci-Fi', year: 1999 },
    { title: 'Interstellar', genre: 'Sci-Fi', year: 2014 },
    { title: 'Titanic', genre: 'Romance', year: 1997 },
    { title: 'The Dark Knight', genre: 'Action', year: 2008 },
    { title: 'Toy Story', genre: 'Animation', year: 1995 },
    { title: 'Parasite', genre: 'Thriller', year: 2019 },
    { title: 'La La Land', genre: 'Drama', year: 2016 }
];

const SAMPLE_RELATIONSHIPS = [
    { user: 'Alice', movie: 'Inception', type: 'WATCHED' },
    { user: 'Alice', movie: 'Inception', type: 'LIKED' },
    { user: 'Alice', movie: 'Interstellar', type: 'LIKED' },
    { user: 'Bob', movie: 'The Matrix', type: 'WATCHED' },
    { user: 'Bob', movie: 'The Matrix', type: 'LIKED' },
    { user: 'Bob', movie: 'The Dark Knight', type: 'LIKED' },
    { user: 'Charlie', movie: 'Titanic', type: 'WATCHED' },
    { user: 'Charlie', movie: 'La La Land', type: 'LIKED' },
    { user: 'Diana', movie: 'Toy Story', type: 'WATCHED' },
    { user: 'Diana', movie: 'Toy Story', type: 'LIKED' },
    { user: 'Diana', movie: 'Inception', type: 'WATCHED' },
    { user: 'Ethan', movie: 'Parasite', type: 'WATCHED' },
    { user: 'Ethan', movie: 'Parasite', type: 'LIKED' },
    { user: 'Ethan', movie: 'The Dark Knight', type: 'WATCHED' }
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
            RETURN m.title AS title, m.genre AS genre, m.year AS year, watchedBy, count(l) AS likedBy
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
    const { title, genre, year } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Movie title is required' });
    }

    try {
        await runQuery(`
            MERGE (m:Movie {title: $title})
            SET m.genre = $genre, m.year = $year
        `, { title, genre: genre ?? null, year: year ?? null }, 'WRITE');

        res.status(201).json({ message: 'Movie saved', title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/movies/:title', async (req, res) => {
    const originalTitle = req.params.title;
    const { title, genre, year } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'New movie title is required' });
    }

    try {
        const result = await runQuery(`
            MATCH (m:Movie {title: $originalTitle})
            SET m.title = $title, m.genre = $genre, m.year = $year
            RETURN m
        `, { originalTitle, title, genre: genre ?? null, year: year ?? null }, 'WRITE');

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
    const { title, genre, year } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'New movie title is required' });
    }

    try {
        const result = await runQuery(`
            MATCH (m:Movie {title: $originalTitle})
            SET m.title = $title, m.genre = $genre, m.year = $year
            RETURN m
        `, { originalTitle, title, genre: genre ?? null, year: year ?? null }, 'WRITE');

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
            SET m.genre = movie.genre, m.year = movie.year
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
