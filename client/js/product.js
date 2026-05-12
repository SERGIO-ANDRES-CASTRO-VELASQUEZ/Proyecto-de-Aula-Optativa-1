// ═══════════════════════════════════════════════════════════════
//  product.js — Detalle de producto  (alquilar_producto.html)
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

    const params    = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        window.location.href = 'client_index.html';
        return;
    }

    try {
        // GET /api/products/{id}
        const p = await apiGet(`/api/products/${productId}`);
        renderizarProducto(p);
        configurarFavorito(p);
        configurarCalendario(p);
    } catch (err) {
        alert('Producto no encontrado o error de conexión.');
        window.location.href = 'client_index.html';
    }
});

// Placeholder SVG (data URI) para evitar imágenes "quemadas" desde archivos estáticos
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial,Helvetica,sans-serif" font-size="20">Imagen no disponible</text>
  </svg>
`);

// ── Renderiza todos los datos del producto ───────────────────────
function renderizarProducto(p) {

    // Imagen principal
    const imgEl = document.querySelector('.main-image img');
    if (imgEl) {
        if (p.images && p.images.length > 0) {
            const url = p.images[0].url;
            imgEl.src = url.startsWith('http')    ? url
                      : url.startsWith('/files/') ? `${API_BASE}${url}`
                      : `../../${url.replace(/^\//, '')}`;
            imgEl.alt = p.name;
        } else {
            imgEl.src = PLACEHOLDER_IMG;
            imgEl.alt = p.name || 'Producto';
        }
    }

    // Thumbnails
    const thumbsEl = document.querySelector('.thumbnails');
    if (thumbsEl && p.images) {
        thumbsEl.innerHTML = p.images.map((img, i) => {
            const url = img.url.startsWith('http')    ? img.url
                      : img.url.startsWith('/files/') ? `${API_BASE}${img.url}`
                      : `../../${img.url.replace(/^\//, '')}`;
            return `<img src="${url}" alt="Thumb ${i+1}" class="thumb ${i===0?'active':''}"
                         onclick="document.querySelector('.main-image img').src=this.src">`;
        }).join('');
    }

    // Nombre del producto
    const titleEl = document.querySelector('.product-title');
    if (titleEl) titleEl.textContent = p.name;

    // Precio
    const priceEl = document.querySelector('.product-price strong');
    if (priceEl) priceEl.textContent = `COP ${p.pricePerDay.toLocaleString('es-CO')}`;

    // Categoría
    const catEl = document.querySelector('.category-pill');
    if (catEl) catEl.textContent = p.categoryName;

    // Descripción
    const descEl = document.querySelector('.desc-text');
    if (descEl) descEl.textContent = p.description;

    // Especificaciones
    const specsEl = document.querySelector('.specs-table');
    if (specsEl && p.specs) {
        specsEl.innerHTML = p.specs.map(s => `
            <div class="spec-row">
                <span class="spec-key">${s.key}</span>
                <span class="spec-val">${s.value}</span>
            </div>
        `).join('');
    }

    // Stock disponible
    const stockBadge = document.querySelector('.badge-tag');
    if (stockBadge) stockBadge.textContent = `${p.stock} disponibles`;
}

// ── Botón favorito ───────────────────────────────────────────────
function configurarFavorito(producto) {
    // Agregar botón favorito al header de info si no existe
    const metaInfo = document.querySelector('.meta-info');
    if (!metaInfo) return;

    // Quitar favorito existente si hay
    metaInfo.querySelector('.fav-detalle-btn')?.remove();

    const isFav = producto.isFavorite || false;
    const btnFav = document.createElement('button');
    btnFav.className   = 'fav-detalle-btn';
    btnFav.dataset.fav = String(isFav);
    btnFav.title       = 'Marcar favorito';
    btnFav.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;';
    btnFav.innerHTML   = `
        <svg width="22" height="22" viewBox="0 0 24 24"
             fill="${isFav ? '#ef4444' : 'none'}"
             stroke="${isFav ? '#ef4444' : '#94a3b8'}"
             stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682
                     a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318
                     a4.5 4.5 0 00-6.364 0z"/>
        </svg>`;
    metaInfo.appendChild(btnFav);

    btnFav.addEventListener('click', async () => {
        const actFav = btnFav.dataset.fav === 'true';
        const svg    = btnFav.querySelector('svg');
        try {
            if (actFav) {
                await apiDelete(`/api/products/${producto.id}/favorite`);
            } else {
                await apiPost(`/api/products/${producto.id}/favorite`);
            }
            btnFav.dataset.fav = String(!actFav);
            svg.setAttribute('fill',   !actFav ? '#ef4444' : 'none');
            svg.setAttribute('stroke', !actFav ? '#ef4444' : '#94a3b8');
        } catch (err) {
            if (err.status === 401) alert('Inicia sesión para guardar favoritos.');
            else console.error(err);
        }
    });
}

// ── Calendario y resumen de alquiler ─────────────────────────────
function configurarCalendario(producto) {
    // Reemplazar el widget de calendario estático con inputs de fecha reales
    const calendarWidget = document.querySelector('.calendar-widget');
    if (!calendarWidget) return;

    const hoy       = new Date().toISOString().split('T')[0];
    const manana    = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    calendarWidget.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:140px;">
                <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">
                    FECHA INICIO
                </label>
                <input type="date" id="startDate" min="${hoy}" value="${hoy}"
                       style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
            </div>
            <div style="flex:1;min-width:140px;">
                <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">
                    FECHA DEVOLUCIÓN
                </label>
                <input type="date" id="endDate" min="${manana}" value="${manana}"
                       style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
            </div>
        </div>
        <div id="calFooterNote" style="margin-top:10px;font-size:13px;color:#64748b;">
            1 día seleccionado
        </div>
    `;

    const startInput = document.getElementById('startDate');
    const endInput   = document.getElementById('endDate');
    const footerNote = document.getElementById('calFooterNote');

    function actualizarResumen() {
        const start = new Date(startInput.value);
        const end   = new Date(endInput.value);

        // Asegurar endDate > startDate
        if (end <= start) {
            const nextDay = new Date(start.getTime() + 86400000);
            endInput.value = nextDay.toISOString().split('T')[0];
        }
        endInput.min = new Date(start.getTime() + 86400000).toISOString().split('T')[0];

        const dias    = Math.max(1, Math.ceil((new Date(endInput.value) - start) / 86400000));
        const total   = dias * producto.pricePerDay;
        const fmtDate = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });

        if (footerNote) footerNote.textContent = `${dias} día${dias>1?'s':''} · ${fmtDate(startInput.value)} → ${fmtDate(endInput.value)}`;

        // Actualizar resumen de precio
        actualizarResumenPrecio(dias, total, producto.pricePerDay);
    }

    startInput.addEventListener('change', actualizarResumen);
    endInput.addEventListener('change',   actualizarResumen);
    actualizarResumen();

    // Botón "Añadir al carrito"
    const btnConfirm = document.querySelector('.btn-confirm-rent');
    if (btnConfirm) {
        btnConfirm.removeAttribute('href');
        btnConfirm.style.cursor = 'pointer';

        btnConfirm.addEventListener('click', () => {
            const start  = startInput.value;
            const end    = endInput.value;
            const dias   = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
            const imgUrl = producto.images?.[0]?.url || '';

            // Agregar al carrito multi-item en localStorage
            addToCart({
                productId:    producto.id,
                productName:  producto.name,
                pricePerDay:  producto.pricePerDay,
                categoryName: producto.categoryName,
                startDate:    start,
                endDate:      end,
                days:         dias,
                quantity:     1,
                imageUrl:     imgUrl
            });

            // Feedback visual
            const original = btnConfirm.textContent;
            btnConfirm.textContent = '✓ Añadido al carrito';
            btnConfirm.style.background = '#22c55e';

            // Mostrar opciones post-añadir
            mostrarOpcionesCarrito(btnConfirm);

            setTimeout(() => {
                btnConfirm.textContent = original;
                btnConfirm.style.background = '';
            }, 2500);
        });
    }
}

function mostrarOpcionesCarrito(btnRef) {
    // Evitar duplicados
    if (document.getElementById('cartActionBtns')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'cartActionBtns';
    wrapper.style.cssText = 'display:flex;gap:10px;margin-top:10px;';

    const btnIr = document.createElement('a');
    btnIr.href = 'checkout.html';
    btnIr.textContent = 'Ir al checkout →';
    btnIr.style.cssText = [
        'flex:1','text-align:center','padding:10px 16px',
        'background:#df2be4','color:#fff','border-radius:10px',
        'text-decoration:none','font-size:14px','font-weight:600'
    ].join(';');

    const btnSeguir = document.createElement('button');
    btnSeguir.textContent = 'Seguir comprando';
    btnSeguir.style.cssText = [
        'flex:1','padding:10px 16px','background:#f1f5f9',
        'border:1px solid #e2e8f0','border-radius:10px',
        'cursor:pointer','font-size:14px','color:#475569'
    ].join(';');
    btnSeguir.addEventListener('click', () => {
        window.location.href = 'client_index.html';
    });

    wrapper.appendChild(btnIr);
    wrapper.appendChild(btnSeguir);
    btnRef.parentElement.appendChild(wrapper);
}

function actualizarResumenPrecio(dias, total, precio) {
    const summaryList = document.querySelector('.summary-list');
    if (!summaryList) return;

    summaryList.innerHTML = `
        <li>
            <span>COP ${precio.toLocaleString('es-CO')} × ${dias} día${dias>1?'s':''}</span>
            <span>COP ${total.toLocaleString('es-CO')}</span>
        </li>
        <li>
            <span>Depósito reembolsable</span>
            <span>COP 0</span>
        </li>
        <li>
            <span>Seguro incluido</span>
            <span class="color-green">Gratis</span>
        </li>
        <li class="summary-total">
            <span>Total</span>
            <span class="color-purple">COP ${total.toLocaleString('es-CO')}</span>
        </li>
    `;
}
