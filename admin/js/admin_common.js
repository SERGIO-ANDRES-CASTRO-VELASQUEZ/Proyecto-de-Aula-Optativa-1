// admin_common.js — Helpers compartidos por todas las páginas admin
// Funciones: ensureAdmin(), updateAdminProfile(), wireLogout(), formatCurrency(), formatDate(), debounce()

async function ensureAdmin() {
    if (!isLoggedIn()) {
        window.location.href = '../../client/html/index.html';
        return null;
    }

    let user = getUser();
    if (!user || !user.role) {
        try {
            // GET /api/auth/me
            user = await apiGet('/api/auth/me');
            setUser(user);
        } catch (err) {
            return null;
        }
    }

    if (!user || user.role !== 'ADMIN') {
        window.location.href = '../../client/html/client_index.html';
        return null;
    }

    updateAdminProfile(user);
    wireLogout();
    return user;
}

function updateAdminProfile(user) {
    const nameEl   = document.querySelector('.admin-name');
    const emailEl  = document.querySelector('.admin-email');
    const avatarEl = document.querySelector('.admin-avatar');

    if (nameEl)   nameEl.textContent   = user.fullName || 'Admin';
    if (emailEl)  emailEl.textContent  = user.email    || 'admin@sports.com';
    if (avatarEl) avatarEl.textContent = getInitials(user.fullName || 'A');
}

function wireLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearSession();
        window.location.href = getLoginPath();
    });
}

function getInitials(fullName) {
    return String(fullName || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'A';
}

function formatCurrency(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return String(value ?? '-');
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
}
