import React, { useState, useEffect, useCallback, useId } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { practicasService } from '../services/practicasService.js';
import { reservasService } from '../services/reservasService.js';

/**
 * Obtiene la fecha actual en formato local AAAA-MM-DD para inicializar y restringir el selector.
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
 * Formatea una hora del backend (tipo TIME o ISO string) a formato legible HH:MM.
 * @param {string|Date} hora
 * @returns {string} Hora en formato HH:MM
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
 * Vista y formulario accesible para solicitar reserva de espacio en UXLab (PB10 / PB10-02).
 * Adaptado a la infraestructura actual de un único laboratorio institucional.
 * Cumple con los criterios WCAG 2.1 A/AA: 1.3.1, 1.4.1, 2.1.1, 2.4.3, 2.4.6, 3.3.1, 3.3.2, 4.1.2, 4.1.3.
 */
export function SolicitudReserva() {
  const { navegar } = useNavigation();
  const fechaHoy = obtenerFechaHoy();

  // Estados de datos maestros
  const [practicasAprobadas, setPracticasAprobadas] = useState([]);
  const [cargandoPracticas, setCargandoPracticas] = useState(true);
  const [errorPracticas, setErrorPracticas] = useState('');

  // Estados del formulario de solicitud
  const [practicaId, setPracticaId] = useState('');
  const [fechaReserva, setFechaReserva] = useState(fechaHoy);
  const [horarioId, setHorarioId] = useState('');

  // Estados de disponibilidad de laboratorios
  const [laboratoriosDisponibles, setLaboratoriosDisponibles] = useState([]);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState('');

  // Estados de envío y validación
  const [enviando, setEnviando] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [reservaExitosa, setReservaExitosa] = useState(null);

  // Región de anuncios accesibles (WCAG 4.1.3)
  const [anuncioLive, setAnuncioLive] = useState('');

  // IDs únicos para vinculación accesible de inputs y labels (WCAG 1.3.1)
  const idPractica = useId();
  const idFecha = useId();
  const idHorario = useId();

  // 1. Cargar prácticas en estado APROBADA al montar la vista
  useEffect(() => {
    let cancelado = false;

    async function cargarPracticas() {
      setCargandoPracticas(true);
      setErrorPracticas('');
      setAnuncioLive('Cargando prácticas aprobadas...');

      try {
        const datos = await practicasService.listar({ estado: 'APROBADA' });
        if (!cancelado) {
          setPracticasAprobadas(datos);
          if (datos.length === 0) {
            setAnuncioLive('No tienes prácticas aprobadas disponibles para reserva.');
          } else {
            setAnuncioLive(`Se encontraron ${datos.length} prácticas aprobadas.`);
          }
        }
      } catch (err) {
        if (!cancelado) {
          const mensaje = err.message || 'No fue posible cargar las prácticas aprobadas.';
          setErrorPracticas(mensaje);
        }
      } finally {
        if (!cancelado) {
          setCargandoPracticas(false);
        }
      }
    }

    cargarPracticas();

    return () => {
      cancelado = true;
    };
  }, []);

  // 2. Consultar disponibilidad automáticamente cuando la fecha cambia y es válida
  const consultarDisponibilidad = useCallback(async (fecha) => {
    if (!fecha || fecha < fechaHoy) {
      setLaboratoriosDisponibles([]);
      return;
    }

    setCargandoDisponibilidad(true);
    setErrorDisponibilidad('');
    setAnuncioLive(`Consultando disponibilidad de laboratorios para el ${fecha}...`);

    try {
      const datos = await reservasService.obtenerLaboratoriosDisponibles(fecha);
      setLaboratoriosDisponibles(datos);

      if (datos.length === 0) {
        setAnuncioLive(`No hay laboratorios ni horarios disponibles para el ${fecha}.`);
      } else if (datos.length === 1) {
        const lab = datos[0];
        const franjasLibres = lab.horarios?.filter((h) => h.disponible && h.cuposLibres > 0).length || 0;
        setAnuncioLive(`Laboratorio ${lab.nombre}: ${franjasLibres} franjas horarias disponibles para el ${fecha}.`);
      } else {
        setAnuncioLive(`Se encontraron ${datos.length} laboratorios. El sistema notificará la estrategia de selección.`);
      }
    } catch (err) {
      const mensaje = err.message || 'Error al consultar disponibilidad para la fecha seleccionada.';
      setErrorDisponibilidad(mensaje);
      setLaboratoriosDisponibles([]);
    } finally {
      setCargandoDisponibilidad(false);
    }
  }, [fechaHoy]);

  // Ejecutar consulta de disponibilidad al cambiar la fecha
  useEffect(() => {
    if (fechaReserva && fechaReserva >= fechaHoy) {
      consultarDisponibilidad(fechaReserva);
    }
  }, [consultarDisponibilidad, fechaReserva, fechaHoy]);

  // Manejar cambio de fecha: limpia el horario seleccionado y reinicia errores
  const manejarCambioFecha = (e) => {
    const nuevaFecha = e.target.value;
    setFechaReserva(nuevaFecha);
    setHorarioId('');
    setErrorEnvio('');

    if (erroresValidacion.fechaReserva) {
      setErroresValidacion((prev) => ({ ...prev, fechaReserva: undefined }));
    }
  };

  // Identificación del laboratorio único entregado por el backend
  const tieneLaboratorios = laboratoriosDisponibles.length > 0;
  const esLaboratorioUnico = laboratoriosDisponibles.length === 1;
  const hayMultiplesLaboratorios = laboratoriosDisponibles.length > 1;

  // Se extrae dinámicamente del registro devuelto por el servicio (sin hardcodear IDs)
  const laboratorioActual = esLaboratorioUnico ? laboratoriosDisponibles[0] : null;
  const franjasHorarias = laboratorioActual?.horarios || [];
  const franjasConCupo = franjasHorarias.filter((h) => h.disponible && h.cuposLibres > 0);

  // Validación cliente previa al envío
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!practicaId) {
      nuevosErrores.practicaId = 'Debe seleccionar una práctica aprobada.';
    }

    if (!fechaReserva) {
      nuevosErrores.fechaReserva = 'Debe seleccionar la fecha de reserva.';
    } else if (fechaReserva < fechaHoy) {
      nuevosErrores.fechaReserva = 'La fecha no puede ser anterior al día de hoy.';
    }

    if (!laboratorioActual) {
      if (hayMultiplesLaboratorios) {
        nuevosErrores.laboratorio = 'El backend actualmente devuelve más de un laboratorio, por lo que será necesario definir posteriormente la estrategia de selección.';
      } else {
        nuevosErrores.laboratorio = 'No hay laboratorios habilitados para la fecha seleccionada.';
      }
    }

    if (!horarioId) {
      nuevosErrores.horarioId = 'Debe seleccionar una franja horaria disponible.';
    }

    setErroresValidacion(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Envío del formulario
  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorEnvio('');

    if (!validarFormulario()) {
      setAnuncioLive('Existen errores en el formulario. Por favor revise los campos requeridos.');
      return;
    }

    setEnviando(true);
    setAnuncioLive('Procesando solicitud de reserva...');

    try {
      const datosReserva = await reservasService.solicitarReserva({
        practicaId: Number(practicaId),
        laboratorioId: Number(laboratorioActual.id), // ID dinámico proveniente del backend
        horarioId: Number(horarioId),
        fechaReserva
      });

      setReservaExitosa(datosReserva || { id: 'Confirmada', fechaReserva });
      setAnuncioLive('La solicitud de reserva fue radicada correctamente y quedó pendiente de aprobación.');
    } catch (err) {
      const codigoError = err.datos?.error?.codigo || err.datos?.codigoError;
      const statusHttp = err.status;

      let mensaje = '';

      if (statusHttp === 400) {
        if (codigoError === 'TRANSICION_ESTADO_INVALIDA') {
          mensaje = 'La práctica seleccionada no se encuentra en estado APROBADA. Solo las prácticas aprobadas pueden solicitar reserva.';
        } else if (codigoError === 'DOCUMENTACION_INCOMPLETA') {
          mensaje = 'Debe adjuntar la documentación obligatoria (Consentimiento informado y Protocolo de prueba) antes de solicitar la reserva.';
        } else if (codigoError === 'HORARIO_DESHABILITADO') {
          mensaje = 'La franja horaria seleccionada no está habilitada o no corresponde a este laboratorio.';
        } else if (codigoError === 'DATOS_INVALIDOS') {
          mensaje = err.datos?.mensaje || 'Los datos proporcionados son inválidos. Verifique la fecha y la franja seleccionada.';
        } else {
          mensaje = err.datos?.mensaje || 'No fue posible radicar la reserva debido a datos inconsistentes.';
        }
      } else if (statusHttp === 403) {
        mensaje = 'Acceso denegado: Solo puedes solicitar reservas para tus propias prácticas aprobadas.';
      } else if (statusHttp === 404) {
        mensaje = 'El laboratorio, franja horaria o práctica seleccionada ya no se encuentra disponible en el sistema.';
      } else if (statusHttp === 409) {
        mensaje = 'El horario seleccionado ya no tiene cupos disponibles. Consulta nuevamente la disponibilidad y selecciona otro horario.';
      } else {
        mensaje = err.message || 'Ocurrió un error inesperado al procesar la reserva. Por favor intente nuevamente.';
      }

      setErrorEnvio(mensaje);
      setAnuncioLive(`Error: ${mensaje}`);
    } finally {
      setEnviando(false);
    }
  };

  // Reiniciar formulario para una nueva solicitud
  const manejarNuevaSolicitud = () => {
    setReservaExitosa(null);
    setPracticaId('');
    setHorarioId('');
    setErrorEnvio('');
    setErroresValidacion({});
    setFechaReserva(fechaHoy);
    setAnuncioLive('Formulario reiniciado para una nueva solicitud de reserva.');
  };

  return (
    <div className="panel-container">
      {/* Región ARIA Live para anuncios dinámicos de estado (WCAG 4.1.3) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      <header className="header-seccion-usuarios">
        <div>
          {/* Navegación de retorno clara hacia Disponibilidad y Panel Estudiante (WCAG 2.4.3, 2.4.6) */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-volver-dashboard"
              onClick={() => navegar(RUTAS.ESTUDIANTE_RESERVAS, 'Disponibilidad de Laboratorios')}
              aria-label="Volver a la consulta de disponibilidad de laboratorios"
            >
              ← Volver a Disponibilidad
            </button>
            <button
              type="button"
              className="btn-volver-dashboard"
              onClick={() => navegar(RUTAS.ESTUDIANTE, 'Panel Estudiante')}
              aria-label="Volver al panel principal del estudiante"
            >
              Panel Estudiante
            </button>
          </div>
          <h1>Solicitar Reserva de Laboratorio UX</h1>
          <p className="subtitulo-seccion">
            Agende una franja horaria en el Laboratorio de Usabilidad para la ejecución de sus pruebas previamente aprobadas.
          </p>
        </div>
      </header>

      {/* Estado de Carga Inicial de Prácticas */}
      {cargandoPracticas && (
        <div className="tabla-cargando" role="status" aria-label="Cargando prácticas aprobadas">
          <p>Verificando prácticas aprobadas del estudiante...</p>
        </div>
      )}

      {/* Error al Cargar Prácticas Aprobadas */}
      {!cargandoPracticas && errorPracticas && (
        <div className="alerta-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span aria-hidden="true" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>⚠️</span>
          <div>
            <strong>Error al cargar prácticas: </strong>
            <span>{errorPracticas}</span>
          </div>
        </div>
      )}

      {/* Estado Vacío: Sin Prácticas Aprobadas (Bloqueante según especificación) */}
      {!cargandoPracticas && !errorPracticas && practicasAprobadas.length === 0 && (
        <div className="lista-vacia-card" role="status" style={{ maxWidth: '680px', margin: '2rem auto' }}>
          <span className="icono-vacio" aria-hidden="true">📋</span>
          <h2>No tienes prácticas aprobadas para agendar</h2>
          <p style={{ marginTop: '0.75rem', lineHeight: '1.6', color: '#475569' }}>
            Para solicitar una reserva en el UXLab, es un requisito institucional indispensable contar con al menos una práctica en estado <strong>APROBADA</strong> por su docente tutor y con su documentación completa (Consentimiento informado y Protocolo de prueba).
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-nuevo-usuario"
              onClick={() => navegar(RUTAS.ESTUDIANTE_PRACTICAS, 'Mis Prácticas')}
            >
              Ir a Mis Prácticas
            </button>
            <button
              type="button"
              className="btn-volver-dashboard"
              onClick={() => navegar(RUTAS.ESTUDIANTE_RESERVAS, 'Disponibilidad de Laboratorios')}
            >
              Consultar Disponibilidad
            </button>
          </div>
        </div>
      )}

      {/* Confirmación Exitosa de la Reserva (WCAG 4.1.3) */}
      {reservaExitosa && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderLeft: '5px solid #22c55e',
            borderRadius: '8px',
            padding: '1.5rem',
            margin: '1.5rem 0',
            color: '#166534'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span aria-hidden="true" style={{ fontSize: '1.75rem' }}>✅</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#14532d' }}>
                ¡Solicitud de Reserva Radicada Exitosamente!
              </h2>
              <p style={{ margin: '0 0 0.75rem 0', lineHeight: '1.5' }}>
                La solicitud de reserva fue radicada correctamente y quedó <strong>pendiente de aprobación</strong> por parte de la administración del laboratorio.
              </p>
              {reservaExitosa.id && (
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>
                  <strong>Número de Radicado / ID Reserva:</strong> #{reservaExitosa.id}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={manejarNuevaSolicitud}
                  className="btn-nuevo-usuario"
                >
                  Radicar otra solicitud de reserva
                </button>
                <button
                  type="button"
                  onClick={() => navegar(RUTAS.ESTUDIANTE_RESERVAS, 'Disponibilidad de Laboratorios')}
                  className="btn-volver-dashboard"
                >
                  Ver Disponibilidad de Espacios
                </button>
                <button
                  type="button"
                  onClick={() => navegar(RUTAS.ESTUDIANTE, 'Panel Estudiante')}
                  className="btn-volver-dashboard"
                >
                  Ir al Panel Estudiante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario Principal de Solicitud de Reserva */}
      {!cargandoPracticas && !reservaExitosa && practicasAprobadas.length > 0 && (
        <form
          onSubmit={manejarSubmit}
          noValidate
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          {/* Instrucciones accesibles (WCAG 3.3.2) */}
          <div
            id="instrucciones-formulario"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '1rem',
              fontSize: '0.9rem',
              color: '#334155',
              lineHeight: '1.5'
            }}
          >
            <strong>Instrucciones:</strong> Seleccione su práctica aprobada, la fecha deseada y escoja una de las franjas horarias con cupos libres del Laboratorio de Usabilidad. Todos los campos marcados son obligatorios.
          </div>

          {/* Alerta de Error de Envío (WCAG 3.3.1) */}
          {errorEnvio && (
            <div className="alerta-error" role="alert">
              <span aria-hidden="true" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>⚠️</span>
              <div>
                <strong>No fue posible completar la reserva: </strong>
                <span>{errorEnvio}</span>
              </div>
            </div>
          )}

          {/* PASO 1: Selección de Práctica Aprobada (WCAG 1.3.1, 2.4.3, 4.1.2) */}
          <div className="filtro-item" style={{ width: '100%' }}>
            <label htmlFor={idPractica} className="filtro-label" style={{ fontWeight: '600' }}>
              1. Práctica de Usabilidad Aprobada <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id={idPractica}
              className="filtro-input"
              value={practicaId}
              onChange={(e) => {
                setPracticaId(e.target.value);
                if (erroresValidacion.practicaId) {
                  setErroresValidacion((prev) => ({ ...prev, practicaId: undefined }));
                }
              }}
              aria-invalid={erroresValidacion.practicaId ? 'true' : 'false'}
              aria-describedby={erroresValidacion.practicaId ? 'error-practica' : 'ayuda-practica'}
              disabled={enviando}
              required
            >
              <option value="">-- Seleccione una práctica aprobada --</option>
              {practicasAprobadas.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.titulo}
                </option>
              ))}
            </select>
            <small id="ayuda-practica" style={{ display: 'block', marginTop: '0.25rem', color: '#64748b' }}>
              Solo se listan sus prácticas en estado APROBADA habilitadas para reserva de espacio.
            </small>
            {erroresValidacion.practicaId && (
              <span id="error-practica" role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {erroresValidacion.practicaId}
              </span>
            )}
          </div>

          {/* PASO 2: Selección de Fecha (WCAG 1.3.1, 2.4.3, 4.1.2) */}
          <div className="filtro-item" style={{ width: '100%' }}>
            <label htmlFor={idFecha} className="filtro-label" style={{ fontWeight: '600' }}>
              2. Fecha de la Reserva <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id={idFecha}
              type="date"
              className="filtro-input"
              min={fechaHoy}
              value={fechaReserva}
              onChange={manejarCambioFecha}
              aria-invalid={erroresValidacion.fechaReserva ? 'true' : 'false'}
              aria-describedby={erroresValidacion.fechaReserva ? 'error-fecha' : 'ayuda-fecha'}
              disabled={enviando}
              required
            />
            <small id="ayuda-fecha" style={{ display: 'block', marginTop: '0.25rem', color: '#64748b' }}>
              La fecha no puede ser anterior al día de hoy ({fechaHoy}). Al cambiar la fecha se consultarán los horarios disponibles.
            </small>
            {erroresValidacion.fechaReserva && (
              <span id="error-fecha" role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {erroresValidacion.fechaReserva}
              </span>
            )}
          </div>

          {/* Estado de Carga de Disponibilidad */}
          {cargandoDisponibilidad && (
            <div role="status" aria-live="polite" style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
              Consultando disponibilidad de horarios para el {fechaReserva}...
            </div>
          )}

          {/* Error al Consultar Disponibilidad */}
          {errorDisponibilidad && (
            <div className="alerta-error" role="alert">
              <span>{errorDisponibilidad}</span>
            </div>
          )}

          {/* PASO 3: Información Contextual del Laboratorio Único (WCAG 1.3.1, 1.4.1) */}
          {!cargandoDisponibilidad && !errorDisponibilidad && (
            <>
              {/* Observación ante escenario futuro no soportado automáticamente */}
              {hayMultiplesLaboratorios && (
                <div className="alerta-error" role="alert">
                  <strong>Observación de infraestructura: </strong>
                  <span>El backend actualmente devuelve más de un laboratorio, por lo que será necesario definir posteriormente la estrategia de selección.</span>
                </div>
              )}

              {/* Estado cuando no hay laboratorios o franjas registradas para la fecha */}
              {!tieneLaboratorios && (
                <div
                  role="status"
                  style={{
                    padding: '1rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '6px',
                    color: '#92400e'
                  }}
                >
                  <p style={{ margin: 0, fontWeight: '600' }}>
                    No hay horarios disponibles para la fecha seleccionada.
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                    Verifique que la fecha corresponda a un día de atención institucional (lunes a sábado) o intente con otra fecha.
                  </p>
                </div>
              )}

              {/* Ficha contextual del laboratorio único */}
              {esLaboratorioUnico && laboratorioActual && (
                <section
                  aria-labelledby="titulo-info-laboratorio"
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #0284c7',
                    borderRadius: '6px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 id="titulo-info-laboratorio" style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                      Laboratorio asignado: <strong>{laboratorioActual.nombre}</strong>
                    </h2>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        backgroundColor: franjasConCupo.length > 0 ? '#def7ec' : '#fde8e8',
                        color: franjasConCupo.length > 0 ? '#03543f' : '#9b1c1c'
                      }}
                    >
                      {franjasConCupo.length > 0 ? `Disponible (${franjasConCupo.length} franjas con cupo)` : 'Sin cupos disponibles para esta fecha'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Ubicación:</strong> {laboratorioActual.ubicacion} &bull; <strong>Capacidad máxima:</strong> {laboratorioActual.capacidad} estudiantes por franja
                    </p>
                    {laboratorioActual.descripcion && (
                      <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
                        {laboratorioActual.descripcion}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {/* PASO 4: Selección de Franja Horaria (WCAG 1.3.1, 1.4.1, 2.4.3, 4.1.2) */}
          <div className="filtro-item" style={{ width: '100%' }}>
            <label htmlFor={idHorario} className="filtro-label" style={{ fontWeight: '600' }}>
              3. Horarios Disponibles <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id={idHorario}
              className="filtro-input"
              value={horarioId}
              onChange={(e) => {
                setHorarioId(e.target.value);
                if (erroresValidacion.horarioId) {
                  setErroresValidacion((prev) => ({ ...prev, horarioId: undefined }));
                }
              }}
              disabled={enviando || cargandoDisponibilidad || !esLaboratorioUnico || franjasHorarias.length === 0}
              aria-invalid={erroresValidacion.horarioId ? 'true' : 'false'}
              aria-describedby={erroresValidacion.horarioId ? 'error-horario' : 'ayuda-horario'}
              required
            >
              <option value="">
                {cargandoDisponibilidad
                  ? 'Consultando horarios...'
                  : !tieneLaboratorios
                  ? '-- No hay horarios disponibles para esta fecha --'
                  : franjasHorarias.length === 0
                  ? '-- Sin franjas configuradas para este día --'
                  : '-- Seleccione un horario disponible --'}
              </option>
              {franjasHorarias.map((h) => {
                const libre = Boolean(h.disponible && h.cuposLibres > 0);
                const textoCupos = libre
                  ? `Disponible: ${h.cuposLibres} de ${h.cuposTotales} cupos`
                  : `Agotado: 0 de ${h.cuposTotales} cupos`;

                return (
                  <option
                    key={h.id}
                    value={h.id}
                    disabled={!libre}
                  >
                    {formatearHora(h.horaInicio)} - {formatearHora(h.horaFin)} | {textoCupos}
                  </option>
                );
              })}
            </select>
            <small id="ayuda-horario" style={{ display: 'block', marginTop: '0.25rem', color: '#64748b' }}>
              Los horarios con 0 cupos aparecen deshabilitados y claramente marcados como Agotados.
            </small>
            {erroresValidacion.horarioId && (
              <span id="error-horario" role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {erroresValidacion.horarioId}
              </span>
            )}
            {erroresValidacion.laboratorio && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {erroresValidacion.laboratorio}
              </span>
            )}
          </div>

          {/* Botón de Envío y Estado de Procesamiento (WCAG 2.1.1, 4.1.2) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-nuevo-usuario"
              disabled={enviando || cargandoDisponibilidad || !esLaboratorioUnico || franjasConCupo.length === 0}
              aria-busy={enviando}
              style={{ minHeight: '44px', minWidth: '200px' }}
            >
              {enviando ? 'Radicando solicitud...' : 'Radicar Solicitud de Reserva'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default SolicitudReserva;
