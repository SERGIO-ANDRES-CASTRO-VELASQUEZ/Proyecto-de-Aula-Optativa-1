// ═══════════════════════════════════════════════════════════════
//  admin_loans.js — Gestión de prestamos/alquileres (admin)
// ═══════════════════════════════════════════════════════════════

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="48"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="8">Sin imagen</text></svg>'
);

let loansCurrentPage = 0;
const LOANS_PAGE_SIZE = 15;
let loansTotalPages  = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadLoanStats();
    await loadLoans(0);

    const searchInput = document.getElementById('loansSearch');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loansCurrentPage = 0;
            loadLoans(0);
        }, 350));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loansCurrentPage = 0;
            loadLoans(0);
        });
    }
});

async function loadLoanStats() {
    try {
        const data = await apiGet('/api/admin/rentals?page=0&size=1');
        const total = data?.totalElements ?? 0;
        setText('totalTicketsCount', total);

        // Obtener conteos por estado
        const [pendData, actData, finData] = await Promise.all([
            apiGet('/api/admin/rentals?page=0&size=1&status=PENDIENTE'),
            apiGet('/api/admin/rentals?page=0&size=1&status=ACTIVO'),
            apiGet('/api/admin/rentals?page=0&size=1&status=FINALIZADO'),
        ]);
        setText('pendingTicketsCount', pendData?.totalElements ?? 0);
        setText('activeTicketsCount',  actData?.totalElements  ?? 0);
        setText('finishedTicketsCount', finData?.totalElements ?? 0);
    } catch (err) {
        console.error('Error loading loan stats:', err);
    }
}

async function loadLoans(page = 0) {
    const searchInput  = document.getElementById('loansSearch');
    const statusFilter = document.getElementById('statusFilter');

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(LOANS_PAGE_SIZE));
    params.set('sort', 'createdAt,desc');

    const q      = searchInput  ? searchInput.value.trim() : '';
    const status = statusFilter ? statusFilter.value       : '';

    if (q)      params.set('q', q);
    if (status) params.set('status', status);

    try {
        const data = await apiGet(`/api/admin/rentals?${params.toString()}`);
        const rentals = data?.content || [];
        loansTotalPages  = data?.totalPages ?? 1;
        loansCurrentPage = page;

        renderLoans(rentals);
        updateLoanCounter(rentals.length, data?.totalElements ?? rentals.length);
        renderLoansPagination(loansTotalPages);
    } catch (err) {
        console.error('Error loading loans:', err);
        renderLoans([]);
        updateLoanCounter(0, 0);
    }
}

function resolveImg(url) {
    if (!url) return PLACEHOLDER_IMG;
    if (url.startsWith('http'))    return url;
    if (url.startsWith('/files/')) return `${API_BASE}${url}`;
    return `../../${url.replace(/^\//, '')}`;
}

function renderLoans(rentals) {
    const tbody = document.getElementById('loansRows');
    if (!tbody) return;

    if (!rentals.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;color:#94a3b8;text-align:center;">Sin tickets para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = rentals.map((r) => {
        const status   = mapLoanStatus(r.status);
        const initials = getInitials(r.userFullName || 'CL');
        const imgSrc   = resolveImg(r.firstProductImageUrl);
        const itemName = r.firstProductName || 'Sin artículo';
        const itemCount = r.itemCount || 0;

        return `
            <tr data-rental-id="${r.id}">
                <td><span class="ticket-id">${r.code || '-'}</span></td>
                <td>
                    <div class="client-cell">
                        <div class="client-avatar">${initials}</div>
                        <div>
                            <strong>${r.userFullName || 'Cliente'}</strong>
                            <span>${r.userEmail || '-'}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="article-cell">
                        <img src="${imgSrc}" alt="${itemName}" onerror="this.src='${PLACEHOLDER_IMG}'"
                             style="width:44px;height:36px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;">
                        <div>
                            <strong>${itemName}</strong>
                            <span>${itemCount} artículo${itemCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </td>
                <td>${formatDate(r.startDate)}</td>
                <td>${formatDate(r.endDate)}</td>
                <td>
                    <strong class="total">${formatCurrency(r.total || 0)}</strong>
                    <span>${formatPayment(r.paymentMethod)}</span>
                </td>
                <td><span class="status-badge ${status.className}">${status.label}</span></td>
                 <td>
                     <div class="actions-cell">
                         <button type="button" class="icon-btn view-detail-btn" data-id="${r.id}" title="Ver detalles">👁</button>
                         <div class="dropdown-wrapper">
                             <button type="button" class="icon-btn status-drop-btn" data-id="${r.id}" title="Cambiar estado">⚙</button>
                             <div class="status-dropdown" id="dropdown-${r.id}" style="display:none;">
                                 ${['PENDIENTE','ACTIVO','FINALIZADO','CANCELADO','VENCIDO'].map(s =>
                                     `<button type="button" class="drop-item ${r.status === s ? 'current' : ''}"
                                              data-rental="${r.id}" data-status="${s}">
                                          ${mapLoanStatus(s).label}
                                      </button>`
                                 ).join('')}
                             </div>
                         </div>
                     </div>
                 </td>
            </tr>
        `;
    }).join('');

    // Dropdown para cambio de estado
    tbody.querySelectorAll('.status-drop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id  = btn.getAttribute('data-id');
            const ddp = document.getElementById(`dropdown-${id}`);
            // Cerrar otros
            tbody.querySelectorAll('.status-dropdown').forEach(d => {
                if (d.id !== `dropdown-${id}`) d.style.display = 'none';
            });
            if (ddp) ddp.style.display = ddp.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
        // Solo cerrar si el clic no es en un dropdown
        if (!e.target.closest('.dropdown-wrapper')) {
            tbody.querySelectorAll('.status-dropdown').forEach(d => d.style.display = 'none');
        }
    });

    // Acción de cambio de estado
    tbody.querySelectorAll('.drop-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rentalId  = item.getAttribute('data-rental');
            const newStatus = item.getAttribute('data-status');
            try {
                await apiPut(`/api/admin/rentals/${rentalId}/status`, { status: newStatus });
                // Recargar la página actual
                loadLoans(loansCurrentPage);
            } catch (err) {
                alert(err.message || 'No se pudo cambiar el estado.');
            }
        });
    });

    // Detail modal buttons
    tbody.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rentalId = btn.getAttribute('data-id');
            await openDetailModal(rentalId);
        });
    });
}

function mapLoanStatus(status) {
    switch (status) {
        case 'ACTIVO':     return { label: 'En Progreso', className: 'progress' };
        case 'FINALIZADO': return { label: 'Devuelto',    className: 'returned' };
        case 'PENDIENTE':  return { label: 'Pendiente',   className: 'pending' };
        case 'CANCELADO':  return { label: 'Cancelado',   className: 'cancelled' };
        case 'VENCIDO':    return { label: 'Vencido',     className: 'overdue' };
        default:           return { label: String(status || 'N/A'), className: 'pending' };
    }
}

function updateLoanCounter(visible, total) {
    const counter = document.getElementById('loansCounter');
    if (counter) counter.textContent = `${visible} de ${total} tickets`;
}

function renderLoansPagination(totalPages) {
    const container = document.getElementById('loansPagination');
    if (!container || totalPages <= 0) return;

    let html = `<button type="button" class="page-btn" onclick="loadLoans(${loansCurrentPage - 1})" ${loansCurrentPage === 0 ? 'disabled' : ''}>‹</button>`;

    const start = Math.max(0, loansCurrentPage - 2);
    const end   = Math.min(totalPages, start + 5);
    for (let i = start; i < end; i++) {
        html += `<button type="button" class="page-btn ${i === loansCurrentPage ? 'active' : ''}" onclick="loadLoans(${i})">${i + 1}</button>`;
    }

    html += `<button type="button" class="page-btn" onclick="loadLoans(${loansCurrentPage + 1})" ${loansCurrentPage >= totalPages - 1 ? 'disabled' : ''}>›</button>`;
    container.innerHTML = html;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatPayment(method) {
    switch (method) {
        case 'TARJETA':  return 'Tarjeta';
        case 'PAYPAL':   return 'PayPal';
        case 'EFECTIVO': return 'Efectivo';
        default:         return method || '-';
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? '0');
}

async function openDetailModal(rentalId) {
    try {
        const rental = await apiGet(`/api/admin/rentals/${rentalId}`);
        renderDetailModal(rental);
        const overlay = document.getElementById('detailModalOverlay');
        if (overlay) overlay.classList.add('active');
    } catch (err) {
        console.error('Error loading rental detail:', err);
        alert('No se pudo cargar el detalle del rental.');
    }
}

function renderDetailModal(rental) {
    const content = document.getElementById('detailModalContent');
    const title = document.getElementById('detailModalTitle');

    title.textContent = `Ticket ${rental.code || 'N/A'}`;

    const itemsHtml = (rental.items || []).map(item => `
        <div class="item-row">
            <div class="item-name">${item.productName || 'Producto'}</div>
            <div class="item-qty">${item.quantity}x</div>
            <div class="item-unitprice">${formatCurrency(item.unitPrice || 0)}</div>
            <div class="item-amount">${formatCurrency(item.lineTotal || 0)}</div>
        </div>
    `).join('');

    const statusBadge = mapLoanStatus(rental.status);

    content.innerHTML = `
        <div class="detail-section">
            <h3>Información del Cliente</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Cliente</label>
                    <div class="value">${rental.userFullName || 'Sin nombre'}</div>
                </div>
                <div class="info-item">
                    <label>Email</label>
                    <div class="value">${rental.userEmail || '-'}</div>
                </div>
                <div class="info-item">
                    <label>Estado</label>
                    <div class="value status ${statusBadge.className}">${statusBadge.label}</div>
                </div>
                <div class="info-item">
                    <label>Método Pago</label>
                    <div class="value">${formatPayment(rental.paymentMethod)}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Fechas del Rental</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Creado</label>
                    <div class="value">${formatDate(rental.createdAt)}</div>
                </div>
                <div class="info-item">
                    <label>Inicio</label>
                    <div class="value">${formatDate(rental.startDate)}</div>
                </div>
                <div class="info-item">
                    <label>Fin</label>
                    <div class="value">${formatDate(rental.endDate)}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Artículos Rentados (${rental.items?.length || 0})</h3>
            <div class="items-list-header">
                <div class="item-name-header">Producto</div>
                <div class="item-qty-header">Qty</div>
                <div class="item-unitprice-header">Unit.</div>
                <div class="item-amount-header">Total</div>
            </div>
            <div class="items-list">
                ${itemsHtml || '<div style="padding: 1rem; text-align: center; color: #94a3b8;">Sin artículos</div>'}
            </div>
        </div>

        <div class="detail-section detail-summary">
            <div class="summary-row">
                <label>Subtotal</label>
                <div class="value">${formatCurrency(rental.subtotal || 0)}</div>
            </div>
            
            <div class="summary-row">
                <label>Depósito</label>
                <div class="value">${formatCurrency(rental.deposit || 0)}</div>
            </div>
            
            <div class="summary-row total">
                <label>Total</label>
                <div class="value amount">${formatCurrency(rental.total || 0)}</div>
            </div>
        </div>
    `;
}

function closeDetailModal() {
    const overlay = document.getElementById('detailModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

// Cerrar modal al presionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
});

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('detailModalOverlay');
    if (overlay && e.target === overlay) closeDetailModal();
});

