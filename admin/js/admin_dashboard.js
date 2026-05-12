let categoryChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que Chart.js está cargado
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please check script order.');
        return;
    }

    const user = await ensureAdmin();
    if (!user) return;

    await loadDashboard();
});

async function loadDashboard() {
    try {
        // Cargar todos los datos en paralelo
        const [dashboard, productsPage, rentalsPage] = await Promise.all([
            apiGet('/api/admin/dashboard'),
            apiGet('/api/admin/products?page=0&size=1'),
            apiGet('/api/admin/rentals?size=5&status=VENCIDO')
        ]);

        console.log('Dashboard data:', dashboard);
        console.log('Products page:', productsPage);
        console.log('Rentals:', rentalsPage);

        // Cargar KPIs
        if (dashboard) {
            // Total de productos desde la paginación
            const totalProducts = productsPage?.totalElements ?? 0;
            setText('metricTotalProducts', totalProducts);

            // Rentas activas hoy
            setText('metricActiveRentals', dashboard.activeRentalsToday ?? 0);

            // Rentas vencidas
            const overdueRentals = dashboard.overdueRentals ?? 0;
            setText('metricOverdueRentals', overdueRentals);

            // Ingresos mensuales
            setText('metricRevenue', formatCurrency(dashboard.revenueThisMonth ?? 0));

            // Gráfica de ocupación
            if (dashboard.categoryOccupation && dashboard.categoryOccupation.length > 0) {
                initCategoryChart(dashboard.categoryOccupation);
            }
        }

        // Cargar actividad reciente - obtener rentas por estado
        try {
            const allRentals = await apiGet('/api/admin/rentals?page=0&size=5&sort=createdAt,desc');
            if (allRentals?.content) {
                renderRecentActivity(allRentals.content);
            }
        } catch (err) {
            console.error('Error loading recent activity:', err);
        }

    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function renderRecentActivity(rentals) {
    const list = document.getElementById('activityList');
    if (!list) return;

    if (!rentals || rentals.length === 0) {
        list.innerHTML = '<div class="activity-item"><div class="ticket-info"><div class="ticket-user">Sin actividad reciente</div></div></div>';
        return;
    }

    list.innerHTML = rentals.map((r) => {
        if (!r) return '';
        
        const status = mapDashboardStatus(r.status);
        
        // Obtener nombre del primer artículo
        let itemName = 'Sin artículo';
        if (r.items && r.items.length > 0) {
            itemName = r.items[0].productName || 'Sin artículo';
        }
        
        return `
            <div class="activity-item">
                <div class="ticket-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div class="ticket-info">
                    <div class="ticket-user"><strong>${r.code || 'N/A'}</strong> · ${r.userFullName || 'Cliente'}</div>
                    <div class="ticket-desc">${itemName}</div>
                </div>
                <div class="ticket-status">
                    <span class="status-badge ${status.className}">${status.label}</span>
                </div>
                <div class="ticket-price">${formatCurrency(r.total || 0)}</div>
            </div>
        `;
    }).join('');
}

function mapDashboardStatus(status) {
    switch (status) {
        case 'ACTIVO':
            return { label: 'En Progreso', className: 'badge-blue' };
        case 'FINALIZADO':
            return { label: 'Devuelto', className: 'badge-green' };
        case 'PENDIENTE':
            return { label: 'Pendiente', className: 'badge-orange' };
        case 'VENCIDO':
            return { label: 'Vencido', className: 'badge-red' };
        case 'CANCELADO':
            return { label: 'Cancelado', className: 'badge-gray' };
        default:
            return { label: String(status || 'N/A'), className: 'badge-orange' };
    }
}

function initCategoryChart(categoryData) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) {
        console.warn('Canvas element not found');
        return;
    }

    if (!categoryData || categoryData.length === 0) {
        console.warn('No category data available');
        // Mostrar mensaje en canvas
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de ocupación disponibles', canvas.width/2, canvas.height/2);
        return;
    }

    // Validar que los datos tengan la estructura correcta
    const hasValidData = categoryData.every(c => 
        c && typeof c === 'object' && 
        'categoryName' in c && 
        ('activeUnits' in c || 'occupancyPercentage' in c)
    );

    if (!hasValidData) {
        console.error('Invalid category data structure:', categoryData);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ef4444';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error al cargar datos de ocupación', canvas.width/2, canvas.height/2);
        return;
    }

    // Ordenar por activeUnits desc y tomar top 5
    const top5 = [...categoryData]
        .sort((a, b) => {
            const va = Number(a.activeUnits !== undefined ? a.activeUnits : a.occupancyPercentage) || 0;
            const vb = Number(b.activeUnits !== undefined ? b.activeUnits : b.occupancyPercentage) || 0;
            return vb - va;
        })
        .slice(0, 5);

    // Preparar datos para Chart.js
    const labels = top5.map(c => c.categoryName || 'Sin nombre');
    const occupancy = top5.map(c => {
        // Usar activeUnits si existe, sino occupancyPercentage
        const val = Number(c.activeUnits !== undefined ? c.activeUnits : c.occupancyPercentage);
        return isNaN(val) ? 0 : Math.max(0, val);
    });

    console.log('Chart labels:', labels);
    console.log('Chart occupancy:', occupancy);

    // Destruir gráfica anterior si existe
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }

    // Dar un poco de tiempo para que el DOM esté listo
    setTimeout(() => {
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Could not get 2D context from canvas');
                return;
            }

            categoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Unidades Alquiladas Hoy',
                        data: occupancy,
                        backgroundColor: [
                            '#df2be4',
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6',
                            '#06b6d4',
                            '#ec4899'
                        ],
                        borderColor: [
                            '#c026d3',
                            '#1d4ed8',
                            '#047857',
                            '#d97706',
                            '#dc2626',
                            '#7c3aed',
                            '#0891b2',
                            '#be185d'
                        ],
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        hoverBackgroundColor: [
                            '#c026d3',
                            '#1d4ed8',
                            '#047857',
                            '#d97706',
                            '#dc2626',
                            '#7c3aed',
                            '#0891b2',
                            '#be185d'
                        ],
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    indexAxis: 'x',
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: {
                                    size: 13,
                                    weight: '600'
                                },
                                color: '#1e293b',
                                padding: 15,
                                usePointStyle: false,
                                boxWidth: 15
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                            padding: 12,
                            titleFont: {
                                size: 13,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 12
                            },
                            borderColor: '#e2e8f0',
                            borderWidth: 1,
                            borderRadius: 8,
                            displayColors: true,
                            boxPadding: 8,
                            callbacks: {
                                label: function(context) {
                                    return ' ' + context.parsed.y + ' unidades alquiladas';
                                },
                                afterLabel: function(context) {
                                    if (context.parsed.y === 0) {
                                        return ' (Disponible)';
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    size: 11
                                },
                                color: '#94a3b8',
                                stepSize: 1
                            },
                            grid: {
                                color: 'rgba(241, 245, 249, 0.5)',
                                drawBorder: false
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 12,
                                    weight: '500'
                                },
                                color: '#64748b'
                            },
                            grid: {
                                display: false,
                                drawBorder: false
                            }
                        }
                    }
                }
            });

            console.log('Chart initialized successfully');
        } catch (err) {
            console.error('Error initializing chart:', err);
        }
    }, 100);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? '0');
}


