// --- 1. DEFINIR LOS DATOS DE LAS CATEGORÍAS (para los mosaicos) ---
const categoriasInfo = {
  'bebidas': { 
    nombre: "Bebidas", 
    imagen: "images/bebidas.jpg", // <-- CAMBIADO
    descripcion: "Refrescantes opciones para calmar tu sed." 
  },
  'snacks': { 
    nombre: "Snacks", 
    imagen: "images/snacks.jpg", // <-- CAMBIADO
    descripcion: "El complemento perfecto para cualquier momento." 
  },
  'dulces': { 
    nombre: "Dulces", 
    imagen: "images/dulces.jpg", // <-- CAMBIADO
    descripcion: "Para endulzar tu día con el mejor sabor." 
  },
  'bebidas-calientes': { 
    nombre: "Bebidas Calientes", 
    imagen: "images/calientes.jpg", // <-- CAMBIADO
    descripcion: "Ideales para el frío o para relajarse." 
  }
};

// --- 2. VARIABLES GLOBALES ---
let productosActuales = []; 
let carrito = []; // ¡Nuestra estructura de carrito ahora será: [{ producto: {...}, cantidad: 1 }]

// --- 3. OBTENER LOS ELEMENTOS DEL HTML ---
// Contenedores
const contSeleccion = document.getElementById("contenedor-seleccion");
const contPago = document.getElementById("contenedor-pago");
const contQr = document.getElementById("contenedor-qr");

// Elementos de Selección
const categoriasGrid = document.getElementById("categorias-grid");
const productosGridContainer = document.getElementById("productos-grid-container");
const botonVolverCategorias = document.getElementById("boton-volver-categorias");
const nombreCategoriaSeleccionada = document.getElementById("nombre-categoria-seleccionada");
const productosGrid = document.getElementById("productos-grid");

// Carrito
const carritoResumen = document.getElementById("carrito-resumen");
const carritoLista = document.getElementById("carrito-lista");
const carritoTotal = document.getElementById("carrito-total");
const botonIrAPagar = document.getElementById("boton-ir-a-pagar");

// Pago
const pagoLista = document.getElementById("pago-lista");
const pagoTotal = document.getElementById("pago-total");
const botonPagarFinal = document.getElementById("boton-pagar-final");

// QR
const qrOrderId = document.getElementById("qr-order-id");
const botonNuevoPedido = document.getElementById("boton-nuevo-pedido");
const qrCodeDiv = document.getElementById("qrcode");


// --- 4. FUNCIÓN PARA FORMATEAR EL PRECIO (CLP) ---
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(precio);
}

// --- 5. FUNCIÓN PARA CARGAR LAS CATEGORÍAS EN EL MOSAICO ---
function cargarCategorias() {
  categoriasGrid.innerHTML = ''; 
  productosGridContainer.classList.add('oculto'); 

  for (const key in categoriasInfo) {
    const categoria = categoriasInfo[key];
    const item = document.createElement('div');
    item.classList.add('grid-item');
    item.dataset.categoriaKey = key; 

    item.innerHTML = `
      <img src="${categoria.imagen}" alt="${categoria.nombre}">
      <h4>${categoria.nombre}</h4>
      <p>${categoria.descripcion}</p>
    `;

    item.addEventListener('click', () => mostrarProductosDeCategoria(key, categoria.nombre));
    categoriasGrid.appendChild(item);
  }
}

// --- 6. FUNCIÓN PARA MOSTRAR LOS PRODUCTOS (Con aviso de stock bajo) ---
async function mostrarProductosDeCategoria(categoriaKey, nombreDisplay) {
  categoriasGrid.classList.add('oculto'); 
  productosGridContainer.classList.remove('oculto'); 
  nombreCategoriaSeleccionada.innerText = nombreDisplay; 

  productosGrid.innerHTML = '<p>Cargando productos...</p>'; 

  try {
    const respuesta = await fetch(`http://localhost:3000/api/productos?categoria=${categoriaKey}`);
    if (!respuesta.ok) { 
        throw new Error(`Error del servidor: ${respuesta.statusText}`);
    }
    productosActuales = await respuesta.json(); 
    
    productosGrid.innerHTML = ''; 

    if (productosActuales.length === 0) {
      productosGrid.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      return;
    }

    productosActuales.forEach((producto, index) => {
      const item = document.createElement('div');
      item.dataset.productoIndex = index; 

      let botonHTML = '';
      let stockHTML = ''; 

      if (producto.stock > 0) {
        item.classList.add('grid-item');
        botonHTML = `<button class="add-to-cart-btn">Añadir</button>`;
        
        if (producto.stock <= 10) {
            stockHTML = `<p class="stock-warning">¡Quedan solo ${producto.stock}!</p>`;
        }

      } else {
        item.classList.add('grid-item', 'agotado');
        botonHTML = `<button class="add-to-cart-btn agotado-btn" disabled>Agotado</button>`;
      }

      item.innerHTML = `
        <img src="${producto.imagen}" alt="${producto.nombre}">
        <h4>${producto.nombre}</h4>
        <p>${producto.descripcion || 'Sin descripción.'}</p>
        ${stockHTML}
        <span class="precio">${formatearPrecio(producto.precio)}</span>
        ${botonHTML} 
      `;

      if (producto.stock > 0) {
        item.querySelector('.add-to-cart-btn').addEventListener('click', (event) => {
          event.stopPropagation(); 
          anadirProductoAlCarrito(index);
        });
      }
      
      productosGrid.appendChild(item);
    });

  } catch (error) {
    console.error("Error al cargar productos:", error);
    productosGrid.innerHTML = `<p style="color: red;">No se pudieron cargar los productos: ${error.message}.</p>`;
  }
}

// -----------------------------------------------------------------
// --- 7. LÓGICA DEL CARRITO INTELIGENTE (¡ACTUALIZADO!) ---
// -----------------------------------------------------------------

function anadirProductoAlCarrito(index) {
  const productoAAgregar = productosActuales[index];
  
  // Buscar si el producto ya está en el carrito
  const itemExistente = carrito.find(item => item.producto.id === productoAAgregar.id);
  
  // Revisar si la cantidad que queremos añadir supera el stock
  const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;
  
  if (cantidadEnCarrito + 1 > productoAAgregar.stock) {
      alert("¡No puedes añadir más de este producto! Stock alcanzado.");
      return;
  }

  if (itemExistente) {
      // Si ya existe, solo incrementa la cantidad
      itemExistente.cantidad++;
  } else {
      // Si no existe, lo añade al carrito con cantidad 1
      carrito.push({
          producto: productoAAgregar,
          cantidad: 1
      });
  }
  
  actualizarVistaCarrito();
  
  // Feedback visual en el botón
  const boton = productosGrid.querySelector(`[data-producto-index="${index}"] .add-to-cart-btn`);
  if(boton){
    boton.innerText = "¡Añadido!";
    setTimeout(() => { boton.innerText = "Añadir"; }, 1000);
  }
}

// Nueva función para restar (o eliminar)
function restarItemDelCarrito(productoId) {
    const itemIndex = carrito.findIndex(item => item.producto.id === productoId);
    
    if (itemIndex > -1) { // Si lo encuentra
        carrito[itemIndex].cantidad--;
        
        // Si la cantidad llega a 0, elimina el producto del carrito
        if (carrito[itemIndex].cantidad === 0) {
            carrito.splice(itemIndex, 1);
        }
        
        actualizarVistaCarrito();
    }
}

// Nueva función para sumar (con control de stock)
function sumarItemAlCarrito(productoId) {
    const item = carrito.find(item => item.producto.id === productoId);
    
    if (item) { // Si lo encuentra
        // Revisar el stock
        if (item.cantidad + 1 > item.producto.stock) {
            alert("¡No puedes añadir más de este producto! Stock alcanzado.");
            return;
        }
        item.cantidad++;
        actualizarVistaCarrito();
    }
}

// Función ACTUALIZADA para dibujar el carrito
function actualizarVistaCarrito() {
  carritoLista.innerHTML = ""; // Limpiar lista
  let total = 0;
  
  if (carrito.length === 0) {
    carritoResumen.classList.add("oculto");
    return;
  }

  carrito.forEach(item => {
    const { producto, cantidad } = item;
    
    const li = document.createElement("li");
    
    li.innerHTML = `
      <div class="item-info">
        <span>${producto.nombre}</span>
        <strong>${formatearPrecio(producto.precio)}</strong>
      </div>
      <div class="item-controles">
        <button class="control-btn restar" data-id="${producto.id}">-</button>
        <span class="cantidad">${cantidad}x</span>
        <button class="control-btn sumar" data-id="${producto.id}">+</button>
      </div>
    `;
    
    // Añadimos los eventos a los nuevos botones
    li.querySelector('.restar').addEventListener('click', () => restarItemDelCarrito(producto.id));
    li.querySelector('.sumar').addEventListener('click', () => sumarItemAlCarrito(producto.id));

    carritoLista.appendChild(li);
    total += (producto.precio * cantidad); // Calcular total
  });
  
  carritoTotal.innerText = `Total: ${formatearPrecio(total)}`;
  carritoResumen.classList.remove("oculto");
}

// -----------------------------------------------------------------
// --- FIN DE LA LÓGICA DEL CARRITO INTELIGENTE ---
// -----------------------------------------------------------------

// --- 9. LÓGICA DE NAVEGACIÓN (Botón Volver) ---
botonVolverCategorias.addEventListener('click', () => {
  productosGridContainer.classList.add('oculto');
  categoriasGrid.classList.remove('oculto');
  productosActuales = []; 
});

// --- 10. LÓGICA DE PAGO Y QR ---

// "Ir a Pagar" (ACTUALIZADO para el nuevo carrito)
botonIrAPagar.addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }
  contSeleccion.classList.add("oculto");
  contPago.classList.remove("oculto");
  
  pagoLista.innerHTML = "";
  let total = 0;
  
  carrito.forEach(item => {
    const { producto, cantidad } = item;
    const li = document.createElement("li");
    li.innerHTML = `<span>${cantidad}x ${producto.nombre}</span> <strong>${formatearPrecio(producto.precio * cantidad)}</strong>`;
    pagoLista.appendChild(li);
    total += (producto.precio * cantidad);
  });
  
  pagoTotal.innerText = formatearPrecio(total);
});

// "Confirmar y Pagar" (ACTUALIZADO para enviar el nuevo carrito)
botonPagarFinal.addEventListener("click", async () => {
  
  botonPagarFinal.disabled = true;
  botonPagarFinal.innerText = "Procesando pago...";
  
  try {
    // Convertimos el carrito al formato que el Back-End espera
    const carritoParaEnviar = carrito.map(item => ({
        id: item.producto.id,
        nombre: item.producto.nombre,
        precio: item.producto.precio,
        cantidad: item.cantidad // ¡Enviamos la cantidad!
    }));

    const respuesta = await fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ carrito: carritoParaEnviar }) // Enviamos el carrito con cantidades
    });
    
    if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(errorData.error || 'Error desconocido al procesar el pago.');
    }

    const datosDelPedido = await respuesta.json();
    
    contPago.classList.add("oculto");
    contQr.classList.remove("oculto");
    
    const orderId = datosDelPedido.idPedido; 
    qrOrderId.innerText = orderId;
    
    qrCodeDiv.innerHTML = "";

    try {
      new QRCode(qrCodeDiv, {
        // ESTA ES LA LÍNEA CORRECTA
text: orderId,
        width: 150,
        height: 150
      });
    } catch (e) {
      console.error("Error al generar QR:", e);
      qrCodeDiv.innerText = "Error al generar QR.";
    }

  } catch (error) {
    console.error("Error en el proceso de pago:", error);
    alert(`Ocurrió un error al procesar el pago: ${error.message}`);
    botonPagarFinal.disabled = false;
    botonPagarFinal.innerText = "Confirmar y Pagar";
  }
});

// "Hacer nuevo pedido"
botonNuevoPedido.addEventListener("click", () => {
  resetAplicacion();
});

// --- 11. FUNCIÓN DE RESETEO (ACTUALIZADA) ---
function resetAplicacion() {
  carrito = []; // Resetea el carrito
  productosActuales = [];

  contSeleccion.classList.remove("oculto");
  contPago.classList.add("oculto");
  contQr.classList.add("oculto");

  categoriasGrid.classList.remove("oculto"); 
  productosGridContainer.classList.add("oculto"); 
  
  carritoResumen.classList.add("oculto"); // Oculta el carrito
  carritoLista.innerHTML = "";
  carritoTotal.innerText = "Total: $ 0";
  
  botonPagarFinal.disabled = false;
  botonPagarFinal.innerText = "Confirmar y Pagar";
  
  qrCodeDiv.innerHTML = "";
  qrOrderId.innerText = "";

  cargarCategorias(); 
}

// --- 12. INICIO DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', cargarCategorias);