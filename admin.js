const ADMIN_PASSWORD = "admin123"; 
// URL DE PRODUCCIÓN (RENDER)
const API_URL = "https://mi-tienda-final.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    let currentPassword = "";
    
    document.getElementById('login-button').addEventListener('click', () => {
        const pass = document.getElementById('password-input').value;
        if (pass === ADMIN_PASSWORD) {
            currentPassword = pass;
            document.getElementById('login-container').classList.add('oculto');
            document.getElementById('dashboard-container').classList.remove('oculto');
            loadAllProducts();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    const tabs = ['stock', 'crear', 'eliminar', 'reportes'];
    tabs.forEach(tab => {
        document.getElementById(`nav-${tab}`).addEventListener('click', (e) => {
            tabs.forEach(t => {
                document.getElementById(`page-${t}`).classList.add('oculto');
                document.getElementById(`nav-${t}`).classList.remove('active');
            });
            document.getElementById(`page-${tab}`).classList.remove('oculto');
            e.target.classList.add('active');
            if(tab === 'reportes') loadReport();
            if(tab === 'stock' || tab === 'eliminar') loadAllProducts();
        });
    });

    async function sendPost(endpoint, data) {
        data.password = currentPassword;
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if(!res.ok) throw new Error(json.error);
            if(json.mensaje) alert(json.mensaje);
            return json;
        } catch (e) { alert(e.message); return null; }
    }

    async function loadAllProducts() {
        const res = await fetch(`${API_URL}/api/admin/productos`);
        const prods = await res.json();
        const selects = [document.getElementById('product-select'), document.getElementById('delete-product-select')];
        selects.forEach(sel => {
            sel.innerHTML = '<option value="">-- Selecciona --</option>';
            prods.forEach(p => {
                sel.innerHTML += `<option value="${p.id}">${p.nombre} (Stock: ${p.stock})</option>`;
            });
        });
    }

    document.getElementById('add-stock-button').addEventListener('click', async () => {
        const id = document.getElementById('product-select').value;
        const qty = document.getElementById('quantity-input').value;
        await sendPost('/api/admin/add-stock', { productId: id, quantityToAdd: qty });
        loadAllProducts();
    });

    document.getElementById('create-product-button').addEventListener('click', async () => {
        const nuevo = {
            nombre: document.getElementById('new-nombre').value,
            descripcion: document.getElementById('new-desc').value,
            precio: document.getElementById('new-precio').value,
            categoria: document.getElementById('new-categoria').value,
            imagen: document.getElementById('new-imagen').value,
            stock: document.getElementById('new-stock').value,
            codigoDeBarra: document.getElementById('new-barcode').value
        };
        await sendPost('/api/admin/crear-producto', { nuevoProducto: nuevo });
    });

    document.getElementById('delete-product-button').addEventListener('click', async () => {
        const id = document.getElementById('delete-product-select').value;
        if(confirm("¿Eliminar producto?")) {
            await sendPost('/api/admin/eliminar-producto', { productId: id });
            loadAllProducts();
        }
    });

    async function loadReport() {
        const res = await sendPost('/api/admin/reporte-ventas', {});
        if(res) {
            document.getElementById('stat-ingresos').innerText = `$ ${new Intl.NumberFormat('es-CL').format(res.stats.totalIngresos)}`;
            document.getElementById('stat-ventas').innerText = res.stats.totalVentas;
            const list = document.getElementById('stat-top-productos');
            list.innerHTML = "";
            res.topProductos.forEach(p => list.innerHTML += `<li><span>${p._id}</span><strong>${p.totalVendido}</strong></li>`);
        }
    }
    document.getElementById('refresh-report-btn').addEventListener('click', loadReport);
});