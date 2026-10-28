import React from 'react';

/**
 * Componente para diagnóstico de prerrequisitos y acción de solicitud/reenvío a revisión docente (RN02 / RN04).
 */
export function AccionRevisionEstudiante({
  practica,
  esPropietario,
  instrumentos = [],
  documentos = [],
  revisiones = [],
  onAbrirModal,
  modalRevisionAbierto,
  botonRef
}) {
  if (!practica) return null;

  // Diagnóstico de prerrequisitos de revisión (RN02)
  const tieneDocente = Boolean(practica.docenteId);
  const tieneInstrumentos = instrumentos.length > 0;
  const tieneConsentimiento = documentos.some((d) => d.tipo === 'CONSENTIMIENTO_INFORMADO');
  const cumplePrerrequisitosRN02 = tieneDocente && tieneInstrumentos && tieneConsentimiento;

  // Diagnóstico de observaciones de revisión (RN04)
  const todasObservaciones = revisiones.flatMap((rev) => rev.observaciones || []);
  const observacionesPendientes = todasObservaciones.filter((obs) => !obs.resuelta);
  const tieneObservacionesPendientes = observacionesPendientes.length > 0;

  const esBorrador = practica.estado === 'BORRADOR';
  const esRechazada = practica.estado === 'RECHAZADA';
  const esEnRevision = practica.estado === 'EN_REVISION';
  const esAprobada = practica.estado === 'APROBADA';
  const esCerrada = practica.estado === 'CERRADA';

  // Habilitación de la acción según ciclo de vida y RN02/RN04
  const puedeSolicitarRevision = Boolean(
    esPropietario &&
    (
      (esBorrador && cumplePrerrequisitosRN02) ||
      (esRechazada && cumplePrerrequisitosRN02 && !tieneObservacionesPendientes)
    )
  );

  return (
    <div className="bloque-revision-estudiante">
      {/* Indicador de Prerrequisitos de Revisión (RN02 / RN04) */}
      <div className="prerrequisitos-status-box" aria-labelledby="titulo-prerrequisitos">
        <h3 id="titulo-prerrequisitos">Verificación de Prerrequisitos para Revisión Docente (RN02 / RN04):</h3>
        <ul className="lista-prerrequisitos" role="list">
          <li className={tieneDocente ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneDocente ? '✓' : '✗'}</span>
            <span>Docente tutor institucional asignado {tieneDocente ? '' : '(Pendiente)'}</span>
          </li>
          <li className={tieneInstrumentos ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneInstrumentos ? '✓' : '✗'}</span>
            <span>Al menos un instrumento de evaluación registrado {tieneInstrumentos ? `(${instrumentos.length} registrado${instrumentos.length > 1 ? 's' : ''})` : '(Pendiente)'}</span>
          </li>
          <li className={tieneConsentimiento ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneConsentimiento ? '✓' : '✗'}</span>
            <span>Documento de Consentimiento Informado en PDF adjunto {tieneConsentimiento ? '' : '(Pendiente)'}</span>
          </li>
          {esRechazada && (
            <li className={!tieneObservacionesPendientes ? 'cumplido' : 'pendiente'}>
              <span aria-hidden="true">{!tieneObservacionesPendientes ? '✓' : '✗'}</span>
              <span>Subsanación de observaciones previas (RN04) {!tieneObservacionesPendientes ? '(Todas resueltas)' : `(${observacionesPendientes.length} pendiente${observacionesPendientes.length > 1 ? 's' : ''})`}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Caja de Acción Principal para el Estudiante */}
      {esPropietario && (esBorrador || esRechazada) && (
        <div
          className={`accion-solicitar-revision-box ${puedeSolicitarRevision ? 'listo' : 'bloqueado'}`}
          role="region"
          aria-labelledby="titulo-accion-revision"
        >
          <div className="accion-revision-header">
            <div className="accion-revision-texto">
              <h3 id="titulo-accion-revision">
                {esRechazada ? 'Reenvío de Práctica a Revisión Docente' : 'Solicitar Revisión Docente'}
              </h3>
              <p>
                {puedeSolicitarRevision
                  ? 'Todos los prerrequisitos se encuentran cumplidos. Puede enviar su práctica al docente tutor para su dictamen metodológico.'
                  : esRechazada && tieneObservacionesPendientes
                  ? 'Debe marcar como resueltas todas las observaciones emitidas por el docente antes de poder reenviar la práctica.'
                  : 'Complete los prerrequisitos faltantes indicados arriba para habilitar el envío a revisión.'}
              </p>
            </div>
            <button
              ref={botonRef}
              type="button"
              className="btn-solicitar-revision"
              disabled={!puedeSolicitarRevision}
              onClick={onAbrirModal}
              aria-haspopup="dialog"
              aria-expanded={modalRevisionAbierto}
            >
              <span aria-hidden="true">✈</span>
              <span>{esRechazada ? 'Reenviar a Revisión Docente' : 'Solicitar Revisión Docente'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mensajes Informativos cuando está en otros estados */}
      {esEnRevision && (
        <div className="banner-estado-revision" role="status">
          <p>
            <strong>Práctica en Revisión:</strong> Esta práctica se encuentra actualmente en evaluación por parte del docente tutor asignado. No es posible realizar modificaciones ni nuevos envíos mientras se emite el dictamen formal.
          </p>
        </div>
      )}

      {esAprobada && (
        <div className="banner-estado-aprobada" role="status">
          <p>
            <strong>Práctica Aprobada:</strong> El docente tutor ha validado y aprobado los instrumentos y documentos de esta práctica. Puede proceder a agendar las reservas de laboratorio necesarias.
          </p>
        </div>
      )}

      {esCerrada && (
        <div className="banner-estado-cerrada" role="status">
          <p>
            <strong>Práctica Cerrada:</strong> Esta práctica ha culminado su ciclo formal de pruebas de usabilidad y ha sido cerrada por el docente orientador. No admite más cambios ni reservas.
          </p>
        </div>
      )}
    </div>
  );
}

export default AccionRevisionEstudiante;