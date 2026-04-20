document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get('ticket') || 'SR-00000';
    const email = params.get('email') || 'carlos.garcia@email.com';

    const ticketNumber = document.getElementById('ticketNumber');
    const ticketEmail = document.getElementById('ticketEmail');

    if (ticketNumber) {
        ticketNumber.textContent = ticket;
    }

    if (ticketEmail) {
        ticketEmail.textContent = email;
    }
});
