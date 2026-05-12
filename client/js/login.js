document.addEventListener('DOMContentLoaded', () => {
    // Toggle de mostrar/ocultar contraseña (mantener la lógica visual existente)
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput  = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            togglePassword.innerHTML = isPassword
                ? `<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`
                : `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
        });
    }

    // Si ya hay sesión activa, redirigir según el rol
    if (isLoggedIn()) {
        const user = getUser();
        if (user && user.role === 'ADMIN') {
            window.location.href = '../../admin/html/admin_dashboard.html';
        } else {
            window.location.href = 'client_index.html';
        }
        return;
    }

    const loginForm  = document.getElementById('loginForm');
    const submitBtn  = loginForm.querySelector('button[type="submit"]');
    const errorDiv   = crearDivError();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        ocultarError(errorDiv);
        submitBtn.disabled    = true;
        submitBtn.textContent = 'Iniciando sesión...';

        try {
            // POST /api/auth/login
            const data = await apiPost('/api/auth/login', { email, password });

            // Guardar token y datos del usuario en localStorage
            setToken(data.token);
            const authUser = data.user || {
                id: data.id,
                email: data.email,
                fullName: data.fullName,
                role: data.role,
                username: data.username
            };
            setUser(authUser);

            // Redirigir según el rol
            if (authUser && authUser.role === 'ADMIN') {
                window.location.href = '../../admin/html/admin_dashboard.html';
            } else {
                window.location.href = 'client_index.html';
            }

        } catch (err) {
            mostrarError(errorDiv, err.message || 'Credenciales incorrectas');
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    });

    // ── Funciones auxiliares de UI ────────────────────────────────────────────

    function crearDivError() {
        const div = document.createElement('div');
        div.style.cssText = 'color:#ef4444;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:none;font-size:14px;';
        loginForm.insertBefore(div, loginForm.querySelector('button[type="submit"]'));
        return div;
    }

    function mostrarError(div, msg) {
        div.textContent = msg;
        div.style.display = 'block';
    }

    function ocultarError(div) {
        div.style.display = 'none';
    }
});
