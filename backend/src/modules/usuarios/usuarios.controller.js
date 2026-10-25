import * as usuariosService from './usuarios.service.js';
import { responderExito } from '../../utils/respuestaApi.js';

export async function listar(req, res, next) {
  try {
    const usuarios = await usuariosService.obtenerListaUsuarios(req.query);
    return responderExito(res, 200, 'Usuarios obtenidos correctamente', usuarios);
  } catch (error) {
    next(error);
  }
}

export async function cambiarRol(req, res, next) {
  try {
    const usuarioId = parseInt(req.params.id, 10);
    const { rolNombre } = req.body;
    const usuarioActualizado = await usuariosService.cambiarRolUsuario(usuarioId, rolNombre);
    return responderExito(res, 200, 'Rol de usuario actualizado exitosamente', usuarioActualizado);
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const usuarioId = parseInt(req.params.id, 10);
    const { activo } = req.body;
    const usuarioActualizado = await usuariosService.cambiarEstadoUsuario(usuarioId, activo);
    const mensaje = activo ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente';
    return responderExito(res, 200, mensaje, usuarioActualizado);
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const nuevoUsuario = await usuariosService.crearUsuarioPorAdmin(req.body);
    return responderExito(res, 201, 'Usuario institucional creado exitosamente por administrador', nuevoUsuario);
  } catch (error) {
    next(error);
  }
}

