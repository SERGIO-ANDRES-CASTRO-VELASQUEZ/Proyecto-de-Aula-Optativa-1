let imageUrls  = [];
let pendingFiles = [];
let specs = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadCategories();
    setupInputValidation();
    wireImageControls();
    wireSpecControls();
    wireUploadTabs();
    wireAddCategoryBtn();

    const form = document.getElementById('createItemForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name        = getValue('articleName');
        const description = getValue('articleDescription');
        const categoryId  = getValue('articleCategory');
        const priceStr    = getValue('articlePrice');
        const stockStr    = getValue('articleStock');

        if (!name || name.length < 3) {
            showError('articleName', 'El nombre debe tener al menos 3 caracteres');
            return;
        }
        if (!description || description.length < 10) {
            showError('articleDescription', 'La descripción debe tener al menos 10 caracteres');
            return;
        }
        if (!categoryId || categoryId === '') {
            showError('articleCategory', 'Debes seleccionar una categoría');
            return;
        }

        const price = Number(priceStr);
        if (!priceStr || isNaN(price) || price <= 0) {
            showError('articlePrice', 'El precio debe ser mayor a 0');
            return;
        }

        const stock = Number(stockStr);
        if (stockStr === '' || isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            showError('articleStock', 'El stock debe ser un entero mayor o igual a 0');
            return;
        }

        // Si el usuario dejó algo escrito en los inputs de spec sin clickear "+", agregarlo automáticamente
        const pendingKey   = document.getElementById('specKey')?.value.trim();
        const pendingValue = document.getElementById('specValue')?.value.trim();
        if (pendingKey && pendingValue) {
            specs.push({ key: pendingKey, value: pendingValue });
            if (document.getElementById('specKey'))   document.getElementById('specKey').value   = '';
            if (document.getElementById('specValue')) document.getElementById('specValue').value = '';
            renderSpecList();
        }

        const payload = {
            name,
            description,
            categoryId:  Number(categoryId),
            pricePerDay: price,
            stock,
            active: document.getElementById('articleActive')?.checked ?? true,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            specs:     specs.length ? specs : []
        };

        try {
            const response = await apiPost('/api/admin/products', payload);

            for (const file of pendingFiles) {
                await apiPostFile(`/api/admin/products/${response.id}/images`, file);
            }

            alert('✅ Artículo creado exitosamente');
            window.location.href = 'admin_inventory.html';
        } catch (err) {
            console.error('Error creating product:', err);
            alert('❌ Error: ' + (err.message || 'No se pudo crear el artículo'));
        }
    });
});

async function loadCategories() {
    const select = document.getElementById('articleCategory');
    if (!select) return;
    try {
        const categories = await apiGet('/api/categories');
        select.innerHTML = '<option value="">Selecciona una categoría</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// ─── Crear categoría inline ───────────────────────────────────────────────────
function wireAddCategoryBtn() {
    const btn = document.getElementById('addCategoryBtn');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const categoryName = prompt('Nombre de la nueva categoría:');
        if (!categoryName || !categoryName.trim()) return;
        try {
            const response = await apiPost('/api/categories', { name: categoryName.trim() });
            await loadCategories();
            const select = document.getElementById('articleCategory');
            if (select && response.id) select.value = response.id;
        } catch (err) {
            alert('❌ Error: ' + (err.message || 'No se pudo crear la categoría'));
        }
    });
}

// ─── Tabs de upload ───────────────────────────────────────────────────────────
function wireUploadTabs() {
    const tabs = document.querySelectorAll('.upload-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.upload-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const content = document.getElementById(tabName);
            if (content) content.classList.add('active');
        });
    });
}

// ─── Validación de inputs ─────────────────────────────────────────────────────
function setupInputValidation() {
    // Nombre: máx. 150 caracteres
    const nameInput = document.getElementById('articleName');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            if (nameInput.value.length > 150) nameInput.value = nameInput.value.slice(0, 150);
            clearError(nameInput);
        });
    }

    // Precio: solo dígitos y un punto decimal (máx. 2 decimales)
    const priceInput = document.getElementById('articlePrice');
    if (priceInput) {
        priceInput.addEventListener('keydown', blockNonDecimal);
        priceInput.addEventListener('input', () => {
            let v = priceInput.value.replace(/[^0-9.]/g, '');
            const parts = v.split('.');
            if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1]?.length > 2) v = parts[0] + '.' + parts[1].slice(0, 2);
            priceInput.value = v;
            clearError(priceInput);
        });
        priceInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const clean  = pasted.replace(/[^0-9.]/g, '');
            const num    = parseFloat(clean);
            priceInput.value = isNaN(num) ? '' : String(num);
        });
    }

    // Stock: solo enteros positivos, sin punto
    const stockInput = document.getElementById('articleStock');
    if (stockInput) {
        stockInput.addEventListener('keydown', blockNonInteger);
        stockInput.addEventListener('input', () => {
            stockInput.value = stockInput.value.replace(/[^0-9]/g, '');
            clearError(stockInput);
        });
        stockInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            stockInput.value = pasted.replace(/[^0-9]/g, '');
        });
    }

    // Descripción: feedback visual de longitud mínima
    const descInput = document.getElementById('articleDescription');
    if (descInput) {
        descInput.addEventListener('input', () => {
            descInput.style.borderColor = descInput.value.length < 10 ? '#ef4444' : '';
            clearError(descInput);
        });
    }
}

// ─── Helpers de teclado ───────────────────────────────────────────────────────
function blockNonDecimal(e) {
    const nav = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[0-9.]$/.test(e.key)) e.preventDefault();
}

function blockNonInteger(e) {
    const nav = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
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

// ─── Imágenes ─────────────────────────────────────────────────────────────────
function wireImageControls() {
    const addUrlBtn = document.getElementById('addImageBtn');
    const urlInput  = document.getElementById('articleImageUrl');
    if (addUrlBtn && urlInput) {
        addUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (!url) return;
            setSingleImage({ url });
            urlInput.value = '';
        });
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (!url) return;
                setSingleImage({ url });
                urlInput.value = '';
            }
        });
    }

    const fileInput = document.getElementById('articleImageFile');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (!fileInput.files.length) return;
            const file = fileInput.files[0];
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                alert('❌ Solo se aceptan JPEG, PNG o WEBP');
                fileInput.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('❌ La imagen no puede superar 5MB');
                fileInput.value = '';
                return;
            }
            setSingleImage({ file });
            fileInput.value = '';
        });
    }

    renderImageList();
    updateImageControls();
}

function setSingleImage({ url, file }) {
    imageUrls    = [];
    pendingFiles = [];
    if (url)  imageUrls    = [url];
    if (file) pendingFiles = [file];
    renderImageList();
    updateImageControls();
}

function renderImageList() {
    const list = document.getElementById('imageList');
    if (!list) return;

    if (!imageUrls.length && !pendingFiles.length) {
        list.innerHTML = '<span class="chip-empty">Sin imágenes</span>';
        return;
    }

    const urlChips  = imageUrls.map((url, idx) => {
        const label = url.length > 28 ? url.slice(0, 25) + '...' : url;
        return `<span class="chip" data-url-index="${idx}">${label} ✕</span>`;
    });
    const fileChips = pendingFiles.map((file, idx) => {
        const label = file.name.length > 25 ? file.name.slice(0, 22) + '...' : file.name;
        return `<span class="chip" data-file-index="${idx}" style="background:#e0f2fe;border-color:#0284c7;">📎 ${label} ✕</span>`;
    });

    list.innerHTML = [...urlChips, ...fileChips].join('');

    list.querySelectorAll('[data-url-index]').forEach(chip => {
        chip.addEventListener('click', () => {
            imageUrls.splice(Number(chip.getAttribute('data-url-index')), 1);
            renderImageList();
            updateImageControls();
        });
    });
    list.querySelectorAll('[data-file-index]').forEach(chip => {
        chip.addEventListener('click', () => {
            pendingFiles.splice(Number(chip.getAttribute('data-file-index')), 1);
            renderImageList();
            updateImageControls();
        });
    });
}

function updateImageControls() {
    const addUrlBtn = document.getElementById('addImageBtn');
    const fileLabel = document.getElementById('fileInputLabel');
    const fileText  = document.getElementById('fileInputText');
    const hasImage  = imageUrls.length > 0 || pendingFiles.length > 0;

    if (addUrlBtn) addUrlBtn.disabled = hasImage;
    if (fileLabel) {
        fileLabel.style.opacity       = hasImage ? '0.5' : '1';
        fileLabel.style.pointerEvents = hasImage ? 'none' : 'auto';
    }
    if (fileText) fileText.textContent = hasImage
        ? '✅ Imagen cargada — quítala para cambiarla'
        : '📁 Selecciona un archivo de imagen';
}

// ─── Especificaciones ─────────────────────────────────────────────────────────
function wireSpecControls() {
    const addBtn     = document.getElementById('addSpecBtn');
    const keyInput   = document.getElementById('specKey');
    const valueInput = document.getElementById('specValue');
    if (!addBtn) return;

    function tryAddSpec() {
        const key   = keyInput?.value.trim();
        const value = valueInput?.value.trim();
        if (!key || !value) return;
        specs.push({ key, value });
        if (keyInput)   keyInput.value   = '';
        if (valueInput) valueInput.value = '';
        renderSpecList();
        keyInput?.focus();
    }

    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!keyInput?.value.trim() || !valueInput?.value.trim()) {
            alert('⚠️ Completa ambos campos (clave y valor)');
            return;
        }
        tryAddSpec();
    });

    // Enter en cualquiera de los dos inputs agrega la spec (no envía el form)
    [keyInput, valueInput].forEach(input => {
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (keyInput?.value.trim() && valueInput?.value.trim()) {
                    tryAddSpec();
                } else if (e.target === keyInput && keyInput.value.trim()) {
                    valueInput?.focus(); // Saltar al campo de valor si la clave está lista
                }
            }
        });
    });

    renderSpecList();
}

function renderSpecList() {
    const list      = document.getElementById('specList');
    const container = document.getElementById('specListContainer');
    const empty     = document.getElementById('specEmpty');
    if (!list || !container || !empty) return;

    if (!specs.length) {
        container.style.display = 'none';
        empty.style.display     = 'block';
        return;
    }

    container.style.display = 'block';
    empty.style.display     = 'none';

    list.innerHTML = specs.map((s, idx) => `
        <tr>
            <td><strong>${s.key}</strong></td>
            <td>${s.value}</td>
            <td><button type="button" class="delete-spec-btn" data-spec-index="${idx}">Eliminar</button></td>
        </tr>
    `).join('');

    list.querySelectorAll('.delete-spec-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            specs.splice(Number(btn.getAttribute('data-spec-index')), 1);
            renderSpecList();
        });
    });
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
