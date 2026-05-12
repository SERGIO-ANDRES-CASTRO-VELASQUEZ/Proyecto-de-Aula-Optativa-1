// GET/PUT /api/admin/users/{id}
document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    const userId = getUserIdFromQuery();
    if (!userId) {
        window.location.href = 'admin_users.html';
        return;
    }

    setupUserValidation({
        fullName: 'editFullName',
        username: 'editUsername',
        email:    'editEmail',
        password: 'editPassword',
        phone:    'editPhone',
        document: 'editDocument',
    });

    const form = document.getElementById('editUserForm');
    if (!form) return;

    try {
        const data = await apiGet(`/api/admin/users/${userId}`);
        fillForm(data);
    } catch (err) {
        alert(err.message || 'No se pudo cargar el usuario.');
        window.location.href = 'admin_users.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateUserForm({ requirePassword: false })) return;

        const payload = {
            fullName:   getValue('editFullName'),
            username:   getValue('editUsername'),
            email:      getValue('editEmail'),
            newPassword: getValue('editPassword') || null,
            phone:      getValue('editPhone') || null,
            idDocument: getValue('editDocument') || null,
        };

        try {
            await apiPut(`/api/admin/users/${userId}`, payload);

            const active = document.getElementById('editActive')?.checked;
            if (active !== undefined) {
                await apiPut(`/api/admin/users/${userId}/active`, { active });
            }

            window.location.href = 'admin_users.html';
        } catch (err) {
            alert(err.message || 'No se pudo actualizar el usuario.');
        }
    });
});

function getUserIdFromQuery() {
    return new URLSearchParams(window.location.search).get('id');
}

function fillForm(u) {
    setValue('editFullName', u.fullName  || '');
    setValue('editUsername', u.username  || '');
    setValue('editEmail',    u.email     || '');
    setValue('editPhone',    u.phone     || '');
    setValue('editDocument', u.idDocument || '');

    const activeInput = document.getElementById('editActive');
    if (activeInput) activeInput.checked = !!u.active;
}

// ─── Validación de campos (igual que en create) ───────────────────────────────
function setupUserValidation(ids) {
    const nameEl = document.getElementById(ids.fullName);
    if (nameEl) {
        nameEl.addEventListener('input', () => {
            nameEl.value = nameEl.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
            clearError(nameEl);
        });
        nameEl.addEventListener('paste', (e) => {
            e.preventDefault();
            nameEl.value = (e.clipboardData || window.clipboardData).getData('text')
                .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
        });
    }

    const userEl = document.getElementById(ids.username);
    if (userEl) {
        userEl.addEventListener('input', () => {
            userEl.value = userEl.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
            clearError(userEl);
        });
        userEl.addEventListener('keydown', (e) => { if (e.key === ' ') e.preventDefault(); });
        userEl.addEventListener('paste', (e) => {
            e.preventDefault();
            userEl.value = (e.clipboardData || window.clipboardData).getData('text')
                .replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        });
    }

    const emailEl = document.getElementById(ids.email);
    if (emailEl) {
        emailEl.addEventListener('input', () => {
            emailEl.value = emailEl.value.replace(/\s/g, '');
            clearError(emailEl);
        });
    }

    const passEl = document.getElementById(ids.password);
    if (passEl) {
        passEl.addEventListener('keydown', (e) => { if (e.key === ' ') e.preventDefault(); });
        passEl.addEventListener('input', () => clearError(passEl));
    }

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
            phoneEl.value = (e.clipboardData || window.clipboardData).getData('text')
                .replace(/[^0-9+\s\-()]/g, '');
        });
    }

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
            docEl.value = (e.clipboardData || window.clipboardData).getData('text')
                .replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        });
    }
}

function validateUserForm({ requirePassword = false } = {}) {
    const fullName = getValue('editFullName');
    const username = getValue('editUsername');
    const email    = getValue('editEmail');
    const password = getValue('editPassword');
    const phone    = getValue('editPhone');

    if (!fullName || fullName.length < 3) {
        showError('editFullName', 'El nombre debe tener al menos 3 caracteres');
        return false;
    }
    if (!username || username.length < 3) {
        showError('editUsername', 'El username debe tener al menos 3 caracteres');
        return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('editUsername', 'Solo letras, números y guiones bajos');
        return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('editEmail', 'Ingresa un email válido');
        return false;
    }
    if (requirePassword) {
        if (!password || password.length < 6) {
            showError('editPassword', 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
    } else if (password && password.length < 6) {
        showError('editPassword', 'Si cambias la contraseña debe tener al menos 6 caracteres');
        return false;
    }
    if (phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length < 7) {
            showError('editPhone', 'El teléfono debe tener al menos 7 dígitos');
            return false;
        }
    }
    return true;
}

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

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
