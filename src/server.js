const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000; // Puerto dinámico para Render

const ADMIN_PASSWORD = "admin123"; 

// Permitir acceso global (CORS)
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- CONEXIÓN A MONGODB (ATLAS) ---
const dbURL = process.env.DATABASE_URL; 

mongoose.connect(dbURL)
  .then(() => console.log('¡Conectado a MongoDB Atlas (Producción)!'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// --- MODELOS ---

const counterSchema = new mongoose.Schema({
    _id: String, 
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema, 'contadores');

const productoSchema = new mongoose.Schema({
  id: Number,
  nombre: String,
  descripcion: String,
  precio: Number,
  imagen: String,
  categoria: String,
  stock: Number,
  codigoDeBarra: String 
});
const Producto = mongoose.model('Producto', productoSchema, 'productos');

const pedidoSchema = new mongoose.Schema({
  idPedido: Number,
  items: Array,
  total: Number,
  fecha: { type: Date, default: Date.now },
  estado: { type: String, default: 'pendiente' }
});
const Pedido = mongoose.model('Pedido', pedidoSchema, 'pedidos');

const errorLogSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  mensaje: String,
  origen: String, 
  detalles: String 
});
const ErrorLog = mongoose.model('ErrorLog', errorLogSchema, 'errores');

// --- UTILIDADES ---

async function logSystemError(mensaje, origen, detalles) {
    try {
        console.error(`[ERROR - ${origen}] ${mensaje}`);
        const nuevoError = new ErrorLog({ mensaje, origen, detalles: JSON.stringify(detalles) });
        await nuevoError.save();
    } catch (e) { console.error(e); }
}

async function getNextSequence(name) {
    const ret = await Counter.findByIdAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return ret.seq;
}

// --- RUTAS API ---

app.get('/api/productos', async (req, res) => {
  const categoria = req.query.categoria;
  try {
    let filtro = {};
    if (categoria) filtro = { categoria: categoria };
    const productosFiltrados = await Producto.find(filtro);
    res.json(productosFiltrados);
  } catch (error) {
    logSystemError(error.message, 'GET /api/productos', error);
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const carrito = req.body.carrito;
  if (!carrito || carrito.length === 0) return res.status(400).json({ error: 'Carrito vacío.' });

  try {
    let totalCalculado = 0;
    for (const item of carrito) {
        const productoDB = await Producto.findOne({ id: item.id });
        if (!productoDB) throw new Error(`Producto ${item.nombre} no encontrado.`);
        if (productoDB.stock < item.cantidad) {
            return res.status(400).json({ error: `Stock insuficiente: ${productoDB.nombre}` });
        }
        totalCalculado += (productoDB.precio * item.cantidad);
    }

    const siguienteNumero = await getNextSequence('pedidoId');

    const nuevoPedido = new Pedido({
      idPedido: siguienteNumero,
      items: carrito,
      total: totalCalculado,
      estado: 'pendiente'
    });

    await nuevoPedido.save();
    
    for (const item of carrito) {
      await Producto.updateOne({ id: item.id }, { $inc: { stock: -item.cantidad } });
    }
    
    res.status(201).json({ mensaje: 'Pedido creado', idPedido: siguienteNumero });

  } catch (error) {
    logSystemError(error.message, 'POST /api/pedidos', error);
    res.status(500).json({ error: error.message || 'Error al guardar pedido' });
  }
});

app.get('/api/pos/barcode/:code', async (req, res) => {
    try {
        const producto = await Producto.findOne({ codigoDeBarra: req.params.code });
        if (producto) res.json(producto);
        else res.status(404).json({ error: 'Producto no encontrado.' });
    } catch (error) {
        logSystemError(error.message, 'GET /api/pos/barcode', error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

// --- ADMIN & CONTROL ---

app.get('/api/admin/productos', async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

app.post('/api/admin/add-stock', async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
  try {
    await Producto.updateOne({ id: req.body.productId }, { $inc: { stock: parseInt(req.body.quantityToAdd) } });
    res.json({ mensaje: 'Stock actualizado' });
  } catch (error) {
    logSystemError(error.message, 'ADD STOCK', error);
    res.status(500).json({ error: 'Error' });
  }
});

app.post('/api/admin/crear-producto', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        const nuevo = req.body.nuevoProducto;
        nuevo.id = Date.now(); 
        const producto = new Producto(nuevo);
        await producto.save();
        res.json({ mensaje: "Producto creado" });
    } catch (error) {
        logSystemError(error.message, 'CREAR PRODUCTO', error);
        res.status(500).json({ error: "Error" });
    }
});

app.post('/api/admin/eliminar-producto', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        await Producto.deleteOne({ id: req.body.productId });
        res.json({ mensaje: "Producto eliminado" });
    } catch (error) {
        logSystemError(error.message, 'ELIMINAR PRODUCTO', error);
        res.status(500).json({ error: "Error" });
    }
});

app.post('/api/admin/reporte-ventas', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        const stats = await Pedido.aggregate([{ $group: { _id: null, totalIngresos: { $sum: "$total" }, totalVentas: { $sum: 1 } } }]);
        const topProductos = await Pedido.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.nombre", totalVendido: { $sum: "$items.cantidad" } } },
            { $sort: { totalVendido: -1 } }
        ]);
        res.json({ stats: stats[0] || { totalIngresos: 0, totalVentas: 0 }, topProductos });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/admin/ultimos-pedidos', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        const pedidos = await Pedido.find().sort({ estado: -1, fecha: -1 }).limit(20);
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/admin/confirmar-entrega', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        const pedido = await Pedido.findOne({ idPedido: parseInt(req.body.idPedido) });
        if (!pedido) return res.status(404).json({ error: 'Pedido no existe.' });
        if (pedido.estado === 'entregado') return res.status(400).json({ error: 'Ya fue entregado.' });
        
        pedido.estado = 'entregado';
        await pedido.save();
        res.json({ mensaje: `Pedido #${req.body.idPedido} entregado.` });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/admin/errores', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorrecta.' });
    try {
        const errores = await ErrorLog.find().sort({ fecha: -1 }).limit(50);
        res.json(errores);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});