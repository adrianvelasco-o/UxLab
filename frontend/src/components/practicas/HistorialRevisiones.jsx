import React from 'react';

/**
 * Componente accesible para desplegar el historial cronolÃ³gico de revisiones docentes (CU10 / HU07).
 */
export function HistorialRevisiones({ revisiones = [], cargando = false }) {
  if (cargando) {
    return (
      <section className="historial-revisiones-section" aria-labelledby="titulo-historial-revisiones">
        <h2 id="titulo-historial-revisiones" className="seccion-titulo-detalle">
          Historial de Revisiones Docentes
        </h2>
        <p className="texto-cargando" role="status">Cargando revisiones docentes...</p>
      </section>
    );
  }

  return (
    <section className="historial-revisiones-section" aria-labelledby="titulo-historial-revisiones">
      <h2 id="titulo-historial-revisiones" className="seccion-titulo-detalle">
        Historial de Revisiones Docentes
      </h2>

      {revisiones.length === 0 ? (
        <div className="sin-instrumentos-box">
          <p>No se registran revisiones docentes formales para esta prÃ¡ctica todavÃ­a.</p>
        </div>
      ) : (
        <div className="revisiones-timeline-lista" role="list">
          {revisiones.map((rev) => {
            const esAprobada = rev.resultado === 'APROBADA';
            const fechaFormateada = rev.creadoEn
              ? new Intl.DateTimeFormat('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                }).format(new Date(rev.creadoEn))
              : 'Fecha no registrada';

            return (
              <article
                key={rev.id}
                className={`revision-card ${esAprobada ? 'aprobada' : 'rechazada'}`}
                role="listitem"
                aria-labelledby={`rev-titulo-${rev.id}`}
              >
                <div className="revision-card-header">
                  <div className="revision-card-meta">
                    <h3 id={`rev-titulo-${rev.id}`} className="instrumento-card-titulo">
                      Dictamen: {esAprobada ? 'Aprobada' : 'Rechazada con Observaciones'}
                    </h3>
                    <span className="revision-fecha-texto">
                      Evaluado el {fechaFormateada} por {rev.docente ? `${rev.docente.nombres} ${rev.docente.apellidos}` : 'Docente Tutor'}
                    </span>
                  </div>
                  <span
                    className={`badge-estado ${esAprobada ? 'badge-aprobada' : 'badge-rechazada'}`}
                    role="status"
                  >
                    {esAprobada ? 'âœ“ APROBADA' : 'âœ— RECHAZADA'}
                  </span>
                </div>

                {rev.comentariosGenerales && (
                  <div className="revision-comentarios-cuerpo">
                    <p className="revision-comentario-label">Comentarios generales del docente tutor:</p>
                    <blockquote className="revision-blockquote">
                      "{rev.comentariosGenerales}"
                    </blockquote>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HistorialRevisiones;