// api.js — Capa de comunicación con el backend (http://localhost:8080)
// Provee: sesión (JWT en localStorage), fetch con auth, helpers HTTP, carrito

const API_BASE = 'http://localhost:8080';

const TOKEN_KEY = 'sportrent_token';
const USER_KEY  = 'sportrent_user';

function getToken()          { return localStorage.getItem(TOKEN_KEY); }
function setToken(token)     { localStorage.setItem(TOKEN_KEY, token); }
function getUser()           { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; }
function setUser(u)          { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function clearSession()      { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function isLoggedIn()        { return !!getToken(); }

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 204) return null;

    // Token expirado o inválido → limpiar sesión y redirigir al login
    if (response.status === 401) {
        clearSession();
        window.location.href = getLoginPath();
        return;
    }

    const data = await response.json();

    if (!response.ok) {
        const msg = data.message || data.error || 'Error desconocido';
        throw new ApiError(response.status, msg, data.fieldErrors || []);
    }

    return data;
}

class ApiError extends Error {
    constructor(status, message, fieldErrors = []) {
        super(message);
        this.status      = status;
        this.fieldErrors = fieldErrors; // [{ field, message }, ...]
    }
}

function getLoginPath() {
    // Desde admin/html/ la ruta relativa al login es diferente
    if (window.location.pathname.includes('/admin/')) {
        return '../../client/html/index.html';
    }
    return 'index.html';
}

function apiGet(path)         { return apiFetch(path, { method: 'GET' }); }
function apiPost(path, body)  { return apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }); }
function apiPut(path, body)   { return apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }); }
function apiDelete(path)      { return apiFetch(path, { method: 'DELETE' }); }

/** Sube un archivo como multipart/form-data (campo "file"). */
async function apiPostFile(path, file) {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
    });

    if (response.status === 204) return null;
    if (response.status === 401) {
        clearSession();
        window.location.href = getLoginPath();
        return;
    }

    const data = await response.json();
    if (!response.ok) {
        throw new ApiError(
            response.status,
            data.message || data.error || 'Error desconocido',
            data.fieldErrors || []
        );
    }
    return data;
}

// Carrito en localStorage — estructura de cada item:
// { productId, productName, pricePerDay, categoryName, startDate, endDate, days, quantity, imageUrl }

const CART_KEY = 'sportrent_cart';

function getCart()   { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function setCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
function clearCart() { localStorage.removeItem(CART_KEY); }

/** Agrega o reemplaza un item en el carrito (match por productId). */
function addToCart(item) {
    const cart = getCart();
    const idx  = cart.findIndex(i => i.productId === item.productId);
    if (idx >= 0) cart[idx] = item;
    else cart.push(item);
    setCart(cart);
}

/** Elimina un item del carrito por productId. */
function removeFromCart(productId) {
    setCart(getCart().filter(i => String(i.productId) !== String(productId)));
}

function cartCount() { return getCart().length; }
