// client.js — Catálogo de productos, perfil y carrito (client_index.html)
// GET /api/auth/me  |  GET /api/categories  |  GET /api/products
// POST/DELETE /api/products/{id}/favorite  |  PUT /api/me

let currentPage       = 0;
let currentCategory   = null;
let currentQuery      = '';
let currentMaxPrice   = null;
let totalPages        = 1;
let favoritosIds      = new Set();

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial,Helvetica,sans-serif" font-size="20">Imagen no disponible</text>
  </svg>
`);

if (!isLoggedIn()) { window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', async () => {

    await cargarPerfil();

    try {
        const favs = await apiGet('/api/me/favorites');
        favoritosIds = new Set((favs || []).map(f => f.id));
    } catch (_) {}

    await cargarCategorias();
    await cargarProductos();

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentQuery = searchInput.value.trim();
            currentPage  = 0;
            cargarProductos();
        }, 400));
    }

    const priceSlider = document.getElementById('priceRange');
    if (priceSlider) {
        priceSlider.addEventListener('input', debounce(() => {
            const val = parseInt(priceSlider.value);
            currentMaxPrice = val < parseInt(priceSlider.max) ? val * 1000 : null;
            currentPage     = 0;
            const maxLabel = priceSlider.parentElement.querySelector('.price-max');
            if (maxLabel) maxLabel.textContent = `COP ${val}.000`;
            cargarProductos();
        }, 400));
    }

    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentQuery    = '';
            currentCategory = null;
            currentMaxPrice = null;
            currentPage     = 0;
            if (priceSlider) priceSlider.value = priceSlider.max;
            if (searchInput) searchInput.value = '';
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            const todos = document.querySelector('.cat-btn[data-id=""]');
            if (todos) todos.classList.add('active');
            cargarProductos();
        });
    }

    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => { currentPage = 0; cargarProductos(); });
    }

    const cartBtn      = document.querySelector('.cart-btn');
    const closeCartBtn = document.getElementById('closeCart');
    const cartSidebar  = document.getElementById('cartSidebar');
    const cartOverlay  = document.getElementById('cartOverlay');

    const openCart  = () => { cartSidebar?.classList.add('open');    cartOverlay?.classList.add('active');    renderizarCarrito(); };
    const closeCart = () => { cartSidebar?.classList.remove('open'); cartOverlay?.classList.remove('active'); };

    cartBtn?.addEventListener('click', openCart);
    closeCartBtn?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);

    actualizarIndicadorCarrito();

    const userProfileBtn  = document.querySelector('.user-profile');
    const profileSidebar  = document.getElementById('profileSidebar');
    const profileOverlay  = document.getElementById('profileOverlay');
    const closeProfileBtn = document.getElementById('closeProfile');

    const openProfile  = () => { profileSidebar?.classList.add('open');   profileOverlay?.classList.add('active');   };
    const closeProfile = () => { profileSidebar?.classList.remove('open'); profileOverlay?.classList.remove('active'); };

    userProfileBtn?.addEventListener('click', openProfile);
    closeProfileBtn?.addEventListener('click', () => { closeProfile(); setTimeout(salirModoEdicion, 300); });
    profileOverlay?.addEventListener('click',  () => { closeProfile(); setTimeout(salirModoEdicion, 300); });

    const editProfileBtn       = document.getElementById('editProfileBtn');
    const cancelSidebarEditBtn = document.getElementById('cancelSidebarEditBtn');
    const sidebarEditForm      = document.getElementById('sidebarEditForm');
    const profileSidebarEl     = document.getElementById('profileSidebar');

    function entrarModoEdicion(e) { if (e) e.preventDefault(); profileSidebarEl?.classList.add('editing'); }
    function salirModoEdicion(e)  { if (e) e.preventDefault(); profileSidebarEl?.classList.remove('editing'); }

    editProfileBtn?.addEventListener('click', entrarModoEdicion);
    cancelSidebarEditBtn?.addEventListener('click', salirModoEdicion);

    if (sidebarEditForm) {
        sidebarEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs     = sidebarEditForm.querySelectorAll('input');
            const fullName   = inputs[0]?.value.trim();
            const phone      = inputs[2]?.value.trim();
            const idDocument = document.getElementById('editIdDocument')?.value.trim();
            try {
                // PUT /api/me
                const updated = await apiPut('/api/me', { fullName, phone, idDocument });
                setUser({ ...getUser(), fullName: updated.fullName, phone: updated.phone, idDocument: updated.idDocument });
                actualizarUIperfil(updated);
                salirModoEdicion();
            } catch (err) {
                alert(err.message || 'No se pudo actualizar el perfil.');
            }
        });
    }
});

async function cargarPerfil() {
    try {
        // GET /api/auth/me
        const user = await apiGet('/api/auth/me');
        setUser(user);
        actualizarUIperfil(user);
    } catch (err) {
        console.error('Error cargando perfil:', err);
    }
}

function actualizarUIperfil(user) {
    const iniciales = (user.fullName || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();

    const navAvatar = document.querySelector('.user-actions .avatar');
    const navName   = document.querySelector('.user-actions .user-name');
    if (navAvatar) navAvatar.textContent = iniciales;
    if (navName)   navName.textContent   = (user.fullName || '').split(' ')[0];

    const sidebarAvatar = document.querySelector('.avatar-circle');
    const sidebarName   = document.querySelector('.profile-name-info h3');
    const sidebarEmail  = document.querySelector('.profile-name-info p');
    const displayPhone  = document.getElementById('displayPhone');
    const displayDoc    = document.getElementById('displayDocument');

    if (sidebarAvatar) sidebarAvatar.textContent = iniciales;
    if (sidebarName)   sidebarName.textContent   = user.fullName   || '—';
    if (sidebarEmail)  sidebarEmail.textContent  = user.email      || '—';
    if (displayPhone)  displayPhone.textContent  = user.phone      || '—';
    if (displayDoc)    displayDoc.textContent    = user.idDocument || '—';

    const inputs = document.querySelectorAll('#sidebarEditForm input');
    if (inputs[0]) inputs[0].value = user.fullName    || '';
    if (inputs[1]) inputs[1].value = user.email       || '';
    if (inputs[2]) inputs[2].value = user.phone       || '';
    const docInput = document.getElementById('editIdDocument');
    if (docInput)  docInput.value  = user.idDocument  || '';
}

async function cargarCategorias() {
    try {
        // GET /api/categories
        const cats = await apiGet('/api/categories');
        renderizarCategorias(cats);
    } catch (err) {
        console.error('Error cargando categorías:', err);
    }
}

function renderizarCategorias(cats) {
    const seccion = document.querySelector('.filter-section');
    if (!seccion) return;

    seccion.innerHTML = `
        <h3>CATEGORÍAS</h3>
        <div class="cat-filter-list">
            <button class="cat-btn active" data-id="">Todos</button>
            ${cats.map(c => `<button class="cat-btn" data-id="${c.id}">${c.name}</button>`).join('')}
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .cat-filter-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
        .cat-btn { background:none; border:1px solid #e2e8f0; border-radius:8px; padding:7px 12px;
                   text-align:left; cursor:pointer; font-size:13px; color:#475569; transition:.15s; }
        .cat-btn:hover, .cat-btn.active { background:#f3e8ff; border-color:#df2be4; color:#df2be4; font-weight:600; }
    `;
    document.head.appendChild(style);

    seccion.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            seccion.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.id || null;
            currentPage     = 0;
            cargarProductos();
        });
    });
}

async function cargarProductos() {
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    if (currentQuery)    params.set('q', currentQuery);
    if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);
    params.set('page', currentPage);
    params.set('size', 9);

    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        const val = sortSelect.value;
        if (val === 'Precio: menor a mayor') params.set('sort', 'pricePerDay,asc');
        else if (val === 'Precio: mayor a menor') params.set('sort', 'pricePerDay,desc');
        else params.set('sort', 'name,asc');
    }

    const grid = document.querySelector('.product-grid');
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px">Cargando productos...</p>';

    try {
        // GET /api/products?category=&q=&maxPrice=&page=&size=&sort=
        const data = await apiGet(`/api/products?${params.toString()}`);
        totalPages = data.totalPages;
        renderizarProductos(data.content);
        actualizarContadorProductos(data.totalElements);
        renderizarPaginacion(data);
    } catch (err) {
        if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:40px">Error al cargar productos. Verifica que el backend esté corriendo.</p>';
        console.error('Error cargando productos:', err);
    }
}

function renderizarProductos(productos) {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    if (!productos.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px">No se encontraron productos.</p>';
        return;
    }

    grid.innerHTML = productos.map(p => {
        // Resolución de imagen: externa (http), upload backend (/files/), o asset local
        let imgSrc;
        if (!p.mainImageUrl)                        imgSrc = PLACEHOLDER_IMG;
        else if (p.mainImageUrl.startsWith('http')) imgSrc = p.mainImageUrl;
        else if (p.mainImageUrl.startsWith('/files/')) imgSrc = `${API_BASE}${p.mainImageUrl}`;
        else                                        imgSrc = `../../${p.mainImageUrl.replace(/^\//, '')}`;

        const estrellas = '★'.repeat(p.stars) + '☆'.repeat(5 - p.stars);
        const isFav     = favoritosIds.has(p.id);

        return `
        <div class="product-card">
            <div class="card-image-wrapper">
                 <img src="${imgSrc}" alt="${p.name}" class="product-image"
                      onerror="this.src='${PLACEHOLDER_IMG}'">
                <button class="favorite-btn ${isFav ? 'fav-active' : ''}"
                        data-product-id="${p.id}" data-is-fav="${isFav}" title="Favorito">
                    <svg viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                </button>
            </div>
            <div class="card-body">
                <span class="category-tag">${p.categoryName}</span>
                <h3 class="product-title">${p.name}</h3>
                <div class="product-rating">
                    <span class="stars">${estrellas}</span>
                    <span class="rating-value">${p.favoriteCount} favoritos</span>
                </div>
                <div class="product-footer">
                    <div class="price">
                        <strong>COP ${p.pricePerDay.toLocaleString('es-CO')}</strong>
                        <span>/día</span>
                    </div>
                    <a href="alquilar_producto.html?id=${p.id}" class="btn-rent" style="text-decoration:none;">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                        </svg>
                        Alquilar
                    </a>
                </div>
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', toggleFavorito);
    });
}

async function toggleFavorito(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn       = e.currentTarget;
    const productId = btn.dataset.productId;
    const isFav     = btn.dataset.isFav === 'true';

    // Actualización optimista — la clase fav-active controla el relleno vía CSS
    btn.dataset.isFav = String(!isFav);
    btn.classList.toggle('fav-active', !isFav);

    try {
        if (isFav) {
            // DELETE /api/products/{id}/favorite
            await apiDelete(`/api/products/${productId}/favorite`);
            favoritosIds.delete(Number(productId));
        } else {
            // POST /api/products/{id}/favorite
            await apiPost(`/api/products/${productId}/favorite`);
            favoritosIds.add(Number(productId));
        }
    } catch (err) {
        // Revertir en caso de error
        btn.dataset.isFav = String(isFav);
        btn.classList.toggle('fav-active', isFav);
        if (err.status === 401) alert('Debes iniciar sesión para guardar favoritos.');
        else console.error('Error favorito:', err);
    }
}

function actualizarContadorProductos(total) {
    const contador = document.querySelector('.products-count strong');
    if (contador) contador.textContent = total;
    const pill = document.querySelector('.availability-pill strong');
    if (pill) pill.textContent = total;
}

function renderizarPaginacion(data) {
    let paginacion = document.querySelector('.pagination-container');
    if (!paginacion) {
        paginacion = document.createElement('div');
        paginacion.className = 'pagination-container';
        paginacion.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:12px;padding:20px 0;';
        document.querySelector('.products-area')?.appendChild(paginacion);
    }

    if (data.totalPages <= 1) { paginacion.innerHTML = ''; return; }

    paginacion.innerHTML = `
        <button onclick="cambiarPagina(${data.number - 1})"
                style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;background:#fff;"
                ${data.number === 0 ? 'disabled style="opacity:.4;cursor:not-allowed;"' : ''}>
            ◀ Anterior
        </button>
        <span style="font-size:14px;color:#64748b;">Página ${data.number + 1} de ${data.totalPages}</span>
        <button onclick="cambiarPagina(${data.number + 1})"
                style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;background:#fff;"
                ${data.number >= data.totalPages - 1 ? 'disabled style="opacity:.4;cursor:not-allowed;"' : ''}>
            Siguiente ▶
        </button>
    `;
}

function cambiarPagina(page) {
    if (page < 0 || page >= totalPages) return;
    currentPage = page;
    cargarProductos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarIndicadorCarrito() {
    const count     = cartCount();
    const indicator = document.getElementById('cartIndicator');
    const headerCount = document.getElementById('cartCount');
    if (indicator) { indicator.textContent = count; indicator.style.display = count > 0 ? 'flex' : 'none'; }
    if (headerCount) headerCount.textContent = count;
}

function renderizarCarrito() {
    actualizarIndicadorCarrito();

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
            cartFooter.innerHTML = `<a href="client_index.html" class="btn-checkout" style="text-align:center;text-decoration:none;">Ver catálogo</a>`;
        }
        return;
    }

    const fmtDate  = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short' });
    const fmtPrice = n => n.toLocaleString('es-CO');

    cartBody.innerHTML = cart.map(item => {
        const total  = item.pricePerDay * item.days * (item.quantity || 1);
        // Resolución de imagen: externa (http), upload backend (/files/), o asset local
        const imgSrc = !item.imageUrl ? PLACEHOLDER_IMG
            : item.imageUrl.startsWith('http')    ? item.imageUrl
            : item.imageUrl.startsWith('/files/') ? `${API_BASE}${item.imageUrl}`
            : `../../${item.imageUrl.replace(/^\//, '')}`;

        return `
        <div class="cart-item" data-product-id="${item.productId}">
            <img src="${imgSrc}" alt="${item.productName}" class="cart-item-img"
                 onerror="this.src='${PLACEHOLDER_IMG}'">
            <div class="cart-item-info">
                <h4>${item.productName}</h4>
                <span class="category-pill">${item.categoryName || ''}</span>
                <p class="rent-dates">
                    <span class="date-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"/>
                        </svg>
                    </span>
                    ${fmtDate(item.startDate)} → ${fmtDate(item.endDate)} &middot; ${item.days} día${item.days > 1 ? 's' : ''}
                </p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                    <div class="cart-item-price">COP ${fmtPrice(total)}</div>
                    <button class="remove-cart-btn" data-product-id="${item.productId}"
                            style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:12px;padding:2px 6px;border-radius:4px;transition:.15s;" title="Eliminar">
                        ✕ Quitar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    cartBody.querySelectorAll('.remove-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => { removeFromCart(btn.dataset.productId); renderizarCarrito(); });
    });

    const totalGeneral = cart.reduce((acc, item) => acc + item.pricePerDay * item.days * (item.quantity || 1), 0);

    if (cartFooter) {
        cartFooter.innerHTML = `
            <div class="cart-summary-line"><span>Subtotal alquiler</span><span>COP ${fmtPrice(totalGeneral)}</span></div>
            <div class="cart-summary-line"><span>Seguro incluido</span><span style="color:#22c55e;font-weight:600;">Gratis</span></div>
            <div class="cart-total"><span>Total estimado</span><span>COP ${fmtPrice(totalGeneral)}</span></div>
            <a href="checkout.html" class="btn-checkout" style="text-decoration:none;">Proceder al pago &rarr;</a>
            <button class="btn-continue" id="continueShopping">Seguir comprando</button>`;

        // Se regenera con innerHTML, por eso se enlaza de nuevo aquí
        document.getElementById('continueShopping')?.addEventListener('click', closeCartFn);
    }
}

function closeCartFn() {
    document.getElementById('cartSidebar')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('active');
}

function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
