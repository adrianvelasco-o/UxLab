import React from 'react';

/**
 * Componente para diagnÃ³stico de prerrequisitos y acciÃ³n de solicitud/reenvÃ­o a revisiÃ³n docente (RN02 / RN04).
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

  // DiagnÃ³stico de prerrequisitos de revisiÃ³n (RN02)
  const tieneDocente = Boolean(practica.docenteId);
  const tieneInstrumentos = instrumentos.length > 0;
  const tieneConsentimiento = documentos.some((d) => d.tipo === 'CONSENTIMIENTO_INFORMADO');
  const cumplePrerrequisitosRN02 = tieneDocente && tieneInstrumentos && tieneConsentimiento;

  // DiagnÃ³stico de observaciones de revisiÃ³n (RN04)
  const todasObservaciones = revisiones.flatMap((rev) => rev.observaciones || []);
  const observacionesPendientes = todasObservaciones.filter((obs) => !obs.resuelta);
  const tieneObservacionesPendientes = observacionesPendientes.length > 0;

  const esBorrador = practica.estado === 'BORRADOR';
  const esRechazada = practica.estado === 'RECHAZADA';
  const esEnRevision = practica.estado === 'EN_REVISION';
  const esAprobada = practica.estado === 'APROBADA';
  const esCerrada = practica.estado === 'CERRADA';

  // HabilitaciÃ³n de la acciÃ³n segÃºn ciclo de vida y RN02/RN04
  const puedeSolicitarRevision = Boolean(
    esPropietario &&
    (
      (esBorrador && cumplePrerrequisitosRN02) ||
      (esRechazada && cumplePrerrequisitosRN02 && !tieneObservacionesPendientes)
    )
  );

  return (
    <div className="bloque-revision-estudiante">
      {/* Indicador de Prerrequisitos de RevisiÃ³n (RN02 / RN04) */}
      <div className="prerrequisitos-status-box" aria-labelledby="titulo-prerrequisitos">
        <h3 id="titulo-prerrequisitos">VerificaciÃ³n de Prerrequisitos para RevisiÃ³n Docente (RN02 / RN04):</h3>
        <ul className="lista-prerrequisitos" role="list">
          <li className={tieneDocente ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneDocente ? 'âœ“' : 'âœ—'}</span>
            <span>Docente tutor institucional asignado {tieneDocente ? '' : '(Pendiente)'}</span>
          </li>
          <li className={tieneInstrumentos ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneInstrumentos ? 'âœ“' : 'âœ—'}</span>
            <span>Al menos un instrumento de evaluaciÃ³n registrado {tieneInstrumentos ? `(${instrumentos.length} registrado${instrumentos.length > 1 ? 's' : ''})` : '(Pendiente)'}</span>
          </li>
          <li className={tieneConsentimiento ? 'cumplido' : 'pendiente'}>
            <span aria-hidden="true">{tieneConsentimiento ? 'âœ“' : 'âœ—'}</span>
            <span>Documento de Consentimiento Informado en PDF adjunto {tieneConsentimiento ? '' : '(Pendiente)'}</span>
          </li>
          {esRechazada && (
            <li className={!tieneObservacionesPendientes ? 'cumplido' : 'pendiente'}>
              <span aria-hidden="true">{!tieneObservacionesPendientes ? 'âœ“' : 'âœ—'}</span>
              <span>SubsanaciÃ³n de observaciones previas (RN04) {!tieneObservacionesPendientes ? '(Todas resueltas)' : `(${observacionesPendientes.length} pendiente${observacionesPendientes.length > 1 ? 's' : ''})`}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Caja de AcciÃ³n Principal para el Estudiante */}
      {esPropietario && (esBorrador || esRechazada) && (
        <div
          className={`accion-solicitar-revision-box ${puedeSolicitarRevision ? 'listo' : 'bloqueado'}`}
          role="region"
          aria-labelledby="titulo-accion-revision"
        >
          <div className="accion-revision-header">
            <div className="accion-revision-texto">
              <h3 id="titulo-accion-revision">
                {esRechazada ? 'ReenvÃ­o de PrÃ¡ctica a RevisiÃ³n Docente' : 'Solicitar RevisiÃ³n Docente'}
              </h3>
              <p>
                {puedeSolicitarRevision
                  ? 'Todos los prerrequisitos se encuentran cumplidos. Puede enviar su prÃ¡ctica al docente tutor para su dictamen metodolÃ³gico.'
                  : esRechazada && tieneObservacionesPendientes
                  ? 'Debe marcar como resueltas todas las observaciones emitidas por el docente antes de poder reenviar la prÃ¡ctica.'
                  : 'Complete los prerrequisitos faltantes indicados arriba para habilitar el envÃ­o a revisiÃ³n.'}
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
              <span aria-hidden="true">âœˆ</span>
              <span>{esRechazada ? 'Reenviar a RevisiÃ³n Docente' : 'Solicitar RevisiÃ³n Docente'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mensajes Informativos cuando estÃ¡ en otros estados */}
      {esEnRevision && (
        <div className="banner-estado-revision" role="status">
          <p>
            <strong>PrÃ¡ctica en RevisiÃ³n:</strong> Esta prÃ¡ctica se encuentra actualmente en evaluaciÃ³n por parte del docente tutor asignado. No es posible realizar modificaciones ni nuevos envÃ­os mientras se emite el dictamen formal.
          </p>
        </div>
      )}

      {esAprobada && (
        <div className="banner-estado-aprobada" role="status">
          <p>
            <strong>PrÃ¡ctica Aprobada:</strong> El docente tutor ha validado y aprobado los instrumentos y documentos de esta prÃ¡ctica. Puede proceder a agendar las reservas de laboratorio necesarias.
          </p>
        </div>
      )}

      {esCerrada && (
        <div className="banner-estado-cerrada" role="status">
          <p>
            <strong>PrÃ¡ctica Cerrada:</strong> Esta prÃ¡ctica ha culminado su ciclo formal de pruebas de usabilidad y ha sido cerrada por el docente orientador. No admite mÃ¡s cambios ni reservas.
          </p>
        </div>
      )}
    </div>
  );
}

export default AccionRevisionEstudiante;