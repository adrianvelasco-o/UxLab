import React, { useState, useRef, useEffect } from 'react';
import { practicasService } from '../../services/practicasService.js';

const SECCIONES_PREDEFINIDAS = [
  'Instrumentos',
  'Consentimiento Informado',
  'Protocolo de Prueba',
  'Guía de Actividades',
  'Alcance Metodológico',
  'General'
];

/**
 * Componente modular para Emisión de Dictamen Docente (PB4-B-02).
 * Permite al docente tutor APROBAR o RECHAZAR una práctica con observaciones estructuradas.
 * Cumple WCAG 2.1 (1.3.1, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 3.3.1, 3.3.2, 4.1.2, 4.1.3).
 */
export function FormularioDictamenDocente({
  practicaId,
  tituloPractica,
  onDictamenExitoso
}) {
  const [decision, setDecision] = useState(''); // 'APROBADA' | 'RECHAZADA'
  const [comentariosGenerales, setComentariosGenerales] = useState('');
  const [observaciones, setObservaciones] = useState([
    { id: 1, seccion: 'Instrumentos', detalle: '' }
  ]);
  const [errores, setErrores] = useState({});
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  const btnAbrirModalRef = useRef(null);
  const modalRef = useRef(null);
  const cancelarModalBtnRef = useRef(null);

  // Focus trap y tecla Escape para el modal accesible de confirmación
  useEffect(() => {
    if (!modalAbierto) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      cancelarModalBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!enviando) {
          cerrarModal();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalAbierto, enviando]);

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrorApi('');
    btnAbrirModalRef.current?.focus();
  };

  // Manejadores para la lista dinámica de observaciones
  const handleAgregarObservacion = () => {
    setObservaciones((prev) => [
      ...prev,
      { id: Date.now(), seccion: 'Instrumentos', detalle: '' }
    ]);
  };

  const handleEliminarObservacion = (id) => {
    setObservaciones((prev) => prev.filter((obs) => obs.id !== id));
  };

  const handleCambiarObservacion = (id, campo, valor) => {
    setObservaciones((prev) =>
      prev.map((obs) => (obs.id === id ? { ...obs, [campo]: valor } : obs))
    );
    // Limpiar error del campo
    if (errores[`obs_${id}_${campo}`]) {
      setErrores((prev) => {
        const nuevo = { ...prev };
        delete nuevo[`obs_${id}_${campo}`];
        return nuevo;
      });
    }
  };

  // Validación accesible
  const validar = () => {
    const nuevosErrores = {};

    if (!decision) {
      nuevosErrores.decision = 'Debe seleccionar una decisión (Aprobar o Rechazar la práctica).';
    }

    if (decision === 'RECHAZADA') {
      if (observaciones.length === 0) {
        nuevosErrores.observacionesGlobal = 'Debe registrar al menos una observación para justificar el dictamen de rechazo.';
      } else {
        observaciones.forEach((obs, index) => {
          if (!obs.seccion || obs.seccion.trim().length < 2) {
            nuevosErrores[`obs_${obs.id}_seccion`] = `La sección de la observación #${index + 1} debe tener al menos 2 caracteres.`;
          }
          if (!obs.detalle || obs.detalle.trim().length < 5) {
            nuevosErrores[`obs_${obs.id}_detalle`] = `El detalle de la observación #${index + 1} debe tener al menos 5 caracteres.`;
          }
        });
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmitPreConfirmacion = (e) => {
    e.preventDefault();
    if (validar()) {
      setModalAbierto(true);
    }
  };

  const handleConfirmarDictamen = async () => {
    setEnviando(true);
    setErrorApi('');

    const payload = {
      resultado: decision,
      comentariosGenerales: comentariosGenerales.trim() || undefined,
      observaciones:
        decision === 'RECHAZADA'
          ? observaciones.map((obs) => ({
              seccion: obs.seccion.trim(),
              detalle: obs.detalle.trim()
            }))
          : []
    };

    try {
      const res = await practicasService.registrarRevision(practicaId, payload);
      setModalAbierto(false);
      if (onDictamenExitoso) {
        onDictamenExitoso(res);
      }
    } catch (err) {
      setErrorApi(err.message || 'Error al emitir el dictamen metodológico.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="formulario-dictamen-card" aria-labelledby="titulo-dictamen-docente">
      <div className="dictamen-header-bloque">
        <h2 id="titulo-dictamen-docente" className="dictamen-titulo-seccion">
          Emisión de Dictamen Metodológico (PB4-B)
        </h2>
        <p className="dictamen-subtitulo">
          Como docente tutor asignado, revise la propuesta de usabilidad y emita su veredicto formal.
        </p>
      </div>

      <form onSubmit={handleSubmitPreConfirmacion} noValidate>
        {/* Selección de Decisión (Fieldset accesible) */}
        <fieldset
          className="dictamen-decision-fieldset"
          aria-describedby={errores.decision ? 'error-dictamen-decision' : 'desc-decision'}
        >
          <legend className="dictamen-legend">
            Decisión Metodológica: <span className="campo-requerido" aria-hidden="true">*</span>
          </legend>
          <p id="desc-decision" className="sr-only">
            Seleccione Aprobada para validar los instrumentos o Rechazada para solicitar correcciones al estudiante.
          </p>

          <div className="dictamen-opciones-grid" role="radiogroup" aria-required="true">
            {/* Opción APROBAR */}
            <label
              htmlFor="radio-decision-aprobada"
              className={`dictamen-opcion-card ${decision === 'APROBADA' ? 'seleccionado-aprobada' : ''}`}
            >
              <input
                type="radio"
                id="radio-decision-aprobada"
                name="decisionDictamen"
                value="APROBADA"
                checked={decision === 'APROBADA'}
                onChange={() => {
                  setDecision('APROBADA');
                  if (errores.decision) {
                    setErrores((prev) => {
                      const n = { ...prev };
                      delete n.decision;
                      return n;
                    });
                  }
                }}
                className="dictamen-radio-input"
              />
              <div className="dictamen-opcion-contenido">
                <span className="dictamen-opcion-icono" aria-hidden="true">✓</span>
                <div>
                  <strong className="dictamen-opcion-titulo">APROBADA</strong>
                  <p className="dictamen-opcion-desc">
                    Los instrumentos y consentimientos cumplen los estándares metodológicos. Habilita las reservas de laboratorio.
                  </p>
                </div>
              </div>
            </label>

            {/* Opción RECHAZAR */}
            <label
              htmlFor="radio-decision-rechazada"
              className={`dictamen-opcion-card ${decision === 'RECHAZADA' ? 'seleccionado-rechazada' : ''}`}
            >
              <input
                type="radio"
                id="radio-decision-rechazada"
                name="decisionDictamen"
                value="RECHAZADA"
                checked={decision === 'RECHAZADA'}
                onChange={() => {
                  setDecision('RECHAZADA');
                  if (errores.decision) {
                    setErrores((prev) => {
                      const n = { ...prev };
                      delete n.decision;
                      return n;
                    });
                  }
                }}
                className="dictamen-radio-input"
              />
              <div className="dictamen-opcion-contenido">
                <span className="dictamen-opcion-icono rechazo" aria-hidden="true">✗</span>
                <div>
                  <strong className="dictamen-opcion-titulo">RECHAZADA CON OBSERVACIONES</strong>
                  <p className="dictamen-opcion-desc">
                    Requiere correcciones metodológicas. El estudiante deberá subsanar las observaciones antes de reenviar.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {errores.decision && (
            <div id="error-dictamen-decision" className="error-mensaje-campo" role="alert">
              {errores.decision}
            </div>
          )}
        </fieldset>

        {/* Comentarios Generales (Opcional) */}
        <div className="campo-formulario-grupo" style={{ marginTop: '1.25rem' }}>
          <label htmlFor="txt-comentarios-generales" className="campo-etiqueta">
            Comentarios Generales del Docente (Opcional):
          </label>
          <textarea
            id="txt-comentarios-generales"
            className="campo-textarea"
            rows="3"
            value={comentariosGenerales}
            onChange={(e) => setComentariosGenerales(e.target.value)}
            placeholder="Añada recomendaciones generales, contexto o felicitaciones respecto a la formulación metodológica..."
            aria-describedby="desc-comentarios-generales"
          />
          <span id="desc-comentarios-generales" className="campo-ayuda-texto">
            Visible para el estudiante tanto en dictámenes aprobados como rechazados.
          </span>
        </div>

        {/* Bloque de Observaciones Requeridas para Rechazo */}
        {decision === 'RECHAZADA' && (
          <div className="observaciones-docente-bloque" aria-labelledby="titulo-obs-requeridas">
            <div className="observaciones-bloque-header">
              <div>
                <h3 id="titulo-obs-requeridas" className="observaciones-bloque-titulo">
                  Observaciones Metodológicas Específicas <span className="campo-requerido" aria-hidden="true">*</span>
                </h3>
                <p className="observaciones-bloque-desc">
                  Registre al menos una observación detallada. Cada observación generará un ítem que el estudiante deberá subsanar individualmente (RN04).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAgregarObservacion}
                className="btn-secundario btn-agregar-obs"
                aria-label="Agregar otra observación metodológica"
              >
                + Agregar otra observación
              </button>
            </div>

            {errores.observacionesGlobal && (
              <div className="alerta-error" role="alert" style={{ marginBottom: '1rem' }}>
                {errores.observacionesGlobal}
              </div>
            )}

            <div className="observaciones-form-lista">
              {observaciones.map((obs, idx) => (
                <div key={obs.id} className="observacion-form-card">
                  <div className="observacion-card-top">
                    <span className="observacion-numero-badge">
                      Observación #{idx + 1}
                    </span>

                    {observaciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleEliminarObservacion(obs.id)}
                        className="btn-eliminar-obs-item"
                        aria-label={`Eliminar observación número ${idx + 1}`}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="observacion-campos-grid">
                    <div className="campo-grupo">
                      <label htmlFor={`obs-seccion-${obs.id}`} className="campo-etiqueta-sm">
                        Sección afectada: <span className="campo-requerido" aria-hidden="true">*</span>
                      </label>
                      <select
                        id={`obs-seccion-${obs.id}`}
                        className={`campo-select ${errores[`obs_${obs.id}_seccion`] ? 'campo-error-input' : ''}`}
                        value={obs.seccion}
                        onChange={(e) => handleCambiarObservacion(obs.id, 'seccion', e.target.value)}
                        aria-invalid={errores[`obs_${obs.id}_seccion`] ? 'true' : 'false'}
                        aria-describedby={errores[`obs_${obs.id}_seccion`] ? `err-obs-sec-${obs.id}` : undefined}
                      >
                        {SECCIONES_PREDEFINIDAS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                      {errores[`obs_${obs.id}_seccion`] && (
                        <span id={`err-obs-sec-${obs.id}`} className="error-mensaje-campo-sm" role="alert">
                          {errores[`obs_${obs.id}_seccion`]}
                        </span>
                      )}
                    </div>

                    <div className="campo-grupo" style={{ flex: 2 }}>
                      <label htmlFor={`obs-detalle-${obs.id}`} className="campo-etiqueta-sm">
                        Detalle de la corrección solicitada: <span className="campo-requerido" aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id={`obs-detalle-${obs.id}`}
                        className={`campo-textarea ${errores[`obs_${obs.id}_detalle`] ? 'campo-error-input' : ''}`}
                        rows="2"
                        value={obs.detalle}
                        onChange={(e) => handleCambiarObservacion(obs.id, 'detalle', e.target.value)}
                        placeholder="Describa con precisión la inconsistencia encontrada y la acción esperada (mín. 5 caracteres)..."
                        aria-invalid={errores[`obs_${obs.id}_detalle`] ? 'true' : 'false'}
                        aria-describedby={errores[`obs_${obs.id}_detalle`] ? `err-obs-det-${obs.id}` : undefined}
                      />
                      {errores[`obs_${obs.id}_detalle`] && (
                        <span id={`err-obs-det-${obs.id}`} className="error-mensaje-campo-sm" role="alert">
                          {errores[`obs_${obs.id}_detalle`]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón Principal para Abrir Confirmación */}
        <div className="dictamen-footer-acciones">
          <button
            ref={btnAbrirModalRef}
            type="submit"
            className={`btn-primario btn-emitir-dictamen ${decision === 'RECHAZADA' ? 'btn-rechazar-accion' : ''}`}
            disabled={!decision}
            aria-haspopup="dialog"
          >
            {decision === 'APROBADA'
              ? 'Emitir Dictamen: APROBAR PRÁCTICA'
              : decision === 'RECHAZADA'
              ? 'Emitir Dictamen: RECHAZAR CON OBSERVACIONES'
              : 'Seleccione una decisión para continuar'}
          </button>
        </div>
      </form>

      {/* Modal Accesible de Confirmación de Dictamen (WCAG 2.1.2 Focus Trap) */}
      {modalAbierto && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !enviando) {
              cerrarModal();
            }
          }}
        >
          <div
            ref={modalRef}
            className="modal-contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-dictamen"
            aria-describedby="desc-modal-dictamen"
          >
            <div className="modal-header">
              <h2 id="titulo-modal-dictamen" className="modal-titulo">
                Confirmar Dictamen: {decision === 'APROBADA' ? 'Aprobación' : 'Rechazo Metodológico'}
              </h2>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={cerrarModal}
                disabled={enviando}
                aria-label="Cerrar modal de confirmación"
              >
                &times;
              </button>
            </div>

            <div className="modal-cuerpo">
              <p id="desc-modal-dictamen" className="modal-confirmacion-texto">
                Está a punto de emitir un dictamen formal sobre la práctica <strong>"{tituloPractica}"</strong>.
              </p>

              <div
                className="modal-resumen-envio"
                style={{
                  borderLeft: `4px solid ${decision === 'APROBADA' ? '#16a34a' : '#dc2626'}`
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                  Decisión:{' '}
                  <span style={{ color: decision === 'APROBADA' ? '#16a34a' : '#dc2626' }}>
                    {decision === 'APROBADA' ? 'APROBADA' : 'RECHAZADA'}
                  </span>
                </p>

                {decision === 'RECHAZADA' && (
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                    <strong>Observaciones registradas:</strong> {observaciones.length} observación(es) técnica(s).
                  </p>
                )}

                {comentariosGenerales && (
                  <p style={{ margin: '0', fontSize: '0.85rem', color: '#475569' }}>
                    <strong>Comentarios generales:</strong> "{comentariosGenerales}"
                  </p>
                )}
              </div>

              <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0' }}>
                {decision === 'APROBADA'
                  ? 'Una vez aprobada, el estudiante podrá solicitar reservas en los laboratorios de usabilidad.'
                  : 'Una vez rechazada, el estudiante recibirá una notificación y deberá subsanar todas las observaciones registradas antes de solicitar una nueva revisión.'}
              </p>

              {errorApi && (
                <div className="alerta-error" role="alert" style={{ marginTop: '1rem' }}>
                  <strong>Error al procesar:</strong> {errorApi}
                </div>
              )}
            </div>

            <div className="modal-acciones">
              <button
                ref={cancelarModalBtnRef}
                type="button"
                className="btn-cancelar-modal"
                onClick={cerrarModal}
                disabled={enviando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={`btn-guardar-modal ${decision === 'RECHAZADA' ? 'btn-modal-rechazar' : ''}`}
                onClick={handleConfirmarDictamen}
                disabled={enviando}
                aria-busy={enviando ? 'true' : 'false'}
              >
                {enviando ? 'Procesando dictamen...' : 'Confirmar y Emitir Dictamen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default FormularioDictamenDocente;

