import React from 'react';

/**
 * Componente accesible para gestiÃ³n y resoluciÃ³n de observaciones docentes (CU11 / HU12 / RN04).
 */
export function ObservacionesRevision({
  revisiones = [],
  onResolverObservacion,
  resolviendoId = null,
  esRechazada = false
}) {
  const todasObservaciones = revisiones.flatMap((rev) => rev.observaciones || []);
  if (todasObservaciones.length === 0) return null;

  const observacionesPendientes = todasObservaciones.filter((obs) => !obs.resuelta);
  const totalObs = todasObservaciones.length;
  const pendientesCount = observacionesPendientes.length;

  return (
    <section className="observaciones-revision-section" aria-labelledby="titulo-observaciones-revision">
      <div className="observaciones-header-box">
        <h2 id="titulo-observaciones-revision" className="seccion-titulo-detalle">
          Observaciones MetodolÃ³gicas del Docente Tutor
        </h2>
        <span
          className={`badge-estado ${pendientesCount === 0 ? 'badge-aprobada' : 'badge-rechazada'}`}
          role="status"
        >
          {pendientesCount === 0
            ? 'âœ“ Todas las observaciones resueltas'
            : `! ${pendientesCount} de ${totalObs} observaciones pendientes`}
        </span>
      </div>

      <p className="observaciones-ayuda-texto">
        Revise cada una de las observaciones emitidas por su docente tutor. Puede marcar cada observaciÃ³n como resuelta a medida que realice los ajustes solicitados en los instrumentos o documentos de la prÃ¡ctica.
      </p>

      <ul className="lista-observaciones-items" role="list">
        {todasObservaciones.map((obs) => {
          const estaResuelta = Boolean(obs.resuelta);
          const estaResolviendo = resolviendoId === obs.id;

          return (
            <li
              key={obs.id}
              className={`observacion-item-card ${estaResuelta ? 'resuelta' : 'pendiente'}`}
              role="listitem"
            >
              <div className="observacion-item-contenido">
                <div className="observacion-item-meta">
                  <span className="observacion-seccion-badge">
                    SecciÃ³n: {obs.seccion}
                  </span>
                  <span
                    className={`badge-obs-status ${estaResuelta ? 'badge-obs-resuelta' : 'badge-obs-pendiente'}`}
                  >
                    {estaResuelta ? 'âœ“ Resuelta' : '! Pendiente de correcciÃ³n'}
                  </span>
                </div>
                <p className="observacion-detalle-texto">{obs.detalle}</p>
              </div>

              {esRechazada && (
                <div className="observacion-item-accion">
                  <button
                    type="button"
                    className={`btn-obs-resolver ${estaResuelta ? 'btn-reabrir' : 'btn-resolver'}`}
                    disabled={estaResolviendo}
                    onClick={() => onResolverObservacion(obs.id, !estaResuelta)}
                    aria-label={estaResuelta
                      ? `Reabrir observaciÃ³n de secciÃ³n ${obs.seccion}`
                      : `Marcar como resuelta observaciÃ³n de secciÃ³n ${obs.seccion}`}
                  >
                    {estaResolviendo ? (
                      'Actualizando...'
                    ) : estaResuelta ? (
                      'Deshacer / Reabrir'
                    ) : (
                      'âœ“ Marcar como resuelta'
                    )}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ObservacionesRevision;