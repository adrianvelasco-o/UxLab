import { Router } from 'express';
import * as reservasController from './reservas.controller.js';
import { autenticar } from '../../middlewares/autenticacion.js';
import { permitirRoles } from '../../middlewares/autorizacion.js';
import { validarEsquema } from '../../middlewares/validarEsquema.js';
import {
  crearReservaEsquema,
  rechazarReservaEsquema,
  crearLaboratorioEsquema,
  crearHorarioEsquema,
  consultarDisponibilidadEsquema,
  cambiarEstadoHorarioEsquema
} from './reservas.schema.js';

const router = Router();

router.use(autenticar);

// Catálogo de laboratorios y horarios disponibles (CU12 / HU13)
router.get(
  '/laboratorios',
  validarEsquema(consultarDisponibilidadEsquema, 'query'),
  reservasController.listarLaboratorios
);

// Gestión de laboratorios y franjas horarias (CU16 / HU16 - Admin/Encargado)
router.post(
  '/laboratorios',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(crearLaboratorioEsquema, 'body'),
  reservasController.crearLaboratorio
);

router.post(
  '/laboratorios/:id/horarios',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(crearHorarioEsquema, 'body'),
  reservasController.crearHorario
);

router.patch(
  '/horarios/:id/estado',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(cambiarEstadoHorarioEsquema, 'body'),
  reservasController.cambiarEstadoHorario
);

// Endpoints generales de reservas
router.post('/', validarEsquema(crearReservaEsquema, 'body'), reservasController.crear);
router.get('/', reservasController.listar);
router.get('/:id', reservasController.obtenerPorId);

// Endpoints administrativos de aprobación y rechazo
router.patch(
  '/:id/aprobar',
  permitirRoles('ADMINISTRADOR'),
  reservasController.aprobar
);

router.patch(
  '/:id/rechazar',
  permitirRoles('ADMINISTRADOR'),
  validarEsquema(rechazarReservaEsquema, 'body'),
  reservasController.rechazar
);

// Avisar al solicitante que falta documentación obligatoria
router.post(
  '/:id/notificar-faltante',
  permitirRoles('ADMINISTRADOR'),
  reservasController.notificarFaltante
);

export default router;
