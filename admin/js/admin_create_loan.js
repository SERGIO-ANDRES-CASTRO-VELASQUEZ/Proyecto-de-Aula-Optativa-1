let clients = [];
let products = [];
let selectedItems = [];
let paymentMethod = 'EFECTIVO';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await Promise.all([loadClients(), loadProducts()]);
    wirePaymentChips();
    wireDateInputs();
    wireCreateButton();

    const clientInput = document.getElementById('cliente');
    clientInput?.addEventListener('input', () => updateSummary());

    updateSummary();
});

async function loadClients() {
    const datalist = document.getElementById('clientList');
    if (!datalist) return;

    try {
        const data = await apiGet('/api/admin/users?size=200');
        clients = (data?.content || []).filter(u => u.role === 'CLIENT');
        datalist.innerHTML = clients.map(u => {
            const label = `${u.fullName} - ${u.email} (id:${u.id})`;
            return `<option value="${label}"></option>`;
        }).join('');
    } catch (err) {
        console.error('Error loading clients:', err);
    }
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

function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;color:#94a3b8;">Sin productos disponibles</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
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

    renderCatalog();
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
    btn.disabled = !(clientId && days > 0 && selectedItems.length > 0 && total > 0);
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
    const input = document.getElementById('cliente');
    if (!input) return null;

    const value = input.value.trim();
    if (!value) return null;

    const match = value.match(/id:(\d+)/i);
    if (match) return match[1];

    const direct = clients.find(c => c.fullName === value || c.email === value);
    return direct ? direct.id : null;
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
