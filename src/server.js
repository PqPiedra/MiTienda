const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = "admin123"; 

app.use(cors({ origin: '*' }));
app.use(express.json());

// Conexión a Base de Datos
const dbURL = process.env.DATABASE_URL; 
mongoose.connect(dbURL)
  .then(() => console.log('¡Conectado a MongoDB Atlas!'))
  .catch(err => console.error('Error al conectar:', err));

// --- MODELOS ---

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema, 'contadores');

// 1. MODIFICACIÓN: Agregamos 'costo'
const productoSchema = new mongoose.Schema({
  id: Number,
  nombre: String,
  descripcion: String,
  precio: Number,      // Precio de Venta
  costo: { type: Number, default: 0 }, // Precio de Compra (Costo)
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
  fecha: { type: Date, default: Date.now }, mensaje: String, origen: String, detalles: String 
});
const ErrorLog = mongoose.model('ErrorLog', errorLogSchema, 'errores');

// --- UTILIDADES ---
async function logSystemError(mensaje, origen, detalles) {
    try {
        console.error(`[ERROR - ${origen}] ${mensaje}`);
        await new ErrorLog({ mensaje, origen, detalles: JSON.stringify(detalles) }).save();
    } catch (e) { console.error(e); }
}

async function getNextSequence(name) {
    const ret = await Counter.findByIdAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return ret.seq;
}

// --- RUTAS API ---

app.get('/api/productos', async (req, res) => {
  try {
    const filtro = req.query.categoria ? { categoria: req.query.categoria } : {};
    res.json(await Producto.find(filtro));
  } catch (error) { res.status(500).json({ error: 'Error BD' }); }
});

app.post('/api/pedidos', async (req, res) => {
  const carrito = req.body.carrito;
  if (!carrito || carrito.length === 0) return res.status(400).json({ error: 'Carrito vacío.' });
  try {
    let totalCalculado = 0;
    for (const item of carrito) {
        const productoDB = await Producto.findOne({ id: item.id });
        if (!productoDB) throw new Error(`Producto ${item.nombre} no encontrado.`);
        if (productoDB.stock < item.cantidad) return res.status(400).json({ error: `Stock insuficiente: ${productoDB.nombre}` });
        totalCalculado += (productoDB.precio * item.cantidad);
    }
    const id = await getNextSequence('pedidoId');
    await new Pedido({ idPedido: id, items: carrito, total: totalCalculado }).save();
    for (const item of carrito) {
      await Producto.updateOne({ id: item.id }, { $inc: { stock: -item.cantidad } });
    }
    res.status(201).json({ mensaje: 'Pedido creado', idPedido: id });
  } catch (error) {
    logSystemError(error.message, 'POST /api/pedidos', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pos/barcode/:code', async (req, res) => {
    try {
        const p = await Producto.findOne({ codigoDeBarra: req.params.code });
        if (p) res.json(p); else res.status(404).json({ error: 'No encontrado.' });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

// --- ADMIN ---

app.get('/api/admin/productos', async (req, res) => {
  try { res.json(await Producto.find().sort({ nombre: 1 })); } 
  catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/add-stock', async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
  try {
    await Producto.updateOne({ id: req.body.productId }, { $inc: { stock: parseInt(req.body.quantityToAdd) } });
    res.json({ mensaje: 'Stock actualizado' });
  } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/crear-producto', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
    try {
        const nuevo = req.body.nuevoProducto;
        nuevo.id = Date.now(); 
        await new Producto(nuevo).save();
        res.json({ mensaje: "Producto creado" });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/eliminar-producto', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
    try {
        await Producto.deleteOne({ id: req.body.productId });
        res.json({ mensaje: "Eliminado" });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

// 2. MODIFICACIÓN: Reporte Financiero (Estado de Resultados)
app.post('/api/admin/reporte-ventas', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
    try {
        const pedidos = await Pedido.find();
        const productos = await Producto.find();
        
        // Mapa de costos
        const mapaCostos = {};
        productos.forEach(p => mapaCostos[p.id] = p.costo || 0);

        let ingresosTotales = 0;
        let costoVentasTotal = 0;

        pedidos.forEach(pedido => {
            ingresosTotales += pedido.total;
            pedido.items.forEach(item => {
                const costoUnitario = mapaCostos[item.id] || 0;
                costoVentasTotal += (costoUnitario * item.cantidad);
            });
        });

        const utilidadBruta = ingresosTotales - costoVentasTotal;
        const margen = ingresosTotales > 0 ? ((utilidadBruta / ingresosTotales) * 100).toFixed(1) : 0;

        const topProductos = await Pedido.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.nombre", totalVendido: { $sum: "$items.cantidad" } } },
            { $sort: { totalVendido: -1 } },
            { $limit: 5 }
        ]);

        res.json({ 
            stats: { ingresos: ingresosTotales, costos: costoVentasTotal, utilidad: utilidadBruta, margen: margen }, 
            topProductos 
        });

    } catch (error) {
        logSystemError(error.message, 'REPORTE', error);
        res.status(500).json({ error: 'Error reporte' });
    }
});

app.post('/api/admin/confirmar-entrega', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
    try {
        const pedido = await Pedido.findOne({ idPedido: parseInt(req.body.idPedido) });
        if (!pedido) return res.status(404).json({ error: 'No existe.' });
        if (pedido.estado === 'entregado') return res.status(400).json({ error: 'Ya entregado.' });
        pedido.estado = 'entregado';
        await pedido.save();
        res.json({ mensaje: `Pedido #${req.body.idPedido} entregado.` });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/admin/errores', async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Pass incorrecta' });
    try { res.json(await ErrorLog.find().sort({ fecha: -1 }).limit(50)); } 
    catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.listen(PORT, () => console.log(`Server en puerto ${PORT}`));