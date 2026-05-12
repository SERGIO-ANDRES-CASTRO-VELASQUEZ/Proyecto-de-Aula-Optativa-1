// ═══════════════════════════════════════════════════════════════
//  ticket.js — Confirmación de alquiler  (ticket_confirmacion.html)
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);

    // Soporta ?code= (flujo real) y ?ticket= (flujo legacy)
    const code  = params.get('code')  || params.get('ticket') || 'SR-00000';
    const email = params.get('email') || getUser()?.email     || '—';
    const total = parseFloat(params.get('total') || '0');

    const ticketNumberEl = document.getElementById('ticketNumber');
    const ticketEmailEl  = document.getElementById('ticketEmail');

    if (ticketNumberEl) ticketNumberEl.textContent = code;
    if (ticketEmailEl)  ticketEmailEl.textContent  = email;

    // Insertar total si viene en la URL
    if (total > 0) {
        const box = document.querySelector('.ticket-number-box');
        if (box) {
            const totalEl = document.createElement('div');
            totalEl.style.cssText = 'margin-top:12px;font-size:15px;color:#64748b;text-align:center;';
            totalEl.innerHTML = `Total pagado: <strong style="color:#df2be4;">COP ${total.toLocaleString('es-CO')}</strong>`;
            box.insertAdjacentElement('afterend', totalEl);
        }
    }
});
