// ═══════════════════════════════════════════════════════════════
//  detalle_alquiler.js  (detalle_alquiler.html)
// ═══════════════════════════════════════════════════════════════

if (!isLoggedIn()) { window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', async () => {

    const params   = new URLSearchParams(window.location.search);
    const rentalId = params.get('id');

    if (!rentalId) { window.location.href = 'mis_alquileres.html'; return; }

    try {
        // GET /api/rentals/{id}
        const alquiler = await apiGet(`/api/rentals/${rentalId}`);
        renderizarDetalle(alquiler);
    } catch (err) {
        alert('No se pudo cargar el alquiler.');
        window.location.href = 'mis_alquileres.html';
    }
});

function renderizarDetalle(a) {
    const fmtDate = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });
    const dias    = Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / 86400000);

    // ── Header ────────────────────────────────────────────────────
    const ticketIdEl  = document.querySelector('.ticket-id');
    const ticketTitle = document.querySelector('.ticket-title');
    if (ticketIdEl)  ticketIdEl.textContent  = `TICKET DE ALQUILER • ${a.code}`;
    if (ticketTitle) ticketTitle.textContent  = a.items?.[0]?.productName || 'Producto';

    // ── Imagen ────────────────────────────────────────────────────
    const imgEl = document.querySelector('.product-img');
    if (imgEl && a.items?.[0]?.imageUrl) {
        const url = a.items[0].imageUrl;
        imgEl.src = url.startsWith('http') ? url : `../../${url.replace(/^\//,'')}`;
        imgEl.alt = a.items[0].productName;
    }

    // ── Badge de estado ───────────────────────────────────────────
    const statusBadge = document.querySelector('.status-badge');
    const statusMap = {
        ACTIVO:     { cls: 'status-active',    txt: 'Activo'     },
        PENDIENTE:  { cls: 'status-pending',   txt: 'Pendiente'  },
        FINALIZADO: { cls: 'status-completed', txt: 'Completado' },
        CANCELADO:  { cls: 'status-cancelled', txt: 'Cancelado'  },
        VENCIDO:    { cls: 'status-cancelled', txt: 'Vencido'    },
    };
    if (statusBadge) {
        const s = statusMap[a.status] || { cls: '', txt: a.status };
        statusBadge.className  = `status-badge ${s.cls}`;
        statusBadge.querySelector('svg + *') // limpiar texto anterior
        statusBadge.lastChild.textContent = ` ${s.txt}`;
    }

    // ── Categoría y nombre ────────────────────────────────────────
    const catEl  = document.querySelector('.product-category');
    const nameEl = document.querySelector('.product-name');
    if (catEl)  catEl.textContent  = a.items?.[0]?.categoryName || '';
    if (nameEl) nameEl.textContent = a.items?.[0]?.productName  || '';

    // ── Fechas ────────────────────────────────────────────────────
    const dateBoxes = document.querySelectorAll('.date-box .value');
    if (dateBoxes[0]) dateBoxes[0].textContent = fmtDate(a.startDate);
    if (dateBoxes[1]) dateBoxes[1].textContent = fmtDate(a.endDate);
    if (dateBoxes[2]) dateBoxes[2].textContent = `${dias} día${dias>1?'s':''}`;

    // ── Desglose de pago ──────────────────────────────────────────
    const paymentList = document.querySelector('.payment-list');
    if (paymentList && a.items) {
        const item = a.items[0];
        paymentList.innerHTML = `
            <li>
                <span>COP ${(item?.unitPrice||0).toLocaleString('es-CO')}/día × ${item?.days||dias} días</span>
                <span>COP ${(item?.lineTotal||a.subtotal).toLocaleString('es-CO')}</span>
            </li>
            <li>
                <span>Seguro incluido</span>
                <span class="color-green">Gratis</span>
            </li>
            <li>
                <span>Depósito reembolsable</span>
                <span>COP ${(a.deposit||0).toLocaleString('es-CO')}</span>
            </li>
            <li class="payment-total">
                <span>Total pagado</span>
                <span class="color-purple">COP ${(a.total||0).toLocaleString('es-CO')}</span>
            </li>
        `;
    }

    // ── Timeline según estado ─────────────────────────────────────
    const timeline = document.querySelector('.timeline');
    if (timeline) {
        const steps = [
            { titulo: 'Pedido confirmado', fecha: fmtDate(a.createdAt || a.startDate), completado: true },
            { titulo: 'Equipo preparado',  fecha: fmtDate(a.startDate),                completado: ['ACTIVO','FINALIZADO'].includes(a.status) },
            { titulo: 'Alquiler activo',   fecha: fmtDate(a.startDate),                completado: ['ACTIVO','FINALIZADO'].includes(a.status) },
            { titulo: 'Devolución',        fecha: fmtDate(a.endDate),                  completado: a.status === 'FINALIZADO' },
        ];
        timeline.innerHTML = steps.map(s => `
            <div class="timeline-step ${s.completado ? 'completed' : 'pending'}">
                <div class="step-indicator">
                    ${s.completado ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <div class="step-content">
                    <span class="step-title">${s.titulo}</span>
                    <span class="step-date">${s.fecha}</span>
                </div>
            </div>
        `).join('');
    }

    // ── Footer: mostrar/ocultar botón de extensión ────────────────
    const btnExtender = document.querySelector('.ticket-footer .btn-primary');
    if (btnExtender) {
        if (['ACTIVO','PENDIENTE'].includes(a.status)) {
            btnExtender.href = `extender_alquiler.html?id=${a.id}`;
        } else {
            btnExtender.style.display = 'none';
        }
    }
}
