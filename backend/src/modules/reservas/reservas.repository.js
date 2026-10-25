import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { CODIGOS_ERROR } from '../../constants/codigosError.js';

// Relaciones comunes de una reserva. Incluye los documentos de la práctica (solo metadatos)
// para poder verificar la documentación obligatoria sin consultas adicionales.
const INCLUDE_RESERVA = {
  practica: {
    include: {
      documentos: {
        select: { id: true, tipo: true, nombreOriginal: true, tamanoBytes: true, creadoEn: true }
      }
    }
  },
  laboratorio: true,
  horario: true,
  solicitante: {
    select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
  }
};

export async function crearReserva(datosReserva) {
  return prisma.reserva.create({
    data: datosReserva,
    include: INCLUDE_RESERVA
  });
}

export async function crearReservaConControlConcurrencia({
  practicaId,
  laboratorioId,
  horarioId,
  solicitanteId,
  fechaReserva,
  fechaInicio,
  fechaFin,
  capacidad,
  estado = 'PENDIENTE'
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Bloqueo pesimista a nivel de fila sobre el horario específico
    await tx.$queryRaw`SELECT id FROM horarios WHERE id = ${horarioId} FOR UPDATE`;

    // 2. Conteo atómico dentro de la transacción protegida
    const reservasActivas = await tx.reserva.count({
      where: {
        laboratorioId,
        horarioId,
        fechaReserva: {
          gte: fechaInicio,
          lt: fechaFin
        },
        estado: {
          in: ['PENDIENTE', 'APROBADA']
        }
      }
    });

    if (reservasActivas >= capacidad) {
      throw new AppError(
        'La franja horaria seleccionada ya no se encuentra disponible para esta fecha',
        409,
        CODIGOS_ERROR.RESERVA_NO_DISPONIBLE
      );
    }

    // 3. Crear la reserva
    return tx.reserva.create({
      data: {
        practicaId,
        laboratorioId,
        horarioId,
        solicitanteId,
        fechaReserva,
        estado
      },
      include: INCLUDE_RESERVA
    });
  });
}

export async function listarReservasPorUsuario(solicitanteId) {
  return prisma.reserva.findMany({
    where: { solicitanteId },
    include: INCLUDE_RESERVA,
    orderBy: { creadoEn: 'desc' }
  });
}

export async function listarTodasLasReservas() {
  return prisma.reserva.findMany({
    include: INCLUDE_RESERVA,
    orderBy: { creadoEn: 'desc' }
  });
}

export async function buscarReservaPorId(id) {
  return prisma.reserva.findUnique({
    where: { id },
    include: INCLUDE_RESERVA
  });
}

export async function actualizarEstadoReserva(id, { estado, revisorId, motivoRechazoCancelacion }) {
  return prisma.reserva.update({
    where: { id },
    data: {
      estado,
      revisorId,
      motivoRechazoCancelacion
    },
    include: INCLUDE_RESERVA
  });
}

export async function listarLaboratoriosConHorarios() {
  return prisma.laboratorio.findMany({
    where: { activo: true },
    include: {
      horarios: {
        where: { activo: true },
        orderBy: { horaInicio: 'asc' }
      }
    }
  });
}

export async function buscarLaboratorioPorId(id) {
  return prisma.laboratorio.findUnique({
    where: { id },
    include: { horarios: true }
  });
}

export async function crearLaboratorio(datos) {
  return prisma.laboratorio.create({
    data: datos
  });
}

export async function crearHorario(datos) {
  return prisma.horario.create({
    data: datos
  });
}

export async function listarReservasPorFecha(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  const fechaInicio = new Date(Date.UTC(year, month - 1, day));
  const fechaFin = new Date(Date.UTC(year, month - 1, day + 1));

  return prisma.reserva.findMany({
    where: {
      fechaReserva: {
        gte: fechaInicio,
        lt: fechaFin
      },
      estado: {
        in: ['PENDIENTE', 'APROBADA']
      }
    }
  });
}

export async function buscarHorarioPorId(id) {
  return prisma.horario.findUnique({
    where: { id }
  });
}

export async function contarReservasActivasEnFranja({ laboratorioId, horarioId, fechaInicio, fechaFin }) {
  return prisma.reserva.count({
    where: {
      laboratorioId,
      horarioId,
      fechaReserva: {
        gte: fechaInicio,
        lt: fechaFin
      },
      estado: {
        in: ['PENDIENTE', 'APROBADA']
      }
    }
  });
}

export async function listarAdministradoresActivos() {
  return prisma.usuario.findMany({
    where: {
      rol: { nombre: 'ADMINISTRADOR' },
      activo: true
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true
    }
  });
}

export async function actualizarEstadoHorario(id, activo) {
  return prisma.horario.update({
    where: { id },
    data: { activo },
    include: {
      laboratorio: true
    }
  });
}

/**
 * Transición atómica de una reserva PENDIENTE a APROBADA/RECHAZADA.
 * El UPDATE condicionado (WHERE estado = 'PENDIENTE') evita que dos revisores procesen la misma solicitud.
 */
export async function transicionarReservaPendiente(id, { estado, revisorId, motivoRechazoCancelacion }) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.reserva.updateMany({
      where: { id, estado: 'PENDIENTE' },
      data: { estado, revisorId, motivoRechazoCancelacion }
    });

    if (count === 0) {
      throw new AppError(
        'La reserva ya fue procesada o no se encuentra en estado PENDIENTE',
        409,
        CODIGOS_ERROR.RESERVA_YA_PROCESADA
      );
    }

    return tx.reserva.findUnique({ where: { id }, include: INCLUDE_RESERVA });
  });
}
