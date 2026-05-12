document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadLoanStats();
    await loadLoans();

    const searchInput = document.getElementById('loansSearch');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadLoans();
        }, 350));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadLoans();
        });
    }
});

async function loadLoanStats() {
    const params = new URLSearchParams();
    params.set('page', '0');
    params.set('size', '200');

    try {
        const data = await apiGet(`/api/admin/rentals?${params.toString()}`);
        const items = data?.content || [];

        const total = data?.totalElements ?? items.length;
        const pending = items.filter(i => i.status === 'PENDIENTE').length;
        const active = items.filter(i => i.status === 'ACTIVO').length;
        const finished = items.filter(i => i.status === 'FINALIZADO').length;

        setText('totalTicketsCount', total);
        setText('pendingTicketsCount', pending);
        setText('activeTicketsCount', active);
        setText('finishedTicketsCount', finished);
    } catch (err) {
        console.error('Error loading loan stats:', err);
    }
}

async function loadLoans() {
    const searchInput = document.getElementById('loansSearch');
    const statusFilter = document.getElementById('statusFilter');

    const params = new URLSearchParams();
    params.set('page', '0');
    params.set('size', '200');

    const q = searchInput ? searchInput.value.trim() : '';
    const status = statusFilter ? statusFilter.value : '';

    if (q) params.set('q', q);
    if (status) params.set('status', status);

    try {
        const data = await apiGet(`/api/admin/rentals?${params.toString()}`);
        renderLoans(data?.content || []);
        updateLoanCounter(data?.content?.length ?? 0, data?.totalElements ?? 0);
    } catch (err) {
        console.error('Error loading loans:', err);
        renderLoans([]);
        updateLoanCounter(0, 0);
    }
}

function renderLoans(rentals) {
    const tbody = document.getElementById('loansRows');
    if (!tbody) return;

    if (!rentals.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:16px;color:#94a3b8;">Sin tickets para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = rentals.map((r) => {
        const status = mapLoanStatus(r.status);
        const initials = getInitials(r.userFullName || 'CL');
        const itemName = r.firstProductName || 'Sin articulo';
        const itemCount = r.itemCount || 0;

        return `
            <tr>
                <td><span class="ticket-id">${r.code}</span></td>
                <td>
                    <div class="client-cell">
                        <div class="client-avatar">${initials}</div>
                        <div><strong>${r.userFullName || 'Cliente'}</strong><span>${r.userEmail || '-'}</span></div>
                    </div>
                </td>
                <td>
                    <div class="article-cell">
                        <img src="../../img/icon.png" alt="Articulo">
                        <div><strong>${itemName}</strong><span>${itemCount} item(s)</span></div>
                    </div>
                </td>
                <td>${formatDate(r.startDate)}</td>
                <td>${formatDate(r.endDate)}</td>
                <td><strong class="total">${formatCurrency(r.total)}</strong><span>${formatPayment(r.paymentMethod)}</span></td>
                <td><span class="status-badge ${status.className}">${status.label}</span></td>
                <td><span class="more-actions">•••</span></td>
            </tr>
        `;
    }).join('');
}

function mapLoanStatus(status) {
    switch (status) {
        case 'ACTIVO':
            return { label: 'En Progreso', className: 'progress' };
        case 'FINALIZADO':
            return { label: 'Devuelto', className: 'returned' };
        case 'PENDIENTE':
            return { label: 'Pendiente', className: 'pending' };
        case 'CANCELADO':
            return { label: 'Cancelado', className: 'pending' };
        case 'VENCIDO':
            return { label: 'Vencido', className: 'pending' };
        default:
            return { label: String(status || 'N/A'), className: 'pending' };
    }
}

function updateLoanCounter(visible, total) {
    const counter = document.querySelector('.table-count');
    if (counter) counter.textContent = `${visible} de ${total} tickets`;
}

function formatPayment(method) {
    switch (method) {
        case 'TARJETA':
            return 'Tarjeta';
        case 'PAYPAL':
            return 'PayPal';
        case 'EFECTIVO':
            return 'Efectivo';
        default:
            return method || '-';
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? '0');
}
