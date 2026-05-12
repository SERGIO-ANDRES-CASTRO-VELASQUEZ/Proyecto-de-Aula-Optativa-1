let inventoryProducts = [];
let inventoryDetails = new Map();

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAdmin();
    if (!user) return;

    await loadCategories();
    await loadProducts();

    const searchInput = document.getElementById('inventorySearch');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadProducts();
        }, 350));
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            loadProducts();
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

async function loadProducts() {
    const searchInput = document.getElementById('inventorySearch');
    const categoryFilter = document.getElementById('categoryFilter');

    const params = new URLSearchParams();
    params.set('page', '0');
    params.set('size', '200');

    const q = searchInput ? searchInput.value.trim() : '';
    const categoryId = categoryFilter ? categoryFilter.value : '';

    if (q) params.set('q', q);
    if (categoryId) params.set('category', categoryId);

    try {
        const data = await apiGet(`/api/admin/products?${params.toString()}`);
        inventoryProducts = data?.content || [];

        // Fetch details for active flag (AdminProductDto includes active)
        const detailList = await Promise.all(
            inventoryProducts.map(p => apiGet(`/api/admin/products/${p.id}`))
        );
        inventoryDetails = new Map(detailList.map(d => [d.id, d]));

        renderProducts(inventoryProducts);
        updateInventoryStats(data?.totalElements ?? inventoryProducts.length, detailList);
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
        const img = p.mainImageUrl || '../../img/icon.png';

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
