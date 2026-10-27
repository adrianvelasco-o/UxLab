import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { practicasService } from '../services/practicasService.js';
import { CrearPracticaModal } from '../components/CrearPracticaModal.jsx';

const ESTADOS_PRACTICA = [
  { valor: 'TODOS', etiqueta: 'Todos los estados' },
  { valor: 'BORRADOR', etiqueta: 'Borrador' },
  { valor: 'EN_REVISION', etiqueta: 'En Revisión' },
  { valor: 'RECHAZADA', etiqueta: 'Rechazada' },
  { valor: 'APROBADA', etiqueta: 'Aprobada' },
  { valor: 'CERRADA', etiqueta: 'Cerrada' }
];

export function PracticasEstudiante() {
  const { navegar } = useNavigation();

  // Estados de datos
  const [practicas, setPracticas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [anuncioLive, setAnuncioLive] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Catálogo de docentes
  const [docentes, setDocentes] = useState([]);
  const [cargandoDocentes, setCargandoDocentes] = useState(false);

  // Modal de Creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const refBotonNuevaPractica = useRef(null);

  // Cargar prácticas desde el backend
  const cargarPracticas = useCallback(async () => {
    setCargando(true);
    setErrorGlobal('');
    try {
      const datos = await practicasService.listar({
        estado: filtroEstado
      });
      setPracticas(datos);
      setAnuncioLive(`Se cargaron ${datos.length} prácticas.`);
    } catch (err) {
      setErrorGlobal(err.message || 'No fue posible cargar sus prácticas.');
      setAnuncioLive('Error al cargar la lista de prácticas.');
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  // Cargar docentes activos para el selector
  const cargarDocentes = useCallback(async () => {
    setCargandoDocentes(true);
    try {
      const listaDocentes = await practicasService.listarDocentesDisponibles();
      setDocentes(listaDocentes);
    } catch (err) {
      console.warn('No se pudo cargar la lista de docentes:', err.message);
    } finally {
      setCargandoDocentes(false);
    }
  }, []);

  useEffect(() => {
    cargarPracticas();
    cargarDocentes();
  }, [cargarPracticas, cargarDocentes]);

  // Retornar el foco al botón disparador tras cerrar el modal (WCAG 2.4.3)
  const manejarCerrarModal = () => {
    setModalAbierto(false);
    setTimeout(() => {
      if (refBotonNuevaPractica.current) {
        refBotonNuevaPractica.current.focus();
      }
    }, 50);
  };

  // Callback de creación exitosa
  const manejarPracticaCreada = (nuevaPractica) => {
    setPracticas((prev) => [nuevaPractica, ...prev]);
    setMensajeExito(`Práctica "${nuevaPractica.titulo}" creada en estado Borrador exitosamente.`);
    setAnuncioLive(`Práctica "${nuevaPractica.titulo}" creada exitosamente.`);

    // Ocultar mensaje tras 6 segundos
    setTimeout(() => {
      setMensajeExito('');
    }, 6000);
  };

  // Formato visual y accesible del estado oficial
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'BORRADOR':
        return <span className="badge-estado badge-borrador">Borrador</span>;
      case 'EN_REVISION':
        return <span className="badge-estado badge-revision">En Revisión</span>;
      case 'RECHAZADA':
        return <span className="badge-estado badge-rechazada">Rechazada</span>;
      case 'APROBADA':
        return <span className="badge-estado badge-aprobada">Aprobada</span>;
      case 'CERRADA':
        return <span className="badge-estado badge-cerrada">Cerrada</span>;
      default:
        return <span className="badge-estado">{estado}</span>;
    }
  };

  // Filtrado en vivo por texto (título, descripción, objetivo o docente)
  const practicasFiltradas = practicas.filter((p) => {
    if (!busqueda.trim()) return true;
    const termino = busqueda.toLowerCase();
    const titulo = (p.titulo || '').toLowerCase();
    const desc = (p.descripcion || '').toLowerCase();
    const obj = (p.objetivo || '').toLowerCase();
    const docente = p.docente
      ? `${p.docente.nombres} ${p.docente.apellidos}`.toLowerCase()
      : '';
    return (
      titulo.includes(termino) ||
      desc.includes(termino) ||
      obj.includes(termino) ||
      docente.includes(termino)
    );
  });

  // Métricas rápidas
  const totalBorrador = practicas.filter((p) => p.estado === 'BORRADOR').length;
  const totalRevision = practicas.filter((p) => p.estado === 'EN_REVISION').length;
  const totalAprobadas = practicas.filter((p) => p.estado === 'APROBADA').length;

  return (
    <div className="panel-container">
      {/* Región de anuncios accesibles para lectores de pantalla (WCAG 4.1.2) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      {/* Cabecera y botón de acción */}
      <div className="header-seccion-usuarios">
        <div>
          <button
            type="button"
            className="btn-volver-dashboard"
            onClick={() => navegar(RUTAS.ESTUDIANTE, 'Panel Estudiante')}
            aria-label="Volver al panel principal del estudiante"
          >
            ← Volver al Panel Estudiante
          </button>
          <h1>Gestión de Prácticas de Usabilidad</h1>
          <p className="subtitulo-seccion">
            Consulte sus prácticas de laboratorio activas, visualice su estado o formule una nueva prueba UX.
          </p>
        </div>

        <button
          type="button"
          ref={refBotonNuevaPractica}
          className="btn btn-primario btn-nuevo-usuario"
          onClick={() => setModalAbierto(true)}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">➕</span> Formular Nueva Práctica
        </button>
      </div>

      {/* Mensaje de éxito tras crear */}
      {mensajeExito && (
        <div className="mensaje-alerta exito" role="status" aria-live="polite">
          <span aria-hidden="true" className="icono-alerta">✅</span>
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Mensaje de error general */}
      {errorGlobal && (
        <div className="mensaje-alerta error" role="alert">
          <span aria-hidden="true" className="icono-alerta">⚠️</span>
          <span>{errorGlobal}</span>
          <button
            type="button"
            className="btn btn-secundario btn-sm ml-auto"
            onClick={cargarPracticas}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas KPI de resumen */}
      <section className="kpi-resumen-grid" aria-labelledby="titulo-resumen-practicas">
        <h2 id="titulo-resumen-practicas" className="sr-only">Resumen de Prácticas</h2>

        <div className="kpi-card">
          <span className="kpi-titulo">Total Prácticas</span>
          <span className="kpi-valor">{practicas.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-titulo">En Borrador</span>
          <span className="kpi-valor">{totalBorrador}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-titulo">En Revisión</span>
          <span className="kpi-valor">{totalRevision}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-titulo">Aprobadas</span>
          <span className="kpi-valor">{totalAprobadas}</span>
        </div>
      </section>

      {/* Barra de herramientas: Búsqueda y Filtros */}
      <section className="toolbar-filtros-grid" aria-labelledby="titulo-filtros-practicas">
        <h2 id="titulo-filtros-practicas" className="sr-only">Búsqueda y Filtros de Prácticas</h2>

        <div className="filtro-campo">
          <label htmlFor="input-busqueda-practicas">Buscar Práctica:</label>
          <input
            id="input-busqueda-practicas"
            type="search"
            placeholder="Buscar por título, objetivo o docente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar en la lista de prácticas"
          />
        </div>

        <div className="filtro-campo">
          <label htmlFor="select-filtro-estado-practica">Filtrar por Estado:</label>
          <select
            id="select-filtro-estado-practica"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            disabled={cargando}
          >
            {ESTADOS_PRACTICA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Listado de Prácticas */}
      <section aria-labelledby="titulo-lista-practicas" className="contenedor-tabla-responsive">
        <h2 id="titulo-lista-practicas" className="sr-only">Lista de Prácticas del Estudiante</h2>

        {cargando ? (
          <div className="loading-container" role="status" aria-live="polite">
            <div className="spinner-large" aria-hidden="true"></div>
            <p>Cargando sus prácticas de usabilidad...</p>
          </div>
        ) : practicasFiltradas.length === 0 ? (
          <div className="lista-vacia-card" role="region" aria-label="Sin prácticas">
            <div className="icono-vacio" aria-hidden="true">📋</div>
            <h3>
              {busqueda || filtroEstado !== 'TODOS'
                ? 'No se encontraron prácticas con los filtros seleccionados'
                : 'Aún no tiene prácticas formuladas'}
            </h3>
            <p>
              {busqueda || filtroEstado !== 'TODOS'
                ? 'Pruebe restableciendo los filtros o ingresando otro término de búsqueda.'
                : 'Inicie la formulación de su primera prueba de laboratorio en estado Borrador.'}
            </p>
            {(!busqueda && filtroEstado === 'TODOS') && (
              <button
                type="button"
                className="btn btn-primario mt-3"
                onClick={() => setModalAbierto(true)}
              >
                Formular Primera Práctica
              </button>
            )}
          </div>
        ) : (
          <table className="tabla-usuarios" aria-describedby="titulo-lista-practicas">
            <caption className="sr-only">Tabla de prácticas formuladas por el estudiante</caption>
            <thead>
              <tr>
                <th scope="col">Título de la Práctica</th>
                <th scope="col">Descripción y Objetivo</th>
                <th scope="col">Docente Tutor</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha Creación</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {practicasFiltradas.map((practica) => (
                <tr key={practica.id}>
                  <td>
                    <div className="nombre-completo-celda">
                      <strong>{practica.titulo}</strong>
                      <span className="correo-institucional-celda">
                        ID: #{practica.id}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="descripcion-practica-celda">
                      <p className="texto-descripcion-resumen">
                        {practica.descripcion}
                      </p>
                      <small className="texto-objetivo-resumen">
                        <strong>Meta:</strong> {practica.objetivo}
                      </small>
                    </div>
                  </td>
                  <td>
                    {practica.docente ? (
                      <div className="docente-asignado-celda">
                        <span className="docente-nombre">
                          {practica.docente.nombres} {practica.docente.apellidos}
                        </span>
                        <span className="correo-institucional-celda">
                          {practica.docente.correoInstitucional}
                        </span>
                      </div>
                    ) : (
                      <span className="badge-sin-tutor">
                        Sin tutor asignado
                      </span>
                    )}
                  </td>
                  <td>{renderBadgeEstado(practica.estado)}</td>
                  <td>
                    {practica.creadoEn
                      ? new Date(practica.creadoEn).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Reciente'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secundario btn-sm"
                      onClick={() =>
                        navegar(
                          `/estudiante/practica?id=${practica.id}`,
                          `Detalle de ${practica.titulo}`
                        )
                      }
                      aria-label={`Gestionar instrumentos y documentos de ${practica.titulo}`}
                    >
                      Gestionar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </section>

      {/* Modal accesible para formular nueva práctica */}
      <CrearPracticaModal
        abierto={modalAbierto}
        alCerrar={manejarCerrarModal}
        alCrearExitoso={manejarPracticaCreada}
        docentes={docentes}
        cargandoDocentes={cargandoDocentes}
      />
    </div>
  );
}

export default PracticasEstudiante;
