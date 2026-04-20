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

    // Favoritos
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

    // Abrir el carrito
    // const rentBtns = document.querySelectorAll('.btn-rent');
    

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);


    // --- Profile Sidebar Logic ---
    const userProfileBtn = document.querySelector('.user-profile');
    const profileSidebar = document.getElementById('profileSidebar');
    const profileOverlay = document.getElementById('profileOverlay');
    const closeProfileBtn = document.getElementById('closeProfile');

    function openProfile() {
        if (profileSidebar) profileSidebar.classList.add('open');
        if (profileOverlay) profileOverlay.classList.add('active');
    }

    function closeProfile() {
        if (profileSidebar) profileSidebar.classList.remove('open');
        if (profileOverlay) profileOverlay.classList.remove('active');
    }

    if (userProfileBtn) userProfileBtn.addEventListener('click', openProfile);
    if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfile);
    if (profileOverlay) profileOverlay.addEventListener('click', closeProfile);

    // --- Edit Profile Logic ---
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileSidebarEl = document.getElementById('profileSidebar');
    const cancelSidebarEditBtn = document.getElementById('cancelSidebarEditBtn');
    const sidebarEditForm = document.getElementById('sidebarEditForm');

    function enterEditMode(e) {
        if(e) e.preventDefault();
        if(profileSidebarEl) profileSidebarEl.classList.add('editing');
    }

    function exitEditMode(e) {
        if(e) e.preventDefault();
        if(profileSidebarEl) profileSidebarEl.classList.remove('editing');
    }

    if(editProfileBtn) editProfileBtn.addEventListener('click', enterEditMode);
    if(cancelSidebarEditBtn) cancelSidebarEditBtn.addEventListener('click', exitEditMode);
    
    if(sidebarEditForm) {
        sidebarEditForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Evita recargar
            exitEditMode(); // Simplemente sale del modo edición, sin guardar
        });
    }

    // Resetear al cerrar todo el panel
    const closeProfileBtnEl = document.getElementById('closeProfile');
    const profileOverlayEl = document.getElementById('profileOverlay');
    if (closeProfileBtnEl) {
        closeProfileBtnEl.addEventListener('click', () => setTimeout(exitEditMode, 300));
    }
    if (profileOverlayEl) {
        profileOverlayEl.addEventListener('click', () => setTimeout(exitEditMode, 300));
    }
});
