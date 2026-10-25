import * as usuariosRepository from './usuarios.repository.js';
import { generarHashContrasena } from '../../utils/hashContrasena.js';
import { AppError } from '../../errors/AppError.js';
import { CODIGOS_ERROR } from '../../constants/codigosError.js';

export async function obtenerListaUsuarios(query = {}) {
  const filtros = {};

  if (query.rol) {
    filtros.rolNombre = query.rol.toUpperCase();
  }

  if (query.activo !== undefined) {
    filtros.activo = query.activo === 'true' || query.activo === true;
  }

  return usuariosRepository.listarUsuarios(filtros);
}

export async function cambiarRolUsuario(usuarioId, rolNombre) {
  const usuario = await usuariosRepository.buscarUsuarioPorId(usuarioId);
  if (!usuario) {
    throw new AppError('El usuario solicitado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const rol = await usuariosRepository.buscarRolPorNombre(rolNombre);
  if (!rol) {
    throw new AppError(`El rol '${rolNombre}' no existe en el sistema`, 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  return usuariosRepository.actualizarRolUsuario(usuarioId, rol.id);
}

export async function cambiarEstadoUsuario(usuarioId, activo) {
  const usuario = await usuariosRepository.buscarUsuarioPorId(usuarioId);
  if (!usuario) {
    throw new AppError('El usuario solicitado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  return usuariosRepository.actualizarEstadoUsuario(usuarioId, activo);
}

export async function crearUsuarioPorAdmin({
  nombres,
  apellidos,
  correoInstitucional,
  contrasena,
  rolNombre,
  activo = true
}) {
  const usuarioExistente = await usuariosRepository.buscarUsuarioPorCorreo(correoInstitucional);
  if (usuarioExistente) {
    throw new AppError(
      'El correo institucional ya se encuentra registrado',
      409,
      CODIGOS_ERROR.CORREO_YA_REGISTRADO
    );
  }

  const rol = await usuariosRepository.buscarRolPorNombre(rolNombre);
  if (!rol) {
    throw new AppError(
      `El rol '${rolNombre}' no existe en el sistema`,
      400,
      CODIGOS_ERROR.DATOS_INVALIDOS
    );
  }

  const contrasenaHash = await generarHashContrasena(contrasena);

  const nuevoUsuario = await usuariosRepository.crearUsuario({
    nombres,
    apellidos,
    correoInstitucional,
    contrasenaHash,
    rolId: rol.id,
    activo
  });

  return nuevoUsuario;
}

