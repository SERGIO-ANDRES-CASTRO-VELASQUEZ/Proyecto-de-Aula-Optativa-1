document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    const userId = getUserIdFromQuery();
    if (!userId) {
        window.location.href = 'admin_users.html';
        return;
    }

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

        const payload = {
            fullName: getValue('editFullName'),
            username: getValue('editUsername'),
            email: getValue('editEmail'),
            newPassword: getValue('editPassword') || null,
            phone: getValue('editPhone') || null,
            idDocument: getValue('editDocument') || null
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
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function fillForm(u) {
    setValue('editFullName', u.fullName || '');
    setValue('editUsername', u.username || '');
    setValue('editEmail', u.email || '');
    setValue('editPhone', u.phone || '');
    setValue('editDocument', u.idDocument || '');

    const activeInput = document.getElementById('editActive');
    if (activeInput) activeInput.checked = !!u.active;
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
