let editSpecs    = [];
let editImages   = [];   // { id, url } — imágenes actuales en BD
let pendingFile  = null; // File | null — archivo a subir al guardar

let productId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    productId = getIdFromQuery();
    if (!productId) {
        window.location.href = 'admin_inventory.html';
        return;
    }

    await loadCategories();

    try {
        const product = await apiGet(`/api/admin/products/${productId}`);
        fillForm(product);
        editSpecs  = product.specs  || [];
        editImages = (product.images || []).map(img => ({ id: img.id, url: img.url }));
        renderSpecs();
        renderThumbs();
        wireImageSection();
    } catch (err) {
        alert(err.message || 'No se pudo cargar el articulo.');
        window.location.href = 'admin_inventory.html';
        return;
    }

    const form = document.getElementById('editItemForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });
});

// ─── Guardar producto ────────────────────────────────────────────────────────
async function saveProduct() {
    const specs = collectSpecs();
    const payload = {
        name:        getValue('editName'),
        description: getValue('editDescription'),
        categoryId:  Number(getValue('editCategory')),
        pricePerDay: Number(getValue('editPrice')),
        stock:       Number(getValue('editStock')),
        active:      document.getElementById('editActive')?.checked,
        specs
    };

    const btn = document.querySelector('.btn-save');
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

        // 1. Actualizar datos básicos
        await apiPut(`/api/admin/products/${productId}`, payload);

        // 2. Subir archivo nuevo si hay uno pendiente
        if (pendingFile) {
            await apiPostFile(`/api/admin/products/${productId}/images`, pendingFile);
        }

        window.location.href = 'admin_inventory.html';
    } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
        alert(err.message || 'No se pudo actualizar el articulo.');
    }
}

// ─── Sección de imagen ────────────────────────────────────────────────────────
function wireImageSection() {
    document.getElementById('editAddFileBtn')?.addEventListener('click', () => {
        const total = editImages.length + (pendingFile ? 1 : 0);
        if (total >= 1) {
            alert('Solo se permite 1 imagen. Elimina la actual antes de añadir una nueva.');
            return;
        }
        const fileInput = document.getElementById('editImageFile');
        const file = fileInput?.files?.[0];
        if (!file) { alert('Selecciona un archivo de imagen.'); return; }
        pendingFile = file;
        if (fileInput) fileInput.value = '';
        renderThumbs();
    });

    // También detectar cuando se selecciona un archivo
    document.getElementById('editImageFile')?.addEventListener('change', (e) => {
        const total = editImages.length + (pendingFile ? 1 : 0);
        if (total >= 1) {
            alert('Solo se permite 1 imagen. Elimina la actual antes de añadir una nueva.');
            e.target.value = '';
            return;
        }
        const file = e.target.files?.[0];
        if (file) {
            pendingFile = file;
            e.target.value = '';
            renderThumbs();
        }
    });
}

// ─── Render thumbnails ───────────────────────────────────────────────────────
function renderThumbs() {
    const thumbs = document.getElementById('editThumbs');
    if (!thumbs) return;

    const items = [
        ...editImages.map((img, i)  => ({ type: 'existing', img, index: i })),
        ...(pendingFile ? [{ type: 'pendingFile', file: pendingFile }] : [])
    ];

    if (!items.length) {
        thumbs.innerHTML = '<span style="color:#94a3b8;font-size:13px;">Sin imagen asignada</span>';
        return;
    }

    thumbs.innerHTML = items.map((item) => {
        let src, badge, delAttr;

        if (item.type === 'existing') {
            const url = item.img.url;
            src = url.startsWith('http')    ? url
                : url.startsWith('/files/') ? `${API_BASE}${url}`
                : `../../${url.replace(/^\//, '')}`;
            badge    = '<span style="position:absolute;bottom:4px;left:4px;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#df2be4;color:#fff;">Actual</span>';
            delAttr  = `data-existing-id="${item.img.id}"`;
        } else {
            src      = URL.createObjectURL(item.file);
            badge    = '<span style="position:absolute;bottom:4px;left:4px;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#059669;color:#fff;">Nueva</span>';
            delAttr  = 'data-pending-file="1"';
        }

        return `
            <div style="position:relative;display:inline-block;">
                <img src="${src}" style="width:90px;height:72px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0;display:block;">
                ${badge}
                <button type="button" ${delAttr}
                    style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;line-height:1;">✕</button>
            </div>
        `;
    }).join('');

    // Listeners para eliminar
    thumbs.querySelectorAll('[data-existing-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const imgId = btn.getAttribute('data-existing-id');
            if (!confirm('¿Eliminar esta imagen del producto?')) return;
            try {
                await apiDelete(`/api/admin/products/${productId}/images/${imgId}`);
                editImages = editImages.filter(img => String(img.id) !== imgId);
                renderThumbs();
            } catch (err) {
                alert(err.message || 'No se pudo eliminar la imagen.');
            }
        });
    });

    thumbs.querySelectorAll('[data-pending-file]').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingFile = null;
            renderThumbs();
        });
    });
}

// ─── Categorías ──────────────────────────────────────────────────────────────
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

// ─── Rellenar formulario ──────────────────────────────────────────────────────
function fillForm(p) {
    setValue('editName',        p.name || '');
    setValue('editPrice',       p.pricePerDay ?? 0);
    setValue('editStock',       p.stock ?? 0);
    setValue('editDescription', p.description || '');

    const category = document.getElementById('editCategory');
    if (category) category.value = String(p.categoryId || '');

    const activeInput = document.getElementById('editActive');
    if (activeInput) activeInput.checked = !!p.active;
}

// ─── Especificaciones ─────────────────────────────────────────────────────────
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

    wireAddSpec();
}

function collectSpecs() {
    const container = document.getElementById('specContainer');
    if (!container) return [];

    const rows = Array.from(container.querySelectorAll('.spec-row'));
    return rows.map((row) => {
        const key   = row.querySelector('.spec-key')?.value.trim();
        const value = row.querySelector('.spec-value')?.value.trim();
        return { key, value };
    }).filter(s => s.key && s.value);
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
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
