import { z } from 'zod';

export const cambiarRolEsquema = z.object({
  rolNombre: z.enum(['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'], {
    errorMap: () => ({ message: 'Rol inválido. Los roles permitidos son: ADMINISTRADOR, DOCENTE, ESTUDIANTE' })
  })
});

export const cambiarEstadoEsquema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio y debe ser booleano' })
});

export const crearUsuarioAdminEsquema = z.object({
  nombres: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  apellidos: z
    .string({ required_error: 'El apellido es obligatorio' })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim(),
  correoInstitucional: z
    .string({ required_error: 'El correo institucional es obligatorio' })
    .email('El correo institucional no tiene un formato válido')
    .max(150, 'El correo institucional no puede exceder 150 caracteres')
    .trim(),
  contrasena: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rolNombre: z.enum(['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'], {
    errorMap: () => ({ message: 'Rol inválido. Los roles permitidos son: ADMINISTRADOR, DOCENTE, ESTUDIANTE' })
  }),
  activo: z.boolean().optional().default(true)
});
