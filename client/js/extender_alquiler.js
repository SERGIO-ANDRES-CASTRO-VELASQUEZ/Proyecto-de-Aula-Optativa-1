// ═══════════════════════════════════════════════════════════════
//  extender_alquiler.js  (extender_alquiler.html)
// ═══════════════════════════════════════════════════════════════

if (!isLoggedIn()) { window.location.href = 'index.html'; }

let alquilerActual = null;
let diasExtra      = 1;

document.addEventListener('DOMContentLoaded', async () => {

    const params   = new URLSearchParams(window.location.search);
    const rentalId = params.get('id');

    if (!rentalId) { window.location.href = 'mis_alquileres.html'; return; }

    try {
        // GET /api/rentals/{id}
        alquilerActual = await apiGet(`/api/rentals/${rentalId}`);
        renderizarPeriodoActual(alquilerActual);
        configurarContador(alquilerActual);
        configurarConfirmar(alquilerActual);
    } catch (err) {
        alert('No se pudo cargar el alquiler.');
        window.location.href = 'mis_alquileres.html';
    }
});

function renderizarPeriodoActual(a) {
    const fmtCorto = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short' });

    // Header
    const titleEl = document.querySelector('.ext-title');
    if (titleEl) titleEl.textContent = a.items?.[0]?.productName || 'Producto';

    // Periodo actual
    const endpoints = document.querySelectorAll('.endpoint-date');
    if (endpoints[0]) endpoints[0].textContent = fmtCorto(a.startDate);
    if (endpoints[1]) endpoints[1].textContent = fmtCorto(a.endDate);

    const diasActuales = Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / 86400000);
    const lineDuration = document.querySelector('.line-duration');
    if (lineDuration) lineDuration.textContent = `${diasActuales}d`;

    // Actualizar enlace de cierre
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) closeBtn.href = `detalle_alquiler.html?id=${a.id}`;
}

function configurarContador(a) {
    const numberEl = document.querySelector('.counter-value .number');
    const unitEl   = document.querySelector('.counter-value .unit');
    const minusBtn = document.querySelector('.counter-btn[aria-label="Restar"]');
    const plusBtn  = document.querySelector('.counter-btn[aria-label="Sumar"]');
    const pillsEl  = document.querySelector('.quick-add-pills');

    function actualizar() {
        if (numberEl) numberEl.textContent = diasExtra;
        if (unitEl)   unitEl.textContent   = diasExtra === 1 ? 'día' : 'días';
        actualizarResumen(a, diasExtra);
    }

    minusBtn?.addEventListener('click', () => { if (diasExtra > 1) { diasExtra--; actualizar(); } });
    plusBtn?.addEventListener('click',  () => { if (diasExtra < 30) { diasExtra++; actualizar(); } });

    // Pills de acceso rápido
    pillsEl?.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pillsEl.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            diasExtra = parseInt(pill.textContent.replace('+','').replace('d',''));
            actualizar();
        });
    });

    actualizar();
}

function actualizarResumen(a, diasExtra) {
    const precioBase   = a.items?.[0]?.unitPrice || 0;
    const costoExtra   = precioBase * diasExtra;
    const fechaActual  = new Date(a.endDate);
    const nuevaFecha   = new Date(fechaActual.getTime() + diasExtra * 86400000);
    const fmtFecha     = d => d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });

    const nuevoFin     = document.querySelector('.summary-value.color-purple');
    const costoEl      = document.querySelector('.summary-col.text-right .summary-value');
    const btnConfirmar = document.querySelector('.btn-confirm');

    if (nuevoFin) nuevoFin.textContent = fmtFecha(nuevaFecha);
    if (costoEl)  costoEl.textContent  = `COP ${costoExtra.toLocaleString('es-CO')}`;
    if (btnConfirmar) btnConfirmar.textContent =
        `Confirmar extensión — COP ${costoExtra.toLocaleString('es-CO')}`;
}

function configurarConfirmar(a) {
    const btnConfirmar = document.querySelector('.btn-confirm');
    if (!btnConfirmar) return;

    // Quitar el href del <a> para manejarlo con JS
    btnConfirmar.removeAttribute('href');
    btnConfirmar.style.cursor = 'pointer';

    btnConfirmar.addEventListener('click', async (e) => {
        e.preventDefault();

        const fechaActual = new Date(a.endDate);
        const nuevaFecha  = new Date(fechaActual.getTime() + diasExtra * 86400000);
        const newEndDate  = nuevaFecha.toISOString().split('T')[0];

        btnConfirmar.textContent = 'Procesando...';

        try {
            // POST /api/rentals/{id}/extend
            await apiPost(`/api/rentals/${a.id}/extend`, { newEndDate });
            alert(`¡Extensión confirmada! Nueva fecha de devolución: ${newEndDate}`);
            window.location.href = `detalle_alquiler.html?id=${a.id}`;
        } catch (err) {
            alert(err.message || 'No se pudo extender el alquiler.');
            btnConfirmar.textContent = `Confirmar extensión`;
        }
    });
}
