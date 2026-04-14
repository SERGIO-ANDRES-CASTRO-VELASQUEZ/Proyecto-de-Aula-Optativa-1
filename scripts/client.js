document.addEventListener('DOMContentLoaded', () => {
    // Funcionalidad básica del botón resetear
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Desmarcar checkboxes
            const checkboxes = document.querySelectorAll('.filter-checkbox input');
            checkboxes.forEach(cb => cb.checked = false);
            
            // Resetear slider de precio
            const priceSlider = document.getElementById('priceRange');
            if (priceSlider) {
                priceSlider.value = priceSlider.max;
            }
            
            alert('Filtros reseteados');
        });
    }

    // Funcionalidad de botones de favoritos (corazón)
    const favoriteBtns = document.querySelectorAll('.favorite-btn');
    favoriteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Alternar color rojo
            const isFav = btn.style.color === 'rgb(239, 68, 68)';
            btn.style.color = isFav ? '#94a3b8' : '#ef4444';
            btn.querySelector('svg').style.fill = isFav ? 'none' : '#ef4444';
        });
    });

    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.getElementById('closeCart');
    const continueShoppingBtn = document.getElementById('continueShopping');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartCount = document.getElementById('cartCount');
    const cartIndicator = document.getElementById('cartIndicator');
    const cartItemTitle = document.querySelector('.cart-item-info h4');
    const cartItemImage = document.querySelector('.cart-item-img');
    const cartItemPrice = document.querySelector('.cart-item-price');

    function openCart() {
        if (cartSidebar) cartSidebar.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('active');
    }

    function closeCart() {
        if (cartSidebar) cartSidebar.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('active');
    }

    function updateCartCounters(value) {
        if (cartCount) {
            cartCount.textContent = String(value);
        }
        if (cartIndicator) {
            cartIndicator.textContent = String(value);
        }
    }

    // Simulación de agregar al carrito/alquilar
    const rentBtns = document.querySelectorAll('.btn-rent:not(.btn-disabled)');
    rentBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.product-card');
            const productTitle = card.querySelector('.product-title').innerText;
            const productPrice = card.querySelector('.price strong').innerText;
            const productImg = card.querySelector('.product-image');

            if (cartItemTitle) {
                cartItemTitle.textContent = productTitle;
            }
            if (cartItemPrice) {
                cartItemPrice.textContent = productPrice;
            }
            if (cartItemImage && productImg) {
                cartItemImage.src = productImg.src;
                cartItemImage.alt = productImg.alt;
            }

            const currentCount = Number(cartCount ? cartCount.textContent : 0) || 0;
            updateCartCounters(currentCount + 1);
            openCart();
        });
    });

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
});