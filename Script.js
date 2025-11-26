// URL DE PRODUCCIÓN (RENDER)
const API_URL = "https://mi-tienda-final.onrender.com";

const categoriasInfo = {
  'bebidas': { nombre: "Bebidas", imagen: "images/bebidas.jpg", descripcion: "Refrescantes opciones." },
  'snacks': { nombre: "Snacks", imagen: "images/snacks.jpg", descripcion: "El complemento perfecto." },
  'dulces': { nombre: "Dulces", imagen: "images/dulces.jpg", descripcion: "Para endulzar tu día." },
  'bebidas-calientes': { nombre: "Bebidas Calientes", imagen: "images/calientes.jpg", descripcion: "Ideales para el frío." }
};

let productosActuales = []; 
let carrito = []; 

const contSeleccion = document.getElementById("contenedor-seleccion");
const contPago = document.getElementById("contenedor-pago");
const contQr = document.getElementById("contenedor-qr");
const categoriasGrid = document.getElementById("categorias-grid");
const productosGridContainer = document.getElementById("productos-grid-container");
const botonVolverCategorias = document.getElementById("boton-volver-categorias");
const nombreCategoriaSeleccionada = document.getElementById("nombre-categoria-seleccionada");
const productosGrid = document.getElementById("productos-grid");
const carritoResumen = document.getElementById("carrito-resumen");
const carritoLista = document.getElementById("carrito-lista");
const carritoTotal = document.getElementById("carrito-total");
const botonIrAPagar = document.getElementById("boton-ir-a-pagar");
const pagoLista = document.getElementById("pago-lista");
const pagoTotal = document.getElementById("pago-total");
const botonPagarFinal = document.getElementById("boton-pagar-final");
const qrOrderId = document.getElementById("qr-order-id");
const botonNuevoPedido = document.getElementById("boton-nuevo-pedido");
const qrCodeDiv = document.getElementById("qrcode");

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(precio);
}

function cargarCategorias() {
  categoriasGrid.innerHTML = ''; 
  productosGridContainer.classList.add('oculto'); 
  for (const key in categoriasInfo) {
    const categoria = categoriasInfo[key];
    const item = document.createElement('div');
    item.classList.add('grid-item');
    item.innerHTML = `<img src="${categoria.imagen}" alt="${categoria.nombre}"><h4>${categoria.nombre}</h4><p>${categoria.descripcion}</p>`;
    item.addEventListener('click', () => mostrarProductosDeCategoria(key, categoria.nombre));
    categoriasGrid.appendChild(item);
  }
}

async function mostrarProductosDeCategoria(categoriaKey, nombreDisplay) {
  categoriasGrid.classList.add('oculto'); 
  productosGridContainer.classList.remove('oculto'); 
  nombreCategoriaSeleccionada.innerText = nombreDisplay; 
  productosGrid.innerHTML = '<p>Cargando productos...</p>'; 

  try {
    const respuesta = await fetch(`${API_URL}/api/productos?categoria=${categoriaKey}`);
    if (!respuesta.ok) throw new Error("Error al cargar");
    productosActuales = await respuesta.json(); 
    
    productosGrid.innerHTML = ''; 
    if (productosActuales.length === 0) {
      productosGrid.innerHTML = '<p>No hay productos disponibles.</p>';
      return;
    }

    productosActuales.forEach((producto, index) => {
      const item = document.createElement('div');
      let botonHTML = '';
      let stockHTML = ''; 
      if (producto.stock > 0) {
        item.classList.add('grid-item');
        botonHTML = `<button class="add-to-cart-btn">Añadir</button>`;
        if (producto.stock <= 10) stockHTML = `<p class="stock-warning">¡Quedan solo ${producto.stock}!</p>`;
      } else {
        item.classList.add('grid-item', 'agotado');
        botonHTML = `<button class="add-to-cart-btn agotado-btn" disabled>Agotado</button>`;
      }
      item.innerHTML = `<img src="${producto.imagen}"><h4>${producto.nombre}</h4><p>${producto.descripcion}</p>${stockHTML}<span class="precio">${formatearPrecio(producto.precio)}</span>${botonHTML}`;
      if (producto.stock > 0) {
        item.querySelector('.add-to-cart-btn').addEventListener('click', (e) => { e.stopPropagation(); anadirProductoAlCarrito(index); });
      }
      productosGrid.appendChild(item);
    });
  } catch (error) {
    productosGrid.innerHTML = `<p style="color: red;">Error de conexión.</p>`;
  }
}

function anadirProductoAlCarrito(index) {
  const prod = productosActuales[index];
  const item = carrito.find(i => i.producto.id === prod.id);
  const qty = item ? item.cantidad : 0;
  if (qty + 1 > prod.stock) return alert("Stock alcanzado.");
  if (item) item.cantidad++;
  else carrito.push({ producto: prod, cantidad: 1 });
  actualizarVistaCarrito();
  const boton = productosGrid.querySelector(`[data-producto-index="${index}"] .add-to-cart-btn`);
  if(boton){ boton.innerText = "¡Añadido!"; setTimeout(() => { boton.innerText = "Añadir"; }, 1000); }
}

function restarItem(id) {
    const idx = carrito.findIndex(i => i.producto.id === id);
    if (idx > -1) { 
        carrito[idx].cantidad--;
        if (carrito[idx].cantidad === 0) carrito.splice(idx, 1);
        actualizarVistaCarrito();
    }
}

function sumarItem(id) {
    const item = carrito.find(i => i.producto.id === id);
    if (item) { 
        if (item.cantidad + 1 > item.producto.stock) return alert("Stock alcanzado.");
        item.cantidad++;
        actualizarVistaCarrito();
    }
}

function actualizarVistaCarrito() {
  carritoLista.innerHTML = "";
  let total = 0;
  if (carrito.length === 0) {
    carritoResumen.classList.add("oculto");
    return;
  }
  carrito.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="item-info"><span>${item.producto.nombre}</span><strong>${formatearPrecio(item.producto.precio)}</strong></div><div class="item-controles"><button class="control-btn restar" data-id="${item.producto.id}">-</button><span class="cantidad">${item.cantidad}x</span><button class="control-btn sumar" data-id="${item.producto.id}">+</button></div>`;
    li.querySelector('.restar').addEventListener('click', () => restarItem(item.producto.id));
    li.querySelector('.sumar').addEventListener('click', () => sumarItem(item.producto.id));
    carritoLista.appendChild(li);
    total += (item.producto.precio * item.cantidad);
  });
  carritoTotal.innerText = `Total: ${formatearPrecio(total)}`;
  carritoResumen.classList.remove("oculto");
}

botonVolverCategorias.addEventListener('click', () => {
  productosGridContainer.classList.add('oculto');
  categoriasGrid.classList.remove('oculto');
  productosActuales = []; 
});

botonIrAPagar.addEventListener("click", () => {
  if (carrito.length === 0) return alert("Carrito vacío.");
  contSeleccion.classList.add("oculto");
  contPago.classList.remove("oculto");
  pagoLista.innerHTML = "";
  let total = 0;
  carrito.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.cantidad}x ${item.producto.nombre}</span> <strong>${formatearPrecio(item.producto.precio * item.cantidad)}</strong>`;
    pagoLista.appendChild(li);
    total += (item.producto.precio * item.cantidad);
  });
  pagoTotal.innerText = formatearPrecio(total);
});

botonPagarFinal.addEventListener("click", async () => {
  botonPagarFinal.disabled = true;
  botonPagarFinal.innerText = "Procesando...";
  try {
    const payload = carrito.map(i => ({ id: i.producto.id, nombre: i.producto.nombre, precio: i.producto.precio, cantidad: i.cantidad }));
    const res = await fetch(`${API_URL}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrito: payload })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    contPago.classList.add("oculto");
    contQr.classList.remove("oculto");
    qrOrderId.innerText = data.idPedido;
    qrCodeDiv.innerHTML = "";
    new QRCode(qrCodeDiv, { text: data.idPedido.toString(), width: 150, height: 150 });
  } catch (error) {
    alert("Error al procesar pago.");
    botonPagarFinal.disabled = false;
    botonPagarFinal.innerText = "Confirmar y Pagar";
  }
});

botonNuevoPedido.addEventListener("click", () => { resetAplicacion(); });

function resetAplicacion() {
  carrito = []; productosActuales = [];
  contSeleccion.classList.remove("oculto"); contPago.classList.add("oculto"); contQr.classList.add("oculto");
  categoriasGrid.classList.remove("oculto"); productosGridContainer.classList.add("oculto"); 
  carritoResumen.classList.add("oculto");
  botonPagarFinal.disabled = false; botonPagarFinal.innerText = "Confirmar y Pagar";
  qrCodeDiv.innerHTML = ""; qrOrderId.innerText = "";
  cargarCategorias(); 
}
document.addEventListener('DOMContentLoaded', cargarCategorias);