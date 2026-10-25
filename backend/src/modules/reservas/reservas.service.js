import * as reservasRepository from './reservas.repository.js';
import * as practicasRepository from '../practicas/practicas.repository.js';
import { crearYEnviarNotificacion } from '../notificaciones/notificaciones.service.js';
import { AppError } from '../../errors/AppError.js';
import { CODIGOS_ERROR } from '../../constants/codigosError.js';
import { fechaHoyColombia, esFechaCalendarioValida, horaATiempoUtc } from '../../utils/fechas.js';
import { evaluarDocumentacion, describirFaltantes } from '../../utils/documentacionReserva.js';

const DIAS_SEMANA_MAP = [
  null,        // 0: Domingo (sin atención)
  'LUNES',     // 1
  'MARTES',    // 2
  'MIERCOLES', // 3
  'JUEVES',    // 4
  'VIERNES',   // 5
  'SABADO'     // 6
];

function conDocumentacion(reserva) {
  return { ...reserva, documentacion: evaluarDocumentacion(reserva.practica?.documentos) };
}

export async function solicitarReserva({ practicaId, laboratorioId = 1, horarioId = 1, fechaReserva, usuario }) {
  // 1. Verificar que la práctica exista
  const practica = await practicasRepository.buscarPracticaPorId(practicaId);
  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // 2. Verificar que el estudiante sea el dueño de la práctica (o admin)
  if (practica.estudianteId !== usuario.id && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Solo puedes solicitar reservas para tus propias prácticas', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  // 3. Validar regla RN07: La práctica debe encontrarse en estado APROBADA
  if (practica.estado !== 'APROBADA') {
    throw new AppError('La práctica debe estar en estado APROBADA para poder solicitar una reserva', 400, CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA);
  }

  // 3.1 Documentación obligatoria: consentimiento informado y protocolo de prueba
  const documentacion = evaluarDocumentacion(practica.documentos);
  if (!documentacion.completa) {
    throw new AppError(
      `Debe adjuntar la documentación obligatoria antes de solicitar la reserva. Falta: ${describirFaltantes(documentacion.faltantes)}`,
      400,
      CODIGOS_ERROR.DOCUMENTACION_INCOMPLETA
    );
  }

  // 4. Verificar que el laboratorio exista y esté activo
  const laboratorio = await reservasRepository.buscarLaboratorioPorId(laboratorioId);
  if (!laboratorio || !laboratorio.activo) {
    throw new AppError('El laboratorio especificado no existe o no está activo', 404, CODIGOS_ERROR.LABORATORIO_INACTIVO);
  }

  // 5. Verificar que el horario exista, pertenezca al laboratorio y esté activo
  const horario = await reservasRepository.buscarHorarioPorId(horarioId);
  if (!horario || horario.laboratorioId !== laboratorioId || !horario.activo) {
    throw new AppError('La franja horaria seleccionada no existe o no está habilitada para este laboratorio', 400, CODIGOS_ERROR.HORARIO_DESHABILITADO);
  }

  // 6. Verificar que la fecha de reserva corresponda al día de la semana de la franja
  if (!esFechaCalendarioValida(fechaReserva)) {
    throw new AppError('La fecha proporcionada no existe en el calendario', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  if (fechaReserva < fechaHoyColombia()) {
    throw new AppError('No se pueden solicitar reservas para fechas pasadas', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  const [year, month, day] = fechaReserva.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(year, month - 1, day));

  const diaSemanaFecha = DIAS_SEMANA_MAP[fechaUtc.getUTCDay()];
  if (!diaSemanaFecha || horario.diaSemana !== diaSemanaFecha) {
    throw new AppError(
      `La fecha seleccionada (${diaSemanaFecha || 'DOMINGO'}) no corresponde al día de atención de la franja (${horario.diaSemana})`,
      400,
      CODIGOS_ERROR.DATOS_INVALIDOS
    );
  }

  // 7 y 8. Crear reserva de forma atómica y protegida contra concurrencia/sobrecupo (RN08 / SEC-03)
  const fechaInicio = new Date(Date.UTC(year, month - 1, day));
  const fechaFin = new Date(Date.UTC(year, month - 1, day + 1));
  const capacidadMaxima = laboratorio.capacidad || 1;

  const nuevaReserva = await reservasRepository.crearReservaConControlConcurrencia({
    practicaId,
    laboratorioId,
    horarioId,
    solicitanteId: usuario.id,
    fechaReserva: new Date(fechaReserva),
    fechaInicio,
    fechaFin,
    capacidad: capacidadMaxima,
    estado: 'PENDIENTE'
  });

  // 9. Notificar al Administrador del laboratorio (Escenario 1)
  reservasRepository.listarAdministradoresActivos().then((administradores) => {
    administradores.forEach((admin) => {
      crearYEnviarNotificacion({
        usuarioId: admin.id,
        titulo: 'Nueva Solicitud de Reserva',
        mensaje: `El estudiante ha solicitado una reserva de laboratorio para la práctica '${practica.titulo}'.`,
        tipo: 'RESERVA_SOLICITADA',
        referenciaEntidad: 'RESERVA',
        referenciaId: nuevaReserva.id
      }).catch((err) => console.error('Error al notificar administrador:', err.message));
    });
  }).catch((err) => console.error('Error al listar administradores:', err.message));

  return nuevaReserva;
}

// Alias para compatibilidad
export const solicitarNuevaReserva = solicitarReserva;

export async function obtenerReservasUsuario(usuario) {
  // Administradores pueden consultar todas las solicitudes
  const reservas = usuario.rolNombre === 'ADMINISTRADOR'
    ? await reservasRepository.listarTodasLasReservas()
    : await reservasRepository.listarReservasPorUsuario(usuario.id);

  return reservas.map(conDocumentacion);
}

export async function obtenerDetalleReserva(reservaId, usuario) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) {
    throw new AppError('La reserva solicitada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const tienePermiso =
    usuario.rolNombre === 'ADMINISTRADOR' ||
    reserva.solicitanteId === usuario.id;

  if (!tienePermiso) {
    throw new AppError('No tienes permiso para consultar esta reserva', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  return conDocumentacion(reserva);
}

export async function aprobarReserva(reservaId, usuario) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) {
    throw new AppError('La reserva a aprobar no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // Regla de negocio: Un estudiante no puede aprobar sus propias reservas
  if (reserva.solicitanteId === usuario.id && usuario.rolNombre !== 'ADMINISTRADOR') {
    throw new AppError('Un estudiante no puede aprobar su propia solicitud de reserva', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  if (reserva.estado !== 'PENDIENTE') {
    throw new AppError(
      `Solo se pueden aprobar reservas en estado PENDIENTE (estado actual: ${reserva.estado})`,
      409,
      CODIGOS_ERROR.RESERVA_YA_PROCESADA
    );
  }

  const documentacion = evaluarDocumentacion(reserva.practica?.documentos);
  if (!documentacion.completa) {
    throw new AppError(
      `No se puede aprobar la reserva: falta documentación obligatoria (${describirFaltantes(documentacion.faltantes)})`,
      400,
      CODIGOS_ERROR.DOCUMENTACION_INCOMPLETA
    );
  }

  const reservaAprobada = await reservasRepository.transicionarReservaPendiente(reservaId, {
    estado: 'APROBADA',
    revisorId: usuario.id,
    motivoRechazoCancelacion: null
  });

  // Notificar al estudiante solicitante
  crearYEnviarNotificacion({
    usuarioId: reserva.solicitanteId,
    titulo: 'Reserva de Laboratorio Aprobada',
    mensaje: `Tu solicitud de reserva de laboratorio para la práctica ID ${reserva.practicaId} ha sido aprobada.`,
    tipo: 'RESERVA_APROBADA',
    referenciaEntidad: 'RESERVA',
    referenciaId: reservaId
  }).catch((err) => console.error('Error al notificar aprobación de reserva:', err.message));

  return reservaAprobada;
}

export async function rechazarReserva(reservaId, motivo, usuario) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) {
    throw new AppError('La reserva a rechazar no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  if (reserva.estado !== 'PENDIENTE') {
    throw new AppError(
      `Solo se pueden rechazar reservas en estado PENDIENTE (estado actual: ${reserva.estado})`,
      409,
      CODIGOS_ERROR.RESERVA_YA_PROCESADA
    );
  }

  const reservaRechazada = await reservasRepository.transicionarReservaPendiente(reservaId, {
    estado: 'RECHAZADA',
    revisorId: usuario.id,
    motivoRechazoCancelacion: motivo
  });

  // Notificar al estudiante solicitante
  crearYEnviarNotificacion({
    usuarioId: reserva.solicitanteId,
    titulo: 'Reserva de Laboratorio Rechazada',
    mensaje: `Tu solicitud de reserva ha sido rechazada. Motivo: ${motivo}`,
    tipo: 'RESERVA_RECHAZADA',
    referenciaEntidad: 'RESERVA',
    referenciaId: reservaId
  }).catch((err) => console.error('Error al notificar rechazo de reserva:', err.message));

  return reservaRechazada;
}


export async function listarLaboratoriosDisponibles(fecha = null) {
  const laboratorios = await reservasRepository.listarLaboratoriosConHorarios();

  if (!fecha) {
    return laboratorios;
  }

  const [year, month, day] = fecha.split('-').map(Number);
  const fechaObj = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(fechaObj.getTime())) {
    throw new AppError('La fecha proporcionada es inválida', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  const diaSemana = DIAS_SEMANA_MAP[fechaObj.getUTCDay()];

  // Si es un día no hábil sin atención (ej. domingo), no existen franjas configuradas
  if (!diaSemana) {
    return laboratorios.map((lab) => ({
      ...lab,
      horarios: []
    }));
  }

  const reservasOcupadas = await reservasRepository.listarReservasPorFecha(fecha);

  return laboratorios.map((lab) => {
    // Filtrar franjas activas del día de la semana correspondiente a la fecha
    const franjasDelDia = lab.horarios.filter((h) => h.diaSemana === diaSemana);

    const horariosConEstado = franjasDelDia.map((horario) => {
      const reservasEnFranja = reservasOcupadas.filter(
        (r) => r.laboratorioId === lab.id && r.horarioId === horario.id
      );
      const cuposTotales = lab.capacidad || 1;
      const cuposLibres = Math.max(cuposTotales - reservasEnFranja.length, 0);
      const estaOcupado = cuposLibres === 0;

      return {
        ...horario,
        estado: estaOcupado ? 'OCUPADO' : 'DISPONIBLE',
        disponible: !estaOcupado,
        cuposTotales,
        cuposLibres
      };
    });

    return {
      ...lab,
      horarios: horariosConEstado
    };
  });
}

export async function crearNuevoLaboratorio(datos) {
  return reservasRepository.crearLaboratorio({
    nombre: datos.nombre,
    ubicacion: datos.ubicacion,
    capacidad: datos.capacidad || 1,
    descripcion: datos.descripcion || null
  });
}

export async function crearHorarioLaboratorio(laboratorioId, datos) {
  const laboratorio = await reservasRepository.buscarLaboratorioPorId(laboratorioId);
  if (!laboratorio) {
    throw new AppError('El laboratorio especificado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // Parsear la cadena HH:MM a un Date UTC (tipo TIME en Postgres vía Prisma), sin depender de la zona del servidor
  const horaInicioDate = horaATiempoUtc(datos.horaInicio);
  const horaFinDate = horaATiempoUtc(datos.horaFin);

  if (horaInicioDate >= horaFinDate) {
    throw new AppError('La hora de inicio debe ser anterior a la hora de fin', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  return reservasRepository.crearHorario({
    laboratorioId,
    diaSemana: datos.diaSemana,
    horaInicio: horaInicioDate,
    horaFin: horaFinDate
  });
}

export async function cambiarEstadoHorario(horarioId, activo) {
  const horario = await reservasRepository.buscarHorarioPorId(horarioId);
  if (!horario) {
    throw new AppError('La franja horaria especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  return reservasRepository.actualizarEstadoHorario(horarioId, activo);
}

export async function notificarDocumentacionFaltante(reservaId) {
  const reserva = await reservasRepository.buscarReservaPorId(reservaId);
  if (!reserva) {
    throw new AppError('La reserva especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const documentacion = evaluarDocumentacion(reserva.practica?.documentos);
  if (documentacion.completa) {
    throw new AppError('La documentación obligatoria de esta reserva ya está completa', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  await crearYEnviarNotificacion({
    usuarioId: reserva.solicitanteId,
    titulo: 'Documentación pendiente para tu reserva',
    mensaje: `Para tramitar tu reserva de laboratorio debes adjuntar: ${describirFaltantes(documentacion.faltantes)}.`,
    tipo: 'RESERVA_DOCUMENTACION_FALTANTE',
    referenciaEntidad: 'RESERVA',
    referenciaId: reservaId
  });

  return { reservaId, faltantes: documentacion.faltantes };
}
