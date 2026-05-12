let imageUrls = [];
let specs = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadCategories();
    wireImageControls();
    wireSpecControls();

    const form = document.getElementById('createItemForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: getValue('articleName'),
            description: getValue('articleDescription'),
            categoryId: Number(getValue('articleCategory')),
            pricePerDay: Number(getValue('articlePrice')),
            stock: Number(getValue('articleStock')),
            active: document.getElementById('articleActive')?.checked,
            imageUrls: imageUrls.length ? imageUrls : null,
            specs: specs.length ? specs : null
        };

        try {
            await apiPost('/api/admin/products', payload);
            window.location.href = 'admin_inventory.html';
        } catch (err) {
            alert(err.message || 'No se pudo crear el articulo.');
        }
    });
});

async function loadCategories() {
    const select = document.getElementById('articleCategory');
    if (!select) return;

    try {
        const categories = await apiGet('/api/categories');
        select.innerHTML = '<option value="">Selecciona una categoria</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function wireImageControls() {
    const addBtn = document.getElementById('addImageBtn');
    const input = document.getElementById('articleImageUrl');
    if (!addBtn || !input) return;

    addBtn.addEventListener('click', () => {
        const url = input.value.trim();
        if (!url) return;
        imageUrls.push(url);
        input.value = '';
        renderImageList();
    });

    renderImageList();
}

function renderImageList() {
    const list = document.getElementById('imageList');
    if (!list) return;

    if (!imageUrls.length) {
        list.innerHTML = '<span class="chip-empty">Sin imagenes</span>';
        return;
    }

    list.innerHTML = imageUrls.map((url, idx) => {
        const shortUrl = url.length > 28 ? url.slice(0, 25) + '...' : url;
        return `<span class="chip" data-image-index="${idx}">${shortUrl} ✕</span>`;
    }).join('');

    list.querySelectorAll('[data-image-index]').forEach((chip) => {
        chip.addEventListener('click', () => {
            const idx = Number(chip.getAttribute('data-image-index'));
            imageUrls.splice(idx, 1);
            renderImageList();
        });
    });
}

function wireSpecControls() {
    const addBtn = document.getElementById('addSpecBtn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const key = prompt('Clave de la especificacion');
        if (!key) return;
        const value = prompt('Valor de la especificacion');
        if (!value) return;
        specs.push({ key: key.trim(), value: value.trim() });
        renderSpecList();
    });

    renderSpecList();
}

function renderSpecList() {
    const list = document.getElementById('specList');
    if (!list) return;

    if (!specs.length) {
        list.innerHTML = '<span class="chip-empty">Sin especificaciones</span>';
        return;
    }

    list.innerHTML = specs.map((s, idx) => {
        return `<span class="chip" data-spec-index="${idx}">${s.key}: ${s.value} ✕</span>`;
    }).join('');

    list.querySelectorAll('[data-spec-index]').forEach((chip) => {
        chip.addEventListener('click', () => {
            const idx = Number(chip.getAttribute('data-spec-index'));
            specs.splice(idx, 1);
            renderSpecList();
        });
    });
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
