// ═══════════════════════════════════════════════════════════════
//  checkout.js — Checkout + Pago  (checkout.html)
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ── Redirigir si no hay sesión ───────────────────────────────
    if (!isLoggedIn()) { window.location.href = 'index.html'; return; }

    // ── Leer carrito desde localStorage ─────────────────────────
    const cart = getCart();

    if (cart.length === 0) {
        alert('Tu carrito está vacío. Selecciona un producto primero.');
        window.location.href = 'client_index.html';
        return;
    }

    // ── Actualizar navbar con datos reales ───────────────────────
    const user = getUser();
    if (user) {
        const iniciales = (user.fullName || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        const navAvatar = document.querySelector('.user-actions .avatar, .checkout-user-actions .avatar');
        const navName   = document.querySelector('.user-actions .user-name, .checkout-user-actions .user-name');
        const cartInd   = document.querySelector('.cart-indicator');
        if (navAvatar) navAvatar.textContent = iniciales;
        if (navName)   navName.textContent   = (user.fullName || '').split(' ')[0];
        if (cartInd)   cartInd.textContent   = cart.length;
    }

    // ── Poblar resumen del pedido ────────────────────────────────
    const summaryTop  = document.querySelector('.summary-top p');
    if (summaryTop) summaryTop.textContent = `${cart.length} artículo${cart.length > 1 ? 's' : ''} en tu carrito`;

    const fmtDate  = d => new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    const fmtPrice = n => n.toLocaleString('es-CO');

    // Contenedor de items (reemplazar el item estático)
    const summaryItemContainer = document.querySelector('.order-summary');
    const summaryLinesEl       = document.querySelector('.summary-lines');
    const summaryTotalEl       = document.querySelector('.summary-total span:last-child');
    const confirmBtn           = document.getElementById('confirmOrder');

    // Renderizar todos los items del carrito encima de .summary-lines
    if (summaryLinesEl) {
        // Insertar items antes de las líneas de resumen
        cart.forEach(item => {
            const total  = item.pricePerDay * item.days * (item.quantity || 1);
            const imgSrc = item.imageUrl
                ? (item.imageUrl.startsWith('http') ? item.imageUrl : `../../${item.imageUrl.replace(/^\//, '')}`)
                : '../../img/bike-trek.jpg';

            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `
                <img src="${imgSrc}" alt="${item.productName}"
                     onerror="this.src='../../img/bike-trek.jpg'">
                <div class="summary-item-info">
                    <h3>${item.productName}</h3>
                    <p>${fmtDate(item.startDate)} → ${fmtDate(item.endDate)}</p>
                    <span>COP ${fmtPrice(item.pricePerDay)}/día × ${item.days}d</span>
                </div>
                <strong>COP ${fmtPrice(total)}</strong>`;

            summaryLinesEl.parentElement.insertBefore(div, summaryLinesEl);
        });

        // Calcular total general
        const totalGeneral = cart.reduce((acc, item) => acc + item.pricePerDay * item.days * (item.quantity || 1), 0);

        summaryLinesEl.innerHTML = `
            <div><span>Subtotal alquiler</span><span>COP ${fmtPrice(totalGeneral)}</span></div>
            <div><span>Seguro incluido</span><span class="free">Gratis</span></div>
            <div><span>Depósito reembolsable</span><span>COP 0</span></div>`;

        if (summaryTotalEl) summaryTotalEl.textContent = `COP ${fmtPrice(totalGeneral)}`;
    }

    // ── Pre-rellenar datos de contacto ───────────────────────────
    if (user) {
        const fullNameEl     = document.getElementById('fullName');
        const contactEmailEl = document.getElementById('contactEmail');
        if (fullNameEl)     fullNameEl.value     = user.fullName || '';
        if (contactEmailEl) contactEmailEl.value = user.email    || '';
    }

    // ── Lógica de tabs de pago ───────────────────────────────────
    const tabCard      = document.getElementById('tabCard');
    const tabPaypal    = document.getElementById('tabPaypal');
    const cardFields   = document.getElementById('cardFields');
    const paypalFields = document.getElementById('paypalFields');

    const cardName     = document.getElementById('cardName');
    const cardNumber   = document.getElementById('cardNumber');
    const cardExpiry   = document.getElementById('cardExpiry');
    const cardCvc      = document.getElementById('cardCvc');
    const contactEmail = document.getElementById('contactEmail');

    let currentMethod = 'card';

    function cleanDigits(v) { return v.replace(/\D/g, ''); }
    function formatCardNumber(v) { return cleanDigits(v).slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); }
    function formatExpiry(v) {
        const d = cleanDigits(v).slice(0, 4);
        return d.length <= 2 ? d : `${d.slice(0,2)}/${d.slice(2)}`;
    }
    function isCardValid() {
        const nameOk = cardName.value.trim().length >= 4;
        const numOk  = cleanDigits(cardNumber.value).length === 16;
        const expOk  = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.value.trim());
        const cvcOk  = /^\d{3,4}$/.test(cardCvc.value.trim());
        return nameOk && numOk && expOk && cvcOk;
    }
    function updateConfirmState() {
        if (currentMethod === 'paypal') { confirmBtn.disabled = false; return; }
        confirmBtn.disabled = !isCardValid();
    }
    function setMethod(method) {
        currentMethod = method;
        const isCard = method === 'card';
        tabCard.classList.toggle('active', isCard);
        tabPaypal.classList.toggle('active', !isCard);
        cardFields.classList.toggle('active', isCard);
        paypalFields.classList.toggle('active', !isCard);
        updateConfirmState();
    }

    tabCard.addEventListener('click',   () => setMethod('card'));
    tabPaypal.addEventListener('click', () => setMethod('paypal'));

    cardNumber.addEventListener('input', () => { cardNumber.value = formatCardNumber(cardNumber.value); updateConfirmState(); });
    cardExpiry.addEventListener('input', () => { cardExpiry.value = formatExpiry(cardExpiry.value);     updateConfirmState(); });
    cardCvc.addEventListener('input',    () => { cardCvc.value    = cleanDigits(cardCvc.value).slice(0, 4); updateConfirmState(); });
    cardName.addEventListener('input', updateConfirmState);

    // ── Confirmar pedido → llamar al backend ─────────────────────
    confirmBtn.addEventListener('click', async () => {
        if (confirmBtn.disabled) return;

        const metodoPago = currentMethod === 'paypal' ? 'PAYPAL' : 'TARJETA';
        confirmBtn.disabled    = true;
        confirmBtn.textContent = 'Procesando pago...';

        try {
            // Agrupar items del carrito por rango de fechas
            // (items con las mismas fechas van en un solo rental)
            const grupos = {};
            cart.forEach(item => {
                const key = `${item.startDate}|${item.endDate}`;
                if (!grupos[key]) {
                    grupos[key] = {
                        startDate: item.startDate,
                        endDate:   item.endDate,
                        items:     []
                    };
                }
                grupos[key].items.push({ productId: item.productId, quantity: item.quantity || 1 });
            });

            // POST /api/rentals por cada grupo de fechas
            const rentals = [];
            for (const grupo of Object.values(grupos)) {
                const alquiler = await apiPost('/api/rentals', {
                    startDate:     grupo.startDate,
                    endDate:       grupo.endDate,
                    paymentMethod: metodoPago,
                    items:         grupo.items
                });
                rentals.push(alquiler);
            }

            // Limpiar carrito
            clearCart();

            // Calcular total general
            const totalGeneral = cart.reduce(
                (acc, item) => acc + item.pricePerDay * item.days * (item.quantity || 1), 0
            );

            const email = contactEmail.value.trim() || user?.email || '';

            // Redirigir al ticket con el primer rental (o el único)
            const primero = rentals[0];
            window.location.href =
                `ticket_confirmacion.html?code=${encodeURIComponent(primero.code)}`
                + `&email=${encodeURIComponent(email)}`
                + `&total=${totalGeneral}`
                + `&rentalId=${primero.id}`;

        } catch (err) {
            alert(err.message || 'Error al procesar el pago. Intenta de nuevo.');
            confirmBtn.disabled    = false;
            confirmBtn.textContent = 'Pagar y Confirmar Alquiler';
        }
    });

    updateConfirmState();
});
