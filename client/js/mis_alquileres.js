// ═══════════════════════════════════════════════════════════════
//  mis_alquileres.js  (mis_alquileres.html)
// ═══════════════════════════════════════════════════════════════

// Protección de ruta
if (!isLoggedIn()) { window.location.href = 'index.html'; }

// Mapas de estilos por estado
const ESTADO_CLASE = {
    PENDIENTE:  { border: '#f59e0b', badge: 'badge-orange', badgeStyle: 'background:rgba(245,158,11,.12);color:#b45309;', label: 'Pendiente',  icono: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
    ACTIVO:     { border: '#22c55e', badge: 'badge-green',  badgeStyle: 'background:rgba(34,197,94,.12);color:#15803d;',  label: 'Activo',     icono: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' },
    FINALIZADO: { border: '#3b82f6', badge: 'badge-blue',   badgeStyle: 'background:rgba(59,130,246,.12);color:#1d4ed8;', label: 'Completado', icono: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' },
    CANCELADO:  { border: '#ef4444', badge: 'badge-red',    badgeStyle: 'background:rgba(239,68,68,.12);color:#dc2626;',  label: 'Cancelado',  icono: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' },
    VENCIDO:    { border: '#dc2626', badge: 'badge-red',    badgeStyle: 'background:rgba(220,38,38,.12);color:#991b1b;',  label: 'Vencido',   icono: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' },
};

// Mapeo de filtros de tab a estados del backend
const TAB_ESTADOS = {
    todos:       null,
    activos:     ['ACTIVO'],
    pendientes:  ['PENDIENTE'],
    completados: ['FINALIZADO'],
    cancelados:  ['CANCELADO', 'VENCIDO'],
};

let todosLosAlquileres = [];

// Placeholder SVG (data URI) para evitar imágenes "quemadas" desde archivos estáticos
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial,Helvetica,sans-serif" font-size="20">Imagen no disponible</text>
  </svg>
`);

document.addEventListener('DOMContentLoaded', async () => {

    await cargarPerfil();
    await cargarAlquileres();

    // ── Tabs de filtrado ─────────────────────────────────────────
    document.querySelectorAll('.r-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.r-tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtrarYRenderizar(tab.dataset.filter);
        });
    });

    // ── Sidebar profile ──────────────────────────────────────────
    const userProfileBtn  = document.querySelector('.user-profile');
    const profileSidebar  = document.getElementById('profileSidebar');
    const profileOverlay  = document.getElementById('profileOverlay');
    const closeProfileBtn = document.getElementById('closeProfile');
    const editProfileBtn  = document.getElementById('editProfileBtn');
    const cancelBtn       = document.getElementById('cancelSidebarEditBtn');
    const profileSidebarEl = document.getElementById('profileSidebar');

    const openProfile  = () => { profileSidebar?.classList.add('open');   profileOverlay?.classList.add('active'); };
    const closeProfile = () => { profileSidebar?.classList.remove('open'); profileOverlay?.classList.remove('active'); };
    const exitEdit     = (e) => { if(e) e.preventDefault(); profileSidebarEl?.classList.remove('editing'); };

    userProfileBtn?.addEventListener('click', openProfile);
    closeProfileBtn?.addEventListener('click', () => { closeProfile(); setTimeout(exitEdit, 300); });
    profileOverlay?.addEventListener('click',  () => { closeProfile(); setTimeout(exitEdit, 300); });
    editProfileBtn?.addEventListener('click',  (e) => { e.preventDefault(); profileSidebarEl?.classList.add('editing'); });
    cancelBtn?.addEventListener('click', exitEdit);

    // ── Cart sidebar ─────────────────────────────────────────────
    const cartBtn      = document.querySelector('.cart-btn');
    const closeCartBtn = document.getElementById('closeCart');
    const cartSidebar  = document.getElementById('cartSidebar');
    const cartOverlay  = document.getElementById('cartOverlay');

    const openCartSidebar  = () => { cartSidebar?.classList.add('open');    cartOverlay?.classList.add('active');    renderizarCarritoLateral(); };
    const closeCartSidebar = () => { cartSidebar?.classList.remove('open'); cartOverlay?.classList.remove('active'); };

    cartBtn?.addEventListener('click', openCartSidebar);
    closeCartBtn?.addEventListener('click', closeCartSidebar);
    cartOverlay?.addEventListener('click',  closeCartSidebar);

    // Actualizar indicador al cargar
    actualizarIndicadorLateral();
});

async function cargarPerfil() {
    try {
        const user = await apiGet('/api/auth/me');
        setUser(user);
        const iniciales = (user.fullName || '??').split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase();
        const navAvatar = document.querySelector('.user-actions .avatar');
        const navName   = document.querySelector('.user-actions .user-name');
        const sideAvatar = document.querySelector('.avatar-circle');
        const sideName   = document.querySelector('.profile-name-info h3');
        const sideEmail  = document.querySelector('.profile-name-info p');
        if (navAvatar)  navAvatar.textContent  = iniciales;
        if (navName)    navName.textContent    = (user.fullName||'').split(' ')[0];
        if (sideAvatar) sideAvatar.textContent = iniciales;
        if (sideName)   sideName.textContent   = user.fullName || '—';
        if (sideEmail)  sideEmail.textContent  = user.email    || '—';
    } catch (err) { console.error('Perfil:', err); }
}

async function cargarAlquileres() {
    try {
        // GET /api/rentals/mine
        todosLosAlquileres = await apiGet('/api/rentals/mine');
        actualizarStats(todosLosAlquileres);
        actualizarContadoresTabs(todosLosAlquileres);
        filtrarYRenderizar('todos');
    } catch (err) {
        const lista = document.querySelector('.rentals-list');
        if (lista) lista.innerHTML = `<p style="padding:30px;text-align:center;color:#ef4444;">
            Error al cargar alquileres: ${err.message || 'Verifica la conexión con el backend.'}
        </p>`;
        console.error('Alquileres:', err);
    }
}

function actualizarStats(alquileres) {
    const total      = alquileres.length;
    const activos    = alquileres.filter(a => a.status === 'ACTIVO').length;
    const finalizados = alquileres.filter(a => a.status === 'FINALIZADO').length;
    const gastado    = alquileres
        .filter(a => a.status !== 'CANCELADO')
        .reduce((s, a) => s + (a.total || 0), 0);

    const statVals = document.querySelectorAll('.r-stat-value');
    if (statVals[0]) statVals[0].textContent = total;
    if (statVals[1]) statVals[1].textContent = activos;
    if (statVals[2]) statVals[2].textContent = finalizados;
    if (statVals[3]) statVals[3].textContent = `COP ${gastado.toLocaleString('es-CO')}`;
}

function actualizarContadoresTabs(alquileres) {
    const conteos = {
        todos:       alquileres.length,
        activos:     alquileres.filter(a => a.status === 'ACTIVO').length,
        pendientes:  alquileres.filter(a => a.status === 'PENDIENTE').length,
        completados: alquileres.filter(a => a.status === 'FINALIZADO').length,
        cancelados:  alquileres.filter(a => ['CANCELADO','VENCIDO'].includes(a.status)).length,
    };
    document.querySelectorAll('.r-tab-btn').forEach(tab => {
        const badge = tab.querySelector('.r-tab-badge');
        if (badge) badge.textContent = conteos[tab.dataset.filter] ?? 0;
    });
}

function filtrarYRenderizar(filtro) {
    const estados = TAB_ESTADOS[filtro];
    const filtrados = estados
        ? todosLosAlquileres.filter(a => estados.includes(a.status))
        : todosLosAlquileres;
    renderizarLista(filtrados);
}

function renderizarLista(alquileres) {
    const lista = document.querySelector('.rentals-list');
    if (!lista) return;

    if (!alquileres.length) {
        lista.innerHTML = '<p style="padding:40px;text-align:center;color:#94a3b8;">No hay alquileres en esta categoría.</p>';
        return;
    }

    const fmtDate = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    const dias    = (a) => Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / 86400000);

    lista.innerHTML = alquileres.map(a => {
        const cfg     = ESTADO_CLASE[a.status] || ESTADO_CLASE['PENDIENTE'];
        const d       = dias(a);
        const imgSrc  = a.mainImageUrl
            ? (a.mainImageUrl.startsWith('http') ? a.mainImageUrl : `../../${a.mainImageUrl.replace(/^\//,'')}`)
            : PLACEHOLDER_IMG;

        // Botones según estado
        let btns = `<a href="detalle_alquiler.html?id=${a.id}" class="r-btn outline" style="text-decoration:none;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg> Detalles
                    </a>`;

        if (['ACTIVO','PENDIENTE'].includes(a.status)) {
            btns += `<a href="extender_alquiler.html?id=${a.id}" class="r-btn purple-outline" style="text-decoration:none;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg> Extensión
                     </a>`;
        }

        if (a.status === 'PENDIENTE') {
            btns += `<button class="r-btn outline btn-cancelar" data-id="${a.id}"
                             style="color:#ef4444;border-color:#ef4444;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg> Cancelar
                     </button>`;
        }

        return `
        <div class="r-ticket-item" style="border-left:6px solid ${cfg.border}; display:flex;">
            <div class="r-ticket-img-container">
                <img src="${imgSrc}" alt="${a.productName || 'Producto'}"
                     onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="r-ticket-main">
                <div class="r-ticket-status ${cfg.badge}" style="${cfg.badgeStyle}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        ${cfg.icono}
                    </svg> ${cfg.label}
                </div>
                <div class="r-ticket-title">${a.productName || 'Alquiler'}</div>
                <div class="r-ticket-cat">${a.categoryName || ''}</div>
                <div class="r-ticket-dates">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${fmtDate(a.startDate)} → ${fmtDate(a.endDate)}
                    <span class="r-days-badge badge-purple">${d} día${d>1?'s':''}</span>
                </div>
            </div>
            <div class="r-ticket-actions">
                <div class="r-ticket-ref">${a.code}</div>
                <div class="r-ticket-price-box">
                    TOTAL<br>
                    <span class="r-t-price">COP ${(a.total||0).toLocaleString('es-CO')}</span>
                </div>
                <div class="r-ticket-btns">${btns}</div>
            </div>
        </div>`;
    }).join('');

    // Registrar eventos de cancelar
    lista.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Cancelar este alquiler?')) return;
            try {
                // POST /api/rentals/{id}/cancel
                await apiPost(`/api/rentals/${btn.dataset.id}/cancel`);
                await cargarAlquileres();
            } catch (err) {
                alert(err.message || 'No se pudo cancelar.');
            }
        });
    });
}

// ── Carrito lateral ──────────────────────────────────────────────

function actualizarIndicadorLateral() {
    const count = cartCount();
    const ind   = document.getElementById('cartIndicator');
    const cnt   = document.getElementById('cartCount');
    if (ind) { ind.textContent = count; ind.style.display = count > 0 ? 'flex' : 'none'; }
    if (cnt) cnt.textContent = count;
}

function renderizarCarritoLateral() {
    actualizarIndicadorLateral();

    const cart       = getCart();
    const cartBody   = document.querySelector('.cart-body');
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartBody) return;

    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div style="text-align:center;padding:48px 20px;color:#94a3b8;">
                <svg width="52" height="52" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     style="margin-bottom:14px;opacity:.4;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17
                             m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p style="font-size:15px;font-weight:500;color:#64748b;margin:0;">Tu carrito está vacío</p>
                <p style="font-size:13px;margin-top:6px;">Agrega productos desde el catálogo</p>
            </div>`;
        if (cartFooter) {
            cartFooter.innerHTML = `
                <a href="client_index.html" class="btn-checkout"
                   style="text-align:center;text-decoration:none;">Ver catálogo</a>`;
        }
        return;
    }

    const fmtDate  = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short' });
    const fmtPrice = n => n.toLocaleString('es-CO');

    cartBody.innerHTML = cart.map(item => {
        const total  = item.pricePerDay * item.days * (item.quantity || 1);
        const imgSrc = item.imageUrl
            ? (item.imageUrl.startsWith('http') ? item.imageUrl : `../../${item.imageUrl.replace(/^\//, '')}`)
            : PLACEHOLDER_IMG;
        return `
        <div class="cart-item" data-product-id="${item.productId}">
            <img src="${imgSrc}" alt="${item.productName}" class="cart-item-img"
                 onerror="this.src='${PLACEHOLDER_IMG}'">
            <div class="cart-item-info">
                <h4>${item.productName}</h4>
                <span class="category-pill">${item.categoryName || ''}</span>
                <p class="rent-dates">
                    <span class="date-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"/>
                    </svg></span>
                    ${fmtDate(item.startDate)} → ${fmtDate(item.endDate)} &middot; ${item.days} día${item.days > 1 ? 's' : ''}
                </p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                    <div class="cart-item-price">COP ${fmtPrice(total)}</div>
                    <button class="remove-cart-btn" data-product-id="${item.productId}"
                            style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:12px;padding:2px 6px;">
                        ✕ Quitar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    cartBody.querySelectorAll('.remove-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.productId);
            renderizarCarritoLateral();
        });
    });

    const totalGeneral = cart.reduce((acc, item) => acc + item.pricePerDay * item.days * (item.quantity || 1), 0);

    if (cartFooter) {
        cartFooter.innerHTML = `
            <div class="cart-summary-line"><span>Subtotal</span><span>COP ${fmtPrice(totalGeneral)}</span></div>
            <div class="cart-summary-line"><span>Seguro incluido</span><span style="color:#22c55e;font-weight:600;">Gratis</span></div>
            <div class="cart-total"><span>Total estimado</span><span>COP ${fmtPrice(totalGeneral)}</span></div>
            <a href="checkout.html" class="btn-checkout" style="text-decoration:none;">Proceder al pago &rarr;</a>
            <button class="btn-continue" id="continueShopping">Seguir comprando</button>`;

        document.getElementById('continueShopping')?.addEventListener('click', () => {
            document.getElementById('cartSidebar')?.classList.remove('open');
            document.getElementById('cartOverlay')?.classList.remove('active');
        });
    }
}
