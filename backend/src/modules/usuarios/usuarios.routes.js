import { Router } from 'express';
import { autenticar } from '../../middlewares/autenticacion.js';
import { permitirRoles } from '../../middlewares/autorizacion.js';
import { validarEsquema } from '../../middlewares/validarEsquema.js';
import * as authService from '../auth/auth.service.js';
import * as usuariosController from './usuarios.controller.js';
import * as usuariosRepository from './usuarios.repository.js';
import { cambiarRolEsquema, cambiarEstadoEsquema, crearUsuarioAdminEsquema } from './usuarios.schema.js';
import { responderExito } from '../../utils/respuestaApi.js';

const router = Router();

router.use(autenticar);

// GET /api/usuarios/me - Datos del usuario en sesión
router.get('/me', async (req, res, next) => {
  try {
    const usuario = await authService.obtenerPerfil(req.usuario.id);
    return responderExito(res, 200, 'Datos del usuario autenticado obtenidos correctamente', usuario);
  } catch (error) {
    next(error);
  }
});

// GET /api/usuarios/docentes - Docentes activos (solo id y nombre) para asignar tutor a una práctica
router.get('/docentes', async (_req, res, next) => {
  try {
    const docentes = await usuariosRepository.listarDocentesActivos();
    return responderExito(res, 200, 'Docentes obtenidos correctamente', docentes);
  } catch (error) {
    next(error);
  }
});

// GET /api/usuarios - Listar usuarios con filtros por rol o estado activo/inactivo (Solo Administrador)
router.get(
  '/',
  permitirRoles('ADMINISTRADOR'),
  usuariosController.listar
);

// POST /api/usuarios - Crear nuevo usuario institucional (Solo Administrador)
router.post(
  '/',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(crearUsuarioAdminEsquema, 'body'),
  usuariosController.crear
);

// PATCH /api/usuarios/:id/rol - Cambiar rol de usuario (Admin)
router.patch(
  '/:id/rol',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(cambiarRolEsquema, 'body'),
  usuariosController.cambiarRol
);

// PATCH /api/usuarios/:id/estado - Activar / desactivar usuario (Admin)
router.patch(
  '/:id/estado',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(cambiarEstadoEsquema, 'body'),
  usuariosController.cambiarEstado
);

export default router;
