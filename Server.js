// 1. Importar Express, Cors y Mongoose
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 2. Inicializar la aplicación Express
const app = express();
const PORT = 3000;

// -------- ¡Contraseña de Administrador! --------
const ADMIN_PASSWORD = "admin123"; // <-- ¡Cambia esto por tu contraseña secreta!
// ---------------------------------------------

// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 3. CONEXIÓN A MONGODB ---
// ¡CONEXIÓN A LA NUBE (ATLAS)!
const dbURL = 'mongodb+srv://joacomayega_db_user:RR9JtZoNiGOnlDy5@cluster0.k7gc9zz.mongodb.net/MiTienda?retryWrites=true&w=majority';

mongoose.connect(dbURL)
  .then(() => {
    console.log('¡Conectado a la base de datos MongoDB (MiTienda)!');
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });

// --- 4. DEFINIR LOS "MODELOS" ---
const productoSchema = new mongoose.Schema({
  id: Number,
  nombre: String,
  descripcion: String,
  precio: Number,
  imagen: String,
  categoria: String,
  stock: Number,
  codigoDeBarra: String // Añadimos el campo para el POS
});
const Producto = mongoose.model('Producto', productoSchema, 'productos');

const pedidoSchema = new mongoose.Schema({
  idPedido: String,
  items: Array,
  total: Number,
  fecha: { type: Date, default: Date.now } 
});
const Pedido = mongoose.model('Pedido', pedidoSchema, 'pedidos');


// --- 5. RUTAS DE API (PARA CLIENTES) ---

// OBTENER PRODUCTOS (Sin cambios)
app.get('/api/productos', async (req, res) => {
  const categoria = req.query.categoria;
  if (!categoria) {
    return res.status(400).json({ error: 'Debes especificar una categoría.' });
  }
  try {
    const productosFiltrados = await Producto.find({ categoria: categoria });
    res.json(productosFiltrados);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// CREAR PEDIDOS (Con carrito inteligente y descuento de stock)
app.post('/api/pedidos', async (req, res) => {
  const carrito = req.body.carrito;
  if (!carrito || carrito.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }

  try {
    let totalCalculado = 0;
    for (const item of carrito) {
        const productoDB = await Producto.findOne({ id: item.id });
        if (!productoDB) {
            throw new Error(`Producto ${item.nombre} no encontrado.`);
        }
        if (productoDB.stock < item.cantidad) {
            return res.status(400).json({ 
                error: `¡Stock insuficiente! Solo quedan ${productoDB.stock} de "${productoDB.nombre}".` 
            });
        }
        totalCalculado += (productoDB.precio * item.cantidad);
    }

    const nuevoIdPedido = "PEDIDO-" + Math.floor(Math.random() * 10000);
    const nuevoPedido = new Pedido({
      idPedido: nuevoIdPedido,
      items: carrito,
      total: totalCalculado
    });
    await nuevoPedido.save();
    
    // Descontar stock
    for (const item of carrito) {
      await Producto.updateOne(
        { id: item.id }, 
        { $inc: { stock: -item.cantidad } }
      );
    }
    
    console.log('Pedido guardado y stock actualizado:', nuevoIdPedido);
    res.status(201).json({ 
      mensaje: '¡Pedido creado con éxito!', 
      idPedido: nuevoIdPedido 
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al guardar el pedido' });
  }
});


// -----------------------------------------------------------------
// -------- RUTAS DE ADMINISTRADOR / POS / MONITOR --------
// -----------------------------------------------------------------

// RUTA ADMIN para OBTENER TODOS LOS PRODUCTOS
app.get('/api/admin/productos', async (req, res) => {
  try {
    const productos = await Producto.find({}, 'id nombre stock').sort({ nombre: 1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar productos de admin' });
  }
});

// RUTA ADMIN para AÑADIR STOCK
app.post('/api/admin/add-stock', async (req, res) => {
  const { productId, quantityToAdd, password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
  }
  
  const cantidad = parseInt(quantityToAdd);
  if (!productId || !cantidad || !Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'Datos incompletos o cantidad inválida.' });
  }

  try {
    const resultado = await Producto.updateOne(
      { id: productId },
      { $inc: { stock: cantidad } } 
    );
    
    if (resultado.matchedCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    console.log(`ADMIN: Se añadieron ${cantidad} unidades al producto ID ${productId}`);
    res.json({ mensaje: '¡Stock actualizado con éxito!' });

  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el stock' });
  }
});

// RUTA POS PARA BUSCAR POR CÓDIGO DE BARRAS
app.get('/api/pos/barcode/:code', async (req, res) => {
    try {
        const barcode = req.params.code; 
        const producto = await Producto.findOne({ codigoDeBarra: barcode });
        
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ error: 'Producto no encontrado.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// RUTA ADMIN para REPORTE DE VENTAS (ACTUALIZADA, sin límite y ordenada)
app.post('/api/admin/reporte-ventas', async (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
    }

    try {
        const stats = await Pedido.aggregate([
            {
                $group: {
                    _id: null,
                    totalIngresos: { $sum: "$total" },
                    totalVentas: { $sum: 1 } 
                }
            }
        ]);

        // Agregación para Todos los Productos Vendidos (ordenados)
        const topProductos = await Pedido.aggregate([
            { $unwind: "$items" }, // Separa los items de los pedidos
            {
                $group: {
                    _id: "$items.nombre", // Agrupa por nombre de producto
                    totalVendido: { $sum: "$items.cantidad" } // Suma la cantidad vendida
                }
            },
            { $sort: { totalVendido: -1 } } // Ordena por totalVendido (de mayor a menor)
        ]);
        
        res.json({
            stats: stats[0] || { totalIngresos: 0, totalVentas: 0 },
            topProductos: topProductos
        });

    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ error: 'Error al generar el reporte' });
    }
});

// RUTA MONITOR DE VENTAS EN VIVO
app.post('/api/admin/ultimos-pedidos', async (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
    }

    try {
        const ultimosPedidos = await Pedido.find()
            .sort({ fecha: -1 }) // El más nuevo primero
            .limit(10); // Trae los últimos 10
        
        res.json(ultimosPedidos);

    } catch (error) {
        console.error('Error al buscar últimos pedidos:', error);
        res.status(500).json({ error: 'Error al generar el reporte' });
    }
});


// --- 6. Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});