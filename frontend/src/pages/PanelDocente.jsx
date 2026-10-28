import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { practicasService } from '../services/practicasService.js';

const FILTROS_ESTADO = [
  { valor: 'TODOS', etiqueta: 'Todas las Prácticas' },
  { valor: 'EN_REVISION', etiqueta: 'Pendientes de Revisión' },
  { valor: 'APROBADA', etiqueta: 'Aprobadas' },
  { valor: 'RECHAZADA', etiqueta: 'Con Observaciones' },
  { valor: 'BORRADOR', etiqueta: 'En Formulación' }
];

/**
 * Bandeja Funcional de Prácticas de Usabilidad para el Docente Tutor (PB4-B-01).
 * Permite consultar, filtrar y navegar a las prácticas asignadas y pendientes de revisión metodológica.
 */
export function PanelDocente() {
  const { usuario } = useAuth();
  const { navegar } = useNavigation();

  const [practicas, setPracticas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [anuncioLive, setAnuncioLive] = useState('');

  // Cargar prácticas asociadas al docente
  const cargarPracticas = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await practicasService.listar();
      setPracticas(datos);
      setAnuncioLive(`Bandeja docente actualizada: ${datos.length} prácticas encontradas.`);
    } catch (err) {
      const msg = err.message || 'No fue posible cargar las prácticas asignadas.';
      setError(msg);
      setAnuncioLive(`Error: ${msg}`);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPracticas();
  }, [cargarPracticas]);

  // Filtrado en memoria de las prácticas asignadas o en revisión
  const practicasFiltradas = practicas.filter((p) => {
    // Si es docente, mostrar aquellas donde es tutor o que estén en revisión
    const esTutor = p.docenteId === usuario?.id || usuario?.rol === 'ADMINISTRADOR';
    if (!esTutor && p.estado !== 'EN_REVISION') return false;

    if (filtroEstado === 'TODOS') return true;
    return p.estado === filtroEstado;
  });

  // Métricas rápidas para resumen en tarjetas
  const totalEnRevision = practicas.filter((p) => p.estado === 'EN_REVISION').length;
  const totalAprobadas = practicas.filter((p) => p.estado === 'APROBADA').length;
  const totalRechazadas = practicas.filter((p) => p.estado === 'RECHAZADA').length;

  const handleCambiarFiltro = (nuevoFiltro) => {
    setFiltroEstado(nuevoFiltro);
    const etiqueta = FILTROS_ESTADO.find((f) => f.valor === nuevoFiltro)?.etiqueta || nuevoFiltro;
    setAnuncioLive(`Filtro aplicado: ${etiqueta}.`);
  };

  return (
    <div className="panel-container" role="main" aria-labelledby="titulo-panel-docente">
      {/* Región ARIA Live para anunciar cambios a tecnologías de asistencia (WCAG 4.1.3) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      <div className="content-welcome-card">
        <h1 id="titulo-panel-docente">Bandeja de Revisión Docente â€” GesLab</h1>
        <p>
          Bienvenido(a), profesor(a) <strong>{usuario?.nombres} {usuario?.apellidos}</strong>. Supervise y dictamine las prácticas de usabilidad, consentimientos y herramientas metodológicas formuladas por los estudiantes.
        </p>
      </div>

      {/* Tarjetas de Resumen Rápido de Estados */}
      <section aria-labelledby="titulo-resumen-metricas">
        <h2 id="titulo-resumen-metricas" className="sr-only">Resumen de Prácticas</h2>
        <div className="system-modules-grid">
          <div
            className={`module-card ${filtroEstado === 'EN_REVISION' ? 'tarjeta-filtro-activa' : ''}`}
            onClick={() => handleCambiarFiltro('EN_REVISION')}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCambiarFiltro('EN_REVISION'); }}
            aria-label={`Filtrar pendientes: ${totalEnRevision} prácticas en revisión`}
          >
            <div className="module-icon-wrap" aria-hidden="true">ðŸ“‹</div>
            <div className="module-info">
              <h3>Pendientes de Revisión</h3>
              <p><strong>{totalEnRevision}</strong> práctica{totalEnRevision !== 1 ? 's' : ''} esperando su dictamen metodológico.</p>
            </div>
          </div>

          <div
            className={`module-card ${filtroEstado === 'APROBADA' ? 'tarjeta-filtro-activa' : ''}`}
            onClick={() => handleCambiarFiltro('APROBADA')}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCambiarFiltro('APROBADA'); }}
            aria-label={`Filtrar aprobadas: ${totalAprobadas} prácticas aprobadas`}
          >
            <div className="module-icon-wrap" aria-hidden="true">✓</div>
            <div className="module-info">
              <h3>Prácticas Aprobadas</h3>
              <p><strong>{totalAprobadas}</strong> práctica{totalAprobadas !== 1 ? 's' : ''} listas para pruebas y reservas.</p>
            </div>
          </div>

          <div
            className={`module-card ${filtroEstado === 'RECHAZADA' ? 'tarjeta-filtro-activa' : ''}`}
            onClick={() => handleCambiarFiltro('RECHAZADA')}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCambiarFiltro('RECHAZADA'); }}
            aria-label={`Filtrar con observaciones: ${totalRechazadas} prácticas con observaciones`}
          >
            <div className="module-icon-wrap" aria-hidden="true">âš ï¸</div>
            <div className="module-info">
              <h3>Con Observaciones</h3>
              <p><strong>{totalRechazadas}</strong> propuesta{totalRechazadas !== 1 ? 's' : ''} en proceso de corrección por el estudiante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Principal de Bandeja y Filtros */}
      <section className="seccion-bandeja-docente" aria-labelledby="titulo-listado-docente" style={{ marginTop: '2rem' }}>
        <div className="bandeja-header-flex">
          <h2 id="titulo-listado-docente" className="seccion-titulo-detalle">
            Prácticas Asignadas ({practicasFiltradas.length})
          </h2>

          {/* Filtros Accesibles por Estado */}
          <div className="filtros-estado-docente" role="group" aria-label="Filtrar prácticas por estado">
            {FILTROS_ESTADO.map((f) => (
              <button
                key={f.valor}
                type="button"
                className={`btn-filtro-docente ${filtroEstado === f.valor ? 'activo' : ''}`}
                onClick={() => handleCambiarFiltro(f.valor)}
                aria-pressed={filtroEstado === f.valor}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {cargando && (
          <p className="texto-cargando" role="status">Cargando bandeja de prácticas...</p>
        )}

        {error && (
          <div className="alerta-error" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!cargando && !error && practicasFiltradas.length === 0 && (
          <div className="sin-instrumentos-box" role="status">
            <p>
              No se encontraron prácticas asignadas bajo el filtro <strong>"{FILTROS_ESTADO.find((f) => f.valor === filtroEstado)?.etiqueta}"</strong>.
            </p>
          </div>
        )}

        {/* Listado de Prácticas */}
        {!cargando && !error && practicasFiltradas.length > 0 && (
          <div className="practicas-grid-lista" role="list">
            {practicasFiltradas.map((p) => {
              const esPendienteRevision = p.estado === 'EN_REVISION';
              const fechaTexto = p.actualizadoEn || p.creadoEn
                ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(p.actualizadoEn || p.creadoEn))
                : 'N/A';

              const nombreEstudiante = p.estudiante
                ? `${p.estudiante.nombres} ${p.estudiante.apellidos}`
                : 'Estudiante no registrado';

              return (
                <article
                  key={p.id}
                  className={`practica-card-item ${esPendienteRevision ? 'card-en-revision-destacada' : ''}`}
                  role="listitem"
                  aria-labelledby={`practica-doc-titulo-${p.id}`}
                >
                  <div className="practica-card-top">
                    <span className={`badge-estado badge-${p.estado.toLowerCase()}`} role="status">
                      {p.estado.replace('_', ' ')}
                    </span>
                    <span className="practica-fecha-meta">
                      Actualizado: {fechaTexto}
                    </span>
                  </div>

                  <h3 id={`practica-doc-titulo-${p.id}`} className="practica-card-titulo">
                    {p.titulo}
                  </h3>

                  <p className="practica-estudiante-texto">
                    <strong>Estudiante autor:</strong> {nombreEstudiante}
                    {p.estudiante?.correoInstitucional && (
                      <span className="estudiante-correo-span"> ({p.estudiante.correoInstitucional})</span>
                    )}
                  </p>

                  <p className="practica-card-desc">
                    {p.descripcion.length > 130 ? `${p.descripcion.substring(0, 130)}...` : p.descripcion}
                  </p>

                  <div className="practica-card-footer">
                    <button
                      type="button"
                      className="btn-primario"
                      onClick={() => navegar(`/docente/practica?id=${p.id}`, `Revisión de ${p.titulo}`)}
                      aria-label={`Revisar práctica ${p.titulo} de ${nombreEstudiante}`}
                    >
                      {esPendienteRevision ? 'Revisar Práctica' : 'Ver Detalle'} &rarr;
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default PanelDocente;