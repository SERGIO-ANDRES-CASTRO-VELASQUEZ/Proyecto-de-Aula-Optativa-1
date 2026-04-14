document.addEventListener('DOMContentLoaded', () => {
    // 1. Simulación visual modo oscuro
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                alert('¡El Modo Oscuro es una característica Premium que implementaremos después! 😎\nPor ahora regresará al modo claro.');
                e.target.checked = false;
            }
        });
    }

    // 2. Interacción simple de las barras en el gráfico
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => {
        bar.addEventListener('mouseenter', () => {
            // Simular un tooltip
            bar.style.opacity = '0.8';
        });
        bar.addEventListener('mouseleave', () => {
            bar.style.opacity = '1';
        });
    });
});