let carritoPOS = []; 
const API_URL = "https://mi-tienda-final.onrender.com"; // Producción

const scannerInput = document.getElementById('scanner-input');
const carritoLista = document.getElementById('pos-carrito-lista');
const carritoTotal = document.getElementById('pos-carrito-total');
const botonFinalizarVenta = document.getElementById('boton-finalizar-venta');
const posMessage = document.getElementById('pos-message');

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(precio);
}

scannerInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        const barcode = scannerInput.value.trim();
        if (barcode === "") return; 
        try {
            const response = await fetch(`${API_URL}/api/pos/barcode/${barcode}`);
            if (response.ok) {
                const producto = await response.json();
                if (producto.stock > 0) {
                    agregarAlCarritoPOS(producto);
                    posMessage.innerText = ""; 
                } else posMessage.innerText = `AGOTADO: ${producto.nombre}`;
            } else posMessage.innerText = `No encontrado: ${barcode}`;
        } catch (error) { posMessage.innerText = "Error de conexión"; }
        scannerInput.value = "";
    }
});

function agregarAlCarritoPOS(producto) {
    const item = carritoPOS.find(i => i.id === producto.id);
    const qty = item ? item.cantidad : 0;
    if (qty + 1 > producto.stock) return posMessage.innerText = "Stock máximo alcanzado";
    if(item) item.cantidad++;
    else carritoPOS.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, stock: producto.stock });
    actualizarVistaPOS();
}

function actualizarVistaPOS() {
    carritoLista.innerHTML = "";
    let total = 0;
    if (carritoPOS.length === 0) {
        carritoLista.innerHTML = "<li>Vacío</li>";
        botonFinalizarVenta.disabled = true;
        botonFinalizarVenta.style.backgroundColor = '#6c757d';
        return;
    }
    carritoPOS.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="item-info"><span>${item.nombre}</span></div><div class="item-controles"><button class="restar">-</button><span class="cantidad">${item.cantidad}x</span><button class="sumar">+</button><strong>${formatearPrecio(item.precio * item.cantidad)}</strong></div>`;
        li.querySelector('.restar').addEventListener('click', () => { item.cantidad--; if(item.cantidad===0) carritoPOS=carritoPOS.filter(i=>i.id!==item.id); actualizarVistaPOS(); });
        li.querySelector('.sumar').addEventListener('click', () => { if(item.cantidad+1<=item.stock) item.cantidad++; else alert("Stock límite"); actualizarVistaPOS(); });
        carritoLista.appendChild(li);
        total += (item.precio * item.cantidad);
    });
    carritoTotal.innerText = `Total: ${formatearPrecio(total)}`;
    botonFinalizarVenta.disabled = false;
    botonFinalizarVenta.style.backgroundColor = '#28a745';
}

botonFinalizarVenta.addEventListener('click', async () => {
    if (carritoPOS.length === 0) return;
    try {
        botonFinalizarVenta.disabled = true;
        botonFinalizarVenta.innerText = "Procesando...";
        const res = await fetch(`${API_URL}/api/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carrito: carritoPOS }) 
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        alert(`¡Venta OK! Ticket #${data.idPedido}`);
        carritoPOS = []; actualizarVistaPOS(); scannerInput.focus();
    } catch (error) { alert("Error al procesar"); } 
    finally { botonFinalizarVenta.disabled = false; botonFinalizarVenta.innerText = "Finalizar Venta"; }
});

document.addEventListener('DOMContentLoaded', () => {
    scannerInput.focus();
    document.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON' && e.target !== scannerInput) scannerInput.focus(); });
    actualizarVistaPOS();
});