document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    const form = document.getElementById('createUserForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            fullName: document.getElementById('createFullName')?.value.trim(),
            username: document.getElementById('createUsername')?.value.trim(),
            email: document.getElementById('createEmail')?.value.trim(),
            password: document.getElementById('createPassword')?.value,
            phone: document.getElementById('createPhone')?.value.trim() || null,
            idDocument: document.getElementById('createDocument')?.value.trim() || null,
            role: document.getElementById('createRoleAdmin')?.checked ? 'ADMIN' : 'CLIENT',
            active: document.getElementById('createActive')?.checked
        };

        try {
            await apiPost('/api/admin/users', payload);
            window.location.href = 'admin_users.html';
        } catch (err) {
            alert(err.message || 'No se pudo crear el usuario.');
        }
    });
});
