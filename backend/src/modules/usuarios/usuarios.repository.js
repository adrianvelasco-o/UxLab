import { prisma } from '../../config/prisma.js';

export async function listarUsuarios(filtros = {}) {
  const where = {};
  
  if (filtros.rolNombre) {
    where.rol = { nombre: filtros.rolNombre };
  }

  if (typeof filtros.activo === 'boolean') {
    where.activo = filtros.activo;
  }

  return prisma.usuario.findMany({
    where,
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true,
      activo: true,
      creadoEn: true,
      actualizadoEn: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }
    },
    orderBy: { creadoEn: 'desc' }
  });
}

export async function buscarUsuarioPorId(id) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true,
      activo: true,
      creadoEn: true,
      actualizadoEn: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }
    }
  });
}

export async function buscarRolPorNombre(nombreRol) {
  return prisma.rol.findUnique({
    where: { nombre: nombreRol }
  });
}

export async function actualizarRolUsuario(usuarioId, rolId) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { rolId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true,
      activo: true,
      actualizadoEn: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }
    }
  });
}

export async function actualizarEstadoUsuario(usuarioId, activo) {
  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true,
      activo: true,
      actualizadoEn: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }
    }
  });
}

export async function listarDocentesActivos() {
  return prisma.usuario.findMany({
    where: { activo: true, rol: { nombre: 'DOCENTE' } },
    select: { id: true, nombres: true, apellidos: true },
    orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }]
  });
}

export async function buscarUsuarioPorCorreo(correoInstitucional) {
  return prisma.usuario.findUnique({
    where: { correoInstitucional }
  });
}

export async function crearUsuario({ nombres, apellidos, correoInstitucional, contrasenaHash, rolId, activo = true }) {
  return prisma.usuario.create({
    data: {
      nombres,
      apellidos,
      correoInstitucional,
      contrasenaHash,
      rolId,
      activo
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correoInstitucional: true,
      activo: true,
      creadoEn: true,
      actualizadoEn: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }
    }
  });
}

