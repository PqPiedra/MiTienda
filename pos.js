let carritoPOS = []; 
// URL DE PRODUCCIÓN (RENDER)
const API_URL = "https://mi-tienda-final.onrender.com"; 

const scannerInput = document.getElementById('scanner-input');
const carritoLista = document.getElementById('pos-carrito-lista');
const carritoTotal = document.getElementById('pos-carrito-total');
const botonFinalizarVenta = document.getElementById('boton-finalizar-venta');
const posMessage = document.getElementById('pos-message');

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(precio);
}

// 1. LÓGICA ESCÁNER
scannerInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        const barcode = scannerInput.value.trim();
        if (barcode === "") return; 

        try {
            // API DE RENDER
            const response = await fetch(`${API_URL}/api/pos/barcode/${barcode}`);
            
            if (response.ok) {
                const producto = await response.json();
                if (producto.stock > 0) {
                    agregarAlCarritoPOS(producto);
                    posMessage.innerText = ""; 
                } else {
                    posMessage.innerText = `AGOTADO: ${producto.nombre}`;
                }
            } else {
                posMessage.innerText = `No encontrado: ${barcode}`;
            }
        } catch (error) {
            posMessage.innerText = "Error de conexión con el servidor.";
        }
        scannerInput.value = "";
    }
});

// 2. FUNCIONES DE CONTROL DE CANTIDAD
function restarItemDelCarritoPOS(productoId) {
    const itemIndex = carritoPOS.findIndex(item => item.id === productoId);
    if (itemIndex > -1) { 
        carritoPOS[itemIndex].cantidad--;
        if (carritoPOS[itemIndex].cantidad === 0) carritoPOS.splice(itemIndex, 1);
        actualizarVistaCarritoPOS();
    }
}

function sumarItemAlCarritoPOS(productoId) {
    const item = carritoPOS.find(item => item.id === productoId);
    if (item) {
        if (item.cantidad + 1 > item.stock) {
            alert("Stock alcanzado.");
            return;
        }
        item.cantidad++;
        actualizarVistaCarritoPOS();
    }
}

// 3. LÓGICA DE CARRITO
function agregarAlCarritoPOS(producto) {
    const itemExistente = carritoPOS.find(item => item.id === producto.id);
    const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;
    
    if (cantidadEnCarrito + 1 > producto.stock) {
        posMessage.innerText = `¡Stock máximo alcanzado para "${producto.nombre}"!`;
        return;
    }

    if(itemExistente){
        itemExistente.cantidad++;
    } else {
        carritoPOS.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            stock: producto.stock 
        });
    }
    actualizarVistaCarritoPOS();
}

function actualizarVistaCarritoPOS() {
    carritoLista.innerHTML = "";
    let total = 0;

    if (carritoPOS.length === 0) {
        carritoLista.innerHTML = "<li>Carrito vacío.</li>";
        botonFinalizarVenta.disabled = true;
        botonFinalizarVenta.style.backgroundColor = '#6c757d';
        carritoTotal.innerText = "Total: $ 0";
        return;
    }

    carritoPOS.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-info"><span>${item.nombre}</span></div>
            <div class="item-controles">
                <button class="control-btn restar" data-id="${item.id}">-</button>
                <span class="cantidad">${item.cantidad}x</span>
                <button class="control-btn sumar" data-id="${item.id}">+</button>
                <strong>${formatearPrecio(item.precio * item.cantidad)}</strong>
            </div>
        `;
        li.querySelector('.restar').addEventListener('click', () => restarItemDelCarritoPOS(item.id));
        li.querySelector('.sumar').addEventListener('click', () => sumarItemAlCarritoPOS(item.id));
        carritoLista.appendChild(li);
        total += (item.precio * item.cantidad);
    });
    
    carritoTotal.innerText = `Total: ${formatearPrecio(total)}`;
    botonFinalizarVenta.disabled = false;
    botonFinalizarVenta.style.backgroundColor = '#28a745';
}

// 4. FINALIZAR VENTA
botonFinalizarVenta.addEventListener('click', async () => {
    if (carritoPOS.length === 0) return;
    try {
        botonFinalizarVenta.disabled = true;
        botonFinalizarVenta.innerText = "Procesando...";
        // API DE RENDER
        const res = await fetch(`${API_URL}/api/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carrito: carritoPOS }) 
        });
        
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        alert(`¡Venta Exitosa! Ticket #${data.idPedido}`);
        
        carritoPOS = [];
        actualizarVistaCarritoPOS();
        posMessage.innerText = "";
        scannerInput.focus();
    } catch (error) {
        alert("Error al procesar la venta.");
    } finally {
        botonFinalizarVenta.disabled = false;
        botonFinalizarVenta.innerText = "Finalizar Venta (Cobrar)";
    }
});

document.addEventListener('DOMContentLoaded', () => {
    scannerInput.focus();
    document.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target !== scannerInput) scannerInput.focus();
    });
    actualizarVistaCarritoPOS();
});