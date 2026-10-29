import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { reservasService } from '../services/reservasService.js';

/**
 * Obtiene la fecha actual en formato local AAAA-MM-DD para inicializar el selector.
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function obtenerFechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Formatea una hora proveniente del backend (tipo TIME o ISO string) a formato legible HH:MM.
 * @param {string|Date} hora
 * @returns {string} Hora formateada en HH:MM
 */
function formatearHora(hora) {
  if (!hora) return '--:--';
  if (typeof hora === 'string') {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) {
      return hora.slice(0, 5);
    }
    const match = hora.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
  }
  try {
    const d = new Date(hora);
    if (!isNaN(d.getTime())) {
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
  } catch {
    // Retorno de contingencia
  }
  return String(hora);
}

/**
 * Vista de Consulta de Disponibilidad del Laboratorio UX (PB9 / PB9-02).
 * Permite al estudiante verificar en tiempo real las estaciones, franjas y cupos
 * cumpliendo con los estándares de accesibilidad WCAG 2.1 (A y AA) y diseño responsive.
 */
export function DisponibilidadLaboratorio() {
  const { navegar } = useNavigation();

  // Estados de consulta y datos
  const [fechaSeleccionada, setFechaSeleccionada] = useState(obtenerFechaHoy());
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [anuncioLive, setAnuncioLive] = useState('');

  // Función principal de consulta que consume exclusivamente el servicio de reservas
  const consultarDisponibilidad = useCallback(async (fechaAconsultar) => {
    if (!fechaAconsultar) return;

    setCargando(true);
    setError('');
    // Anuncio discreto de inicio de carga (WCAG 4.1.3 - Mensajes de estado)
    setAnuncioLive('Consultando disponibilidad de laboratorios...');

    try {
      const datos = await reservasService.obtenerLaboratoriosDisponibles(fechaAconsultar);
      setLaboratorios(datos);

      // Anuncios informativos de resultados (WCAG 4.1.3)
      if (datos.length === 0) {
        setAnuncioLive(`Consulta finalizada. No se encontraron laboratorios registrados para la fecha ${fechaAconsultar}.`);
      } else {
        const totalHorarios = datos.reduce((acc, lab) => acc + (lab.horarios?.length || 0), 0);
        setAnuncioLive(`Consulta finalizada. Se encontraron ${datos.length} laboratorios y ${totalHorarios} franjas horarias.`);
      }
    } catch (err) {
      const mensaje = err.message || 'No fue posible consultar la disponibilidad del laboratorio.';
      setError(mensaje);
      setLaboratorios([]);
      // Para evitar lecturas duplicadas en lectores de pantalla, el error se anuncia
      // exclusivamente mediante el contenedor con role="alert" (WCAG 3.3.1).
      setAnuncioLive('');
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial automática con la fecha actual al montar la vista (Estado 1: Carga Inicial)
  useEffect(() => {
    consultarDisponibilidad(fechaSeleccionada);
  }, [consultarDisponibilidad, fechaSeleccionada]);

  // Manejo del envío explícito del formulario (WCAG 2.1.1 - Accesibilidad por Teclado)
  const manejarSubmit = (e) => {
    e.preventDefault();
    consultarDisponibilidad(fechaSeleccionada);
  };

  return (
    <div className="panel-container">
      {/* Región ARIA Live para anuncios de estado dinámicos (WCAG 4.1.3 - Mensajes de estado) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      {/* Cabecera semántica con botón de retorno al panel (WCAG 2.4.3, 2.4.6) */}
      <header className="header-seccion-usuarios">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div>
            <button
              type="button"
              className="btn-volver-dashboard"
              onClick={() => navegar(RUTAS.ESTUDIANTE, 'Panel Estudiante')}
              aria-label="Volver al panel principal del estudiante"
            >
              ← Volver al Panel Estudiante
            </button>
            <h1>Disponibilidad del Laboratorio UX</h1>
            <p className="subtitulo-seccion">
              Consulte en tiempo real los espacios, franjas horarias y cupos disponibles para la ejecución de sus pruebas de usabilidad.
            </p>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-nuevo-usuario"
              onClick={() => navegar(RUTAS.ESTUDIANTE_RESERVA_SOLICITAR, 'Solicitar Reserva')}
              aria-label="Ir a radicar una solicitud de reserva de laboratorio"
            >
              + Solicitar Reserva
            </button>
          </div>
        </div>
      </header>

      {/* Formulario accesible de selección de fecha (WCAG 2.1.1, 2.4.6, 4.1.2) */}
      <section aria-labelledby="seccion-consulta-fecha" className="usuarios-toolbar-card">
        <h2 id="seccion-consulta-fecha" className="sr-only">Criterios de consulta de disponibilidad</h2>

        <form onSubmit={manejarSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="filtro-item" style={{ flex: '1 1 240px' }}>
            <label htmlFor="selector-fecha-disponibilidad" className="filtro-label">
              Fecha de consulta:
            </label>
            <input
              id="selector-fecha-disponibilidad"
              type="date"
              className="filtro-input"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              disabled={cargando}
              required
              aria-describedby="ayuda-fecha"
            />
            <small id="ayuda-fecha" className="sr-only">
              Seleccione una fecha en formato día, mes y año para consultar los horarios disponibles.
            </small>
          </div>

          <div className="filtro-item" style={{ flex: '0 0 auto' }}>
            <button
              type="submit"
              className="btn-nuevo-usuario"
              disabled={cargando}
              aria-busy={cargando}
            >
              {cargando ? 'Consultando...' : 'Consultar Disponibilidad'}
            </button>
          </div>
        </form>
      </section>

      {/* Estado 5: Error al consultar (WCAG 3.3.1 - Identificación de errores) */}
      {error && (
        <div className="alerta-error" role="alert">
          <span aria-hidden="true" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>⚠</span>
          <div>
            <strong>Error al consultar disponibilidad: </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Estado 2: Cargando disponibilidad (WCAG 4.1.3) */}
      {cargando && (
        <div className="tabla-cargando" role="status" aria-label="Cargando laboratorios y disponibilidad">
          <p>Cargando disponibilidad de espacios y horarios...</p>
        </div>
      )}

      {/* Contenido de resultados cuando finaliza la carga y no hay error */}
      {!cargando && !error && (
        <main aria-label="Resultados de disponibilidad">
          {/* Estado 4: Sin laboratorios registrados */}
          {laboratorios.length === 0 ? (
            <div className="lista-vacia-card" role="status">
              <span className="icono-vacio" aria-hidden="true">🏢</span>
              <h2>No se encontraron laboratorios registrados</h2>
              <p>No existen espacios físicos habilitados para la consulta solicitada.</p>
            </div>
          ) : (
            /* Estado 3: Resultados disponibles */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {laboratorios.map((lab) => {
                const totalHorarios = lab.horarios?.length || 0;

                return (
                  <article
                    key={lab.id}
                    aria-labelledby={`lab-titulo-${lab.id}`}
                    className="usuarios-tabla-card"
                    style={{ padding: '1.5rem' }}
                  >
                    {/* Encabezado del Laboratorio (WCAG 2.4.6) */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '0.75rem'
                    }}>
                      <div>
                        <h2
                          id={`lab-titulo-${lab.id}`}
                          style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '1.25rem' }}
                        >
                          {lab.nombre}
                        </h2>
                        {lab.ubicacion && (
                          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <span aria-hidden="true">📍 </span>
                            <strong>Ubicación:</strong> {lab.ubicacion}
                          </p>
                        )}
                      </div>

                      <div style={{
                        fontSize: '0.875rem',
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <strong>Capacidad total:</strong> {lab.capacidad} {lab.capacidad === 1 ? 'estación' : 'estaciones'}
                      </div>
                    </div>

                    {/* Descripción del espacio */}
                    {lab.descripcion && (
                      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.25rem' }}>
                        {lab.descripcion}
                      </p>
                    )}

                    {/* Subtítulo de franjas horarias */}
                    <h3 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '0.75rem' }}>
                      Franjas Horarias y Cupos de Atención
                    </h3>

                    {/* Caso sin franjas habilitadas para el día (ej. Domingos o sin horarios activos) */}
                    {totalHorarios === 0 ? (
                      <div className="lista-vacia-card" style={{ padding: '1.25rem 1rem' }} role="status">
                        <p style={{ margin: 0 }}>
                          No hay franjas de atención habilitadas para este laboratorio en la fecha seleccionada.
                        </p>
                      </div>
                    ) : (
                      /* Tabla HTML semántica y responsive (sin tabIndex artificial ni roles redundantes) */
                      <>
                        <div className="tabla-responsive-wrap">
                          <table className="tabla-usuarios" aria-label={`Franjas horarias y cupos de ${lab.nombre}`}>
                            <thead>
                              <tr>
                                <th scope="col">Día</th>
                                <th scope="col">Horario</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Cupos Libres</th>
                                <th scope="col">Capacidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.horarios.map((horario) => {
                                const esDisponible = horario.disponible ?? (horario.estado === 'DISPONIBLE');
                                const badgeClase = esDisponible ? 'badge-aprobada' : 'badge-rechazada';
                                const textoEstado = esDisponible ? 'Disponible' : 'Ocupado';
                                const iconoEstado = esDisponible ? '✓' : '✕';

                                return (
                                  <tr key={horario.id}>
                                    <td>
                                      <strong>{horario.diaSemana || 'Día configurado'}</strong>
                                    </td>
                                    <td>
                                      {formatearHora(horario.horaInicio)} – {formatearHora(horario.horaFin)}
                                    </td>
                                    <td>
                                      {/* Cumplimiento WCAG 1.4.1: Texto explícito e icono distintivo, nunca solo color */}
                                      <span className={`badge-estado ${badgeClase}`}>
                                        <span aria-hidden="true" style={{ marginRight: '0.3rem', fontWeight: 'bold' }}>
                                          {iconoEstado}
                                        </span>
                                        {textoEstado}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{horario.cuposLibres ?? (esDisponible ? horario.cuposTotales : 0)}</strong>
                                    </td>
                                    <td>
                                      {horario.cuposTotales ?? lab.capacidad ?? 1}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Botón de acción para solicitar reserva directamente tras consultar cupos */}
                        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-nuevo-usuario"
                            onClick={() => navegar(RUTAS.ESTUDIANTE_RESERVA_SOLICITAR, 'Solicitar Reserva')}
                            aria-label={`Solicitar reserva en el espacio ${lab.nombre}`}
                          >
                            Solicitar Reserva en este espacio →
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default DisponibilidadLaboratorio;
