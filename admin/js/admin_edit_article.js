let editSpecs = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    const productId = getIdFromQuery();
    if (!productId) {
        window.location.href = 'admin_inventory.html';
        return;
    }

    await loadCategories();

    try {
        const product = await apiGet(`/api/admin/products/${productId}`);
        fillForm(product);
        editSpecs = product.specs || [];
        renderSpecs();
        wireAddSpec();
    } catch (err) {
        alert(err.message || 'No se pudo cargar el articulo.');
        window.location.href = 'admin_inventory.html';
        return;
    }

    const form = document.getElementById('editItemForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const specs = collectSpecs();
        const payload = {
            name: getValue('editName'),
            description: getValue('editDescription'),
            categoryId: Number(getValue('editCategory')),
            pricePerDay: Number(getValue('editPrice')),
            stock: Number(getValue('editStock')),
            active: document.getElementById('editActive')?.checked,
            specs
        };

        try {
            await apiPut(`/api/admin/products/${productId}`, payload);
            window.location.href = 'admin_inventory.html';
        } catch (err) {
            alert(err.message || 'No se pudo actualizar el articulo.');
        }
    });
});

async function loadCategories() {
    const select = document.getElementById('editCategory');
    if (!select) return;

    try {
        const categories = await apiGet('/api/categories');
        select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function fillForm(p) {
    setValue('editName', p.name || '');
    setValue('editPrice', p.pricePerDay ?? 0);
    setValue('editStock', p.stock ?? 0);
    setValue('editDescription', p.description || '');

    const category = document.getElementById('editCategory');
    if (category) category.value = String(p.categoryId || '');

    const activeInput = document.getElementById('editActive');
    if (activeInput) activeInput.checked = !!p.active;

    const imgInput = document.getElementById('editImageUrl');
    if (imgInput) imgInput.value = p.images?.[0]?.url || '';

    renderThumbs(p.images || []);
}

function renderThumbs(images) {
    const thumbs = document.getElementById('editThumbs');
    if (!thumbs) return;

    if (!images.length) {
        thumbs.innerHTML = '<span class="chip-empty">Sin imagenes</span>';
        return;
    }

    thumbs.innerHTML = images.map((img, idx) => {
        const mainClass = idx === 0 ? 'thumb main' : 'thumb';
        const label = idx === 0 ? '<span>Principal</span>' : '';
        return `<article class="${mainClass}"><img src="${img.url}" alt="Imagen">${label}</article>`;
    }).join('');
}

function wireAddSpec() {
    const addBtn = document.querySelector('.add-static');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const key = prompt('Clave de la especificacion');
        if (!key) return;
        const value = prompt('Valor de la especificacion');
        if (!value) return;
        editSpecs.push({ key: key.trim(), value: value.trim() });
        renderSpecs();
    });
}

function renderSpecs() {
    const container = document.getElementById('specContainer');
    if (!container) return;

    if (!editSpecs.length) {
        container.innerHTML = '<p style="color:#94a3b8;">Sin especificaciones</p>';
        return;
    }

    container.innerHTML = editSpecs.map((s, idx) => {
        return `
            <div class="spec-row" data-spec-index="${idx}">
                <span class="spec-icon">⚙</span>
                <input type="text" class="spec-key" value="${escapeHtml(s.key)}">
                <input type="text" class="spec-value" value="${escapeHtml(s.value)}">
                <button type="button" class="trash" aria-label="Eliminar">🗑</button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.trash').forEach((btn) => {
        btn.addEventListener('click', () => {
            const row = btn.closest('[data-spec-index]');
            const idx = Number(row?.getAttribute('data-spec-index'));
            if (!Number.isNaN(idx)) {
                editSpecs.splice(idx, 1);
                renderSpecs();
            }
        });
    });
}

function collectSpecs() {
    const container = document.getElementById('specContainer');
    if (!container) return [];

    const rows = Array.from(container.querySelectorAll('.spec-row'));
    return rows.map((row) => {
        const key = row.querySelector('.spec-key')?.value.trim();
        const value = row.querySelector('.spec-value')?.value.trim();
        return { key, value };
    }).filter(s => s.key && s.value);
}

function getIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
