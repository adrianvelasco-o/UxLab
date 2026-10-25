import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { usuariosService } from '../services/usuariosService.js';

const ROLES_OFICIALES = [
  { valor: 'ADMINISTRADOR', etiqueta: 'Administrador' },
  { valor: 'DOCENTE', etiqueta: 'Docente' },
  { valor: 'ESTUDIANTE', etiqueta: 'Estudiante' }
];

export function UsuariosAdmin() {
  const { navegar } = useNavigation();

  // Estados de datos y carga
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [anuncioLive, setAnuncioLive] = useState('');

  // Filtros
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal de Creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState({
    nombres: '',
    apellidos: '',
    correoInstitucional: '',
    contrasena: '',
    rolNombre: 'DOCENTE',
    activo: true
  });
  const [erroresFormulario, setErroresFormulario] = useState({});

  const refBotonNuevo = useRef(null);
  const refPrimerInputModal = useRef(null);

  // Cargar usuarios desde la API
  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setErrorGlobal('');
    try {
      const datos = await usuariosService.listar({
        rol: filtroRol,
        activo: filtroEstado
      });
      setUsuarios(datos);
      setAnuncioLive(`Se cargaron ${datos.length} usuarios.`);
    } catch (err) {
      setErrorGlobal(err.message || 'Error al obtener la lista de usuarios.');
      setAnuncioLive('Error al cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  }, [filtroRol, filtroEstado]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Enfocar el primer campo al abrir modal
  useEffect(() => {
    if (modalAbierto && refPrimerInputModal.current) {
      refPrimerInputModal.current.focus();
    }
  }, [modalAbierto]);

  // Manejar cambio de rol
  const handleCambiarRol = async (usuarioId, nuevoRol) => {
    try {
      await usuariosService.cambiarRol(usuarioId, nuevoRol);
      setAnuncioLive(`Rol de usuario actualizado a ${nuevoRol}.`);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, rol: { ...u.rol, nombre: nuevoRol } } : u))
      );
    } catch (err) {
      setErrorGlobal(err.message || 'Error al cambiar rol del usuario.');
    }
  };

  // Manejar cambio de estado activo/inactivo
  const handleCambiarEstado = async (usuarioId, estadoActual, nombreUsuario) => {
    const nuevoEstado = !estadoActual;
    try {
      await usuariosService.cambiarEstado(usuarioId, nuevoEstado);
      const textoEstado = nuevoEstado ? 'activada' : 'desactivada';
      setAnuncioLive(`Cuenta de ${nombreUsuario} ${textoEstado} exitosamente.`);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, activo: nuevoEstado } : u))
      );
    } catch (err) {
      setErrorGlobal(err.message || 'Error al actualizar el estado del usuario.');
    }
  };

  // Validación y envío de formulario de creación
  const validarFormulario = () => {
    const errores = {};
    if (!formulario.nombres.trim() || formulario.nombres.trim().length < 2) {
      errores.nombres = 'El nombre es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (!formulario.apellidos.trim() || formulario.apellidos.trim().length < 2) {
      errores.apellidos = 'El apellido es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (!formulario.correoInstitucional.trim() || !formulario.correoInstitucional.includes('@')) {
      errores.correoInstitucional = 'Ingrese un correo institucional válido.';
    }
    if (!formulario.contrasena || formulario.contrasena.length < 8) {
      errores.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (!['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'].includes(formulario.rolNombre)) {
      errores.rolNombre = 'Rol no permitido.';
    }
    return errores;
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    const errores = validarFormulario();
    if (Object.keys(errores).length > 0) {
      setErroresFormulario(errores);
      return;
    }

    setGuardando(true);
    setErroresFormulario({});
    try {
      const nuevo = await usuariosService.crearUsuario(formulario);
      setAnuncioLive(`Usuario ${nuevo.nombres} ${nuevo.apellidos} creado exitosamente.`);
      setModalAbierto(false);
      setFormulario({
        nombres: '',
        apellidos: '',
        correoInstitucional: '',
        contrasena: '',
        rolNombre: 'DOCENTE',
        activo: true
      });
      // Recargar lista
      cargarUsuarios();
      if (refBotonNuevo.current) {
        refBotonNuevo.current.focus();
      }
    } catch (err) {
      setErroresFormulario({ general: err.message || 'Error al crear usuario.' });
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErroresFormulario({});
    if (refBotonNuevo.current) {
      refBotonNuevo.current.focus();
    }
  };

  // Filtrado de usuarios por búsqueda en memoria
  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busqueda.trim()) return true;
    const termino = busqueda.toLowerCase();
    const nombreCompleto = `${u.nombres} ${u.apellidos}`.toLowerCase();
    const correo = (u.correoInstitucional || '').toLowerCase();
    return nombreCompleto.includes(termino) || correo.includes(termino);
  });

  return (
    <div className="panel-container">
      {/* Región ARIA Live para anuncios accesibles (WCAG 4.1.2) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {anuncioLive}
      </div>

      {/* Cabecera y migas de pan */}
      <div className="content-welcome-card">
        <div className="breadcrumb-nav">
          <button
            type="button"
            onClick={() => navegar(RUTAS.ADMIN, 'Panel Administrador')}
            className="btn-breadcrumb"
            aria-label="Volver al panel principal de administrador"
          >
            ← Volver al Panel de Administración
          </button>
        </div>
        <h1>Gestión de Usuarios y Roles Institucionales</h1>
        <p>
          Administración de cuentas de usuarios de GesLab: alta de nuevos integrantes, asignación de roles (Administrador, Docente, Estudiante) y activación/desactivación de cuentas.
        </p>
      </div>

      {/* Mensaje de error global si existe */}
      {errorGlobal && (
        <div className="alerta-error" role="alert" aria-live="assertive">
          <span className="alerta-icono" aria-hidden="true">⚠️</span>
          <span>{errorGlobal}</span>
        </div>
      )}

      {/* Barra de herramientas y filtros */}
      <section className="usuarios-toolbar-card" aria-label="Filtros y búsqueda de usuarios">
        <div className="toolbar-filtros-grid">
          {/* Campo de búsqueda */}
          <div className="filtro-item">
            <label htmlFor="input-busqueda-usuario" className="filtro-label">
              Buscar usuario:
            </label>
            <input
              id="input-busqueda-usuario"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, apellido o correo..."
              className="filtro-input"
              aria-label="Buscar usuarios por nombre, apellido o correo institucional"
            />
          </div>

          {/* Filtro por Rol oficial */}
          <div className="filtro-item">
            <label htmlFor="select-filtro-rol" className="filtro-label">
              Filtrar por rol:
            </label>
            <select
              id="select-filtro-rol"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="filtro-select"
            >
              <option value="TODOS">Todos los roles</option>
              {ROLES_OFICIALES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="filtro-item">
            <label htmlFor="select-filtro-estado" className="filtro-label">
              Filtrar por estado:
            </label>
            <select
              id="select-filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="filtro-select"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVOS">Solo activos</option>
              <option value="INACTIVOS">Solo inactivos</option>
            </select>
          </div>

          {/* Botón Nuevo Usuario */}
          <div className="filtro-accion">
            <button
              ref={refBotonNuevo}
              type="button"
              onClick={() => setModalAbierto(true)}
              className="btn-nuevo-usuario"
              aria-haspopup="dialog"
            >
              + Nuevo Usuario
            </button>
          </div>
        </div>
      </section>

      {/* Tabla accesible de usuarios (WCAG 1.3.1, 2.1.1) */}
      <section className="usuarios-tabla-card" aria-labelledby="titulo-tabla-usuarios">
        <h2 id="titulo-tabla-usuarios" className="sr-only">
          Listado de usuarios registrados en GesLab
        </h2>

        {cargando ? (
          <div className="tabla-cargando" role="status" aria-live="polite">
            <div className="spinner-large" aria-hidden="true"></div>
            <p>Cargando lista de usuarios...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="tabla-vacia" role="status">
            <p>No se encontraron usuarios con los criterios de búsqueda seleccionados.</p>
          </div>
        ) : (
          <div className="tabla-responsive-wrap">
            <table className="tabla-usuarios" aria-describedby="titulo-tabla-usuarios">
              <caption className="sr-only">
                Usuarios de GesLab con opciones para editar rol y cambiar estado activo o inactivo
              </caption>
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Correo Institucional</th>
                  <th scope="col">Rol Actual</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const rolActual = u.rol?.nombre || 'ESTUDIANTE';
                  return (
                    <tr key={u.id} className={!u.activo ? 'fila-inactiva' : ''}>
                      <td>
                        <strong className="usuario-nombre">
                          {u.nombres} {u.apellidos}
                        </strong>
                      </td>
                      <td className="usuario-correo">{u.correoInstitucional}</td>
                      <td>
                        {/* Selector accesible de cambio de rol */}
                        <label htmlFor={`select-rol-${u.id}`} className="sr-only">
                          Cambiar rol de {u.nombres} {u.apellidos}
                        </label>
                        <select
                          id={`select-rol-${u.id}`}
                          value={rolActual}
                          onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                          className="select-tabla-rol"
                          aria-label={`Cambiar rol de ${u.nombres} ${u.apellidos}`}
                        >
                          {ROLES_OFICIALES.map((r) => (
                            <option key={r.valor} value={r.valor}>
                              {r.etiqueta}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`badge-estado ${u.activo ? 'activo' : 'inactivo'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {/* Botón accesible de activar/desactivar */}
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(u.id, u.activo, `${u.nombres} ${u.apellidos}`)}
                          className={`btn-estado-toggle ${u.activo ? 'btn-desactivar' : 'btn-activar'}`}
                          aria-label={`${u.activo ? 'Desactivar' : 'Activar'} cuenta de ${u.nombres} ${u.apellidos}`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Accesible para Crear Usuario (WCAG 1.3.1, 2.1.2, 2.4.3, 3.3.1, 3.3.2) */}
      {modalAbierto && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-crear"
          onKeyDown={(e) => {
            if (e.key === 'Escape') cerrarModal();
          }}
        >
          <div className="modal-contenido">
            <div className="modal-header">
              <h2 id="titulo-modal-crear">Crear Nuevo Usuario Institucional</h2>
              <button
                type="button"
                onClick={cerrarModal}
                className="btn-cerrar-modal"
                aria-label="Cerrar ventana de creación de usuario"
              >
                ✕
              </button>
            </div>

            {erroresFormulario.general && (
              <div className="alerta-error" role="alert">
                <span>{erroresFormulario.general}</span>
              </div>
            )}

            <form onSubmit={handleCrearUsuario} noValidate>
              <div className="form-group">
                <label htmlFor="modal-nombres" className="form-label">
                  Nombres <span aria-hidden="true">*</span>
                </label>
                <input
                  ref={refPrimerInputModal}
                  id="modal-nombres"
                  type="text"
                  value={formulario.nombres}
                  onChange={(e) => setFormulario({ ...formulario, nombres: e.target.value })}
                  className={`form-input ${erroresFormulario.nombres ? 'input-error' : ''}`}
                  aria-required="true"
                  aria-invalid={!!erroresFormulario.nombres}
                  aria-describedby={erroresFormulario.nombres ? 'error-nombres' : undefined}
                />
                {erroresFormulario.nombres && (
                  <span id="error-nombres" className="error-mensaje" role="alert">
                    {erroresFormulario.nombres}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="modal-apellidos" className="form-label">
                  Apellidos <span aria-hidden="true">*</span>
                </label>
                <input
                  id="modal-apellidos"
                  type="text"
                  value={formulario.apellidos}
                  onChange={(e) => setFormulario({ ...formulario, apellidos: e.target.value })}
                  className={`form-input ${erroresFormulario.apellidos ? 'input-error' : ''}`}
                  aria-required="true"
                  aria-invalid={!!erroresFormulario.apellidos}
                  aria-describedby={erroresFormulario.apellidos ? 'error-apellidos' : undefined}
                />
                {erroresFormulario.apellidos && (
                  <span id="error-apellidos" className="error-mensaje" role="alert">
                    {erroresFormulario.apellidos}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="modal-correo" className="form-label">
                  Correo Institucional (@unicolmayor.edu.co) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="modal-correo"
                  type="email"
                  value={formulario.correoInstitucional}
                  onChange={(e) => setFormulario({ ...formulario, correoInstitucional: e.target.value })}
                  className={`form-input ${erroresFormulario.correoInstitucional ? 'input-error' : ''}`}
                  aria-required="true"
                  aria-invalid={!!erroresFormulario.correoInstitucional}
                  aria-describedby={erroresFormulario.correoInstitucional ? 'error-correo' : undefined}
                  autoComplete="off"
                />
                {erroresFormulario.correoInstitucional && (
                  <span id="error-correo" className="error-mensaje" role="alert">
                    {erroresFormulario.correoInstitucional}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="modal-contrasena" className="form-label">
                  Contraseña Inicial (mínimo 8 caracteres) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="modal-contrasena"
                  type="password"
                  value={formulario.contrasena}
                  onChange={(e) => setFormulario({ ...formulario, contrasena: e.target.value })}
                  className={`form-input ${erroresFormulario.contrasena ? 'input-error' : ''}`}
                  aria-required="true"
                  aria-invalid={!!erroresFormulario.contrasena}
                  aria-describedby={erroresFormulario.contrasena ? 'error-contrasena' : undefined}
                  autoComplete="new-password"
                />
                {erroresFormulario.contrasena && (
                  <span id="error-contrasena" className="error-mensaje" role="alert">
                    {erroresFormulario.contrasena}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="modal-rol" className="form-label">
                  Rol Institucional <span aria-hidden="true">*</span>
                </label>
                <select
                  id="modal-rol"
                  value={formulario.rolNombre}
                  onChange={(e) => setFormulario({ ...formulario, rolNombre: e.target.value })}
                  className="form-select"
                  aria-required="true"
                >
                  {ROLES_OFICIALES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="btn-cancelar-modal"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-guardar-modal"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsuariosAdmin;
