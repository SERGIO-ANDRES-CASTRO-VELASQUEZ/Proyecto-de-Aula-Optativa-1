let imageUrls  = [];   // URLs externas (http/https)
let pendingFiles = []; // File objects a subir tras crear el producto
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
            alert('❌ El nombre debe tener al menos 3 caracteres');
            document.getElementById('articleName').focus();
            return;
        }
        if (!description || description.length < 10) {
            alert('❌ La descripción debe tener al menos 10 caracteres');
            document.getElementById('articleDescription').focus();
            return;
        }
        if (!categoryId || categoryId === '') {
            alert('❌ Debes seleccionar una categoría');
            document.getElementById('articleCategory').focus();
            return;
        }

        // Validar precio (número positivo)
        const price = Number(priceStr);
        if (isNaN(price) || price <= 0) {
            alert('❌ El precio debe ser un número mayor a 0');
            document.getElementById('articlePrice').focus();
            return;
        }

        // Validar stock (entero positivo)
        const stock = Number(stockStr);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            alert('❌ El stock debe ser un número entero mayor o igual a 0');
            document.getElementById('articleStock').focus();
            return;
        }

        const payload = {
            name: name,
            description: description,
            categoryId: Number(categoryId),
            pricePerDay: price,
            stock: stock,
            active: document.getElementById('articleActive')?.checked ?? true,
            images: imageUrls.length > 0 ? imageUrls.map(url => ({ url })) : [],
            specs: specs.length ? specs : []
        };

        try {
            console.log('📤 Creating product:', payload);
            const response = await apiPost('/api/admin/products', payload);
            console.log('✅ Product created:', response);

            // Subir archivos locales al producto recién creado
            for (const file of pendingFiles) {
                await apiPostFile(`/api/admin/products/${response.id}/images`, file);
            }

            alert('✅ Artículo creado exitosamente');
            window.location.href = 'admin_inventory.html';
        } catch (err) {
            console.error('❌ Error creating product:', err);
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

// ─── CREAR CATEGORÍA INLINE ───
function wireAddCategoryBtn() {
    const btn = document.getElementById('addCategoryBtn');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const categoryName = prompt('Nombre de la nueva categoría:');
        if (!categoryName || !categoryName.trim()) return;

        try {
            const response = await apiPost('/api/categories', { name: categoryName.trim() });
            console.log('✅ Categoría creada:', response);
            await loadCategories();

            // Seleccionar la nueva categoría
            const select = document.getElementById('articleCategory');
            if (select && response.id) {
                select.value = response.id;
            }
        } catch (err) {
            console.error('❌ Error creando categoría:', err);
            alert('❌ Error: ' + (err.message || 'No se pudo crear la categoría'));
        }
    });
}

// ─── TABS DE UPLOAD ───
function wireUploadTabs() {
    const tabs = document.querySelectorAll('.upload-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');

            // Desactivar todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.upload-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Activar este tab
            tab.classList.add('active');
            const content = document.getElementById(tabName);
            if (content) content.classList.add('active');
        });
    });
}

function setupInputValidation() {
    // Validar campo "Nombre" - Solo letras, números y espacios
    const nameInput = document.getElementById('articleName');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            if (e.target.value.length > 150) {
                e.target.value = e.target.value.slice(0, 150);
            }
        });
    }

    // Validar campo "Precio" - Solo números y punto decimal
    const priceInput = document.getElementById('articlePrice');
    if (priceInput) {
        priceInput.addEventListener('input', (e) => {
            let value = e.target.value;
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts[1];
            }
            e.target.value = value;
        });

        priceInput.addEventListener('keydown', (e) => {
            const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','Tab','ArrowLeft','ArrowRight'];
            if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
            }
        });
    }

    // Validar campo "Stock" - Solo números enteros positivos
    const stockInput = document.getElementById('articleStock');
    if (stockInput) {
        stockInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        stockInput.addEventListener('keydown', (e) => {
            const allowed = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','Tab','ArrowLeft','ArrowRight'];
            if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
            }
        });
    }

    // Validar campo "Descripción" - Mínimo 10 caracteres
    const descInput = document.getElementById('articleDescription');
    if (descInput) {
        descInput.addEventListener('input', (e) => {
            const charCount = e.target.value.length;
            const minChars = 10;
            const remaining = Math.max(0, minChars - charCount);

            if (charCount < minChars) {
                e.target.style.borderColor = '#ef4444';
            } else {
                e.target.style.borderColor = '';
            }
        });
    }
}

// ─── IMÁGENES ───
function wireImageControls() {
    // URL: agregar con botón o con Enter
    const addUrlBtn = document.getElementById('addImageBtn');
    const urlInput = document.getElementById('articleImageUrl');
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

    // Archivo: auto-carga al seleccionar
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
    imageUrls = [];
    pendingFiles = [];

    if (url) imageUrls = [url];
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

    const urlChips = imageUrls.map((url, idx) => {
        const label = url.length > 28 ? url.slice(0, 25) + '...' : url;
        return `<span class="chip" data-url-index="${idx}">${label} ✕</span>`;
    });

    const fileChips = pendingFiles.map((file, idx) => {
        const label = file.name.length > 25 ? file.name.slice(0, 22) + '...' : file.name;
        return `<span class="chip" data-file-index="${idx}"
                      style="background:#e0f2fe;border-color:#0284c7;">📎 ${label} ✕</span>`;
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
    const fileText = document.getElementById('fileInputText');
    const hasImage = imageUrls.length > 0 || pendingFiles.length > 0;

    if (addUrlBtn) addUrlBtn.disabled = hasImage;
    if (fileLabel) fileLabel.style.opacity = hasImage ? '0.5' : '1';
    if (fileLabel) fileLabel.style.pointerEvents = hasImage ? 'none' : 'auto';
    if (fileText && hasImage) fileText.textContent = '✅ Imagen cargada — quítala para cambiarla';
    if (fileText && !hasImage) fileText.textContent = '📁 Selecciona un archivo de imagen';
}

// ─── ESPECIFICACIONES ───
function wireSpecControls() {
    const addBtn = document.getElementById('addSpecBtn');
    if (!addBtn) return;

    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const keyInput = document.getElementById('specKey');
        const valueInput = document.getElementById('specValue');

        if (!keyInput || !valueInput) return;

        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (!key || !value) {
            alert('⚠️ Completa ambos campos');
            return;
        }

        specs.push({ key, value });
        keyInput.value = '';
        valueInput.value = '';
        renderSpecList();
    });

    renderSpecList();
}

function renderSpecList() {
    const list = document.getElementById('specList');
    const container = document.getElementById('specListContainer');
    const empty = document.getElementById('specEmpty');

    if (!list || !container || !empty) return;

    if (!specs.length) {
        container.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    empty.style.display = 'none';

    list.innerHTML = specs.map((s, idx) => {
        return `
            <tr>
                <td><strong>${s.key}</strong></td>
                <td>${s.value}</td>
                <td><button type="button" class="delete-spec-btn" data-spec-index="${idx}">Eliminar</button></td>
            </tr>
        `;
    }).join('');

    list.querySelectorAll('.delete-spec-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const idx = Number(btn.getAttribute('data-spec-index'));
            specs.splice(idx, 1);
            renderSpecList();
        });
    });
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
