// Contraseña del Front-End (debe coincidir con la del server.js)
const ADMIN_PASSWORD = "admin123"; // <-- ¡Debe ser la misma que en server.js!

document.addEventListener('DOMContentLoaded', () => {

    // --- Obtener Elementos ---
    const loginContainer = document.getElementById('login-container');
    const pageMonitor = document.getElementById('page-monitor');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    
    const listaVentasVivas = document.getElementById('lista-ventas-vivas');
    
    let currentPassword = ""; // Guardar la contraseña aquí
    
    // --- Lógica de Login ---
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            currentPassword = passwordInput.value; 
            loginContainer.classList.add('oculto');
            pageMonitor.classList.remove('oculto');
            
            // 1. Cargar las ventas inmediatamente
            cargarVentas();
            
            // 2. ¡EL POLLING! Actualizar las ventas cada 5 segundos
            setInterval(cargarVentas, 5000); // 5000 milisegundos = 5 segundos
            
        } else {
            loginError.innerText = "Contraseña incorrecta.";
            loginError.style.display = 'block';
        }
    });

    // --- Lógica del Monitor ---
    async function cargarVentas() {
        if (currentPassword === "") return; // No hacer nada si no se ha logueado

        console.log("Buscando nuevas ventas..."); // Puedes ver esto en la consola (F12)

        try {
            const response = await fetch('https://mi-tienda-final.onrender.com/api/admin/ultimos-pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: currentPassword }) // Enviar la contraseña
            });
            
            const pedidos = await response.json();
            
            if (!response.ok) {
                throw new Error(pedidos.error || 'No se pudo cargar el reporte.');
            }
            
            // Dibujar la lista de ventas
            listaVentasVivas.innerHTML = ""; // Limpiar la lista
            
            if (pedidos.length === 0) {
                listaVentasVivas.innerHTML = "<li>Aún no hay ventas registradas.</li>";
                return;
            }
            
            pedidos.forEach(pedido => {
                const li = document.createElement('li');
                li.classList.add('venta-item');
                
                // Formatear la fecha
                const fecha = new Date(pedido.fecha).toLocaleString('es-CL');
                
                // Crear la lista de productos
                let productosHTML = '<ul class="venta-item-productos">';
                pedido.items.forEach(item => {
                    productosHTML += `<li>${item.cantidad}x ${item.nombre}</li>`;
                });
                productosHTML += '</ul>';
                
                // Insertar todo el HTML
                li.innerHTML = `
                    <div class="venta-item-header">
                        <span class="pedido-id">${pedido.idPedido}</span>
                        <span class="pedido-total">${formatearPrecio(pedido.total)}</span>
                    </div>
                    <p class="pedido-fecha">${fecha}</p>
                    ${productosHTML}
                `;
                listaVentasVivas.appendChild(li);
            });
            
        } catch (error) {
            console.error("Error al cargar ventas:", error);
            listaVentasVivas.innerHTML = `<li style="color:red;">Error al cargar ventas: ${error.message}</li>`;
        }
    }
    
    // Función de formateo de precio (necesaria también aquí)
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