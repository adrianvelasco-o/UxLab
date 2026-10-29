import { z } from 'zod';

export const crearPracticaEsquema = z.object({
  titulo: z
    .string({ required_error: 'El título de la práctica es obligatorio' })
    .min(3, 'El título debe tener al menos 3 caracteres')
    .trim(),
  descripcion: z
    .string({ required_error: 'La descripción es obligatoria' })
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .trim(),
  objetivo: z
    .string({ required_error: 'El objetivo es obligatorio' })
    .min(5, 'El objetivo debe tener al menos 5 caracteres')
    .trim(),
  docenteId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
});

export const actualizarPracticaEsquema = z.object({
  titulo: z.string().min(3).trim().optional(),
  descripcion: z.string().min(5).trim().optional(),
  objetivo: z.string().min(5).trim().optional(),
  docenteId: z.number().int().positive().optional().nullable()
});

export const crearInstrumentoEsquema = z.object({
  tipo: z.enum([
    'GUIA_OBSERVACION',
    'CUESTIONARIO_PRE_TEST',
    'BANCO_TAREAS',
    'CUESTIONARIO_POST_TEST'
  ], {
    errorMap: () => ({ message: 'Tipo de instrumento inválido' })
  }),
  nombre: z
    .string({ required_error: 'El nombre del instrumento es obligatorio' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .trim(),
  instrucciones: z.string().optional().nullable(),
  contenido: z.any().optional().nullable()
});

export const revisionDocenteEsquema = z
  .object({
    resultado: z.enum(['APROBADA', 'RECHAZADA'], {
      errorMap: () => ({ message: 'El resultado debe ser APROBADA o RECHAZADA' })
    }),
    comentariosGenerales: z.string().optional().nullable(),
    observaciones: z
      .array(
        z.object({
          seccion: z.string().min(2, 'La sección es obligatoria'),
          detalle: z.string().min(5, 'El detalle de la observación debe tener al menos 5 caracteres')
        })
      )
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.resultado === 'RECHAZADA') {
      if (!data.observaciones || data.observaciones.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['observaciones'],
          message: 'Debe incluir al menos una observación para justificar el rechazo de la práctica'
        });
      }
    }
  });

export const finalizarPracticaEsquema = z.object({
  estado: z.enum(['FINALIZADA', 'CERRADA'], {
    errorMap: () => ({ message: 'El estado debe ser FINALIZADA o CERRADA' })
  }).optional().default('FINALIZADA'),
  observacionesFinales: z.string().optional().nullable()
});

export const resolverObservacionEsquema = z.object({
  resuelta: z.boolean().optional().default(true)
}).default({});

export const registrarParticipanteEsquema = z.object({
  codigoAnonimo: z
    .string({ required_error: 'El código anónimo es obligatorio' })
    .min(1, 'El código anónimo no puede estar vacío')
    .max(50, 'El código anónimo no puede exceder 50 caracteres')
    .trim(),
  nombres: z
    .string({ required_error: 'Los nombres son obligatorios' })
    .min(2, 'Los nombres deben tener al menos 2 caracteres')
    .max(100)
    .trim(),
  apellidos: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100)
    .trim(),
  edad: z.number().int().positive('La edad debe ser un número entero positivo').optional().nullable(),
  genero: z.string().max(30).trim().optional().nullable(),
  ocupacion: z.string().max(100).trim().optional().nullable(),
  experienciaPrevia: z.string().trim().optional().nullable(),
  consentimientoFirmado: z.boolean().optional().default(false)
});

