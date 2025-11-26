const ADMIN_PASSWORD = "admin123";
const API_URL = "https://mi-tienda-final.onrender.com"; // Producción

document.addEventListener('DOMContentLoaded', () => {
    let currentPassword = ""; 
    const loginBtn = document.getElementById('login-button');
    
    loginBtn.addEventListener('click', () => {
        const pass = document.getElementById('password-input').value;
        if (pass === ADMIN_PASSWORD) {
            currentPassword = pass; 
            document.getElementById('login-container').classList.add('oculto');
            document.getElementById('page-monitor').classList.remove('oculto');
            cargarVentas();
            setInterval(cargarVentas, 5000);
            document.getElementById('qr-confirm-input').focus();
        } else document.getElementById('login-error').style.display = 'block';
    });

    document.getElementById('qr-confirm-input').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const id = e.target.value;
            if(id) { await confirmarEntrega(id); e.target.value = ""; }
        }
    });

    async function confirmarEntrega(id) {
        const msg = document.getElementById('qr-message');
        msg.innerText = "Validando...";
        try {
            const res = await fetch(`${API_URL}/api/admin/confirmar-entrega`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPedido: id, password: currentPassword })
            });
            const data = await res.json();
            if (res.ok) { msg.innerText = `✅ ${data.mensaje}`; msg.style.color = "green"; cargarVentas(); }
            else { msg.innerText = `❌ ${data.error}`; msg.style.color = "red"; }
        } catch (error) { msg.innerText = "Error conexión"; }
        setTimeout(() => { msg.innerText = ""; }, 4000);
    }

    async function cargarVentas() {
        if (!currentPassword) return; 
        try {
            const res = await fetch(`${API_URL}/api/admin/ultimos-pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: currentPassword }) 
            });
            const pedidos = await res.json();
            const lista = document.getElementById('lista-ventas-vivas');
            lista.innerHTML = ""; 
            
            pedidos.forEach(p => {
                const li = document.createElement('li');
                li.classList.add('venta-item', p.estado === 'entregado' ? 'entregado' : 'pendiente');
                const prods = p.items.map(i => `<li>${i.cantidad}x ${i.nombre}</li>`).join('');
                const btn = p.estado === 'pendiente' ? `<button class="btn-entregar" data-id="${p.idPedido}">Entregar</button>` : '✅';
                
                li.innerHTML = `<div class="venta-item-header"><span class="pedido-id">#${p.idPedido}</span><span class="status-badge status-${p.estado}">${p.estado}</span></div><div class="venta-item-header"><span class="pedido-total">$${p.total}</span></div><ul class="venta-item-productos">${prods}</ul><div style="text-align:right;">${btn}</div>`;
                if(p.estado === 'pendiente') li.querySelector('.btn-entregar').addEventListener('click', () => confirmarEntrega(p.idPedido));
                lista.appendChild(li);
            });
        } catch (e) { console.error(e); }
    }
});