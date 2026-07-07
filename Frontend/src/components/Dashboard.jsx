import { useState, useEffect } from 'react';
import { LogOut, Home, Users, BarChart3, Upload, Search, Edit, Save, RefreshCw, Shield, X, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../services/api';
import './Dashboard.css';

const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const normalizeSpreadsheetRow = (row) =>
  Object.entries(row || {}).reduce((accumulator, [key, value]) => {
    accumulator[normalizeKey(key)] = typeof value === 'string' ? value.trim() : value;
    return accumulator;
  }, {});

const readSpreadsheetRows = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'csv') {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheet = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
};

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const mapUserRole = (roles) => {
  if (Array.isArray(roles)) {
    return roles.includes('ADMIN') ? 'ADMIN' : roles[0] || 'USER';
  }

  if (typeof roles === 'string' && roles.trim()) {
    return roles.includes('ADMIN') ? 'ADMIN' : roles;
  }

  return 'USER';
};

const WelcomeView = ({ user }) => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await apiFetch('/users/me/summary');
        setSummary(data);
      } catch (error) {
        console.error('Error cargando el resumen del usuario', error);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, []);

  const latestSession = summary?.latestSession;
  const displayUser = summary?.user || user;

  return (
    <div className="stats-section">
      <h2>Bienvenido a tu Espacio de Trabajo</h2>
      <div className="stat-card stat-blue">
        <div className="stat-icon"><Home size={28} /></div>
        <div className="stat-content">
          <p className="stat-label">Perfil Actual</p>
          <h3 className="stat-value">{displayUser?.username || displayUser?.userName}</h3>
          <span className="stat-change change-positive">Rol: {displayUser?.role || 'Usuario Estándar'}</span>
        </div>
      </div>
      
      <h3 style={{marginTop: '30px', marginBottom: '15px'}}>Información de tu Última Sesión</h3>
      <div className="chart-card">
        {loadingSummary ? (
          <p>Cargando datos de la última sesión...</p>
        ) : (
          <>
            <p><strong>Hora de inicio:</strong> {latestSession?.startedAt ? new Date(latestSession.startedAt).toLocaleString() : 'Sin registro'}</p>
            <p><strong>Hora fin:</strong> {latestSession?.endedAt ? new Date(latestSession.endedAt).toLocaleString() : 'Sesión activa o sin cierre'}</p>
            <p><strong>Intentos fallidos previos:</strong> {summary?.failedAttempts ?? displayUser?.intentosFallidos ?? 0}</p>
          </>
        )}
        <p style={{color: 'var(--text-tertiary)', marginTop: '10px'}}>
          * La información se carga desde el backend autenticado.
        </p>
      </div>
    </div>
  );
};

const AdminStatsView = () => {
  const [stats, setStats] = useState({ activos: 0, inactivos: 0, bloqueados: 0, fallidos: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch('/dashboard/stats');
        setStats({ activos: data.usuariosActivos, inactivos: data.usuariosInactivos, bloqueados: data.usuariosBloqueados, fallidos: data.totalIntentosFallidos });
      } catch (error) { console.error("Error cargando stats"); }
    };
    fetchStats();
  }, []);

  return (
    <div className="stats-section">
      <h2>Indicadores de Usuarios</h2>
      <div className="stats-grid">
        <div className="stat-card stat-green">
          <div className="stat-icon"><Users size={28} /></div>
          <div className="stat-content">
            <p className="stat-label">Sesiones Activas</p>
            <h3 className="stat-value">{stats.activos}</h3>
          </div>
        </div>
        <div className="stat-card stat-yellow">
          <div className="stat-icon"><Users size={28} /></div>
          <div className="stat-content">
            <p className="stat-label">Inactivos</p>
            <h3 className="stat-value">{stats.inactivos}</h3>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon"><BarChart3 size={28} /></div>
          <div className="stat-content">
            <p className="stat-label">Bloqueados</p>
            <h3 className="stat-value">{stats.bloqueados}</h3>
          </div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-icon"><BarChart3 size={28} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Intentos Fallidos</p>
            <h3 className="stat-value">{stats.fallidos}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};


const UserEditorModal = ({ currentUser, user, isAdmin, mySummary, onClose, onSave }) => {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    fechaNacimiento: '',
    userName: '',
    email: '',
    status: '',
    roleName: 'USER',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        nombres: user.nombres || '',
        apellidos: user.apellidos || '',
        identificacion: user.identificacion || '',
        fechaNacimiento: formatDateInput(user.fechaNacimiento),
        userName: user.userName || '',
        email: user.email || '',
        status: user.status || 'ACTIVO',
        roleName: user.role || 'USER',
        password: ''
      });
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const isOwnRecord = Number(currentUser?.id) === Number(user.id);
  const canEditStatus = isAdmin && !isOwnRecord && user.role !== 'ADMIN';
  const canEditRole = isAdmin && !isOwnRecord;
  const editableFields = isAdmin
    ? ['nombres', 'apellidos', 'identificacion', 'fechaNacimiento', 'userName', 'email']
    : ['nombres', 'apellidos', 'identificacion', 'fechaNacimiento'];
  const failedAttempts = isOwnRecord ? (mySummary?.failedAttempts ?? currentUser?.intentosFallidos ?? 0) : (user.intentosFallidos ?? 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1200 }}>
      <div className="chart-card" style={{ width: 'min(720px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ marginBottom: '6px' }}>Editar datos de {user.nombres} {user.apellidos}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{isOwnRecord ? 'Actualización de tu perfil' : 'Edición administrada desde el panel'}</p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Rol actual</div>
            <div style={{ marginTop: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>{user.role || 'USER'}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Intentos fallidos</div>
            <div style={{ marginTop: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>{failedAttempts}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Último acceso</div>
            <div style={{ marginTop: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>{isOwnRecord ? 'Disponible en bienvenida' : 'Vista administrativa'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            ['nombres', 'Nombres'],
            ['apellidos', 'Apellidos'],
            ['identificacion', 'Identificación'],
            ['fechaNacimiento', 'Fecha de nacimiento'],
            ['userName', 'Usuario'],
            ['email', 'Correo']
          ].filter(([field]) => editableFields.includes(field)).map(([field, label]) => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {label}
              <input
                value={form[field]}
                type={field === 'fechaNacimiento' ? 'date' : 'text'}
                onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </label>
          ))}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
            Nueva contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
              placeholder="Dejar en blanco para no cambiarla"
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </label>

          {canEditStatus && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Estado
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </label>
          )}

          {canEditRole && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Rol
              <select
                value={form.roleName}
                onChange={(event) => setForm((previous) => ({ ...previous, roleName: event.target.value }))}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="logout-button" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            Cancelar
          </button>
          <button type="button" onClick={() => onSave(form)} className="login-button" style={{ marginTop: 0 }}>
            <Save size={18} /> Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateUserModal = ({ isAdmin, onClose, onCreate }) => {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    fechaNacimiento: '',
    userName: '',
    password: '',
    roleName: 'USER'
  });

  if (!isAdmin) {
    return null;
  }

  const handleSubmit = () => {
    onCreate(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1300 }}>
      <div className="chart-card" style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ marginBottom: '6px' }}>Crear usuario manualmente</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Alta rápida desde el panel del administrador</p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            ['nombres', 'Nombres'],
            ['apellidos', 'Apellidos'],
            ['identificacion', 'Identificación'],
            ['fechaNacimiento', 'Fecha de nacimiento'],
            ['userName', 'Usuario'],
            ['password', 'Contraseña']
          ].map(([field, label]) => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {label}
              <input
                value={form[field]}
                type={field === 'fechaNacimiento' ? 'date' : field === 'password' ? 'password' : 'text'}
                onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </label>
          ))}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
            Rol
            <select
              value={form.roleName}
              onChange={(event) => setForm((previous) => ({ ...previous, roleName: event.target.value }))}
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="logout-button" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="login-button" style={{ marginTop: 0 }}>
            <Save size={18} /> Crear usuario
          </button>
        </div>
      </div>
    </div>
  );
};

const MaintenanceView = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN';
  const [users, setUsers] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const loadUsers = async (filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const searchParams = new URLSearchParams();
      if (isAdmin) {
        if (filters.search) searchParams.set('search', filters.search);
        if (filters.status) searchParams.set('status', filters.status);
        if (filters.role) searchParams.set('role', filters.role);
      }

      const data = await apiFetch(isAdmin ? `/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}` : '/users/me');
      setUsers(Array.isArray(data) ? data : [data]);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers({ search, status: statusFilter, role: roleFilter });
    const loadMySummary = async () => {
      try {
        const data = await apiFetch('/users/me/summary');
        setMySummary(data);
      } catch (error) {
        console.error('Error cargando mi resumen', error);
      }
    };

    loadMySummary();
  }, [user]);

  const submitFilters = async (event) => {
    event.preventDefault();
    await loadUsers({ search, status: statusFilter, role: roleFilter });
  };

  const handleSaveUser = async (form) => {
    setSaving(true);
    setError('');
    try {
      const payload = isAdmin
        ? {
            nombres: form.nombres,
            apellidos: form.apellidos,
            identificacion: form.identificacion,
            fechaNacimiento: form.fechaNacimiento,
            userName: form.userName,
            mail: form.email,
            status: form.status,
            password: form.password || undefined
          }
        : {
            nombres: form.nombres,
            apellidos: form.apellidos,
            identificacion: form.identificacion,
            fechaNacimiento: form.fechaNacimiento,
            password: form.password || undefined
          };

      await apiFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (isAdmin && form.roleName && form.roleName !== editingUser.role) {
        await apiFetch(`/users/${editingUser.id}/role`, {
          method: 'PUT',
          body: JSON.stringify({ roleName: form.roleName })
        });
      }

      setEditingUser(null);
      setMessage('Usuario actualizado correctamente.');
      await loadUsers({ search, status: statusFilter, role: roleFilter });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (form) => {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          nombres: form.nombres,
          apellidos: form.apellidos,
          identificacion: form.identificacion,
          fechaNacimiento: form.fechaNacimiento,
          userName: form.userName,
          password: form.password,
          roleName: form.roleName
        })
      });

      setCreatingUser(false);
      setMessage('Usuario creado correctamente.');
      await loadUsers({ search, status: statusFilter, role: roleFilter });
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (targetUser) => {
    setSaving(true);
    setError('');
    try {
      const nextStatus = targetUser.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await apiFetch(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage(`Estado de ${targetUser.userName} actualizado a ${nextStatus}.`);
      await loadUsers({ search, status: statusFilter, role: roleFilter });
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const rows = await readSpreadsheetRows(file);
      const normalizedRows = rows.map(normalizeSpreadsheetRow).map((row) => ({
        nombres: row.nombres || row.nombre || row.firstName || '',
        apellidos: row.apellidos || row.apellido || row.lastName || '',
        identificacion: String(row.identificacion || row.cedula || row.documento || ''),
        fechaNacimiento: row.fechanacimiento || row.fechaNacimiento || row.fechadenacimiento || null,
        userName: row.username || row.userName || row.usuario || '',
        mail: row.mail || row.email || row.correo || '',
        status: row.status || row.estado || 'ACTIVO',
        password: row.password || row.clave || ''
      })).filter((row) => row.identificacion && row.nombres && row.apellidos);

      const result = await apiFetch('/users/import', {
        method: 'POST',
        body: JSON.stringify({ rows: normalizedRows })
      });

      setBulkResult(result);
      setMessage(result.message || 'Carga masiva procesada.');
      await loadUsers({ search, status: statusFilter, role: roleFilter });
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const visibleUsers = users;

  return (
    <div className="stats-section">
      <h2>Mantenimiento de Personas</h2>

      {error && (
        <div className="chart-card" style={{ marginBottom: '18px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="chart-card" style={{ marginBottom: '18px', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
          {message}
        </div>
      )}

      {isAdmin && (
        <div className="chart-card" style={{ marginBottom: '20px', display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700 }}>Carga masiva (.xlsx o .csv)</label>
              <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} disabled={uploading} />
            </div>

            <button type="button" className="logout-button" onClick={() => loadUsers({ search, status: statusFilter, role: roleFilter })} disabled={loading || saving || uploading}>
              <RefreshCw size={18} /> Refrescar
            </button>

            <button type="button" className="login-button" style={{ marginTop: 0 }} onClick={() => setCreatingUser(true)} disabled={saving || uploading}>
              <Users size={18} /> Nuevo usuario
            </button>
          </div>

          {bulkResult && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '14px', lineHeight: '1.6' }}>
              <strong>Resultado:</strong> {bulkResult.created} creados, {bulkResult.updated} actualizados, {bulkResult.skipped} omitidos.
            </div>
          )}

          <form onSubmit={submitFilters} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 700 }}>Buscar personas</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="text"
                  placeholder="Nombre, identificación, correo o usuario"
                  style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <button type="submit" className="login-button" style={{ marginTop: 0 }} disabled={loading}>
                  <Search size={18} /> Buscar
                </button>
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 700 }}>Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 700 }}>Rol</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos</option>
                <option value="ADMIN">ADMIN</option>
                <option value="USER">USER</option>
              </select>
            </label>

            <button type="submit" className="logout-button" style={{ height: '48px', justifyContent: 'center' }} disabled={loading}>
              <Filter size={18} /> Filtrar
            </button>
          </form>
        </div>
      )}

      <div className="activity-list" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px' }}>Persona</th>
              <th style={{ padding: '16px' }}>Identificación</th>
              <th style={{ padding: '16px' }}>Usuario</th>
              <th style={{ padding: '16px' }}>Correo</th>
              <th style={{ padding: '16px' }}>Rol</th>
              <th style={{ padding: '16px' }}>Estado</th>
              <th style={{ padding: '16px' }}>Intentos fallidos</th>
              <th style={{ padding: '16px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Cargando usuarios...
                </td>
              </tr>
            ) : visibleUsers.length ? (
              visibleUsers.map((item) => {
                const role = mapUserRole(item.roles || item.role);
                const isOwnRecord = Number(user.id) === Number(item.id);
                const canEdit = !isAdmin ? isOwnRecord : role !== 'ADMIN' || isOwnRecord;
                const canChangeStatus = isAdmin && role !== 'ADMIN' && !isOwnRecord;
                const statusClass = item.status === 'ACTIVO' ? 'change-positive' : item.status === 'BLOQUEADO' ? 'change-negative' : '';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>
                      <strong>{item.nombres} {item.apellidos}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{item.fechaNacimiento || 'Sin fecha registrada'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>{item.identificacion}</td>
                    <td style={{ padding: '16px' }}>{item.userName}</td>
                    <td style={{ padding: '16px' }}>{item.email}</td>
                    <td style={{ padding: '16px' }}>{role}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`stat-change ${statusClass}`}>{item.status}</span>
                    </td>
                    <td style={{ padding: '16px' }}>{item.intentosFallidos ?? 0}</td>
                    <td style={{ padding: '16px' }}>
                      {canEdit && (
                        <button type="button" onClick={() => setEditingUser({ ...item, role })} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                          <Edit size={18} /> Editar
                        </button>
                      )}
                      {canChangeStatus && (
                        <button type="button" onClick={() => handleStatusChange(item)} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={saving}>
                          <Shield size={16} /> {item.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay usuarios disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <UserEditorModal
          currentUser={user}
          user={editingUser}
          isAdmin={isAdmin}
          mySummary={mySummary}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {creatingUser && (
        <CreateUserModal
          isAdmin={isAdmin}
          onClose={() => setCreatingUser(false)}
          onCreate={handleCreateUser}
        />
      )}
    </div>
  );
};



const Dashboard = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('welcome');
  const [menuOptions, setMenuOptions] = useState([]);

  // Cargar menú desde la Base de Datos (Simulado según el Rol)
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const data = await apiFetch('/menus');
        const resolvedMenu = data.map((item) => ({
          ...item,
          icon: item.id === 'stats' ? BarChart3 : item.id === 'maintenance' ? Users : Home
        }));

        setMenuOptions(resolvedMenu);
        if (!resolvedMenu.some((item) => item.id === currentView)) {
          setCurrentView(resolvedMenu[0]?.id || 'welcome');
        }
      } catch (error) {
        console.error('Error cargando el menú', error);
        setMenuOptions([
          { id: 'welcome', label: 'Bienvenida', icon: Home },
          { id: 'maintenance', label: 'Mantenimiento', icon: Users }
        ]);
      }
    };
    fetchMenu();
  }, [user]);

  return (
    <div style={{display: 'flex', width: '100%', minHeight: '100vh'}}>
      
      {/* SIDEBAR */}
      <aside style={{width: '260px', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column'}}>
        <div style={{padding: '30px 20px', borderBottom: '1px solid var(--border-color)'}}>
          <h2 style={{color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap:'10px'}}>
             <BarChart3 size={24}/> Viamatica
          </h2>
        </div>
        
        <nav style={{flexGrow: 1, padding: '20px 0'}}>
          {menuOptions.map(option => {
            const Icon = option.icon;
            return (
              <div 
                key={option.id} 
                onClick={() => setCurrentView(option.id)}
                style={{
                  padding: '15px 24px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: currentView === option.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: currentView === option.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                  borderRight: currentView === option.id ? '4px solid var(--color-primary)' : 'none',
                  fontWeight: currentView === option.id ? '600' : '500'
                }}>
                <Icon size={20} />
                {option.label}
              </div>
            )
          })}
        </nav>

        <div style={{padding: '20px', borderTop: '1px solid var(--border-color)'}}>
          <button onClick={onLogout} className="logout-button" style={{width: '100%', justifyContent: 'center'}}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="dashboard-container" style={{flexGrow: 1}}>
        <header className="dashboard-header">
          <div className="header-content">
            <h1>Panel de Control</h1>
            <p className="header-subtitle">{new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        <main className="dashboard-main">
          {currentView === 'welcome' && <WelcomeView user={user} />}
          {currentView === 'stats' && <AdminStatsView />}
          {currentView === 'maintenance' && <MaintenanceView user={user} />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;