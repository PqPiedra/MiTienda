const ADMIN_PASSWORD = "admin123"; 
// NOTA: Si al subir a Render no te conecta, cambia esta línea por la URL de tu Render: "https://mi-tienda-final.onrender.com"
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
        } else document.getElementById('login-error').style.display = 'block';
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
            if(tab === 'reportes') loadReport(); else loadAllProducts();
        });
    });

    async function sendPost(end, data) {
        data.password = currentPassword;
        try {
            const res = await fetch(`${API_URL}${end}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
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
            prods.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.nombre} (Stock: ${p.stock})</option>`);
        });
    }

    document.getElementById('add-stock-button').addEventListener('click', async () => {
        await sendPost('/api/admin/add-stock', { 
            productId: document.getElementById('product-select').value, 
            quantityToAdd: document.getElementById('quantity-input').value 
        });
        loadAllProducts();
    });

    document.getElementById('create-product-button').addEventListener('click', async () => {
        const nuevo = {
            nombre: document.getElementById('new-nombre').value,
            descripcion: document.getElementById('new-desc').value,
            precio: document.getElementById('new-precio').value,
            costo: document.getElementById('new-costo').value,
            categoria: document.getElementById('new-categoria').value,
            imagen: document.getElementById('new-imagen').value,
            stock: document.getElementById('new-stock').value,
            codigoDeBarra: document.getElementById('new-barcode').value
        };
        await sendPost('/api/admin/crear-producto', { nuevoProducto: nuevo });
        document.querySelectorAll('#page-crear input').forEach(i => i.value = '');
    });

    document.getElementById('delete-product-button').addEventListener('click', async () => {
        if(confirm("¿Eliminar?")) {
            await sendPost('/api/admin/eliminar-producto', { productId: document.getElementById('delete-product-select').value });
            loadAllProducts();
        }
    });

    async function loadReport() {
        const res = await sendPost('/api/admin/reporte-ventas', {});
        if(res) {
            const fmt = (n) => new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'}).format(n);
            document.getElementById('fin-ingresos').innerText = fmt(res.stats.ingresos);
            document.getElementById('fin-costos').innerText = fmt(res.stats.costos);
            document.getElementById('fin-utilidad').innerText = fmt(res.stats.utilidad);
            document.getElementById('fin-margen').innerText = res.stats.margen + "%";

            const list = document.getElementById('stat-top-productos');
            list.innerHTML = "";
            res.topProductos.forEach(p => list.innerHTML += `<li><span>${p._id}</span><strong>${p.totalVendido} un.</strong></li>`);
        }
    }
    document.getElementById('refresh-report-btn').addEventListener('click', loadReport);
});