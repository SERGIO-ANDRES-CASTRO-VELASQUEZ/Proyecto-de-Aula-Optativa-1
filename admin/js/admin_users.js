document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    const searchInput = document.getElementById('usersSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadUsers(searchInput.value.trim());
        }, 350));
    }

    await loadUsers('');
});

async function loadUsers(query) {
    const params = new URLSearchParams();
    params.set('page', '0');
    params.set('size', '200');
    if (query) params.set('q', query);

    try {
        const data = await apiGet(`/api/admin/users?${params.toString()}`);
        const users = data?.content || [];
        renderUsers(users);
        updateUserStats(users, data?.totalElements ?? users.length);
    } catch (err) {
        console.error('Error loading users:', err);
        renderUsers([]);
        updateUserStats([], 0);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersRows');
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;color:#94a3b8;">Sin usuarios para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = users.map((u) => {
        const initials = getInitials(u.fullName);
        const roleLabel = u.role === 'ADMIN' ? 'Admin' : 'Cliente';
        const roleClass = u.role === 'ADMIN' ? 'admin' : 'user';
        const activeLabel = u.active ? 'Activo' : 'Inactivo';
        const activeClass = u.active ? 'admin' : 'user';
        const phone = u.phone || '-';
        const doc = u.idDocument || '-';
        return `
            <tr data-id="${u.id}">
                <td>
                    <div class="user-cell">
                        <div class="user-avatar avatar-purple">${initials}</div>
                        <div>
                            <h4>${u.fullName || 'Usuario'}</h4>
                            <p>#${u.id} · ${u.username || '-'}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-cell">
                        <strong>${u.email || '-'}</strong>
                        <span>${phone}</span>
                    </div>
                </td>
                <td><span class="city-pill">${doc}</span></td>
                <td>
                    <div class="role-cell">
                        <span class="role-label ${roleClass}">${roleLabel}</span>
                    </div>
                </td>
                <td>
                    <div class="role-cell">
                        <label class="switch row-role-switch">
                            <input type="checkbox" ${u.active ? 'checked' : ''} data-id="${u.id}">
                            <span class="slider-switch"></span>
                        </label>
                        <span class="role-label ${activeClass}" data-active-label="${u.id}">${activeLabel}</span>
                    </div>
                </td>
                <td>
                    <div class="actions-cell">
                        <a class="icon-btn" href="admin_edit_user.html?id=${u.id}" title="Editar">✎</a>
                        <button class="icon-btn" type="button" data-delete-id="${u.id}" title="Eliminar">🗑</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('input[type="checkbox"][data-id]').forEach((input) => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const active = e.target.checked;
            try {
                await apiPut(`/api/admin/users/${id}/active`, { active });
                const label = tbody.querySelector(`[data-active-label="${id}"]`);
                if (label) {
                    label.textContent = active ? 'Activo' : 'Inactivo';
                    label.classList.toggle('admin', active);
                    label.classList.toggle('user', !active);
                }
            } catch (err) {
                e.target.checked = !active;
                alert(err.message || 'No se pudo actualizar el estado.');
            }
        });
    });

    tbody.querySelectorAll('button[data-delete-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-delete-id');
            if (!confirm('Eliminar este usuario? Esta accion no se puede deshacer.')) return;
            try {
                await apiDelete(`/api/admin/users/${id}`);
                btn.closest('tr')?.remove();
            } catch (err) {
                alert(err.message || 'No se pudo eliminar el usuario.');
            }
        });
    });
}

function updateUserStats(users, total) {
    const totalEl = document.getElementById('totalUsersCount');
    const adminEl = document.getElementById('adminUsersCount');
    const clientEl = document.getElementById('regularUsersCount');
    const counterEl = document.getElementById('usersCounter');

    const adminCount = users.filter((u) => u.role === 'ADMIN').length;
    const clientCount = users.filter((u) => u.role !== 'ADMIN').length;

    if (totalEl) totalEl.textContent = String(total);
    if (adminEl) adminEl.textContent = String(adminCount);
    if (clientEl) clientEl.textContent = String(clientCount);
    if (counterEl) counterEl.textContent = `${users.length} de ${total} usuarios`;
}
