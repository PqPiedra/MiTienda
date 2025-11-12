// Contraseña del Front-End (debe coincidir con la del server.js)
const ADMIN_PASSWORD = "admin123"; // <-- ¡Debe ser la misma que en server.js!

document.addEventListener('DOMContentLoaded', () => {

    // --- Obtener Elementos ---
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    
    // Pestañas
    const navStockBtn = document.getElementById('nav-stock');
    const navReportesBtn = document.getElementById('nav-reportes');
    const pageStock = document.getElementById('page-stock');
    const pageReportes = document.getElementById('page-reportes');
    
    // Página Stock
    const productSelect = document.getElementById('product-select');
    const quantityInput = document.getElementById('quantity-input');
    const addStockButton = document.getElementById('add-stock-button');
    const adminMessage = document.getElementById('admin-message');

    // Página Reportes
    const statIngresos = document.getElementById('stat-ingresos');
    const statVentas = document.getElementById('stat-ventas');
    const statTopProductos = document.getElementById('stat-top-productos');
    const refreshReportBtn = document.getElementById('refresh-report-btn');

    let currentPassword = ""; // Guardar la contraseña aquí después del login

    // --- Lógica de Login ---
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            currentPassword = passwordInput.value; 
            loginContainer.classList.add('oculto');
            dashboardContainer.classList.remove('oculto');
            loadAdminProducts();
        } else {
            loginError.innerText = "Contraseña incorrecta.";
            loginError.style.display = 'block';
        }
    });

    // --- Lógica de Pestañas ---
    navStockBtn.addEventListener('click', () => {
        pageReportes.classList.add('oculto');
        pageStock.classList.remove('oculto');
        navReportesBtn.classList.remove('active');
        navStockBtn.classList.add('active');
    });

    navReportesBtn.addEventListener('click', () => {
        pageStock.classList.add('oculto');
        pageReportes.classList.remove('oculto');
        navStockBtn.classList.remove('active');
        navReportesBtn.classList.add('active');
        loadReport();
    });

    // --- Lógica del Panel de Stock ---
    
    async function loadAdminProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/admin/productos');
            const productos = await response.json();
            
            productSelect.innerHTML = '<option value="">-- Selecciona un producto --</option>';
            
            productos.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.text = `${p.nombre} (Stock: ${p.stock})`;
                productSelect.appendChild(option);
            });
            
        } catch (error) {
            adminMessage.style.color = 'red';
            adminMessage.innerText = "Error al cargar productos.";
        }
    }

    addStockButton.addEventListener('click', async () => {
        const productId = productSelect.value;
        const quantityToAdd = quantityInput.value;
        
        if (!productId || !quantityToAdd || quantityToAdd <= 0) {
            adminMessage.style.color = 'red';
            adminMessage.innerText = "Por favor, selecciona un producto y una cantidad válida.";
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/admin/add-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId: parseInt(productId),
                    quantityToAdd: parseInt(quantityToAdd),
                    password: currentPassword 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error desconocido');
            }

            adminMessage.style.color = 'green';
            adminMessage.innerText = `¡Éxito! Stock actualizado.`;
            
            quantityInput.value = "";
            loadAdminProducts(); // Recargar la lista

        } catch (error) {
            adminMessage.style.color = 'red';
            adminMessage.innerText = `Error: ${error.message}`;
        }
    });
    
    // --- Lógica del Panel de Reportes ---
    refreshReportBtn.addEventListener('click', loadReport);

    async function loadReport() {
        statIngresos.innerText = "...";
        statVentas.innerText = "...";
        statTopProductos.innerHTML = "<li>Cargando reporte...</li>";
        
        try {
            const response = await fetch('http://localhost:3000/api/admin/reporte-ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: currentPassword }) 
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'No se pudo cargar el reporte.');
            }
            
            statIngresos.innerText = formatearPrecio(data.stats.totalIngresos);
            statVentas.innerText = data.stats.totalVentas;
            
            statTopProductos.innerHTML = "";
            if (data.topProductos.length === 0) {
                statTopProductos.innerHTML = "<li>Aún no hay ventas registradas.</li>";
            }
            
            // Esta función recibe la lista ya ordenada desde el servidor
            data.topProductos.forEach(prod => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${prod._id}</span> 
                    <strong>${prod.totalVendido} vendidos</strong>
                `;
                statTopProductos.appendChild(li);
            });
            
        } catch (error) {
            console.error("Error al cargar reporte:", error);
            statTopProductos.innerHTML = `<li style="color:red;">Error al cargar reporte: ${error.message}</li>`;
        }
    }
    
    function formatearPrecio(precio) {
      if (typeof precio !== 'number') {
          precio = 0;
      }
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
      }).format(precio);
    }
});