import * as practicasRepository from './practicas.repository.js';
import { crearYEnviarNotificacion } from '../notificaciones/notificaciones.service.js';
import { AppError } from '../../errors/AppError.js';
import { CODIGOS_ERROR } from '../../constants/codigosError.js';

async function validarDocenteAsignable(docenteId) {
  if (docenteId === undefined || docenteId === null) return;
  const docente = await practicasRepository.buscarDocenteActivoPorId(docenteId);
  if (!docente) {
    throw new AppError(
      'El docente tutor indicado no existe, está inactivo o no tiene rol DOCENTE',
      400,
      CODIGOS_ERROR.DATOS_INVALIDOS
    );
  }
}

export async function crearNuevaPractica(estudianteId, datos) {
  await validarDocenteAsignable(datos.docenteId);
  return practicasRepository.crearPractica({
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    objetivo: datos.objetivo,
    estudianteId,
    docenteId: datos.docenteId || null,
    estado: 'BORRADOR'
  });
}

export async function actualizarPractica(practicaId, datos, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // Verificar que el estudiante sea el dueño
  const esDuenio = practica.estudianteId === usuario.id || ['ADMINISTRADOR'].includes(usuario.rolNombre);
  if (!esDuenio) {
    throw new AppError('No tienes permisos para modificar esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  // Regla RN06: Inmutabilidad de práctica cerrada
  if (practica.estado === 'CERRADA') {
    throw new AppError('La práctica se encuentra formalmente CERRADA y no admite modificaciones (RN06)', 400, CODIGOS_ERROR.PRACTICA_NO_EDITABLE);
  }

  // Solo se puede modificar en BORRADOR o RECHAZADA
  if (!['BORRADOR', 'RECHAZADA'].includes(practica.estado) && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Solo se pueden modificar prácticas en estado BORRADOR o RECHAZADA', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  await validarDocenteAsignable(datos.docenteId);

  return practicasRepository.actualizarPractica(practicaId, datos);
}

export async function enviarPracticaARevision(practicaId, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  if (practica.estudianteId !== usuario.id && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Solo el creador de la práctica puede enviarla a revisión', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  if (!['BORRADOR', 'RECHAZADA'].includes(practica.estado)) {
    throw new AppError('La práctica ya fue enviada o no se encuentra en estado editable', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  // Validación de Regla RN02 / CU09: Prerrequisitos de envío a revisión
  if (!practica.docenteId) {
    throw new AppError('Debe asignar un docente tutor a la práctica antes de enviarla a revisión', 400, CODIGOS_ERROR.DOCENTE_NO_ASIGNADO);
  }

  const tieneInstrumentos = Boolean(practica.instrumentos && practica.instrumentos.length > 0);
  const tieneConsentimiento = Boolean(practica.documentos && practica.documentos.some((doc) => doc.tipo === 'CONSENTIMIENTO_INFORMADO'));

  if (!tieneInstrumentos || !tieneConsentimiento) {
    throw new AppError(
      'La práctica debe contar con al menos un instrumento de evaluación y un documento de consentimiento informado adjunto antes de enviarse a revisión',
      400,
      CODIGOS_ERROR.DOCUMENTACION_INCOMPLETA
    );
  }

  // Validación de observaciones resueltas (CU11 / HU12 / RN04)
  const tieneObservacionesPendientes = practica.revisiones?.some((rev) =>
    rev.observaciones?.some((obs) => !obs.resuelta)
  );

  if (tieneObservacionesPendientes) {
    throw new AppError(
      'Todas las observaciones de revisiones previas deben estar marcadas como resueltas antes de reenviar la práctica a revisión',
      400,
      CODIGOS_ERROR.OBSERVACIONES_PENDIENTES
    );
  }

  const practicaActualizada = await practicasRepository.actualizarPractica(practicaId, { estado: 'EN_REVISION' });

  // Notificar al docente asignado si existe
  if (practica.docenteId) {
    crearYEnviarNotificacion({
      usuarioId: practica.docenteId,
      titulo: 'Nueva práctica para revisión',
      mensaje: `El estudiante ha enviado una práctica para tu revisión.`,
      tipo: 'PRACTICA_ENVIADA_REVISION',
      referenciaEntidad: 'PRACTICA',
      referenciaId: practicaId
    }).catch((err) => console.error('Error al notificar docente:', err.message));
  }

  return practicaActualizada;
}

export async function obtenerPracticasUsuario(usuario) {
  if (usuario.rolNombre === 'ADMINISTRADOR') {
    return practicasRepository.listarTodasLasPracticas();
  }
  if (usuario.rolNombre === 'DOCENTE') {
    // Los docentes pueden ver todas las que estén en revisión o asignadas a ellos
    return practicasRepository.listarTodasLasPracticas();
  }
  return practicasRepository.listarPracticasPorEstudiante(usuario.id);
}

export async function obtenerPracticaDetalle(practicaId, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);

  if (!practica) {
    throw new AppError('La práctica solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const tienePermiso =
    ['ADMINISTRADOR', 'DOCENTE'].includes(usuario.rolNombre) ||
    practica.estudianteId === usuario.id;

  if (!tienePermiso) {
    throw new AppError('No tienes permisos para consultar esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  return practica;
}

// -------------------------------------------------------------
// INSTRUMENTOS
// -------------------------------------------------------------

function validarPracticaModificableParaInstrumentos(practica) {
  if (practica.estado === 'CERRADA') {
    throw new AppError(
      'La práctica se encuentra formalmente CERRADA y no admite modificaciones (RN06)',
      400,
      CODIGOS_ERROR.PRACTICA_NO_EDITABLE
    );
  }

  if (!['BORRADOR', 'RECHAZADA'].includes(practica.estado)) {
    throw new AppError(
      `Solo se pueden agregar o eliminar instrumentos en prácticas en estado BORRADOR o RECHAZADA (estado actual: ${practica.estado})`,
      400,
      CODIGOS_ERROR.PRACTICA_NO_EDITABLE
    );
  }
}

export async function agregarInstrumento(practicaId, datos, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const esDuenio = practica.estudianteId === usuario.id || ['ADMINISTRADOR'].includes(usuario.rolNombre);
  if (!esDuenio) {
    throw new AppError('No tienes permisos para agregar instrumentos a esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  validarPracticaModificableParaInstrumentos(practica);

  return practicasRepository.crearInstrumento({
    practicaId,
    tipo: datos.tipo,
    nombre: datos.nombre,
    instrucciones: datos.instrucciones || null,
    contenido: datos.contenido || null
  });
}

export async function obtenerInstrumentos(practicaId, usuario) {
  await obtenerPracticaDetalle(practicaId, usuario);
  return practicasRepository.listarInstrumentosPorPractica(practicaId);
}

export async function eliminarInstrumento(practicaId, instrumentoId, usuario) {
  const instrumento = await practicasRepository.buscarInstrumentoPorId(instrumentoId);
  if (!instrumento || instrumento.practicaId !== practicaId) {
    throw new AppError('El instrumento especificado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const esDuenio = practica.estudianteId === usuario.id || ['ADMINISTRADOR'].includes(usuario.rolNombre);
  if (!esDuenio) {
    throw new AppError('No tienes permisos para eliminar este instrumento', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  validarPracticaModificableParaInstrumentos(practica);

  return practicasRepository.eliminarInstrumento(instrumentoId);
}

// -------------------------------------------------------------
// REVISIONES DOCENTES
// -------------------------------------------------------------

export async function registrarRevisionDocente(practicaId, datos, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica a revisar no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  if (practica.estado !== 'EN_REVISION' && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Solo se pueden evaluar prácticas que se encuentren en estado EN_REVISION', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  if (usuario.rolNombre === 'DOCENTE' && practica.docenteId !== usuario.id) {
    throw new AppError('Solo el docente tutor asignado a la práctica puede revisarla', 403, CODIGOS_ERROR.DOCENTE_NO_ASIGNADO);
  }

  // Salvaguarda en el service para defensa en profundidad (PB7)
  if (datos.resultado === 'RECHAZADA') {
    if (!datos.observaciones || !Array.isArray(datos.observaciones) || datos.observaciones.length === 0) {
      throw new AppError(
        'Una práctica rechazada debe incluir al menos una observación que permita su corrección',
        400,
        CODIGOS_ERROR.DATOS_INVALIDOS
      );
    }
  }

  const revision = await practicasRepository.crearRevisionConObservaciones({
    practicaId,
    docenteId: usuario.id,
    resultado: datos.resultado,
    comentariosGenerales: datos.comentariosGenerales || null,
    observaciones: datos.observaciones || []
  });

  // Notificar al estudiante creador de la práctica
  const esAprobada = datos.resultado === 'APROBADA';
  const tipoNotif = esAprobada ? 'PRACTICA_APROBADA' : 'PRACTICA_RECHAZADA';
  const tituloNotif = esAprobada ? 'Práctica Aprobada' : 'Práctica Requiere Correcciones';
  const mensajeNotif = esAprobada
    ? `Tu práctica '${practica.titulo}' ha sido aprobada por el docente.`
    : `Tu práctica '${practica.titulo}' requiere correcciones tras la revisión docente.`;

  crearYEnviarNotificacion({
    usuarioId: practica.estudianteId,
    titulo: tituloNotif,
    mensaje: mensajeNotif,
    tipo: tipoNotif,
    referenciaEntidad: 'PRACTICA',
    referenciaId: practicaId
  }).catch((err) => console.error('Error al notificar estudiante:', err.message));

  return revision;
}

export async function obtenerRevisionesDePractica(practicaId, usuario) {
  await obtenerPracticaDetalle(practicaId, usuario);
  return practicasRepository.listarRevisionesPorPractica(practicaId);
}

export async function finalizarPractica(practicaId, datos, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  if (practica.estado === 'CERRADA') {
    throw new AppError('La práctica ya se encuentra formalmente CERRADA y no admite más transiciones', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  const nuevoEstado = datos.estado || 'FINALIZADA';

  if (nuevoEstado === 'CERRADA') {
    // Regla CU15 / HU17: Cierre formal exclusivo del DOCENTE orientador o ADMINISTRADOR
    const esDocenteTutor = (usuario.rolNombre === 'DOCENTE' && practica.docenteId === usuario.id) || usuario.rolNombre === 'ADMINISTRADOR';
    if (!esDocenteTutor) {
      throw new AppError('Solo el docente orientador asignado a la práctica puede formalizar su cierre definitivo', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
    }

    // Debe encontrarse previamente en estado FINALIZADA
    if (practica.estado !== 'FINALIZADA' && usuario.rolNombre !== 'ADMINISTRADOR') {
      throw new AppError('La práctica debe estar en estado FINALIZADA para poder proceder con el cierre formal', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
    }

    // Regla RN32: Exigir reporte final o evidencia adjunta
    const tieneReporteOEvidencia = Boolean(
      practica.documentos &&
      practica.documentos.some((doc) => ['REPORTE_FINAL', 'EVIDENCIA'].includes(doc.tipo))
    );

    if (!tieneReporteOEvidencia) {
      throw new AppError(
        'La práctica debe contar con al menos un documento de tipo REPORTE_FINAL o EVIDENCIA antes del cierre formal (RN32)',
        400,
        CODIGOS_ERROR.DOCUMENTACION_INCOMPLETA
      );
    }

    const practicaCerrada = await practicasRepository.actualizarPractica(practicaId, { estado: 'CERRADA' });

    // Notificar al estudiante del cierre exitoso
    crearYEnviarNotificacion({
      usuarioId: practica.estudianteId,
      titulo: 'Práctica Cerrada Formalmente',
      mensaje: `Tu práctica '${practica.titulo}' ha sido formalmente evaluada y cerrada por el docente orientador.`,
      tipo: 'PRACTICA_CERRADA',
      referenciaEntidad: 'PRACTICA',
      referenciaId: practicaId
    }).catch((err) => console.error('Error al notificar cierre de práctica:', err.message));

    return practicaCerrada;
  }

  // Transición a FINALIZADA
  const esDuenio = practica.estudianteId === usuario.id || ['ADMINISTRADOR', 'DOCENTE'].includes(usuario.rolNombre);
  if (!esDuenio) {
    throw new AppError('No tienes permisos para finalizar esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  const estadosValidos = ['APROBADA', 'EN_EJECUCION'];
  if (!estadosValidos.includes(practica.estado) && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('La práctica debe estar en estado APROBADA o EN_EJECUCION para poder ser finalizada', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  return practicasRepository.actualizarPractica(practicaId, { estado: 'FINALIZADA' });
}

export async function resolverObservacion(practicaId, observacionId, resuelta, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const esDuenio = practica.estudianteId === usuario.id || ['ADMINISTRADOR'].includes(usuario.rolNombre);
  if (!esDuenio) {
    throw new AppError('No tienes permisos para modificar las observaciones de esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  if (!['BORRADOR', 'RECHAZADA'].includes(practica.estado) && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Solo se pueden resolver observaciones de prácticas en estado RECHAZADA o BORRADOR', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  const observacion = await practicasRepository.buscarObservacionPorId(observacionId);
  if (!observacion || observacion.revision?.practicaId !== practicaId) {
    throw new AppError('La observación solicitada no existe en esta práctica', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  return practicasRepository.actualizarObservacion(observacionId, { resuelta });
}

// -------------------------------------------------------------
// PARTICIPANTES DE PRUEBAS UX (CU05, CU08 / HU19)
// -------------------------------------------------------------

export async function agregarParticipante(practicaId, datos, usuario) {
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const esDuenio = practica.estudianteId === usuario.id || usuario.rolNombre === 'ADMINISTRADOR';
  if (!esDuenio) {
    throw new AppError('No tienes permisos para agregar participantes a esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  if (practica.estado === 'CERRADA') {
    throw new AppError('La práctica se encuentra formalmente CERRADA y no admite modificaciones (RN06)', 400, CODIGOS_ERROR.PRACTICA_NO_EDITABLE);
  }

  const existente = await practicasRepository.buscarParticipantePorCodigo(practicaId, datos.codigoAnonimo);
  if (existente) {
    throw new AppError(`El código anónimo '${datos.codigoAnonimo}' ya está registrado en esta práctica`, 409, CODIGOS_ERROR.CONFLICTO_DUPLICADO);
  }

  return practicasRepository.crearParticipante({
    practicaId,
    codigoAnonimo: datos.codigoAnonimo,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    edad: datos.edad !== undefined ? datos.edad : null,
    genero: datos.genero || null,
    ocupacion: datos.ocupacion || null,
    experienciaPrevia: datos.experienciaPrevia || null,
    consentimientoFirmado: Boolean(datos.consentimientoFirmado)
  });
}

export async function obtenerParticipantes(practicaId, usuario) {
  await obtenerPracticaDetalle(practicaId, usuario);
  return practicasRepository.listarParticipantesPorPractica(practicaId);
}

export async function eliminarParticipante(practicaId, participanteId, usuario) {
  const participante = await practicasRepository.buscarParticipantePorId(participanteId);
  if (!participante || participante.practicaId !== practicaId) {
    throw new AppError('El participante especificado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  const esDuenio = practica.estudianteId === usuario.id || usuario.rolNombre === 'ADMINISTRADOR';
  if (!esDuenio) {
    throw new AppError('No tienes permisos para eliminar este participante', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  if (practica.estado === 'CERRADA') {
    throw new AppError('La práctica se encuentra formalmente CERRADA y no admite modificaciones (RN06)', 400, CODIGOS_ERROR.PRACTICA_NO_EDITABLE);
  }

  return practicasRepository.eliminarParticipante(participanteId);
}

