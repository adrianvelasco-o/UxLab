import { Router } from 'express';
import * as pretestsController from './pretests.controller.js';
import { autenticar } from '../../middlewares/autenticacion.js';
import { permitirRoles } from '../../middlewares/autorizacion.js';
import { validarEsquema } from '../../middlewares/validarEsquema.js';
import { crearPretestEsquema, actualizarPretestEsquema, parametroIdPretestEsquema } from './pretests.schema.js';

const router = Router();

router.use(autenticar);

// Los pre-tests contienen datos personales de participantes (Roles oficiales: ESTUDIANTE, DOCENTE, ADMINISTRADOR)
const rolesPretest = permitirRoles('ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR');

router.get('/', rolesPretest, pretestsController.listar);
router.get('/:id', rolesPretest, validarEsquema(parametroIdPretestEsquema, 'params'), pretestsController.obtener);
router.post('/', rolesPretest, validarEsquema(crearPretestEsquema, 'body'), pretestsController.crear);
router.put(
  '/:id',
  rolesPretest,
  validarEsquema(parametroIdPretestEsquema, 'params'),
  validarEsquema(actualizarPretestEsquema, 'body'),
  pretestsController.actualizar
);
router.delete(
  '/:id',
  permitirRoles('DOCENTE', 'ADMINISTRADOR'),
  validarEsquema(parametroIdPretestEsquema, 'params'),
  pretestsController.eliminar
);

export default router;
