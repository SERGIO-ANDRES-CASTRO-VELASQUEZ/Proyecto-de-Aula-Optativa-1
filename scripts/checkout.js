document.addEventListener('DOMContentLoaded', () => {
    const tabCard = document.getElementById('tabCard');
    const tabPaypal = document.getElementById('tabPaypal');
    const cardFields = document.getElementById('cardFields');
    const paypalFields = document.getElementById('paypalFields');
    const confirmOrder = document.getElementById('confirmOrder');

    const cardName = document.getElementById('cardName');
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvc = document.getElementById('cardCvc');
    const contactEmail = document.getElementById('contactEmail');

    let currentMethod = 'card';

    function cleanDigits(value) {
        return value.replace(/\D/g, '');
    }

    function formatCardNumber(value) {
        const digits = cleanDigits(value).slice(0, 16);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    }

    function formatExpiry(value) {
        const digits = cleanDigits(value).slice(0, 4);
        if (digits.length <= 2) {
            return digits;
        }
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    function isCardValid() {
        const nameValid = cardName.value.trim().length >= 4;
        const numberValid = cleanDigits(cardNumber.value).length === 16;
        const expiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.value.trim());
        const cvcValid = /^\d{3,4}$/.test(cardCvc.value.trim());
        return nameValid && numberValid && expiryValid && cvcValid;
    }

    function updateConfirmState() {
        if (currentMethod === 'paypal') {
            confirmOrder.disabled = false;
            return;
        }
        confirmOrder.disabled = !isCardValid();
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

    tabCard.addEventListener('click', () => setMethod('card'));
    tabPaypal.addEventListener('click', () => setMethod('paypal'));

    cardNumber.addEventListener('input', () => {
        cardNumber.value = formatCardNumber(cardNumber.value);
        updateConfirmState();
    });

    cardExpiry.addEventListener('input', () => {
        cardExpiry.value = formatExpiry(cardExpiry.value);
        updateConfirmState();
    });

    cardCvc.addEventListener('input', () => {
        cardCvc.value = cleanDigits(cardCvc.value).slice(0, 4);
        updateConfirmState();
    });

    cardName.addEventListener('input', updateConfirmState);

    confirmOrder.addEventListener('click', () => {
        if (confirmOrder.disabled) {
            return;
        }

        const orderNumber = `SR-${Math.floor(10000 + Math.random() * 90000)}`;
        const safeEmail = (contactEmail.value || 'carlos.garcia@email.com').trim();
        const target = `ticket_confirmacion.html?ticket=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(safeEmail)}`;
        window.location.href = target;
    });

    updateConfirmState();
});
