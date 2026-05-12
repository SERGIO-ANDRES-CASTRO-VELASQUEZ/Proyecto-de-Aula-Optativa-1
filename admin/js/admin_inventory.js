let inventoryProducts = [];
let inventoryDetails = new Map();
let currentPage = 0;
let PAGE_SIZE = 10;
let totalPages = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadCategories();
    await loadProducts(0);

    const searchInput = document.getElementById('inventorySearch');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 0;
            loadProducts(0);
        }, 350));
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentPage = 0;
            loadProducts(0);
        });
    }
});

async function loadCategories() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    try {
        const categories = await apiGet('/api/categories');
        select.innerHTML = '<option value="">Todas las categorias</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

async function loadProducts(page = 0) {
    const searchInput = document.getElementById('inventorySearch');
    const categoryFilter = document.getElementById('categoryFilter');

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(PAGE_SIZE));

    const q = searchInput ? searchInput.value.trim() : '';
    const categoryId = categoryFilter ? categoryFilter.value : '';

    if (q) params.set('q', q);
    if (categoryId) params.set('category', categoryId);

    try {
        console.log('Loading products page:', page);
        const data = await apiGet(`/api/admin/products?${params.toString()}`);
        inventoryProducts = data?.content || [];
        totalPages = data?.totalPages ?? 1;
        currentPage = page;

        // Fetch details for active flag (AdminProductDto includes active)
        const detailList = await Promise.all(
            inventoryProducts.map(p => apiGet(`/api/admin/products/${p.id}`))
        );
        inventoryDetails = new Map(detailList.map(d => [d.id, d]));

        renderProducts(inventoryProducts);
        updateInventoryStats(data?.totalElements ?? inventoryProducts.length, detailList);
        renderPagination(totalPages);
    } catch (err) {
        console.error('Error loading products:', err);
        renderProducts([]);
        updateInventoryStats(0, []);
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('inventoryRows');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;color:#94a3b8;">Sin articulos para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = products.map((p) => {
        const details = inventoryDetails.get(p.id);
        const active = details ? details.active : true;
        const statusText = active ? 'Publico' : 'Oculto';
        const statusClass = active ? 'public' : 'private';
        const img = !p.mainImageUrl                         ? '../../img/icon.png'
            : p.mainImageUrl.startsWith('http')              ? p.mainImageUrl
            : p.mainImageUrl.startsWith('/files/')           ? `${API_BASE}${p.mainImageUrl}`
            : `../../${p.mainImageUrl.replace(/^\//, '')}`;

        return `
            <tr data-id="${p.id}">
                <td>
                    <div class="article-cell">
                        <img src="${img}" alt="${p.name}">
                        <div>
                            <h4>${p.name}</h4>
                            <p>#${p.id} <span>★ ${p.stars ?? 0}</span></p>
                        </div>
                    </div>
                </td>
                <td><span class="category-pill">${p.categoryName || '-'}</span></td>
                <td><strong>${formatCurrency(p.pricePerDay)}</strong><span>/dia</span></td>
                <td><strong class="stock-mid">${p.stock}</strong><span> uds.</span></td>
                <td>
                    <div class="status-cell">
                        <label class="switch row-switch">
                            <input type="checkbox" ${active ? 'checked' : ''} data-id="${p.id}">
                            <span class="slider-switch"></span>
                        </label>
                        <span class="status-text ${statusClass}" data-status-label="${p.id}">${statusText}</span>
                    </div>
                </td>
                <td>
                    <div class="actions-cell">
                        <a class="icon-btn" href="admin_edit_article.html?id=${p.id}" title="Editar">✎</a>
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
                await apiPut(`/api/admin/products/${id}`, { active });
                const label = tbody.querySelector(`[data-status-label="${id}"]`);
                if (label) {
                    label.textContent = active ? 'Publico' : 'Oculto';
                    label.classList.toggle('public', active);
                    label.classList.toggle('private', !active);
                }
            } catch (err) {
                e.target.checked = !active;
                alert(err.message || 'No se pudo actualizar el estado.');
            }
        });
    });
}

function updateInventoryStats(total, detailList) {
    const totalEl = document.getElementById('totalProductsCount');
    const activeEl = document.getElementById('activeProductsCount');
    const stockEl = document.getElementById('stockUnits');

    const activeCount = detailList.filter(d => d.active).length;
    const stockSum = inventoryProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);

    if (totalEl) totalEl.textContent = String(total ?? 0);
    if (activeEl) activeEl.textContent = String(activeCount ?? 0);
    if (stockEl) stockEl.textContent = String(stockSum ?? 0);
}

function renderPagination(totalPages) {
    const container = document.querySelector('.table-footer .table-pagination');
    if (!container) return;

    let html = '';

    // Botón anterior
    if (currentPage > 0) {
        html += `<button type="button" class="page-btn" onclick="loadProducts(${currentPage - 1})">‹</button>`;
    } else {
        html += '<button type="button" class="page-btn" disabled>‹</button>';
    }

    // Números de página (máximo 5 visibles)
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 5);

    for (let i = startPage; i < endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        html += `<button type="button" class="page-btn ${isActive}" onclick="loadProducts(${i})">${i + 1}</button>`;
    }

    // Botón siguiente
    if (currentPage < totalPages - 1) {
        html += `<button type="button" class="page-btn" onclick="loadProducts(${currentPage + 1})">›</button>`;
    } else {
        html += '<button type="button" class="page-btn" disabled>›</button>';
    }

    container.innerHTML = html;
}
