// forgot_password.js — Recuperación de contraseña (forgot_password.html)
// POST /api/auth/forgot-password → 200 OK si el correo existe, 404 si no

document.addEventListener('DOMContentLoaded', () => {

    const form      = document.getElementById('forgotPasswordForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv  = crearDivError();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        ocultarError(errorDiv);

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Verificando...';

        try {
            await apiPost('/api/auth/forgot-password', { email });
            mostrarExito('Si el correo está registrado, recibirás instrucciones de recuperación.');
            submitBtn.textContent = 'Instrucciones enviadas ✓';
        } catch (err) {
            if (err.status === 404) {
                mostrarError(errorDiv, 'No existe ninguna cuenta registrada con ese correo.');
            } else {
                mostrarError(errorDiv, err.message || 'Error al procesar la solicitud. Intenta de nuevo.');
            }
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Enviar Instrucciones';
        }
    });

    function crearDivError() {
        const div = document.createElement('div');
        div.style.cssText = ['color:#ef4444','background:#fee2e2','border:1px solid #fca5a5','border-radius:8px','padding:10px 14px','margin-bottom:12px','display:none','font-size:14px'].join(';');
        form.insertBefore(div, submitBtn);
        return div;
    }

    function mostrarError(div, msg) { div.textContent = msg; div.style.display = 'block'; }
    function ocultarError(div)      { div.style.display = 'none'; }

    function mostrarExito(msg) {
        const div = document.createElement('div');
        div.style.cssText = ['color:#15803d','background:#dcfce7','border:1px solid #86efac','border-radius:8px','padding:10px 14px','margin-bottom:12px','font-size:14px'].join(';');
        div.textContent = msg;
        form.insertBefore(div, submitBtn);
    }
});
