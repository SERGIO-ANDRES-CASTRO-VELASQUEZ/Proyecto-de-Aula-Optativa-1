document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadDashboard();
});

async function loadDashboard() {
    try {
        const [productsPage, dashboard, rentalsPage] = await Promise.all([
            apiGet('/api/admin/products?size=1'),
            apiGet('/api/admin/dashboard'),
            apiGet('/api/admin/rentals?size=4')
        ]);

        const totalProducts = productsPage?.totalElements ?? 0;
        const activeRentals = dashboard?.activeRentalsToday ?? 0;
        const overdueRentals = dashboard?.overdueRentals ?? 0;
        const revenue = dashboard?.revenueThisMonth ?? 0;

        setText('metricTotalProducts', totalProducts);
        setText('metricActiveRentals', activeRentals);
        setText('metricOverdueRentals', overdueRentals);
        setText('metricRevenue', formatCurrency(revenue));

        renderRecentActivity(rentalsPage?.content || []);
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function renderRecentActivity(rentals) {
    const list = document.getElementById('activityList');
    if (!list) return;

    if (!rentals.length) {
        list.innerHTML = '<div class="activity-item"><div class="ticket-info">Sin actividad reciente</div></div>';
        return;
    }

    list.innerHTML = rentals.map((r) => {
        const status = mapDashboardStatus(r.status);
        const itemName = r.firstProductName || 'Sin articulo';
        return `
            <div class="activity-item">
                <div class="ticket-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div class="ticket-info">
                    <div class="ticket-user"><strong>${r.code}</strong> · ${r.userFullName || 'Cliente'}</div>
                    <div class="ticket-desc">${itemName}</div>
                </div>
                <div class="ticket-status">
                    <span class="status-badge ${status.className}">${status.label}</span>
                </div>
                <div class="ticket-price">${formatCurrency(r.total)}</div>
            </div>
        `;
    }).join('');
}

function mapDashboardStatus(status) {
    switch (status) {
        case 'ACTIVO':
            return { label: 'En Progreso', className: 'badge-blue' };
        case 'FINALIZADO':
            return { label: 'Devuelto', className: 'badge-green' };
        case 'PENDIENTE':
            return { label: 'Pendiente', className: 'badge-orange' };
        case 'VENCIDO':
            return { label: 'Vencido', className: 'badge-orange' };
        case 'CANCELADO':
            return { label: 'Cancelado', className: 'badge-orange' };
        default:
            return { label: String(status || 'N/A'), className: 'badge-orange' };
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? '0');
}
