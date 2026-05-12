// POST /api/admin/users
document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    setupUserValidation({
        fullName:  'createFullName',
        username:  'createUsername',
        email:     'createEmail',
        password:  'createPassword',
        phone:     'createPhone',
        document:  'createDocument',
    });

    const form = document.getElementById('createUserForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateUserForm({ requirePassword: true })) return;

        const payload = {
            fullName:   getValue('createFullName'),
            username:   getValue('createUsername'),
            email:      getValue('createEmail'),
            password:   getValue('createPassword'),
            phone:      getValue('createPhone') || null,
            idDocument: getValue('createDocument') || null,
            role:       document.getElementById('createRoleAdmin')?.checked ? 'ADMIN' : 'CLIENT',
            active:     document.getElementById('createActive')?.checked ?? true,
        };

        try {
            await apiPost('/api/admin/users', payload);
            window.location.href = 'admin_users.html';
        } catch (err) {
            alert(err.message || 'No se pudo crear el usuario.');
        }
    });
});

// ─── Validación de campos ─────────────────────────────────────────────────────
function setupUserValidation(ids) {
    // Nombre completo: letras, tildes, espacios
    const nameEl = document.getElementById(ids.fullName);
    if (nameEl) {
        nameEl.addEventListener('input', () => {
            nameEl.value = nameEl.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
            clearError(nameEl);
        });
        nameEl.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            nameEl.value = pasted.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
        });
    }

    // Username: alfanumérico + guión bajo, sin espacios
    const userEl = document.getElementById(ids.username);
    if (userEl) {
        userEl.addEventListener('input', () => {
            userEl.value = userEl.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
            clearError(userEl);
        });
        userEl.addEventListener('keydown', (e) => {
            if (e.key === ' ') e.preventDefault();
        });
        userEl.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            userEl.value = pasted.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        });
    }

    // Email: limpieza básica de espacios
    const emailEl = document.getElementById(ids.email);
    if (emailEl) {
        emailEl.addEventListener('input', () => {
            emailEl.value = emailEl.value.replace(/\s/g, '');
            clearError(emailEl);
        });
    }

    // Contraseña: sin espacios
    if (ids.password) {
        const passEl = document.getElementById(ids.password);
        if (passEl) {
            passEl.addEventListener('keydown', (e) => {
                if (e.key === ' ') e.preventDefault();
            });
            passEl.addEventListener('input', () => clearError(passEl));
        }
    }

    // Teléfono: dígitos, +, espacios, guiones y paréntesis
    const phoneEl = document.getElementById(ids.phone);
    if (phoneEl) {
        phoneEl.setAttribute('placeholder', 'Ej: +57 310 123 4567');
        phoneEl.addEventListener('keydown', (e) => {
            const nav = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return;
            if (!/^[0-9+\s\-()]$/.test(e.key)) e.preventDefault();
        });
        phoneEl.addEventListener('input', () => {
            phoneEl.value = phoneEl.value.replace(/[^0-9+\s\-()]/g, '');
            clearError(phoneEl);
        });
        phoneEl.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            phoneEl.value = pasted.replace(/[^0-9+\s\-()]/g, '');
        });
    }

    // Documento: alfanumérico en mayúsculas
    const docEl = document.getElementById(ids.document);
    if (docEl) {
        docEl.setAttribute('placeholder', 'Ej: 1000234567');
        docEl.addEventListener('keydown', (e) => {
            const nav = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return;
            if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
        });
        docEl.addEventListener('input', () => {
            docEl.value = docEl.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            clearError(docEl);
        });
        docEl.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            docEl.value = pasted.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        });
    }
}

function validateUserForm({ requirePassword = false } = {}) {
    const fullName = getValue('createFullName') || getValue('editFullName');
    const username = getValue('createUsername') || getValue('editUsername');
    const email    = getValue('createEmail')    || getValue('editEmail');
    const password = getValue('createPassword') || getValue('editPassword');
    const phone    = getValue('createPhone')    || getValue('editPhone');

    const fullNameId = document.getElementById('createFullName') ? 'createFullName' : 'editFullName';
    const usernameId = document.getElementById('createUsername') ? 'createUsername' : 'editUsername';
    const emailId    = document.getElementById('createEmail')    ? 'createEmail'    : 'editEmail';
    const passwordId = document.getElementById('createPassword') ? 'createPassword' : 'editPassword';
    const phoneId    = document.getElementById('createPhone')    ? 'createPhone'    : 'editPhone';

    if (!fullName || fullName.length < 3) {
        showError(fullNameId, 'El nombre debe tener al menos 3 caracteres');
        return false;
    }
    if (!username || username.length < 3) {
        showError(usernameId, 'El username debe tener al menos 3 caracteres');
        return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError(usernameId, 'Solo letras, números y guiones bajos');
        return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailId, 'Ingresa un email válido');
        return false;
    }
    if (requirePassword) {
        if (!password || password.length < 6) {
            showError(passwordId, 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
    } else if (password && password.length < 6) {
        showError(passwordId, 'Si cambias la contraseña debe tener al menos 6 caracteres');
        return false;
    }
    if (phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length < 7) {
            showError(phoneId, 'El teléfono debe tener al menos 7 dígitos');
            return false;
        }
    }
    return true;
}

// ─── Feedback visual ──────────────────────────────────────────────────────────
function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '#ef4444';
    el.focus();
    let hint = el.parentElement.querySelector('.field-error');
    if (!hint) {
        hint = document.createElement('span');
        hint.className = 'field-error';
        hint.style.cssText = 'color:#ef4444;font-size:0.78rem;margin-top:3px;display:block;';
        el.parentElement.appendChild(hint);
    }
    hint.textContent = msg;
}

function clearError(el) {
    if (!el) return;
    el.style.borderColor = '';
    el.parentElement?.querySelector('.field-error')?.remove();
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
