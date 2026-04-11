const MovieRecUI = (() => {
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
        setConnectionBadge,
        refreshConnectionStatus
    };
})();

window.MovieRecUI = MovieRecUI;
window.showToast = MovieRecUI.toast;
window.toggleMenu = MovieRecUI.toggleMenu;
