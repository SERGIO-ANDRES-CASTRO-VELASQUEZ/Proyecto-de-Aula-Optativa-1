let clients = [];
let products = [];
let selectedItems = [];
let paymentMethod = 'EFECTIVO';
let selectedClientId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await Promise.all([loadClients(), loadProducts()]);
    wirePaymentChips();
    wireDateInputs();
    wireCreateButton();
    wireCatalogSearch();
    updateSummary();
});

// ── CLIENTES ──

async function loadClients() {
    try {
        const data = await apiGet('/api/admin/users?size=200');
        clients = (data?.content || []).filter(u => u.role === 'CLIENT');
        wireClientSelect();
    } catch (err) {
        console.error('Error loading clients:', err);
    }
}

function wireClientSelect() {
    const searchInput = document.getElementById('clienteSearch');
    const dropdown = document.getElementById('clienteDropdown');
    const field = document.getElementById('clienteField');
    if (!searchInput || !dropdown || !field) return;

    renderClientDropdown(clients);

    // Abrir al hacer foco
    searchInput.addEventListener('focus', () => openDropdown());

    // Filtrar al escribir
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        const filtered = term
            ? clients.filter(c =>
                String(c.fullName || '').toLowerCase().includes(term) ||
                String(c.email || '').toLowerCase().includes(term))
            : clients;
        renderClientDropdown(filtered);
        openDropdown();
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#clienteSelectWrapper')) closeDropdown();
    });
}

function renderClientDropdown(list) {
    const dropdown = document.getElementById('clienteDropdown');
    if (!dropdown) return;

    if (!list.length) {
        dropdown.innerHTML = '<div class="ss-empty">Sin resultados</div>';
        return;
    }

    dropdown.innerHTML = list.map(u => `
        <div class="ss-option ${selectedClientId === u.id ? 'selected' : ''}"
             data-id="${u.id}" data-name="${u.fullName || ''}" data-email="${u.email || ''}">
            <span class="ss-opt-name">${u.fullName || 'Sin nombre'}</span>
            <span class="ss-opt-email">${u.email || ''}</span>
        </div>
    `).join('');

    dropdown.querySelectorAll('.ss-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const id = Number(opt.getAttribute('data-id'));
            const name = opt.getAttribute('data-name');
            selectClient(id, name);
        });
    });
}

function selectClient(id, name) {
    selectedClientId = id;
    const searchInput = document.getElementById('clienteSearch');
    const hiddenInput = document.getElementById('clienteSelectedId');
    const field = document.getElementById('clienteField');
    if (searchInput) searchInput.value = name;
    if (hiddenInput) hiddenInput.value = String(id);
    if (field) field.classList.add('has-value');
    closeDropdown();
    updateSummary();
}

function openDropdown() {
    const dropdown = document.getElementById('clienteDropdown');
    if (dropdown) dropdown.classList.add('open');
}

function closeDropdown() {
    const dropdown = document.getElementById('clienteDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

async function loadProducts() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    grid.innerHTML = '<p style="grid-column:1/-1;color:#94a3b8;">Cargando catalogo...</p>';

    try {
        const data = await apiGet('/api/admin/products?size=200');
        products = data?.content || [];
        renderCatalog();
    } catch (err) {
        console.error('Error loading products:', err);
        grid.innerHTML = '<p style="grid-column:1/-1;color:#ef4444;">No se pudo cargar el catalogo.</p>';
    }
}

// ── CATÁLOGO ──

function wireCatalogSearch() {
    const input = document.getElementById('catalogSearch');
    if (!input) return;
    input.addEventListener('input', () => {
        const term = input.value.trim().toLowerCase();
        const filtered = term
            ? products.filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.categoryName || '').toLowerCase().includes(term))
            : products;
        renderCatalog(filtered);
    });
}

function renderCatalog(list = products) {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    if (!list.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;color:#94a3b8;">Sin productos disponibles</p>';
        return;
    }

    grid.innerHTML = list.map(p => {
        const raw = p.mainImageUrl;
        const img = !raw ? '../../img/icon.png'
                  : raw.startsWith('http')    ? raw
                  : raw.startsWith('/files/') ? `${API_BASE}${raw}`
                  : `../../${raw.replace(/^\//, '')}`;
        const selected = selectedItems.some(i => i.productId === p.id);
        return `
            <article class="item-card ${selected ? 'selected' : ''}" data-id="${p.id}">
                <img src="${img}" alt="${p.name}">
                <div class="item-info">
                    <h4 class="item-name">${p.name}</h4>
                    <div class="item-meta">
                        <span class="item-category">${p.categoryName || '-'}</span>
                        <strong class="item-price">${formatCurrency(p.pricePerDay)}/dia</strong>
                    </div>
                </div>
                <button type="button" class="item-btn">${selected ? 'Agregado' : 'Agregar al Ticket'}</button>
            </article>
        `;
    }).join('');

    grid.querySelectorAll('.item-card').forEach(card => {
        const btn = card.querySelector('.item-btn');
        btn?.addEventListener('click', () => toggleItem(card));
    });
}


function toggleItem(card) {
    const id = Number(card.getAttribute('data-id'));
    const product = products.find(p => p.id === id);
    if (!product) return;

    const idx = selectedItems.findIndex(i => i.productId === id);
    if (idx >= 0) {
        selectedItems.splice(idx, 1);
    } else {
        selectedItems.push({ productId: id, quantity: 1, pricePerDay: product.pricePerDay });
    }

    // Re-render respetando el filtro activo del buscador
    const catalogInput = document.getElementById('catalogSearch');
    const term = (catalogInput?.value || '').trim().toLowerCase();
    const filtered = term
        ? products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.categoryName || '').toLowerCase().includes(term))
        : products;
    renderCatalog(filtered);
    updateSummary();
}

function wirePaymentChips() {
    document.querySelectorAll('.pay-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pay-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            paymentMethod = btn.getAttribute('data-method') || 'EFECTIVO';
            updateSummary();
        });
    });
}

function wireDateInputs() {
    const startInput = document.getElementById('inicio');
    const endInput = document.getElementById('fin');

    startInput?.addEventListener('change', updateSummary);
    endInput?.addEventListener('change', updateSummary);
}

function updateSummary() {
    const daysEl = document.getElementById('loanDays');
    const paymentEl = document.getElementById('loanPayment');
    const totalEl = document.getElementById('loanTotal');

    const days = calcDays();
    const total = selectedItems.reduce((sum, item) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.pricePerDay) || 0;
        return sum + (price * qty * days);
    }, 0);

    if (daysEl) daysEl.textContent = String(days);
    if (paymentEl) paymentEl.textContent = formatPayment(paymentMethod);
    if (totalEl) totalEl.textContent = formatCurrency(total);

    updateButtonState(days, total);
}

function formatPayment(method) {
    switch (method) {
        case 'TARJETA':
            return 'Tarjeta';
        case 'PAYPAL':
            return 'PayPal';
        default:
            return 'Efectivo';
    }
}

function updateButtonState(days, total) {
    const btn = document.getElementById('createLoanBtn');
    if (!btn) return;

    const clientId = resolveClientId();
    const isReady = clientId && days > 0 && selectedItems.length > 0 && total > 0;
    btn.disabled = !isReady;
    btn.classList.toggle('is-active', Boolean(isReady));
}

function wireCreateButton() {
    const btn = document.getElementById('createLoanBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const clientId = resolveClientId();
        const startDate = document.getElementById('inicio')?.value;
        const endDate = document.getElementById('fin')?.value;

        if (!clientId || !startDate || !endDate || !selectedItems.length) {
            alert('Completa cliente, fechas y articulo.');
            return;
        }

        const payload = {
            items: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            startDate,
            endDate,
            paymentMethod
        };

        try {
            await apiPost(`/api/admin/rentals?clientId=${clientId}`, payload);
            window.location.href = 'admin_loans.html';
        } catch (err) {
            alert(err.message || 'No se pudo crear el alquiler.');
        }
    });
}

function resolveClientId() {
    return selectedClientId || null;
}

function calcDays() {
    const start = document.getElementById('inicio')?.value;
    const end = document.getElementById('fin')?.value;
    if (!start || !end) return 0;

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const diff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.floor(diff) : 0;
}
