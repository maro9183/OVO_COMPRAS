const API_URL = '/api';

// Auth checks
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;

// Determine current page
const isDashboard = window.location.pathname.includes('dashboard.html');

if (!token && isDashboard) {
  window.location.href = 'index.html';
}
if (token && !isDashboard) {
  window.location.href = 'dashboard.html';
}

// Interceptor for fetch to add auth headers automatically
const fetchApi = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 && isDashboard) {
    logout();
  }

  return response;
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
};


// --------------------------------------------------------
// LOGIN PAGE LOGIC
// --------------------------------------------------------
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');
    
    errorMsg.style.display = 'none';
    const btn = loginForm.querySelector('.btn');
    btn.textContent = 'Autenticando...';
    btn.disabled = true;

    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } else {
        errorMsg.style.display = 'block';
      }
    } catch (error) {
      errorMsg.textContent = 'Error de conexión';
      errorMsg.style.display = 'block';
    } finally {
      btn.textContent = 'Ingresar al Sistema';
      btn.disabled = false;
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  if (isDashboard) {
    try {
      const profileRes = await fetchApi('/usuarios/perfil/me');
      if (profileRes.ok) {
        const freshUser = await profileRes.json();
        localStorage.setItem('user', JSON.stringify(freshUser));
        Object.assign(user, freshUser);
      }
    } catch (e) { console.error('Error refreshing profile:', e); }

    if (document.getElementById('user-name')) {
      document.getElementById('user-name').textContent = user?.nombre || 'Usuario';
    }
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    const updateMenuVisibility = () => {
      const usuariosNavItem = document.querySelector('[data-view="usuarios-view"]');
      if (usuariosNavItem) {
        if (user?.rol === 'ADMIN') {
          usuariosNavItem.style.display = 'flex';
        } else {
          usuariosNavItem.style.display = 'none';
        }
      }
    };
    updateMenuVisibility();


  let appMateriales = [];
  let appProveedores = [];
  let appUsuarios = [];
  let appCategorias = [];
  let showInactivePedidos = false;
  let showInactiveMateriales = false;
  let showInactiveProveedores = false;
  let showInactiveDetalles = false;
  let showInactiveUnidades = false;

  const validarCuit = (cuit) => {
    if (!cuit) return false;
    const regex = /^\d{2}-\d{8}-\d{1}$/;
    if (!regex.test(cuit)) return false;
    const digits = cuit.replace(/-/g, '').split('').map(Number);
    if (digits.length !== 11) return false;
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * multipliers[i];
    let dv = 11 - (sum % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) dv = 9;
    return dv === digits[10];
  };

  // Load Selects
  const refreshSelects = async () => {
    try {
      const [sectoresRes, materialesRes, categoriasRes, proveedoresRes] = await Promise.all([
        fetchApi('/sectores'),
        fetchApi('/materiales'),
        fetchApi('/categorias'),
        fetchApi('/proveedores')
      ]);
      
      if (sectoresRes.ok) {
        const sectores = await sectoresRes.json();
        if (document.getElementById('usuario-sector')) {
          document.getElementById('usuario-sector').innerHTML = '<option value="">Ninguno</option>' + sectores.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        }
        if (document.getElementById('filter-sector')) {
          document.getElementById('filter-sector').innerHTML = '<option value="">Todos los Sectores</option>' + sectores.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
        }
        if (document.getElementById('pedido-sector-select')) {
          document.getElementById('pedido-sector-select').innerHTML = sectores.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        }
      }

      const usuariosRes = await fetchApi('/usuarios');
      if (usuariosRes.ok) {
        appUsuarios = await usuariosRes.json();
        if (document.getElementById('pedido-solicitante')) {
          document.getElementById('pedido-solicitante').innerHTML = appUsuarios.map(u => `<option value="${u.id}">${u.nombre} (${u.rol})</option>`).join('');
        }
      }

      if (categoriasRes.ok) {
        appCategorias = await categoriasRes.json();
        if (document.getElementById('material-categoria')) {
          document.getElementById('material-categoria').innerHTML = '<option value="">Sin Categoría</option>' + appCategorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }
       const userCatList = document.getElementById('usuario-categorias-list');
    if (userCatList) {
      userCatList.innerHTML = appCategorias.map(c => `
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; cursor: pointer; color: var(--text-main);">
          <input type="checkbox" value="${c.id}" class="usuario-cat-checkbox" style="width: auto;">
          ${c.nombre}
        </label>
      `).join('');
    }
    }

      const unidadesRes = await fetchApi('/unidades');
      if (unidadesRes.ok) {
        const unidades = await unidadesRes.json();
        if (document.getElementById('material-unidad')) {
          document.getElementById('material-unidad').innerHTML = '<option value="">Sin Unidad</option>' + unidades.map(u => `<option value="${u.id}">${u.simbolo} - ${u.descripcion}</option>`).join('');
        }
        if (document.getElementById('quick-material-unidad')) {
          document.getElementById('quick-material-unidad').innerHTML = '<option value="">Seleccionar...</option>' + unidades.map(u => `<option value="${u.id}">${u.simbolo} - ${u.descripcion}</option>`).join('');
        }
      }

      if (proveedoresRes.ok) {
        appProveedores = await proveedoresRes.json();
        const provSelect = document.getElementById('material-proveedor');
        if (provSelect) {
          provSelect.innerHTML = '<option value="">Sin Proveedor Principal</option>' + 
            appProveedores.filter(p => p.activo).map(p => `<option value="${p.id}">${p.razonSocial}</option>`).join('');
        }
      }

      if (categoriasRes.ok) {
        // Categories for quick-create as well
        if (document.getElementById('quick-material-categoria')) {
          document.getElementById('quick-material-categoria').innerHTML = '<option value="">Sin Categoría</option>' + appCategorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }
      }

      if (materialesRes.ok) {
        appMateriales = await materialesRes.json();
        // Initialize first row if items list is empty
        if (document.getElementById('items-list') && document.getElementById('items-list').children.length === 0) {
          document.getElementById('add-item-btn')?.click();
        }
      }
    } catch (e) { console.error(e); }
  };

  // LOAD TABLES
  const loadSectoresTable = async () => {
    const res = await fetchApi('/sectores');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('sectores-table-body').innerHTML = data.map(s => `
        <tr class="${!s.activo ? 'inactive-row' : ''}">
          <td>${s.id}</td>
          <td>
            <input type="text" class="inline-edit-input" value="${s.nombre}" onchange="updateSectorInline(${s.id}, this.value)">
          </td>
          <td><span class="badge ${s.activo ? 'badge-active' : 'badge-pending'}">${s.activo ? 'Sí' : 'No'}</span></td>
          <td style="text-align: right;">
            <button class="btn-icon delete-btn" onclick="toggleSector(${s.id})" title="${s.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${s.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </td>
        </tr>`).join('');
    }
  };

  window.updateSectorInline = async (id, nombre) => {
    const res = await fetchApi(`/sectores/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (res.ok) loadSectoresTable();
  };

  window.toggleSector = async (id) => {
    const res = await fetchApi(`/sectores/${id}`, { method: 'DELETE' });
    if (res.ok) loadSectoresTable();
  };

  const loadCategoriasTable = async () => {
    const res = await fetchApi('/categorias');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('categorias-table-body').innerHTML = data.map(c => `
        <tr class="${!c.activo ? 'inactive-row' : ''}">
          <td>${c.id}</td>
          <td>
            <input type="text" class="inline-edit-input" value="${c.nombre}" onchange="updateCategoriaInline(${c.id}, this.value)">
          </td>
          <td><span class="badge ${c.activo ? 'badge-active' : 'badge-pending'}">${c.activo ? 'Sí' : 'No'}</span></td>
          <td style="text-align: right;">
            <button class="btn-icon delete-btn" onclick="toggleCategoria(${c.id})" title="${c.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${c.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </td>
        </tr>`).join('');
    }
  };

  window.updateCategoriaInline = async (id, nombre) => {
    const res = await fetchApi(`/categorias/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (res.ok) loadCategoriasTable();
  };

  window.toggleCategoria = async (id) => {
    const res = await fetchApi(`/categorias/${id}`, { method: 'DELETE' });
    if (res.ok) loadCategoriasTable();
  };

  const loadUsuariosTable = async () => {
    const res = await fetchApi('/usuarios');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('usuarios-table-body').innerHTML = data.map(u => `<tr>
        <td>${u.id}</td>
        <td>${u.nombre}</td>
        <td>${u.correo || '-'}</td>
        <td>${u.telefono || '-'}</td>
        <td>${u.username || '-'}</td>
        <td>${u.rol}</td>
        <td>${u.sector?.nombre || '-'}</td>
        <td><span class="badge ${u.activo ? 'badge-active' : 'badge-pending'}">${u.activo ? 'Sí' : 'No'}</span></td>
        <td>
          <div class="actions">
            <button class="btn-icon edit-btn" onclick="editUsuario(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" onclick="toggleUsuario(${u.id})" title="${u.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${u.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
    }
  };

  let allPedidos = [];

  const renderPedidosTable = (pedidos) => {
    const tbody = document.getElementById('pedidos-table-body');
    if (!pedidos || pedidos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay pedidos que coincidan con la búsqueda.</td></tr>';
      return;
    }

    const visiblePedidos = showInactivePedidos ? pedidos : pedidos.filter(p => p.activo);
    
    if (visiblePedidos.length === 0 && pedidos.length > 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay pedidos activos. Use el botón "Inactivos" para ver todos.</td></tr>';
      return;
    }

    tbody.innerHTML = visiblePedidos.map(p => {
      const isEditable = ['CREADO', 'APROBADO', 'APROBADO_PARCIAL'].includes(p.estado) && p.activo;
      
      // State Machine Transitions (Frontend Sync)
      const allowedTransitions = {
        'CREADO': ['APROBADO', 'APROBADO_PARCIAL', 'RECHAZADO'],
        'APROBADO': ['EN_COMPRA'],
        'APROBADO_PARCIAL': ['EN_COMPRA'],
        'EN_COMPRA': ['COMPRADO'],
        'COMPRADO': ['RECIBIDO'],
        'RECHAZADO': [],
        'RECIBIDO': []
      };

      const options = allowedTransitions[p.estado] || [];
      
      // Role-based status filtering: 
      let filteredOptions = options;
      if (user?.rol === 'ADMIN') {
        // Admin sees all states to "fix" things if needed
        filteredOptions = ['CREADO', 'APROBADO', 'APROBADO_PARCIAL', 'EN_COMPRA', 'COMPRADO', 'RECIBIDO', 'RECHAZADO'].filter(s => s !== p.estado);
      } else if (user?.rol === 'SOLICITANTE') {
        filteredOptions = options.filter(opt => opt === 'RECIBIDO');
      }

      const statusHtml = `<option value="${p.estado}" selected>${p.estado}</option>` + 
        filteredOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('');

      return `
        <tr class="${!p.activo ? 'inactive-row' : ''}" style="cursor: pointer;" onclick="if (!event.target.closest('input') && !event.target.closest('button') && !event.target.closest('select')) openDetallesModal(${p.id})">
          <td>${p.numeroSolicitud}</td>
          <td>${p.solicitante?.nombre || '-'}</td>
          <td>${p.sector?.nombre || p.solicitante?.sector?.nombre || '-'}</td>
          <td>
            ${isEditable ? `<input type="text" class="inline-edit-input" value="${p.descripcion}" onchange="updatePedidoInline(${p.id}, 'descripcion', this.value)">` : p.descripcion}
          </td>
          <td>
            ${isEditable ? `<input type="text" class="inline-edit-input" value="${p.observaciones || ''}" onchange="updatePedidoInline(${p.id}, 'observaciones', this.value)">` : (p.observaciones || '-')}
          </td>
          <td><span class="badge ${p.estado === 'RECHAZADO' ? 'badge-pending' : 'badge-active'}">${p.estado}</span></td>
          <td>${new Date(p.fechaPedido).toLocaleDateString()}</td>
          <td><span class="badge ${p.activo ? 'badge-active' : 'badge-pending'}">${p.activo ? 'Sí' : 'No'}</span></td>
          <td>
            <div class="actions">
              <select class="status-select" onchange="updatePedidoInline(${p.id}, 'estado', this.value)">
                ${statusHtml}
              </select>
              <button class="btn-icon edit-btn" onclick="editPedido(${p.id})" title="Editar Datos" style="color: var(--primary);">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon delete-btn" onclick="togglePedido(${p.id})" title="${p.activo ? 'Inactivar' : 'Reactivar'}">
                <i class="fas ${p.activo ? 'fa-ban' : 'fa-check'}"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const loadOrders = async () => {
    const tbody = document.getElementById('pedidos-table-body');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Cargando pedidos...</td></tr>';
    
    try {
      const res = await fetchApi('/pedidos');
      if (res.ok) {
        allPedidos = await res.json();
        renderPedidosTable(allPedidos);
      }
    } catch (e) { tbody.innerHTML = '<tr><td colspan="8">Error.</td></tr>'; }
  };

  const applyFilters = () => {
    const term = document.getElementById('pedido-search')?.value.toLowerCase() || '';
    const sector = document.getElementById('filter-sector')?.value || '';

    const filtered = allPedidos.filter(p => {
      const matchTerm = 
        p.numeroSolicitud.toLowerCase().includes(term) ||
        p.descripcion.toLowerCase().includes(term) ||
        p.solicitante?.nombre?.toLowerCase().includes(term) ||
        p.detalles?.some(d => 
          d.material?.codigo?.toLowerCase().includes(term) ||
          d.material?.nombre?.toLowerCase().includes(term) ||
          d.descripcionManual?.toLowerCase().includes(term)
        );

      const matchSector = !sector || (p.solicitante?.sector?.nombre === sector || p.sector?.nombre === sector);
      const estadoFilter = document.getElementById('filter-estado')?.value || '';
      const matchEstado = !estadoFilter || p.estado === estadoFilter;

      return matchTerm && matchSector && matchEstado;
    });

    renderPedidosTable(filtered);
  };

  document.getElementById('pedido-search')?.addEventListener('input', applyFilters);
  document.getElementById('filter-sector')?.addEventListener('change', applyFilters);
  document.getElementById('filter-estado')?.addEventListener('change', applyFilters);

  document.getElementById('toggle-inactive-pedidos')?.addEventListener('click', (e) => {
    showInactivePedidos = !showInactivePedidos;
    const btn = e.currentTarget;
    btn.classList.toggle('btn-active', showInactivePedidos);
    btn.querySelector('i').className = showInactivePedidos ? 'fas fa-eye' : 'fas fa-eye-slash';
    applyFilters();
  });

  window.updatePedidoInline = async (id, field, value) => {
    const res = await fetchApi(`/pedidos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value })
    });
    if (!res.ok) {
      const err = await res.json();
      alert('Error al actualizar el pedido: ' + (err.message || 'Error desconocido'));
    }
    loadOrders();
  };

  window.togglePedido = async (id) => {
    const p = allPedidos.find(x => x.id === id);
    const action = p?.activo ? 'Inactivar' : 'Reactivar';
    if (confirm(`¿Está seguro de que desea ${action} este pedido?`)) {
      const res = await fetchApi(`/pedidos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadOrders();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al actualizar');
        loadOrders(); // Refresh to revert UI
      }
    }
  };

  let currentPedidoForDetalles = null;
  window.openDetallesModal = (pedidoId) => {
    const p = allPedidos.find(x => x.id === pedidoId);
    if (!p) return;
    currentPedidoForDetalles = p;
    document.getElementById('detalles-pedido-numero').textContent = p.numeroSolicitud;
    renderDetallesTable(p);
    document.getElementById('detalles-modal').classList.add('active');
  };

  const renderDetallesTable = (pedido) => {
    const tbody = document.getElementById('detalles-table-body');
    if (!pedido.detalles || pedido.detalles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay detalles activos.</td></tr>';
      return;
    }

    tbody.innerHTML = pedido.detalles.map(d => {
      const isEditable = ['PENDIENTE', 'APROBADO'].includes(d.estado) && d.activo;
      const canMarkRecibido = d.estado === 'COMPRADO' && d.activo && user && user.rol !== 'COMPRADOR';
      const isCompradorOrEncargado = user && (user.rol === 'COMPRADOR' || user.rol === 'ENCARGADO');
      const canMarkComprado = d.estado === 'EN_COMPRA' && d.activo && isCompradorOrEncargado;
      const canMarkEnCompra = d.estado === 'APROBADO' && d.activo && isCompradorOrEncargado;

      return `
        <tr class="${!d.activo ? 'inactive-row' : ''}">
          <td>
            ${isEditable ? 
              `<input type="text" class="inline-edit-input" value="${d.material?.nombre || d.descripcionManual || ''}" 
                onchange="updateDetalleInline(${d.id}, 'descripcionManual', this.value)" placeholder="Descripción">` 
              : (d.material?.nombre || d.descripcionManual || '-')}
          </td>
          <td>
            ${isEditable ? 
              `<input type="number" class="inline-edit-input" style="width: 80px;" value="${Number(d.cantidad) % 1 === 0 ? parseInt(d.cantidad) : d.cantidad}" step="any" 
                onchange="updateDetalleInline(${d.id}, 'cantidad', parseFloat(this.value))">` 
              : (Number(d.cantidad) % 1 === 0 ? parseInt(d.cantidad) : d.cantidad)}
          </td>
          <td><span class="badge badge-active">${d.estado}</span></td>
          <td>${d.comprador?.nombre || d.compradorNombreSnapshot || '-'}</td>
          <td><span class="badge ${d.activo ? 'badge-active' : 'badge-pending'}">${d.activo ? 'Sí' : 'No'}</span></td>
          <td>
            <div class="actions">
              ${canMarkEnCompra ? `<button class="btn-icon" onclick="cambiarEstadoDetalle(${d.id}, 'EN_COMPRA')" title="Pasar a En Compra"><i class="fas fa-shopping-cart"></i></button>` : ''}
              ${canMarkComprado ? `<button class="btn-icon" onclick="cambiarEstadoDetalle(${d.id}, 'COMPRADO')" title="Marcar Comprado"><i class="fas fa-check-double"></i></button>` : ''}
              ${canMarkRecibido ? `<button class="btn-icon" onclick="cambiarEstadoDetalle(${d.id}, 'RECIBIDO')" title="Marcar Recibido"><i class="fas fa-box-open"></i></button>` : ''}
              <button class="btn-icon delete-btn" onclick="toggleDetalle(${d.id})" title="${d.activo ? 'Inactivar' : 'Reactivar'}">
                <i class="fas ${d.activo ? 'fa-ban' : 'fa-check'}"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  window.updateDetalleInline = async (id, field, value) => {
    const res = await fetchApi(`/pedidos/detalles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value })
    });
    if (res.ok) {
      loadOrders().then(() => {
        if (currentPedidoForDetalles) openDetallesModal(currentPedidoForDetalles.id);
      });
    } else { alert('Error al actualizar detalle'); }
  };

  window.toggleDetalle = async (id) => {
    if (confirm('¿Cambiar estado activo de este detalle?')) {
      const res = await fetchApi(`/pedidos/detalles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadOrders().then(() => {
          if (currentPedidoForDetalles) openDetallesModal(currentPedidoForDetalles.id);
        });
      }
    }
  };

  window.cambiarEstadoDetalle = async (id, estado) => {
    if (confirm('¿Cambiar estado a ' + estado + '?')) {
      const res = await fetchApi(`/pedidos/detalles/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      });
      if (res.ok) {
        loadOrders().then(() => {
          if (currentPedidoForDetalles) openDetallesModal(currentPedidoForDetalles.id);
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error al cambiar estado');
      }
    }
  };

  // Add Pedido Modal
  const newPedidoModal = document.getElementById('new-pedido-modal');
  document.getElementById('add-pedido-btn')?.addEventListener('click', () => {
    document.getElementById('new-pedido-modal-title').textContent = 'Nuevo Pedido';
    document.getElementById('new-pedido-submit-btn').textContent = 'Crear Pedido';
    document.getElementById('pedido-id-hidden').value = '';
    document.getElementById('new-order-form').reset();
    document.querySelectorAll('.edit-only-fields').forEach(el => el.style.display = 'none');
    document.getElementById('modal-items-section').style.display = 'block';
    itemsList.innerHTML = '';
    addItemRow();
    if (user?.sector?.id) {
      document.getElementById('pedido-sector-select').value = user.sector.id;
    }
    newPedidoModal.classList.add('active');
  });

  window.editPedido = (id) => {
    const p = allPedidos.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('new-pedido-modal-title').textContent = 'Editar Datos del Pedido ' + p.numeroSolicitud;
    document.getElementById('new-pedido-submit-btn').textContent = 'Guardar Cambios';
    document.getElementById('pedido-id-hidden').value = p.id;
    document.getElementById('descripcion').value = p.descripcion;
    document.getElementById('observaciones-pedido').value = p.observaciones || '';
    
    // Set edit-only fields
    document.querySelectorAll('.edit-only-fields').forEach(el => el.style.display = 'contents');
    document.getElementById('pedido-solicitante').value = p.solicitante?.id || '';
    document.getElementById('pedido-sector-select').value = p.sector?.id || p.solicitante?.sector?.id || '';
    document.getElementById('pedido-estado-select').value = p.estado;
    document.getElementById('pedido-fecha').value = p.fechaPedido ? new Date(p.fechaPedido).toISOString().split('T')[0] : '';
    
    // Hide items section as per user request
    document.getElementById('modal-items-section').style.display = 'none';
    
    newPedidoModal.classList.add('active');
  };

  // Global modal close logic (ESC, backdrop click, close buttons)
  const closeModal = (modal) => {
    if (modal) modal.classList.remove('active');
  };

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      closeModal(modal);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(closeModal);
    }
  });

  // Close modals listener already generic


  // FORM SUBMISSIONS
  document.getElementById('new-sector-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('sector-name').value;
    const res = await fetchApi('/sectores', { method: 'POST', body: JSON.stringify({ nombre }) });
    if (res.ok) {
      document.getElementById('new-sector-form').reset();
      loadSectoresTable();
      refreshSelects();
    }
  });

  document.getElementById('new-categoria-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('categoria-name').value;
    const res = await fetchApi('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) });
    if (res.ok) {
      document.getElementById('new-categoria-form').reset();
      loadCategoriasTable();
      refreshSelects();
    }
  });

  // User View Logic: List Full Width vs Split View
  const toggleUserForm = (show, title = 'Nuevo Usuario') => {
    const listPanel = document.getElementById('user-list-panel');
    const formPanel = document.getElementById('user-form-panel');
    const formTitle = document.getElementById('user-form-title');
    
    if (show) {
      listPanel.style.gridColumn = 'auto';
      formPanel.style.display = 'block';
      if (formTitle) formTitle.textContent = title;
    } else {
      listPanel.style.gridColumn = 'span 2';
      formPanel.style.display = 'none';
      document.getElementById('new-usuario-form').reset();
      document.getElementById('usuario-id').value = '';
    }
  };

  document.getElementById('add-usuario-btn')?.addEventListener('click', () => {
    toggleUserForm(true, 'Nuevo Usuario');
  });

  document.getElementById('cancel-user-btn')?.addEventListener('click', () => {
    toggleUserForm(false);
  });

  // User Role Toggle for Categories
  document.getElementById('usuario-rol')?.addEventListener('change', (e) => {
    const isBuyer = (e.target.value === 'COMPRADOR' || e.target.value === 'ADMIN');
    const categoriesGroup = document.getElementById('buyer-categories-group');
    if (categoriesGroup) {
      categoriesGroup.style.display = isBuyer ? 'block' : 'none';
    }
  });

  document.getElementById('new-usuario-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('usuario-id').value;
    const sectorId = document.getElementById('usuario-sector').value;
    const password = document.getElementById('usuario-password').value;
    const checkboxes = document.querySelectorAll('.usuario-cat-checkbox:checked');
    const categoriaIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    const body = {
      nombre: document.getElementById('usuario-nombre').value,
      correo: document.getElementById('usuario-correo').value,
      telefono: document.getElementById('usuario-telefono').value,
      username: document.getElementById('usuario-username').value,
      rol: document.getElementById('usuario-rol').value,
      puedeLoguearse: true,
      categoriaIds
    };
    if (password) body.password = password;
    if (sectorId) body.sectorId = parseInt(sectorId);
    
    const method = id ? 'PATCH' : 'POST';
    const endpoint = id ? `/usuarios/${id}` : '/usuarios';
    const res = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
    if (res.ok) {
      toggleUserForm(false); // Hides and resets
      loadUsuariosTable();
    } else {
      const err = await res.json();
      alert(err.message || 'Error guardando usuario');
    }
  });

  window.editUsuario = async (id) => {
    const res = await fetchApi(`/usuarios/${id}`);
    if (res.ok) {
      const u = await res.json();
      toggleUserForm(true, 'Editar Usuario');
      document.getElementById('usuario-id').value = u.id;
      document.getElementById('usuario-nombre').value = u.nombre;
      document.getElementById('usuario-correo').value = u.correo || '';
      document.getElementById('usuario-telefono').value = u.telefono || '';
      document.getElementById('usuario-username').value = u.username;
      document.getElementById('usuario-rol').value = u.rol;
      document.getElementById('usuario-rol').dispatchEvent(new Event('change'));
      
      const checkboxes = document.querySelectorAll('.usuario-cat-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = u.categorias?.some(c => c.id === parseInt(cb.value));
      });

      document.getElementById('usuario-sector').value = u.sector?.id || '';
      document.getElementById('usuario-password').value = '';
    }
  };

  window.toggleUsuario = async (id) => {
    if (confirm('¿Cambiar estado de este usuario?')) {
      const res = await fetchApi(`/usuarios/${id}`, { method: 'DELETE' }); // DELETE endpoint toggles active
      if (res.ok) loadUsuariosTable();
    }
  };

  // Dynamic Items Logic
  const itemsList = document.getElementById('items-list');
  const addItemBtn = document.getElementById('add-item-btn');

  const addItemRow = (data = null) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 80px 120px 1.5fr auto';
    row.style.gap = '0.5rem';
    row.style.marginBottom = '0.5rem';
    
    const materialesOptions = '<option value="">(Manual) Escribir descripción...</option>' + 
      appMateriales.filter(m => m.activo).map(m => `<option value="${m.id}">${m.codigo} - ${m.nombre}</option>`).join('') +
      '<option value="NEW" style="color: var(--primary); font-weight: 600;">＋ Crear nuevo material...</option>';

    row.innerHTML = `
      <div class="input-group" style="margin-bottom:0;">
        <select class="item-material">
          ${materialesOptions}
        </select>
        <input type="text" class="item-desc" placeholder="Descripción manual..." style="margin-top:0.25rem;">
      </div>
      <div class="input-group qty-group" style="margin-bottom:0;">
        <input type="number" class="item-qty" required min="0.001" step="any" value="1" placeholder="Cant.">
      </div>
      <div class="input-group unit-group" style="margin-bottom:0;">
        <span class="item-unit-display" style="display:none; font-size: 0.8rem; padding: 0.5rem; color: var(--primary); font-weight: 600;"></span>
        <select class="item-unit-override" style="display:block;">
          <option value="">Unidad...</option>
          ${allUnidades.map(u => `<option value="${u.id}">${u.simbolo}</option>`).join('')}
        </select>
      </div>
      <div class="input-group" style="margin-bottom:0;">
        <input type="text" class="item-obs" placeholder="Obs...">
      </div>
      <button type="button" class="remove-item-btn" style="align-self: flex-start; padding: 0.5rem;"><i class="fas fa-times"></i></button>
    `;

    const matSelect = row.querySelector('.item-material');
    const descInput = row.querySelector('.item-desc');
    const unitDisplay = row.querySelector('.item-unit-display');
    const unitSelect = row.querySelector('.item-unit-override');

    matSelect.addEventListener('change', () => {
      const val = matSelect.value;
      
      if (val === 'NEW') {
        // Reset select to manual and open quick modal
        matSelect.value = '';
        descInput.style.display = 'block';
        unitSelect.style.display = 'block';
        unitDisplay.style.display = 'none';
        
        // Open quick modal
        document.getElementById('quick-material-modal').classList.add('active');
        // Store which select we should update after creation
        window.lastMaterialSelect = matSelect;
        return;
      }

      const matId = parseInt(val);
      if (matId) {
        descInput.style.display = 'none';
        unitSelect.style.display = 'none';
        unitDisplay.style.display = 'block';
        const mat = appMateriales.find(m => m.id === matId);
        unitDisplay.textContent = mat?.unidad?.simbolo || '-';
      } else {
        descInput.style.display = 'block';
        unitSelect.style.display = 'block';
        unitDisplay.style.display = 'none';
      }
    });

    if (data) {
      matSelect.value = data.material?.id || '';
      descInput.value = data.descripcionManual || '';
      row.querySelector('.item-qty').value = data.cantidad;
      row.querySelector('.item-obs').value = data.observaciones || '';
      if (data.unidadOverride) unitSelect.value = data.unidadOverride.id;
    }

    matSelect.dispatchEvent(new Event('change'));
    itemsList.appendChild(row);
  };

  addItemBtn.addEventListener('click', () => addItemRow());


  itemsList.addEventListener('click', (e) => {
    if (e.target.closest('.remove-item-btn')) {
      const rows = itemsList.querySelectorAll('.item-row');
      if (rows.length > 1) {
        e.target.closest('.item-row').remove();
      }
    }
  });

  document.getElementById('new-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('new-pedido-submit-btn');
    btn.disabled = true;

    const pedidoId = document.getElementById('pedido-id-hidden').value;
    const body = {
      descripcion: document.getElementById('descripcion').value,
      observaciones: document.getElementById('observaciones-pedido').value,
      sectorId: parseInt(document.getElementById('pedido-sector-select').value) || null
    };

    if (pedidoId) {
      body.solicitanteId = parseInt(document.getElementById('pedido-solicitante').value);
      body.sectorId = parseInt(document.getElementById('pedido-sector-select').value);
      body.estado = document.getElementById('pedido-estado-select').value;
      body.fechaPedido = document.getElementById('pedido-fecha').value;
    } else {
      const detalles = [];
      const rows = itemsList.querySelectorAll('.item-row');
      rows.forEach(row => {
        const materialId = row.querySelector('.item-material').value;
        const descripcionManual = row.querySelector('.item-desc').value;
        const cantidad = parseFloat(row.querySelector('.item-qty').value);
        const observaciones = row.querySelector('.item-obs').value;
        const unidadOverrideId = row.querySelector('.item-unit-override').value;
        
        const detalle = { cantidad };
        if (materialId) detalle.materialId = parseInt(materialId);
        else if (descripcionManual.trim()) {
          detalle.descripcionManual = descripcionManual.trim();
          if (unidadOverrideId) detalle.unidadOverrideId = parseInt(unidadOverrideId);
        }
        
        if (observaciones.trim()) detalle.observaciones = observaciones.trim();
        detalles.push(detalle);
      });
      body.detalles = detalles;
    }

    const method = pedidoId ? 'PATCH' : 'POST';
    const endpoint = pedidoId ? `/pedidos/${pedidoId}` : '/pedidos';

    try {
      const res = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
      if (res.ok) {
        closeModal(newPedidoModal);
        loadOrders();
      } else {
        const err = await res.json();
        document.getElementById('order-error').textContent = err.message || 'Error al procesar';
        document.getElementById('order-error').style.display = 'block';
      }
    } catch (e) { console.error(e); }
    btn.disabled = false;
  });


  // --------------------------------------------------------
  // MATERIALES LOGIC
  // --------------------------------------------------------
  let allMateriales = [];
  const renderMaterialesTable = (materiales) => {
    const tbody = document.getElementById('materiales-table-body');
    if (materiales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay materiales que coincidan.</td></tr>';
      return;
    }

    const visibleMateriales = showInactiveMateriales ? materiales : materiales.filter(m => m.activo);

    if (visibleMateriales.length === 0 && materiales.length > 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay materiales activos. Use el botón "Inactivos" para ver todos.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleMateriales.map(m => `
      <tr>
        <td><span class="badge" style="background: var(--bg-3); border: 1px solid var(--border);">${m.codigo}</span></td>
        <td><strong>${m.nombre}</strong></td>
        <td><span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-muted);">${m.categoria?.nombre || '-'}</span></td>
        <td><span style="font-weight: 600; color: var(--primary);">${m.unidad?.simbolo || '-'}</span></td>
        <td><small style="color: var(--text-2);">${m.proveedorPrincipal?.razonSocial || '-'}</small></td>
        <td>${m.linkPlano ? `<a href="${m.linkPlano}" target="_blank" class="link-plano"><i class="fas fa-file-pdf"></i> Plano</a>` : '-'}</td>
        <td><span class="badge ${m.activo ? 'badge-active' : 'badge-pending'}">${m.activo ? 'Sí' : 'No'}</span></td>
        <td style="text-align: right;">
          <div class="actions" style="justify-content: flex-end;">
            <button class="btn-icon edit-btn" onclick="editMaterial(${m.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" onclick="deleteMaterial(${m.id})" title="${m.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${m.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const loadMaterialesTable = async () => {
    const tbody = document.getElementById('materiales-table-body');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Cargando materiales...</td></tr>';
    
    try {
      const res = await fetchApi('/materiales');
      if (res.ok) {
        allMateriales = await res.json();
        renderMaterialesTable(allMateriales);
      } else {
        const err = await res.json();
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444;">Error al cargar materiales: ${err.message || 'Error desconocido'}</td></tr>`;
      }
    } catch (e) { 
      console.error(e); 
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ef4444;">Error de conexión al cargar materiales.</td></tr>';
    }
  };

  let searchTimeout;
  document.getElementById('material-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const term = e.target.value;
    
    searchTimeout = setTimeout(async () => {
      const endpoint = term ? `/materiales/buscar?q=${encodeURIComponent(term)}` : '/materiales';
      const res = await fetchApi(endpoint);
      if (res.ok) {
        allMateriales = await res.json();
        renderMaterialesTable(allMateriales);
      }
    }, 300);
  });

  document.getElementById('toggle-inactive-materiales')?.addEventListener('click', (e) => {
    showInactiveMateriales = !showInactiveMateriales;
    const btn = e.currentTarget;
    btn.classList.toggle('btn-active', showInactiveMateriales);
    btn.querySelector('i').className = showInactiveMateriales ? 'fas fa-eye' : 'fas fa-eye-slash';
    renderMaterialesTable(allMateriales);
  });

  const materialModal = document.getElementById('material-modal');
  const materialForm = document.getElementById('material-form');

  document.getElementById('add-material-btn').addEventListener('click', () => {
    document.getElementById('material-modal-title').textContent = 'Nuevo Material';
    document.getElementById('material-codigo-badge').style.display = 'none';
    document.getElementById('material-codigo').value = '';
    document.getElementById('material-codigo').disabled = false;
    document.getElementById('material-codigo-notice').style.display = 'block';
    materialForm.reset();
    document.getElementById('material-id').value = '';
    materialModal.classList.add('active');
  });

  materialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('material-id').value;
    const body = {
      codigo: document.getElementById('material-codigo').value || null,
      nombre: document.getElementById('material-nombre').value,
      linkPlano: document.getElementById('material-link').value || null,
      descripcion: document.getElementById('material-descripcion').value || null,
      notas: document.getElementById('material-notas').value || null,
      categoriaId: document.getElementById('material-categoria').value ? parseInt(document.getElementById('material-categoria').value) : null,
      unidadId: document.getElementById('material-unidad').value ? parseInt(document.getElementById('material-unidad').value) : null,
      proveedorPrincipalId: document.getElementById('material-proveedor').value ? parseInt(document.getElementById('material-proveedor').value) : null,
      codigoProveedor: document.getElementById('material-codigo-prov').value || null,
      keywords: document.getElementById('material-keywords').value ? document.getElementById('material-keywords').value.split(',').map(k => k.trim()) : []
    };

    const method = id ? 'PATCH' : 'POST';
    const endpoint = id ? `/materiales/${id}` : '/materiales';

    const res = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
    if (res.ok) {
      materialModal.classList.remove('active');
      loadMaterialesTable();
      refreshSelects(); // Important as materials are used in other views
    } else {
      const err = await res.json();
      alert(err.message || 'Error al guardar material');
    }
  });

  window.editMaterial = async (id) => {
    const res = await fetchApi(`/materiales/${id}`);
    if (res.ok) {
      const m = await res.json();
      document.getElementById('material-modal-title').textContent = 'Editar Material';
      const badge = document.getElementById('material-codigo-badge');
      badge.textContent = m.codigo;
      badge.style.display = 'inline-block';

      document.getElementById('material-id').value = m.id;
      document.getElementById('material-codigo').value = m.codigo;
      document.getElementById('material-codigo').disabled = true;
      document.getElementById('material-codigo-notice').style.display = 'none';
      document.getElementById('material-nombre').value = m.nombre;
      document.getElementById('material-link').value = m.linkPlano || '';
      document.getElementById('material-descripcion').value = m.descripcion || '';
      document.getElementById('material-notas').value = m.notas || '';
      document.getElementById('material-categoria').value = m.categoria?.id || '';
      document.getElementById('material-unidad').value = m.unidad?.id || '';
      document.getElementById('material-proveedor').value = m.proveedorPrincipal?.id || '';
      document.getElementById('material-codigo-prov').value = m.codigoProveedor || '';
      document.getElementById('material-keywords').value = m.keywords ? m.keywords.join(', ') : '';
      
      materialModal.classList.add('active');
    }
  };

  window.deleteMaterial = async (id) => {
    const m = allMateriales.find(x => x.id === id);
    const action = m?.activo ? 'Inactivar' : 'Reactivar';
    if (confirm(`¿Está seguro de que desea ${action} este material?`)) {
      const res = await fetchApi(`/materiales/${id}`, { method: 'DELETE' });
      if (res.ok) loadMaterialesTable();
    }
  };

  // --------------------------------------------------------
  // PROVEEDORES LOGIC
  // --------------------------------------------------------
  const renderProveedoresTable = (proveedores) => {
    const tbody = document.getElementById('proveedores-table-body');
    if (!tbody) return;

    if (proveedores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay proveedores.</td></tr>';
      return;
    }

    const visible = showInactiveProveedores ? proveedores : proveedores.filter(p => p.activo);
    
    tbody.innerHTML = visible.map(p => `
      <tr class="${!p.activo ? 'inactive-row' : ''}">
        <td><span class="badge" style="background: var(--bg-3); border: 1px solid var(--border);">${p.codigo}</span></td>
        <td><strong>${p.razonSocial}</strong>${p.nombreFantasia ? `<br><small style="color: var(--text-3);">${p.nombreFantasia}</small>` : ''}</td>
        <td>${p.cuit || '-'}</td>
        <td>${p.contactoNombre || '-'}</td>
        <td>${p.telefono || p.contactoTelefono || '-'}</td>
        <td><span class="badge ${p.activo ? 'badge-active' : 'badge-pending'}">${p.activo ? 'Sí' : 'No'}</span></td>
        <td style="text-align: right;">
          <div class="actions" style="justify-content: flex-end;">
            <button class="btn-icon edit-btn" onclick="editProveedor(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" onclick="toggleProveedor(${p.id})" title="${p.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${p.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const loadProveedoresTable = async () => {
    try {
      const res = await fetchApi('/proveedores');
      if (res.ok) {
        appProveedores = await res.json();
        renderProveedoresTable(appProveedores);
      }
    } catch (e) { console.error(e); }
  };

  document.getElementById('proveedor-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = appProveedores.filter(p => 
      p.razonSocial.toLowerCase().includes(term) || 
      p.codigo.toLowerCase().includes(term) || 
      (p.cuit || '').includes(term)
    );
    renderProveedoresTable(filtered);
  });

  document.getElementById('toggle-inactive-proveedores')?.addEventListener('click', (e) => {
    showInactiveProveedores = !showInactiveProveedores;
    const btn = e.currentTarget;
    btn.classList.toggle('btn-active', showInactiveProveedores);
    btn.querySelector('i').className = showInactiveProveedores ? 'fas fa-eye' : 'fas fa-eye-slash';
    renderProveedoresTable(appProveedores);
  });

  const proveedorModal = document.getElementById('proveedor-modal');
  const proveedorForm = document.getElementById('proveedor-form');

  document.getElementById('add-proveedor-btn')?.addEventListener('click', () => {
    document.getElementById('proveedor-modal-title').textContent = 'Nuevo Proveedor';
    document.getElementById('proveedor-codigo-badge').style.display = 'none';
    document.getElementById('proveedor-codigo').value = '';
    document.getElementById('proveedor-codigo').disabled = false;
    document.getElementById('proveedor-codigo-notice').style.display = 'block';
    proveedorForm.reset();
    document.getElementById('proveedor-id').value = '';
    document.getElementById('cuit-validation-msg').textContent = '';
    proveedorModal.classList.add('active');
  });

  document.getElementById('proveedor-cuit')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const msg = document.getElementById('cuit-validation-msg');
    if (!val) {
      msg.textContent = '';
      e.target.style.borderColor = 'var(--border)';
      return;
    }
    if (validarCuit(val)) {
      msg.textContent = '✓ CUIT válido';
      msg.style.color = '#10b981';
      e.target.style.borderColor = '#10b981';
    } else {
      msg.textContent = '✕ CUIT inválido (XX-XXXXXXXX-X)';
      msg.style.color = '#ef4444';
      e.target.style.borderColor = '#ef4444';
    }
  });

  proveedorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('proveedor-id').value;
    const cuit = document.getElementById('proveedor-cuit').value;

    if (cuit && !validarCuit(cuit)) {
      alert('Por favor, ingrese un CUIT válido.');
      return;
    }

    const body = {
      codigo: document.getElementById('proveedor-codigo').value || null,
      razonSocial: document.getElementById('proveedor-razon-social').value,
      cuit: cuit || null,
      nombreFantasia: document.getElementById('proveedor-nombre-fantasia').value || null,
      email: document.getElementById('proveedor-email').value || null,
      direccion: document.getElementById('proveedor-direccion').value || null,
      contactoNombre: document.getElementById('proveedor-contacto-nombre').value || null,
      contactoTelefono: document.getElementById('proveedor-contacto-tel').value || null,
      contactoEmail: document.getElementById('proveedor-contacto-email').value || null,
      notas: document.getElementById('proveedor-notas').value || null,
    };

    const method = id ? 'PATCH' : 'POST';
    const endpoint = id ? `/proveedores/${id}` : '/proveedores';

    const res = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
    if (res.ok) {
      proveedorModal.classList.remove('active');
      loadProveedoresTable();
      refreshSelects();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al guardar proveedor');
    }
  });

  window.editProveedor = async (id) => {
    const p = appProveedores.find(x => x.id === id);
    if (p) {
      document.getElementById('proveedor-modal-title').textContent = 'Editar Proveedor';
      const badge = document.getElementById('proveedor-codigo-badge');
      badge.textContent = p.codigo;
      badge.style.display = 'inline-block';
      
      document.getElementById('proveedor-id').value = p.id;
      document.getElementById('proveedor-codigo').value = p.codigo;
      document.getElementById('proveedor-codigo').disabled = true;
      document.getElementById('proveedor-codigo-notice').style.display = 'none';
      document.getElementById('proveedor-razon-social').value = p.razonSocial;
      document.getElementById('proveedor-cuit').value = p.cuit || '';
      document.getElementById('proveedor-nombre-fantasia').value = p.nombreFantasia || '';
      document.getElementById('proveedor-email').value = p.email || '';
      document.getElementById('proveedor-direccion').value = p.direccion || '';
      document.getElementById('proveedor-contacto-nombre').value = p.contactoNombre || '';
      document.getElementById('proveedor-contacto-tel').value = p.contactoTelefono || '';
      document.getElementById('proveedor-contacto-email').value = p.contactoEmail || '';
      document.getElementById('proveedor-notas').value = p.notas || '';
      
      document.getElementById('proveedor-cuit').dispatchEvent(new Event('input'));
      proveedorModal.classList.add('active');
    }
  };

  window.toggleProveedor = async (id) => {
    if (confirm('¿Cambiar estado de este proveedor?')) {
      const res = await fetchApi(`/proveedores/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadProveedoresTable();
        refreshSelects();
      }
    }
  };

  // --------------------------------------------------------
  // UNIDADES LOGIC
  // --------------------------------------------------------
  let allUnidades = [];
  const renderUnidadesTable = (unidades) => {
    const tbody = document.getElementById('unidades-table-body');
    if (!tbody) return;

    if (unidades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay unidades cargadas.</td></tr>';
      return;
    }

    const visibleUnidades = showInactiveUnidades ? unidades : unidades.filter(u => u.activo);

    if (visibleUnidades.length === 0 && unidades.length > 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay unidades activas. Use el botón "Inactivos" para ver todos.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleUnidades.map(u => `
      <tr class="${!u.activo ? 'inactive-row' : ''}">
        <td style="font-weight: 600; color: var(--primary);">${u.simbolo}</td>
        <td>${u.descripcion}</td>
        <td><span class="badge ${u.activo ? 'badge-active' : 'badge-pending'}">${u.activo ? 'Activa' : 'Inactiva'}</span></td>
        <td style="text-align: right;">
          <div class="actions" style="justify-content: flex-end;">
            <button class="btn-icon edit-btn" onclick="editUnidad(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" onclick="deleteUnidad(${u.id})" title="${u.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${u.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const loadUnidadesTable = async () => {
    const tbody = document.getElementById('unidades-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando unidades...</td></tr>';
    
    try {
      const res = await fetchApi('/unidades');
      if (res.ok) {
        allUnidades = await res.json();
        renderUnidadesTable(allUnidades);
      }
    } catch (e) { console.error(e); }
  };

  document.getElementById('toggle-inactive-unidades')?.addEventListener('click', (e) => {
    showInactiveUnidades = !showInactiveUnidades;
    const btn = e.currentTarget;
    btn.classList.toggle('btn-active', showInactiveUnidades);
    btn.querySelector('i').className = showInactiveUnidades ? 'fas fa-eye' : 'fas fa-eye-slash';
    renderUnidadesTable(allUnidades);
  });

  const unidadModal = document.getElementById('unidad-modal');
  const unidadForm = document.getElementById('unidad-form');

  document.getElementById('add-unidad-btn')?.addEventListener('click', () => {
    document.getElementById('unidad-modal-title').textContent = 'Nueva Unidad';
    unidadForm.reset();
    document.getElementById('unidad-id').value = '';
    unidadModal.classList.add('active');
  });

  unidadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('unidad-id').value;
    const body = {
      simbolo: document.getElementById('unidad-simbolo').value.trim().toUpperCase(),
      descripcion: document.getElementById('unidad-descripcion').value.trim()
    };

    const method = id ? 'PATCH' : 'POST';
    const endpoint = id ? `/unidades/${id}` : '/unidades';

    const res = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
    if (res.ok) {
      unidadModal.classList.remove('active');
      loadUnidadesTable();
      refreshSelects(); // Units are used in selects
    } else {
      const err = await res.json();
      alert(err.message || 'Error al guardar unidad');
    }
  });

  window.editUnidad = async (id) => {
    const u = allUnidades.find(x => x.id === id);
    if (u) {
      document.getElementById('unidad-modal-title').textContent = 'Editar Unidad';
      document.getElementById('unidad-id').value = u.id;
      document.getElementById('unidad-simbolo').value = u.simbolo;
      document.getElementById('unidad-descripcion').value = u.descripcion;
      unidadModal.classList.add('active');
    }
  };

  window.deleteUnidad = async (id) => {
    const u = allUnidades.find(x => x.id === id);
    const action = u?.activo ? 'Inactivar' : 'Reactivar';
    if (confirm(`¿Está seguro de que desea ${action} esta unidad?`)) {
      const res = await fetchApi(`/unidades/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadUnidadesTable();
        refreshSelects();
      }
    }
  };

  // --------------------------------------------------------
  // ROUTER & NAVIGATION
  // --------------------------------------------------------
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      
      // Update UI
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      viewSections.forEach(s => s.classList.remove('active'));
      document.getElementById(targetView).classList.add('active');

      // Refresh data for the view
      if (targetView === 'pedidos-view') loadOrders();
      if (targetView === 'sectores-view') loadSectoresTable();
      if (targetView === 'categorias-view') loadCategoriasTable();
      if (targetView === 'materiales-view') loadMaterialesTable();
      if (targetView === 'proveedores-view') loadProveedoresTable();
      if (targetView === 'usuarios-view') loadUsuariosTable();
      if (targetView === 'unidades-view') loadUnidadesTable();
    });
  });

  // --------------------------------------------------------
  // DETALLES MODAL LOGIC
  // --------------------------------------------------------
  const detallesModal = document.getElementById('detalles-modal');

  window.renderDetallesTable = (detalles, pedidoId) => {
    const tbody = document.getElementById('detalles-table-body');
    if (!tbody) return;
    
    const compradoresOptions = '<option value="">Sin Asignar</option>' + 
      appUsuarios.filter(u => u.rol === 'COMPRADOR' || u.rol === 'ADMIN').map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');

    const visibleDetalles = showInactiveDetalles ? detalles : detalles.filter(d => d.activo);

    const unidadesOptions = '<option value="">(Manual)...</option>' + 
      allUnidades.map(u => `<option value="${u.id}">${u.simbolo}</option>`).join('');

    if (visibleDetalles.length === 0 && detalles.length > 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay ítems activos. Use el botón de ojo para ver todos.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleDetalles.map(d => {
      const allowedTransitions = {
        'PENDIENTE': ['APROBADO', 'RECHAZADO'],
        'APROBADO': ['EN_COMPRA'],
        'EN_COMPRA': ['COMPRADO'],
        'COMPRADO': ['RECIBIDO'],
        'RECHAZADO': [],
        'RECIBIDO': []
      };

      let filteredStates = allowedTransitions[d.estado] || [];
      if (user?.rol === 'ADMIN') {
        filteredStates = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_COMPRA', 'COMPRADO', 'RECIBIDO'].filter(s => s !== d.estado);
      } else if (user?.rol === 'SOLICITANTE') {
        filteredStates = filteredStates.filter(s => s === 'RECIBIDO');
      }

      const stateOptions = `<option value="${d.estado}" selected>${d.estado}</option>` + 
        filteredStates.map(s => `<option value="${s}">${s}</option>`).join('');

      // Auto-assignment logic: find buyers with matching category
      let suggestedBuyerId = d.comprador?.id || '';
      if (!suggestedBuyerId && d.material?.categoria?.id) {
        const matches = appUsuarios.filter(u => 
          (u.rol === 'COMPRADOR' || u.rol === 'ADMIN') && 
          u.categorias?.some(c => c.id === d.material.categoria.id)
        );
        if (matches.length > 0) suggestedBuyerId = matches[0].id; // Assign first match
      }

      return `
        <tr class="${!d.activo ? 'inactive-row' : ''}">
          <td>
            <div style="font-weight: 600;">${d.material ? d.material.nombre : d.descripcionManual}</div>
            ${d.material?.codigo ? `<div style="font-size: 0.7rem; color: var(--primary); font-family: monospace;">${d.material.codigo}</div>` : ''}
          </td>
          <td>
            <input type="number" class="inline-edit-input" value="${Number(d.cantidad) % 1 === 0 ? parseInt(d.cantidad) : d.cantidad}" step="any" style="width: 80px;" onchange="updateDetalleInline(${d.id}, 'cantidad', this.value, ${pedidoId})">
          </td>
          <td>
            ${d.material ? 
              `<span style="color: var(--primary); font-weight:600;">${d.material.unidad?.simbolo || '-'}</span>` : 
              `<select class="status-select" style="width: 80px;" onchange="updateDetalleInline(${d.id}, 'unidadOverrideId', this.value, ${pedidoId})">
                ${unidadesOptions}
               </select>`
            }
          </td>
          <td>
            <select class="status-select" onchange="cambiarEstadoDetalle(${d.id}, this.value, ${pedidoId})">
              ${stateOptions}
            </select>
          </td>
          <td>
            <select class="status-select" style="width: 150px;" onchange="updateDetalleInline(${d.id}, 'compradorId', this.value, ${pedidoId})">
              ${compradoresOptions}
            </select>
          </td>
          <td>
            <input type="text" class="inline-edit-input" value="${d.observaciones || ''}" placeholder="Notas..." style="width: 150px;" onchange="updateDetalleInline(${d.id}, 'observaciones', this.value, ${pedidoId})">
          </td>
          <td>
            <span class="badge ${d.activo ? 'badge-active' : 'badge-pending'}">${d.activo ? 'Sí' : 'No'}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn-icon delete-btn" onclick="toggleDetalleActivo(${d.id}, ${pedidoId})" title="${d.activo ? 'Desactivar' : 'Reactivar'}">
              <i class="fas ${d.activo ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Set select values after rendering
    detalles.forEach((d, idx) => {
      const row = tbody.children[idx];
      if (!row) return;

      const selects = row.querySelectorAll('select');
      // New Order of selects in row: [Unit (if manual), State, Buyer]
      
      let stateSelect, buyerSelect, unitSelect;
      if (!d.material) {
        unitSelect = selects[0];
        stateSelect = selects[1];
        buyerSelect = selects[2];
        if (unitSelect) unitSelect.value = d.unidadOverride?.id || '';
      } else {
        stateSelect = selects[0];
        buyerSelect = selects[1];
      }

      if (stateSelect) stateSelect.value = d.estado;
      
      if (buyerSelect) {
        let buyerId = d.comprador?.id || '';
        if (!buyerId && d.material?.categoria?.id) {
          const matches = appUsuarios.filter(u => u.categorias?.some(c => c.id === d.material.categoria.id));
          if (matches.length > 0) buyerId = matches[0].id;
        }
        buyerSelect.value = buyerId;
      }
    });
  };

  let currentPedidoData = null; // For export/print
  window.openDetallesModal = async (pedidoId) => {
    const res = await fetchApi(`/pedidos/${pedidoId}`);
    if (res.ok) {
      currentPedidoData = await res.json();
      document.getElementById('detalles-pedido-numero').textContent = currentPedidoData.numeroSolicitud;
      document.getElementById('detalles-pedido-descripcion').textContent = currentPedidoData.descripcion || '';
      window.renderDetallesTable(currentPedidoData.detalles, currentPedidoData.id);
      detallesModal.classList.add('active');
    }
  };

  document.getElementById('toggle-inactive-detalles')?.addEventListener('click', (e) => {
    showInactiveDetalles = !showInactiveDetalles;
    const btn = e.currentTarget;
    btn.classList.toggle('btn-active', showInactiveDetalles);
    btn.querySelector('i').className = showInactiveDetalles ? 'fas fa-eye' : 'fas fa-eye-slash';
    if (currentPedidoData) {
      window.renderDetallesTable(currentPedidoData.detalles, currentPedidoData.id);
    }
  });

  document.getElementById('add-detalle-btn')?.addEventListener('click', () => {
    if (!currentPedidoData) return;
    const tbody = document.getElementById('detalles-table-body');
    
    // Remove "No hay detalles" if present
    if (tbody.innerHTML.includes('colspan')) tbody.innerHTML = '';

    const row = document.createElement('tr');
    row.style.background = 'rgba(255, 255, 255, 0.05)';
    
    const materialesOptions = '<option value="">(Manual) Escribir descripción...</option>' + 
      appMateriales.map(m => `<option value="${m.id}">${m.codigo ? m.codigo + ' - ' : ''}${m.nombre}</option>`).join('');

    row.innerHTML = `
      <td>
        <select class="status-select new-item-material" onchange="this.nextElementSibling.style.display = this.value ? 'none' : 'block'">
          ${materialesOptions}
        </select>
        <input type="text" class="inline-edit-input new-item-desc" placeholder="Descripción manual..." style="margin-top: 5px;">
      </td>
      <td><input type="number" class="inline-edit-input new-item-qty" value="1" step="0.01" style="width: 80px;"></td>
      <td><span class="badge badge-pending">PENDIENTE</span></td>
      <td>-</td>
      <td><input type="text" class="inline-edit-input new-item-obs" placeholder="Notas..." style="width: 150px;"></td>
      <td>-</td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn-icon" onclick="saveNewDetalle(this, ${currentPedidoData.id})" title="Guardar" style="color: var(--primary);">
            <i class="fas fa-save"></i>
          </button>
          <button class="btn-icon" onclick="this.closest('tr').remove()" title="Cancelar" style="color: #ef4444;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  window.saveNewDetalle = async (btn, pedidoId) => {
    const row = btn.closest('tr');
    const materialId = row.querySelector('.new-item-material').value;
    const descripcionManual = row.querySelector('.new-item-desc').value;
    const cantidad = parseFloat(row.querySelector('.new-item-qty').value);
    const observaciones = row.querySelector('.new-item-obs').value;

    const res = await fetchApi(`/pedidos/${pedidoId}/detalles`, {
      method: 'POST',
      body: JSON.stringify({ 
        materialId: materialId ? parseInt(materialId) : undefined, 
        descripcionManual, 
        cantidad,
        observaciones
      })
    });

    if (res.ok) {
      window.openDetallesModal(pedidoId);
      loadOrders();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al agregar ítem');
    }
  };

  document.getElementById('export-excel-btn')?.addEventListener('click', () => {
    if (!currentPedidoData) return;
    const rows = [
      ['SOLICITUD DE PEDIDO MANTENIMIENTO'],
      ['Nro Pedido', currentPedidoData.numeroSolicitud],
      ['Solicitante', currentPedidoData.solicitante?.nombre || 'N/A'],
      ['Sector', currentPedidoData.sector?.nombre || 'General'],
      ['Fecha', new Date(currentPedidoData.fechaPedido).toLocaleDateString()],
      ['Descripción', currentPedidoData.descripcion || ''],
      [],
      ['Material / Descripción', 'Cantidad', 'U.M.', 'Observaciones']
    ];

    currentPedidoData.detalles.forEach(d => {
      const materialName = d.material ? `${d.material.codigo ? d.material.codigo + ' - ' : ''}${d.material.nombre}` : d.descripcionManual;
      const unit = d.material ? (d.material.unidad?.simbolo || '-') : (d.unidadOverride?.simbolo || '-');
      const qty = Number(d.cantidad) % 1 === 0 ? parseInt(d.cantidad) : d.cantidad;
      
      rows.push([
        materialName,
        qty,
        unit,
        d.observaciones || ''
      ]);
    });

    // Use semicolon as separator for better compatibility with Spanish Excel
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedido_${currentPedidoData.numeroSolicitud}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  document.getElementById('print-pedido-btn')?.addEventListener('click', () => {
    if (!currentPedidoData) return;
    const printWindow = window.open('', '_blank');
    
    // Logo / Brand Name
    const systemName = "OVO_COMPRAS";
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${currentPedidoData.numeroSolicitud}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            * { box-sizing: border-box; }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              line-height: 1.5;
              background: #fff;
            }
            
            /* Header Styling */
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .brand-section h1 {
              margin: 0;
              font-size: 24px;
              color: #0f172a;
              letter-spacing: -0.02em;
            }
            
            .brand-section h1 span { color: #3b82f6; }
            
            .request-meta {
              text-align: right;
            }
            
            .request-number {
              font-size: 18px;
              font-weight: 700;
              color: #3b82f6;
              margin-bottom: 4px;
            }
            
            .date-stamp {
              font-size: 12px;
              color: #64748b;
            }
            
            /* Summary Grid */
            .summary-box {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 30px;
            }
            
            .summary-item label {
              display: block;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 4px;
            }
            
            .summary-item p {
              margin: 0;
              font-size: 14px;
              font-weight: 500;
              color: #1e293b;
            }
            
            /* Table Styling */
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            
            th { 
              background-color: #f1f5f9; 
              color: #475569;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-weight: 700;
              padding: 12px 15px;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            
            td { 
              padding: 14px 15px; 
              font-size: 13px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: top;
            }
            
            tr:last-child td { border-bottom: none; }
            
            .item-name { font-weight: 600; color: #0f172a; }
            .item-code { font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px; }
            .item-obs { font-style: italic; color: #64748b; font-size: 12px; margin-top: 4px; }
            
            /* Signatures */
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 40px;
            }
            
            .sig-box {
              border-top: 1px solid #cbd5e1;
              padding-top: 10px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
            }
            
            .footer { 
              margin-top: 60px; 
              font-size: 11px; 
              color: #94a3b8; 
              text-align: center;
              border-top: 1px solid #f1f5f9;
              padding-top: 20px;
            }
            
            @media print {
              body { padding: 0; }
              .summary-box { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
              th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand-section">
              <h1><span>OVO</span>_COMPRAS</h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Sistema de Gestión de Compras</p>
            </div>
            <div class="request-meta">
              <div class="request-number">SOLICITUD #${currentPedidoData.numeroSolicitud}</div>
              <div class="date-stamp">Emitido el ${reportDate} a las ${reportTime}</div>
            </div>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <label>Solicitante</label>
              <p>${currentPedidoData.solicitante?.nombre || 'N/A'}</p>
            </div>
            <div class="summary-item">
              <label>Sector / Área</label>
              <p>${currentPedidoData.sector?.nombre || 'General'}</p>
            </div>
            <div class="summary-item">
              <label>Fecha del Pedido</label>
              <p>${new Date(currentPedidoData.fechaPedido).toLocaleDateString()}</p>
            </div>
            <div class="summary-item" style="grid-column: span 3;">
              <label>Descripción General</label>
              <p>${currentPedidoData.descripcion || 'Sin descripción'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Ítem / Material</th>
                <th style="width: 15%; text-align: center;">Cantidad</th>
                <th style="width: 15%; text-align: center;">U.M.</th>
                <th style="width: 20%;">Observación</th>
              </tr>
            </thead>
            <tbody>
              ${currentPedidoData.detalles.map(d => {
                const materialName = d.material ? d.material.nombre : d.descripcionManual;
                const materialCode = d.material?.codigo || '';
                const unit = d.material ? (d.material.unidad?.simbolo || '-') : (d.unidadOverride?.simbolo || '-');
                const qty = Number(d.cantidad) % 1 === 0 ? parseInt(d.cantidad) : d.cantidad;
                
                return `
                  <tr>
                    <td>
                      <div class="item-name">${materialName}</div>
                      ${materialCode ? `<div class="item-code">Cód: ${materialCode}</div>` : ''}
                    </td>
                    <td style="text-align: center; font-weight: 600;">${qty}</td>
                    <td style="text-align: center;">${unit}</td>
                    <td><div class="item-obs">${d.observaciones || '-'}</div></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="sig-box">Firma Solicitante</div>
            <div class="sig-box">Firma Autorizante</div>
            <div class="sig-box">Departamento Compras</div>
          </div>

          <div class="footer">
              Solicitud de Pedido Mantenimiento
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Give a small delay for fonts/styles to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  });

  window.updateDetalleInline = async (id, field, value, pedidoId) => {
    const body = { [field]: ['compradorId', 'unidadOverrideId'].includes(field) ? (value ? parseInt(value) : null) : (field === 'cantidad' ? parseFloat(value) : value) };
    const res = await fetchApi(`/pedidos/detalles/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (res.ok) {
      window.openDetallesModal(pedidoId);
      loadOrders();
    }
  };

  window.cambiarEstadoDetalle = async (id, nuevoEstado, pedidoId) => {
    const res = await fetchApi(`/pedidos/detalles/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: nuevoEstado }) });
    if (res.ok) {
      window.openDetallesModal(pedidoId);
      loadOrders();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al cambiar estado');
      window.openDetallesModal(pedidoId);
    }
  };

  window.toggleDetalleActivo = async (id, pedidoId) => {
    const pedido = allPedidos.find(p => p.id === pedidoId) || currentPedidoData;
    const d = pedido?.detalles?.find(x => x.id === id);
    const action = d?.activo ? 'Inactivar' : 'Reactivar';
    
    if (confirm(`¿Está seguro de que desea ${action} este ítem del pedido?`)) {
      const res = await fetchApi(`/pedidos/detalles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.openDetallesModal(pedidoId);
        loadOrders();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al actualizar');
      }
    }
  };

  // --------------------------------------------------------
  // QUICK MATERIAL LOGIC
  // --------------------------------------------------------
  document.getElementById('quick-material-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('quick-material-submit-btn');
    btn.disabled = true;

    const body = {
      nombre: document.getElementById('quick-material-nombre').value,
      unidadId: parseInt(document.getElementById('quick-material-unidad').value),
      categoriaId: document.getElementById('quick-material-categoria').value ? parseInt(document.getElementById('quick-material-categoria').value) : null
    };

    try {
      const res = await fetchApi('/materiales/quick', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) {
        const material = await res.json();
        // Refresh materials list globally
        await refreshSelects();
        
        // Update the select that triggered this
        if (window.lastMaterialSelect) {
          window.lastMaterialSelect.value = material.id;
          window.lastMaterialSelect.dispatchEvent(new Event('change'));
        }
        
        document.getElementById('quick-material-modal').classList.remove('active');
        document.getElementById('quick-material-form').reset();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al crear material');
      }
    } catch (e) { console.error(e); }
    btn.disabled = false;
  });

  // Init
  refreshSelects();
  loadOrders();
  }
});
