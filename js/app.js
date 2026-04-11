const MovieRecUI = (() => {
    const WIKI_TITLE_MAP = {
        'Inception': 'Inception',
        'The Matrix': 'The Matrix',
        'Interstellar': 'Interstellar (film)',
        'Blade Runner 2049': 'Blade Runner 2049',
        'Arrival': 'Arrival (film)',
        'Mad Max: Fury Road': 'Mad Max: Fury Road',
        'The Dark Knight': 'The Dark Knight',
        'John Wick': 'John Wick (film)',
        'Gladiator': 'Gladiator (2000 film)',
        'Mission: Impossible - Fallout': 'Mission: Impossible – Fallout',
        'Parasite': 'Parasite (film)',
        'Gone Girl': 'Gone Girl (film)',
        'Shutter Island': 'Shutter Island (film)',
        'Prisoners': 'Prisoners (2013 film)',
        'Titanic': 'Titanic (1997 film)',
        'La La Land': 'La La Land',
        'Before Sunrise': 'Before Sunrise',
        'About Time': 'About Time (2013 film)',
        'The Grand Budapest Hotel': 'The Grand Budapest Hotel',
        'Knives Out': 'Knives Out',
        'Superbad': 'Superbad',
        'Little Miss Sunshine': 'Little Miss Sunshine',
        'Toy Story': 'Toy Story',
        'Spider-Man: Into the Spider-Verse': 'Spider-Man: Into the Spider-Verse',
        'Coco': 'Coco (2017 film)',
        'How to Train Your Dragon': 'How to Train Your Dragon (film)',
        'Whiplash': 'Whiplash (2014 film)',
        'The Shawshank Redemption': 'The Shawshank Redemption',
        'The Social Network': 'The Social Network',
        'Ford v Ferrari': 'Ford v Ferrari'
    };
    const posterCache = new Map();

    function esc(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escJs(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const node = document.createElement('div');
        node.className = `toast toast-${type}`;
        node.innerHTML = `<span>${icons[type] || icons.info}</span><span>${esc(message)}</span>`;
        container.appendChild(node);
        setTimeout(() => node.remove(), 3200);
    }

    function toggleMenu() {
        const navLinks = document.getElementById('navLinks');
        if (navLinks) navLinks.classList.toggle('open');
    }

    function debounce(fn, wait = 250) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    }

    function isGeneratedPoster(url) {
        return typeof url === 'string' && url.startsWith('data:image/svg+xml');
    }

    async function resolvePosterUrl(movie) {
        if (!movie?.title) return movie?.image_url || '';
        if (movie.image_url && !isGeneratedPoster(movie.image_url)) return movie.image_url;
        if (posterCache.has(movie.title)) return posterCache.get(movie.title);

        const wikiTitle = movie.wiki_title || WIKI_TITLE_MAP[movie.title] || movie.title;

        try {
            const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`);
            if (!response.ok) throw new Error(`Wikipedia poster lookup failed: HTTP ${response.status}`);
            const payload = await response.json();
            const poster = payload?.originalimage?.source || payload?.thumbnail?.source || movie.image_url || '';
            posterCache.set(movie.title, poster);
            return poster;
        } catch {
            const fallback = movie.image_url || '';
            posterCache.set(movie.title, fallback);
            return fallback;
        }
    }

    function setConnectionBadge(targetId, status) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const state = status?.ok ? 'online' : 'offline';
        const label = status?.label || (status?.ok ? 'Connected' : 'Disconnected');
        el.className = `connection-badge ${state}`;
        el.innerHTML = `<span class="dot"></span><span>${esc(label)}</span>`;
    }

    async function refreshConnectionStatus() {
        if (typeof testConnection !== 'function') return;

        const targets = document.querySelectorAll('[data-connection-badge]');
        if (!targets.length) return;

        try {
            const ok = await testConnection();
            targets.forEach((target) => {
                setConnectionBadge(target.id, {
                    ok,
                    label: ok ? 'API + Graph DB connected' : 'API unavailable'
                });
            });
        } catch (error) {
            targets.forEach((target) => {
                setConnectionBadge(target.id, {
                    ok: false,
                    label: 'Connection check failed'
                });
            });
        }
    }

    function setupNavbarEffects() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        const syncScrollState = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 40);
        };

        syncScrollState();
        window.addEventListener('scroll', syncScrollState);
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupNavbarEffects();
        refreshConnectionStatus();
    });

    return {
        esc,
        escJs,
        toast,
        toggleMenu,
        debounce,
        isGeneratedPoster,
        resolvePosterUrl,
        setConnectionBadge,
        refreshConnectionStatus
    };
})();

window.MovieRecUI = MovieRecUI;
window.showToast = MovieRecUI.toast;
window.toggleMenu = MovieRecUI.toggleMenu;
