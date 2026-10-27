import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { eliminarArchivoDisco } from '../src/middlewares/subidaArchivos.js';
import {
  loginEsquema,
  registroEsquema
} from '../src/modules/auth/auth.schema.js';
import {
  crearPracticaEsquema,
  crearInstrumentoEsquema,
  revisionDocenteEsquema,
  finalizarPracticaEsquema,
  resolverObservacionEsquema,
  registrarParticipanteEsquema
} from '../src/modules/practicas/practicas.schema.js';
import {
  cambiarRolEsquema,
  cambiarEstadoEsquema,
  crearUsuarioAdminEsquema
} from '../src/modules/usuarios/usuarios.schema.js';
import { compararContrasena } from '../src/utils/hashContrasena.js';
import {
  crearLaboratorioEsquema,
  crearHorarioEsquema,
  consultarDisponibilidadEsquema,
  crearReservaEsquema,
  cambiarEstadoHorarioEsquema
} from '../src/modules/reservas/reservas.schema.js';
import {
  subirDocumentoEsquema,
  parametroIdPracticaEsquema,
  parametroIdDocumentoEsquema
} from '../src/modules/documentos/documentos.schema.js';
import { obtenerArchivoParaDescarga } from '../src/modules/documentos/documentos.service.js';
import { prisma } from '../src/config/prisma.js';
import { autenticar } from '../src/middlewares/autenticacion.js';
import { permitirRoles } from '../src/middlewares/autorizacion.js';
import { manejadorErrores } from '../src/middlewares/manejadorErrores.js';
import { generarTokenJwt } from '../src/utils/tokenJwt.js';
import { solicitarReserva } from '../src/modules/reservas/reservas.service.js';
import { AppError } from '../src/errors/AppError.js';
import { CODIGOS_ERROR } from '../src/constants/codigosError.js';



describe('API Ux', () => {
  test('GET /api/salud debe retornar 200 OK y estado del servidor', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('exito', true);
    expect(res.body.datos).toHaveProperty('estado', 'OK');
  });

  test('GET /api/ruta-inexistente debe retornar error 404', async () => {
    const res = await request(app).get('/api/ruta-inexistente');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('exito', false);
  });

  describe('Protección Anti Fuerza Bruta - Rate Limiting (SEC-02)', () => {
    test('POST /api/autenticacion/iniciar-sesion debe incluir cabeceras de rate limiting', async () => {
      const res = await request(app)
        .post('/api/autenticacion/iniciar-sesion')
        .send({ correoInstitucional: 'test@unicolmayor.edu.co', contrasena: '123456' });

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });

    test('POST /api/autenticacion/login alias debe estar protegido con cabeceras de rate limiting', async () => {
      const res = await request(app)
        .post('/api/autenticacion/login')
        .send({ correoInstitucional: 'test@unicolmayor.edu.co', contrasena: '123456' });

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('Configuración de Seguridad CORS (SEC-04)', () => {
    test('Petición con origen permitido debe reflejar el origen y admitir credenciales', async () => {
      const res = await request(app)
        .get('/api/salud')
        .set('Origin', 'http://localhost:3000');

      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test('Petición con origen no autorizado no debe emitir cabecera access-control-allow-origin', async () => {
      const res = await request(app)
        .get('/api/salud')
        .set('Origin', 'https://sitio-malicioso.com');

      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('Petición preflight OPTIONS con origen autorizado debe responder exitosamente', async () => {
      const res = await request(app)
        .options('/api/salud')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Esquemas de Validación Zod - Autenticación y Registro (SEC-01)', () => {
    test('registroEsquema debe validar correctamente los datos válidos de registro', () => {
      const datosRegistro = {
        nombres: 'Laura',
        apellidos: 'Mendoza',
        correoInstitucional: 'lmendoza@unicolmayor.edu.co',
        contrasena: 'claveSegura123'
      };
      const res = registroEsquema.safeParse(datosRegistro);
      expect(res.success).toBe(true);
      expect(res.data).not.toHaveProperty('rolNombre');
    });

    test('registroEsquema debe descartar rolNombre si un cliente intenta inyectarlo (SEC-01)', () => {
      const intentoAtaque = {
        nombres: 'Atacante',
        apellidos: 'Privilegiado',
        correoInstitucional: 'hacker@unicolmayor.edu.co',
        contrasena: 'clave12345',
        rolNombre: 'ADMINISTRADOR'
      };
      const res = registroEsquema.safeParse(intentoAtaque);
      expect(res.success).toBe(true);
      expect(res.data.rolNombre).toBeUndefined();
    });

    test('registroEsquema debe rechazar contraseñas cortas o correo inválido', () => {
      const datosInvalidos = {
        nombres: 'A',
        apellidos: 'B',
        correoInstitucional: 'no-es-correo',
        contrasena: '123'
      };
      const res = registroEsquema.safeParse(datosInvalidos);
      expect(res.success).toBe(false);
    });

    test('loginEsquema debe validar credenciales con correo válido y contraseña', () => {
      const loginValido = {
        correoInstitucional: 'admin@unicolmayor.edu.co',
        contrasena: 'Ux2026*'
      };
      expect(loginEsquema.safeParse(loginValido).success).toBe(true);

      const loginInvalido = {
        correoInstitucional: 'invalido',
        contrasena: ''
      };
      expect(loginEsquema.safeParse(loginInvalido).success).toBe(false);
    });
  });

  describe('Esquemas de Validación Zod - Prácticas e Instrumentos', () => {
    test('crearPracticaEsquema debe validar correctamente', () => {
      const datosValidos = {
        titulo: 'Práctica de Usabilidad App Móvil',
        descripcion: 'Evaluación de interfaz con usuarios finales',
        objetivo: 'Medir tiempo de tarea y tasa de errores'
      };
      const resultado = crearPracticaEsquema.safeParse(datosValidos);
      expect(resultado.success).toBe(true);
    });

    test('crearPracticaEsquema debe fallar si faltan campos obligatorios', () => {
      const datosInvalidos = { titulo: 'AB' };
      const resultado = crearPracticaEsquema.safeParse(datosInvalidos);
      expect(resultado.success).toBe(false);
    });

    test('crearInstrumentoEsquema debe validar tipos válidos', () => {
      const instrumentoValido = {
        tipo: 'GUIA_OBSERVACION',
        nombre: 'Guía de observación heurística',
        instrucciones: 'Marcar fallos visuales'
      };
      const resultado = crearInstrumentoEsquema.safeParse(instrumentoValido);
      expect(resultado.success).toBe(true);
    });

    test('crearInstrumentoEsquema debe rechazar tipo inválido', () => {
      const instrumentoInvalido = {
        tipo: 'TIPO_INVENTADO',
        nombre: 'Guía'
      };
      const resultado = crearInstrumentoEsquema.safeParse(instrumentoInvalido);
      expect(resultado.success).toBe(false);
    });

    test('revisionDocenteEsquema debe validar resultado APROBADA o RECHAZADA', () => {
      const revisionValida = {
        resultado: 'APROBADA',
        comentariosGenerales: 'Práctica bien planteada',
        observaciones: [
          { seccion: 'Objetivos', detalle: 'Aclarar métricas de éxito' }
        ]
      };
      const resultado = revisionDocenteEsquema.safeParse(revisionValida);
      expect(resultado.success).toBe(true);
    });

    test('finalizarPracticaEsquema debe validar estados FINALIZADA y CERRADA', () => {
      const resultadoFinalizada = finalizarPracticaEsquema.safeParse({ estado: 'FINALIZADA' });
      expect(resultadoFinalizada.success).toBe(true);

      const resultadoCerrada = finalizarPracticaEsquema.safeParse({ estado: 'CERRADA' });
      expect(resultadoCerrada.success).toBe(true);

      const resultadoInvalido = finalizarPracticaEsquema.safeParse({ estado: 'INVALIDO' });
      expect(resultadoInvalido.success).toBe(false);
    });

    test('resolverObservacionEsquema debe validar booleano o valor por defecto', () => {
      const resPorDefecto = resolverObservacionEsquema.safeParse({});
      expect(resPorDefecto.success).toBe(true);
      expect(resPorDefecto.data.resuelta).toBe(true);

      const resExplicito = resolverObservacionEsquema.safeParse({ resuelta: false });
      expect(resExplicito.success).toBe(true);
      expect(resExplicito.data.resuelta).toBe(false);

      const resInvalido = resolverObservacionEsquema.safeParse({ resuelta: 'si' });
      expect(resInvalido.success).toBe(false);
    });

    test('registrarParticipanteEsquema debe validar participante correcto', () => {
      const participanteValido = {
        codigoAnonimo: 'P01',
        nombres: 'Carlos',
        apellidos: 'Gómez',
        edad: 24,
        genero: 'M',
        ocupacion: 'Estudiante',
        consentimientoFirmado: true
      };
      const res = registrarParticipanteEsquema.safeParse(participanteValido);
      expect(res.success).toBe(true);
      expect(res.data.consentimientoFirmado).toBe(true);
    });

    test('registrarParticipanteEsquema debe fallar si falta codigoAnonimo o nombres', () => {
      const participanteInvalido = {
        apellidos: 'Gómez'
      };
      const res = registrarParticipanteEsquema.safeParse(participanteInvalido);
      expect(res.success).toBe(false);
    });
  });

  describe('Esquemas de Validación Zod - Administración de Usuarios', () => {
    test('cambiarRolEsquema debe aceptar los 3 roles oficiales y rechazar ENCARGADO u otros roles', () => {
      expect(cambiarRolEsquema.safeParse({ rolNombre: 'ADMINISTRADOR' }).success).toBe(true);
      expect(cambiarRolEsquema.safeParse({ rolNombre: 'DOCENTE' }).success).toBe(true);
      expect(cambiarRolEsquema.safeParse({ rolNombre: 'ESTUDIANTE' }).success).toBe(true);
      expect(cambiarRolEsquema.safeParse({ rolNombre: 'ENCARGADO' }).success).toBe(false);
      expect(cambiarRolEsquema.safeParse({ rolNombre: 'ROL_INEXISTENTE' }).success).toBe(false);
    });

    test('cambiarEstadoEsquema debe requerir booleano', () => {
      expect(cambiarEstadoEsquema.safeParse({ activo: false }).success).toBe(true);
      expect(cambiarEstadoEsquema.safeParse({ activo: 'true' }).success).toBe(false);
    });

    test('crearUsuarioAdminEsquema debe validar usuario con datos completos y rol válido', () => {
      const usuarioValido = {
        nombres: 'María',
        apellidos: 'Gómez',
        correoInstitucional: 'mgomez@unicolmayor.edu.co',
        contrasena: 'claveSegura123',
        rolNombre: 'DOCENTE',
        activo: true
      };
      const res = crearUsuarioAdminEsquema.safeParse(usuarioValido);
      expect(res.success).toBe(true);
      expect(res.data.rolNombre).toBe('DOCENTE');
      expect(res.data.activo).toBe(true);
    });

    test('crearUsuarioAdminEsquema debe rechazar contraseñas menores a 8 caracteres o correos no válidos', () => {
      const usuarioInvalido = {
        nombres: 'A',
        apellidos: 'B',
        correoInstitucional: 'invalido',
        contrasena: '123',
        rolNombre: 'ESTUDIANTE'
      };
      const res = crearUsuarioAdminEsquema.safeParse(usuarioInvalido);
      expect(res.success).toBe(false);
      expect(res.error.errors.some((e) => e.path.includes('contrasena'))).toBe(true);
      expect(res.error.errors.some((e) => e.path.includes('correoInstitucional'))).toBe(true);
    });

    test('crearUsuarioAdminEsquema debe rechazar rol ENCARGADO y otros no permitidos', () => {
      const rolEncargado = {
        nombres: 'Juan',
        apellidos: 'Pérez',
        correoInstitucional: 'jperez@unicolmayor.edu.co',
        contrasena: 'claveSegura123',
        rolNombre: 'ENCARGADO'
      };
      expect(crearUsuarioAdminEsquema.safeParse(rolEncargado).success).toBe(false);

      const rolInvalido = {
        nombres: 'Juan',
        apellidos: 'Pérez',
        correoInstitucional: 'jperez@unicolmayor.edu.co',
        contrasena: 'claveSegura123',
        rolNombre: 'SUPER_USUARIO'
      };
      expect(crearUsuarioAdminEsquema.safeParse(rolInvalido).success).toBe(false);
    });
  });

  describe('Esquemas de Validación Zod - Laboratorios y Horarios', () => {
    test('crearLaboratorioEsquema debe validar correctamente', () => {
      const labValido = {
        nombre: 'Ux Principal',
        ubicacion: 'Edificio B - Piso 2',
        capacidad: 10
      };
      expect(crearLaboratorioEsquema.safeParse(labValido).success).toBe(true);
    });

    test('crearHorarioEsquema debe validar día y formato de hora HH:MM', () => {
      const horarioValido = {
        diaSemana: 'LUNES',
        horaInicio: '08:00',
        horaFin: '12:00'
      };
      expect(crearHorarioEsquema.safeParse(horarioValido).success).toBe(true);

      const horarioInvalido = {
        diaSemana: 'DOMINGO', // No está en enum DiaSemana
        horaInicio: '8am',
        horaFin: '12pm'
      };
      expect(crearHorarioEsquema.safeParse(horarioInvalido).success).toBe(false);
    });

    test('consultarDisponibilidadEsquema debe validar fecha opcional en formato AAAA-MM-DD', () => {
      expect(consultarDisponibilidadEsquema.safeParse({}).success).toBe(true);
      expect(consultarDisponibilidadEsquema.safeParse({ fecha: '2026-10-15' }).success).toBe(true);
      expect(consultarDisponibilidadEsquema.safeParse({ fecha: '15-10-2026' }).success).toBe(false);
      expect(consultarDisponibilidadEsquema.safeParse({ fecha: 'invalida' }).success).toBe(false);
    });

    test('crearReservaEsquema debe validar campos obligatorios y formato de fecha', () => {
      const reservaValida = {
        practicaId: 1,
        laboratorioId: 1,
        horarioId: 1,
        fechaReserva: '2026-10-15'
      };
      expect(crearReservaEsquema.safeParse(reservaValida).success).toBe(true);

      const reservaSinFecha = { practicaId: 1 };
      expect(crearReservaEsquema.safeParse(reservaSinFecha).success).toBe(false);

      const reservaFechaInvalida = { practicaId: 1, fechaReserva: 'ayer' };
      expect(crearReservaEsquema.safeParse(reservaFechaInvalida).success).toBe(false);
    });

    test('cambiarEstadoHorarioEsquema debe requerir booleano en activo', () => {
      expect(cambiarEstadoHorarioEsquema.safeParse({ activo: false }).success).toBe(true);
      expect(cambiarEstadoHorarioEsquema.safeParse({ activo: true }).success).toBe(true);
      expect(cambiarEstadoHorarioEsquema.safeParse({ activo: 'false' }).success).toBe(false);
      expect(cambiarEstadoHorarioEsquema.safeParse({}).success).toBe(false);
    });
  });

  describe('Limpieza de Archivos Huérfanos en Subidas (SEC-05)', () => {
    test('eliminarArchivoDisco debe borrar de forma segura un archivo existente', () => {
      const rutaPrueba = path.resolve('./uploads/temp-test-file.txt');
      fs.writeFileSync(rutaPrueba, 'dummy content');
      expect(fs.existsSync(rutaPrueba)).toBe(true);

      eliminarArchivoDisco(rutaPrueba);
      expect(fs.existsSync(rutaPrueba)).toBe(false);
    });

    test('eliminarArchivoDisco debe manejar rutas inexistentes o nulas sin lanzar excepciones', () => {
      expect(() => eliminarArchivoDisco(null)).not.toThrow();
      expect(() => eliminarArchivoDisco('./uploads/archivo-inexistente-12345.pdf')).not.toThrow();
    });
  });

  describe('Content Security Policy - Helmet (SEC-06)', () => {
    test('Las respuestas HTTP deben incluir cabecera Content-Security-Policy con directivas seguras', async () => {
      const res = await request(app).get('/api/autenticacion/iniciar-sesion');
      expect(res.headers).toHaveProperty('content-security-policy');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });
  });

  describe('Esquemas de Validación Zod - Documentos (SEC-07)', () => {
    test('subirDocumentoEsquema debe validar correctamente con datos válidos', () => {
      const datosValidos = { practicaId: 1, tipo: 'CONSENTIMIENTO_INFORMADO' };
      const resultado = subirDocumentoEsquema.safeParse(datosValidos);
      expect(resultado.success).toBe(true);
      expect(resultado.data.practicaId).toBe(1);
      expect(resultado.data.tipo).toBe('CONSENTIMIENTO_INFORMADO');
    });

    test('subirDocumentoEsquema debe coercionar practicaId enviado como string numérico y usar tipo por defecto', () => {
      const datosString = { practicaId: '12' };
      const resultado = subirDocumentoEsquema.safeParse(datosString);
      expect(resultado.success).toBe(true);
      expect(resultado.data.practicaId).toBe(12);
      expect(resultado.data.tipo).toBe('CONSENTIMIENTO_INFORMADO');
    });

    test('subirDocumentoEsquema debe rechazar tipos de documento no permitidos por Prisma', () => {
      const datosTipoInvalido = { practicaId: 1, tipo: 'DOCUMENTO_MALICIOSO' };
      const resultado = subirDocumentoEsquema.safeParse(datosTipoInvalido);
      expect(resultado.success).toBe(false);
      expect(resultado.error.errors[0].message).toContain('tipo de documento');
    });

    test('subirDocumentoEsquema debe rechazar practicaId faltante, negativo o no numérico', () => {
      expect(subirDocumentoEsquema.safeParse({}).success).toBe(false);
      expect(subirDocumentoEsquema.safeParse({ practicaId: -5 }).success).toBe(false);
      expect(subirDocumentoEsquema.safeParse({ practicaId: 'invalido' }).success).toBe(false);
    });

    test('parametroIdPracticaEsquema debe validar ids numéricos enteros positivos', () => {
      expect(parametroIdPracticaEsquema.safeParse({ id: '5' }).success).toBe(true);
      expect(parametroIdPracticaEsquema.safeParse({ id: 5 }).success).toBe(true);
      expect(parametroIdPracticaEsquema.safeParse({ id: 'abc' }).success).toBe(false);
      expect(parametroIdPracticaEsquema.safeParse({ id: -1 }).success).toBe(false);
    });

    test('parametroIdDocumentoEsquema debe validar identificador de documento', () => {
      expect(parametroIdDocumentoEsquema.safeParse({ id: '10' }).success).toBe(true);
      expect(parametroIdDocumentoEsquema.safeParse({ id: 10 }).success).toBe(true);
      expect(parametroIdDocumentoEsquema.safeParse({ id: '0' }).success).toBe(false);
      expect(parametroIdDocumentoEsquema.safeParse({ id: -10 }).success).toBe(false);
      expect(parametroIdDocumentoEsquema.safeParse({}).success).toBe(false);
    });
  });

  describe('Descarga Segura de Documentos (FUNC-01)', () => {
    test('GET /api/documentos/:id/descargar debe requerir autenticación (401)', async () => {
      const res = await request(app).get('/api/documentos/1/descargar');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('exito', false);
    });

    test('obtenerArchivoParaDescarga debe rechazar con 404 si el documento no existe', async () => {
      jest.spyOn(prisma.documento, 'findUnique').mockResolvedValue(null);

      await expect(
        obtenerArchivoParaDescarga(999, { id: 1, rolNombre: 'ADMINISTRADOR' })
      ).rejects.toMatchObject({
        codigoHttp: 404
      });
    });

    test('obtenerArchivoParaDescarga debe denegar acceso (403) si el usuario no es dueño ni docente/admin', async () => {
      jest.spyOn(prisma.documento, 'findUnique').mockResolvedValue({
        id: 1,
        subidoPorUsuarioId: 5,
        practicaId: 10,
        ruta: './uploads/doc.pdf',
        practica: { id: 10, estudianteId: 5, docenteId: 2 }
      });

      await expect(
        obtenerArchivoParaDescarga(1, { id: 99, rolNombre: 'ESTUDIANTE' })
      ).rejects.toMatchObject({
        codigoHttp: 403
      });
    });

    test('obtenerArchivoParaDescarga debe prevenir Directory Traversal fuera de uploads (403)', async () => {
      jest.spyOn(prisma.documento, 'findUnique').mockResolvedValue({
        id: 2,
        subidoPorUsuarioId: 1,
        practicaId: 10,
        ruta: '../../etc/passwd',
        practica: { id: 10, estudianteId: 1 }
      });

      await expect(
        obtenerArchivoParaDescarga(2, { id: 1, rolNombre: 'ADMINISTRADOR' })
      ).rejects.toMatchObject({
        codigoHttp: 403
      });
    });

    test('obtenerArchivoParaDescarga debe retornar archivo y metadatos si el archivo existe y el usuario es autorizado', async () => {
      const rutaPrueba = path.resolve('./uploads/temp-descarga.pdf');
      fs.writeFileSync(rutaPrueba, '%PDF-1.4 dummy content');

      jest.spyOn(prisma.documento, 'findUnique').mockResolvedValue({
        id: 3,
        subidoPorUsuarioId: 1,
        practicaId: 10,
        nombreOriginal: 'consentimiento.pdf',
        ruta: './uploads/temp-descarga.pdf',
        tipoMime: 'application/pdf',
        practica: { id: 10, estudianteId: 1 }
      });

      const resultado = await obtenerArchivoParaDescarga(3, { id: 1, rolNombre: 'ESTUDIANTE' });
      expect(resultado).toHaveProperty('rutaAbsoluta');
      expect(resultado.nombreOriginal).toBe('consentimiento.pdf');
      expect(resultado.tipoMime).toBe('application/pdf');

      eliminarArchivoDisco(rutaPrueba);
    });
  });

  describe('Pruebas de Integración Complementarias - Seguridad y Control de Acceso (TEST-01)', () => {
    describe('Middleware de Autenticación (JWT)', () => {
      test('debe rechazar petición sin cabecera Authorization con 401', async () => {
        const req = { headers: {} };
        const next = jest.fn();
        await autenticar(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 401, codigoError: CODIGOS_ERROR.TOKEN_NO_PROPORCIONADO })
        );
      });

      test('debe rechazar formato no Bearer con 401', async () => {
        const req = { headers: { authorization: 'Basic token123' } };
        const next = jest.fn();
        await autenticar(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 401, codigoError: CODIGOS_ERROR.TOKEN_NO_PROPORCIONADO })
        );
      });

      test('debe rechazar token manipulado o con firma inválida con 401', async () => {
        const req = { headers: { authorization: 'Bearer token.invalido.falso' } };
        const next = jest.fn();
        await autenticar(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 401, codigoError: CODIGOS_ERROR.TOKEN_INVALIDO })
        );
      });

      test('debe rechazar con 403 si la cuenta del usuario está inactiva', async () => {
        const tokenValido = generarTokenJwt({ usuarioId: 99 });
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 99,
          nombres: 'Usuario',
          apellidos: 'Inactivo',
          correoInstitucional: 'inactivo@Ux.edu',
          activo: false,
          rolId: 1,
          rol: { nombre: 'ESTUDIANTE' }
        });

        const req = { headers: { authorization: `Bearer ${tokenValido}` } };
        const next = jest.fn();
        await autenticar(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 403, codigoError: CODIGOS_ERROR.USUARIO_INACTIVO })
        );
      });

      test('debe autenticar satisfactoriamente con token válido y usuario activo', async () => {
        const tokenValido = generarTokenJwt({ usuarioId: 10 });
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 10,
          nombres: 'Estudiante',
          apellidos: 'Activo',
          correoInstitucional: 'activo@Ux.edu',
          activo: true,
          rolId: 1,
          rol: { nombre: 'ESTUDIANTE' }
        });

        const req = { headers: { authorization: `Bearer ${tokenValido}` } };
        const next = jest.fn();
        await autenticar(req, {}, next);
        expect(req.usuario).toBeDefined();
        expect(req.usuario.id).toBe(10);
        expect(req.usuario.rolNombre).toBe('ESTUDIANTE');
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('Middleware de Autorización RBAC (permitirRoles)', () => {
      test('debe denegar acceso (403) si el rol no está en la lista de permitidos', () => {
        const middleware = permitirRoles('ADMINISTRADOR', 'DOCENTE');
        const req = { usuario: { id: 1, rolNombre: 'ESTUDIANTE' } };
        const next = jest.fn();

        middleware(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 403, codigoError: CODIGOS_ERROR.ACCESO_DENEGADO })
        );
      });

      test('debe conceder acceso (next sin error) si el rol está autorizado', () => {
        const middleware = permitirRoles('ADMINISTRADOR', 'DOCENTE');
        const req = { usuario: { id: 2, rolNombre: 'ADMINISTRADOR' } };
        const next = jest.fn();

        middleware(req, {}, next);
        expect(next).toHaveBeenCalledWith();
      });

      test('debe rechazar con 401 si no hay usuario en la petición', () => {
        const middleware = permitirRoles('ADMINISTRADOR');
        const req = {};
        const next = jest.fn();

        middleware(req, {}, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ codigoHttp: 401, codigoError: CODIGOS_ERROR.TOKEN_NO_PROPORCIONADO })
        );
      });
    });

    describe('Manejo Centralizado de Errores', () => {
      test('debe formatear errores operacionales AppError con su código HTTP y estructura estándar', () => {
        const error = new AppError('Dato no válido', 422, CODIGOS_ERROR.DATOS_INVALIDOS, [{ campo: 'correo' }]);
        const res = {
          statusCode: 200,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json: jest.fn()
        };

        manejadorErrores(error, {}, res, jest.fn());
        expect(res.statusCode).toBe(422);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            exito: false,
            mensaje: 'Dato no válido',
            error: expect.objectContaining({
              codigo: CODIGOS_ERROR.DATOS_INVALIDOS
            })
          })
        );
      });
    });

    describe('Reglas de Negocio en Reservas', () => {
      test('solicitarReserva debe rechazar si la práctica no está en estado APROBADA (RN07)', async () => {
        jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
          id: 5,
          titulo: 'Práctica Borrador',
          estudianteId: 1,
          estado: 'BORRADOR'
        });

        await expect(
          solicitarReserva({
            practicaId: 5,
            laboratorioId: 1,
            horarioId: 1,
            fechaReserva: '2026-10-05',
            usuario: { id: 1, rolNombre: 'ESTUDIANTE' }
          })
        ).rejects.toMatchObject({
          codigoHttp: 400,
          codigoError: CODIGOS_ERROR.TRANSICION_ESTADO_INVALIDA
        });
      });

      test('solicitarReserva debe denegar acceso (403) si el estudiante no es dueño de la práctica', async () => {
        jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
          id: 6,
          titulo: 'Práctica de Otro',
          estudianteId: 2,
          estado: 'APROBADA'
        });

        await expect(
          solicitarReserva({
            practicaId: 6,
            laboratorioId: 1,
            horarioId: 1,
            fechaReserva: '2026-10-05',
            usuario: { id: 3, rolNombre: 'ESTUDIANTE' }
          })
        ).rejects.toMatchObject({
          codigoHttp: 403,
          codigoError: CODIGOS_ERROR.ACCESO_DENEGADO
        });
      });
    });

    describe('Gestión de Usuarios - Creación Administrativa (POST /api/usuarios - PB2/SB3)', () => {
      const usuarioAdminToken = generarTokenJwt({ usuarioId: 1 });
      const usuarioEstudianteToken = generarTokenJwt({ usuarioId: 2 });

      test('POST /api/usuarios debe requerir autenticación (401 si no hay token)', async () => {
        const res = await request(app)
          .post('/api/usuarios')
          .send({
            nombres: 'Test',
            apellidos: 'Usuario',
            correoInstitucional: 'test@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'DOCENTE'
          });

        expect(res.statusCode).toBe(401);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar con 403 si el rol es ESTUDIANTE', async () => {
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 2,
          nombres: 'Estudiante',
          apellidos: 'Prueba',
          correoInstitucional: 'estudiante@unicolmayor.edu.co',
          activo: true,
          rolId: 3,
          rol: { nombre: 'ESTUDIANTE' }
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioEstudianteToken}`)
          .send({
            nombres: 'Nuevo',
            apellidos: 'Docente',
            correoInstitucional: 'ndocente@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'DOCENTE'
          });

        expect(res.statusCode).toBe(403);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar con 403 si el rol es DOCENTE', async () => {
        const usuarioDocenteToken = generarTokenJwt({ usuarioId: 3 });
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 3,
          nombres: 'Docente',
          apellidos: 'Prueba',
          correoInstitucional: 'docente@unicolmayor.edu.co',
          activo: true,
          rolId: 2,
          rol: { nombre: 'DOCENTE' }
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioDocenteToken}`)
          .send({
            nombres: 'Nuevo',
            apellidos: 'Usuario',
            correoInstitucional: 'nusuario@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'ESTUDIANTE'
          });

        expect(res.statusCode).toBe(403);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar rol ENCARGADO con 400 (rol inexistente en GesLab)', async () => {
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 1,
          nombres: 'Admin',
          apellidos: 'Sistema',
          correoInstitucional: 'admin@unicolmayor.edu.co',
          activo: true,
          rolId: 1,
          rol: { nombre: 'ADMINISTRADOR' }
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioAdminToken}`)
          .send({
            nombres: 'Carlos',
            apellidos: 'Encargado',
            correoInstitucional: 'carlosenc@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'ENCARGADO'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar datos inválidos con 400 (Zod)', async () => {
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 1,
          nombres: 'Admin',
          apellidos: 'Sistema',
          correoInstitucional: 'admin@unicolmayor.edu.co',
          activo: true,
          rolId: 1,
          rol: { nombre: 'ADMINISTRADOR' }
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioAdminToken}`)
          .send({
            nombres: '',
            apellidos: '',
            correoInstitucional: 'correo-no-valido',
            contrasena: '123'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar rol no permitido con 400', async () => {
        jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
          id: 1,
          nombres: 'Admin',
          apellidos: 'Sistema',
          correoInstitucional: 'admin@unicolmayor.edu.co',
          activo: true,
          rolId: 1,
          rol: { nombre: 'ADMINISTRADOR' }
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioAdminToken}`)
          .send({
            nombres: 'Docente',
            apellidos: 'Invalido',
            correoInstitucional: 'docenteinv@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'ROL_INEXISTENTE'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.exito).toBe(false);
      });

      test('POST /api/usuarios debe rechazar correo duplicado con 409', async () => {
        jest.spyOn(prisma.usuario, 'findUnique').mockImplementation(({ where }) => {
          if (where.id === 1) {
            return Promise.resolve({
              id: 1,
              nombres: 'Admin',
              apellidos: 'Sistema',
              correoInstitucional: 'admin@unicolmayor.edu.co',
              activo: true,
              rolId: 1,
              rol: { nombre: 'ADMINISTRADOR' }
            });
          }
          if (where.correoInstitucional === 'duplicado@unicolmayor.edu.co') {
            return Promise.resolve({
              id: 99,
              correoInstitucional: 'duplicado@unicolmayor.edu.co'
            });
          }
          return Promise.resolve(null);
        });

        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioAdminToken}`)
          .send({
            nombres: 'Usuario',
            apellidos: 'Repetido',
            correoInstitucional: 'duplicado@unicolmayor.edu.co',
            contrasena: 'claveSegura123',
            rolNombre: 'DOCENTE'
          });

        expect(res.statusCode).toBe(409);
        expect(res.body.exito).toBe(false);
        expect(res.body.mensaje).toContain('ya se encuentra registrado');
      });

      test('POST /api/usuarios debe crear usuario exitosamente (201), hasheando la contraseña y sin exponer hash ni contrasena en respuesta', async () => {
        let datosEnviadosAPrisma = null;

        jest.spyOn(prisma.usuario, 'findUnique').mockImplementation(({ where }) => {
          if (where.id === 1) {
            return Promise.resolve({
              id: 1,
              nombres: 'Admin',
              apellidos: 'Sistema',
              correoInstitucional: 'admin@unicolmayor.edu.co',
              activo: true,
              rolId: 1,
              rol: { nombre: 'ADMINISTRADOR' }
            });
          }
          // Para verificación de correo duplicado
          return Promise.resolve(null);
        });

        jest.spyOn(prisma.rol, 'findUnique').mockResolvedValue({
          id: 2,
          nombre: 'DOCENTE',
          descripcion: 'Docente tutor'
        });

        jest.spyOn(prisma.usuario, 'create').mockImplementation(({ data }) => {
          datosEnviadosAPrisma = data;
          return Promise.resolve({
            id: 25,
            nombres: data.nombres,
            apellidos: data.apellidos,
            correoInstitucional: data.correoInstitucional,
            activo: data.activo,
            creadoEn: new Date('2026-10-24T12:00:00Z'),
            actualizadoEn: new Date('2026-10-24T12:00:00Z'),
            rol: {
              id: 2,
              nombre: 'DOCENTE',
              descripcion: 'Docente tutor'
            }
          });
        });

        const contrasenaPlana = 'ContrasenaSegura2026*';
        const res = await request(app)
          .post('/api/usuarios')
          .set('Authorization', `Bearer ${usuarioAdminToken}`)
          .send({
            nombres: 'Adriana',
            apellidos: 'Morales',
            correoInstitucional: 'amorales@unicolmayor.edu.co',
            contrasena: contrasenaPlana,
            rolNombre: 'DOCENTE',
            activo: true
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.exito).toBe(true);

        // Verificación de almacenamiento seguro mediante hash bcrypt
        expect(datosEnviadosAPrisma).toBeDefined();
        expect(datosEnviadosAPrisma.contrasenaHash).toBeDefined();
        expect(datosEnviadosAPrisma.contrasenaHash).not.toBe(contrasenaPlana);
        const hashValido = await compararContrasena(contrasenaPlana, datosEnviadosAPrisma.contrasenaHash);
        expect(hashValido).toBe(true);

        // Verificación de no exposición de credenciales
        expect(res.body.datos).not.toHaveProperty('contrasena');
        expect(res.body.datos).not.toHaveProperty('contrasenaHash');
        expect(res.body.datos.id).toBe(25);
        expect(res.body.datos.correoInstitucional).toBe('amorales@unicolmayor.edu.co');
        expect(res.body.datos.rol.nombre).toBe('DOCENTE');
      });
    });

    describe('Formulación de Prácticas, Instrumentos y Carga de Documentos PDF (PB3 / SB4)', () => {
      const estudianteId = 20;
      const estudianteToken = generarTokenJwt({ usuarioId: estudianteId });
      const otroEstudianteId = 21;
      const otroEstudianteToken = generarTokenJwt({ usuarioId: otroEstudianteId });
      const docenteId = 30;
      const docenteToken = generarTokenJwt({ usuarioId: docenteId });

      beforeEach(() => {
        jest.spyOn(prisma.usuario, 'findUnique').mockImplementation(({ where }) => {
          if (where.id === estudianteId) {
            return Promise.resolve({
              id: estudianteId,
              nombres: 'Carlos',
              apellidos: 'Estudiante',
              correoInstitucional: 'cestudiante@unicolmayor.edu.co',
              activo: true,
              rolId: 3,
              rol: { nombre: 'ESTUDIANTE' }
            });
          }
          if (where.id === otroEstudianteId) {
            return Promise.resolve({
              id: otroEstudianteId,
              nombres: 'Ana',
              apellidos: 'OtraEstudiante',
              correoInstitucional: 'aestudiante@unicolmayor.edu.co',
              activo: true,
              rolId: 3,
              rol: { nombre: 'ESTUDIANTE' }
            });
          }
          if (where.id === docenteId) {
            return Promise.resolve({
              id: docenteId,
              nombres: 'Profesor',
              apellidos: 'Tutor',
              correoInstitucional: 'ptutor@unicolmayor.edu.co',
              activo: true,
              rolId: 2,
              rol: { nombre: 'DOCENTE' }
            });
          }
          return Promise.resolve(null);
        });
      });

      // -----------------------------------------------------------------
      // PRÁCTICAS: POST /api/practicas
      // -----------------------------------------------------------------
      describe('Creación de Prácticas (POST /api/practicas)', () => {
        test('POST /api/practicas debe requerir autenticación (401 sin token)', async () => {
          const res = await request(app)
            .post('/api/practicas')
            .send({
              titulo: 'Práctica de usabilidad',
              descripcion: 'Descripción general',
              objetivo: 'Medir la tasa de error'
            });

          expect(res.statusCode).toBe(401);
          expect(res.body.exito).toBe(false);
        });

        test('POST /api/practicas debe permitir al estudiante crear práctica en estado BORRADOR asignándose como propietario', async () => {
          jest.spyOn(prisma.practica, 'create').mockImplementation(({ data }) => {
            return Promise.resolve({
              id: 10,
              titulo: data.titulo,
              descripcion: data.descripcion,
              objetivo: data.objetivo,
              estudianteId: data.estudianteId,
              docenteId: data.docenteId,
              estado: data.estado,
              creadoEn: new Date(),
              estudiante: {
                id: data.estudianteId,
                nombres: 'Carlos',
                apellidos: 'Estudiante',
                correoInstitucional: 'cestudiante@unicolmayor.edu.co'
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              titulo: 'Prueba de Usabilidad Portal Web',
              descripcion: 'Evaluación heurística y pruebas con usuarios finales',
              objetivo: 'Identificar fricciones en el flujo de matrícula'
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.id).toBe(10);
          expect(res.body.datos.estado).toBe('BORRADOR');
          expect(res.body.datos.estudianteId).toBe(estudianteId);
        });

        test('POST /api/practicas debe permitir asignar docente tutor si este existe, está activo y tiene rol DOCENTE', async () => {
          jest.spyOn(prisma.usuario, 'findFirst').mockResolvedValue({
            id: docenteId
          });

          jest.spyOn(prisma.practica, 'create').mockImplementation(({ data }) => {
            return Promise.resolve({
              id: 11,
              titulo: data.titulo,
              descripcion: data.descripcion,
              objetivo: data.objetivo,
              estudianteId: data.estudianteId,
              docenteId: data.docenteId,
              estado: 'BORRADOR',
              estudiante: {
                id: data.estudianteId,
                nombres: 'Carlos',
                apellidos: 'Estudiante',
                correoInstitucional: 'cestudiante@unicolmayor.edu.co'
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              titulo: 'Prueba con Tutor Asignado',
              descripcion: 'Descripción metodológica de la prueba',
              objetivo: 'Evaluar tiempos de respuesta del sistema',
              docenteId: docenteId
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.datos.docenteId).toBe(docenteId);
        });

        test('POST /api/practicas debe rechazar con 400 si el docenteId asignado no existe o no tiene rol DOCENTE', async () => {
          jest.spyOn(prisma.usuario, 'findFirst').mockResolvedValue(null);

          const res = await request(app)
            .post('/api/practicas')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              titulo: 'Prueba con Docente Inválido',
              descripcion: 'Descripción metodológica',
              objetivo: 'Evaluar usabilidad',
              docenteId: 9999
            });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('docente tutor indicado no existe');
        });
      });

      // -----------------------------------------------------------------
      // INSTRUMENTOS: POST /api/practicas/:id/instrumentos
      // -----------------------------------------------------------------
      describe('Registro de Instrumentos de Evaluación (POST /api/practicas/:id/instrumentos)', () => {
        test('POST /api/practicas/:id/instrumentos debe permitir al estudiante propietario registrar un instrumento estructurado', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'BORRADOR'
          });

          jest.spyOn(prisma.instrumento, 'create').mockImplementation(({ data }) => {
            return Promise.resolve({
              id: 1,
              practicaId: data.practicaId,
              tipo: data.tipo,
              nombre: data.nombre,
              instrucciones: data.instrucciones,
              contenido: data.contenido
            });
          });

          const res = await request(app)
            .post('/api/practicas/101/instrumentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              tipo: 'GUIA_OBSERVACION',
              nombre: 'Guía de Observación - Flujo de Compra',
              instrucciones: 'Anotar comportamientos del usuario al pagar',
              contenido: { metricas: ['tiempo_total', 'errores'] }
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.practicaId).toBe(101);
          expect(res.body.datos.tipo).toBe('GUIA_OBSERVACION');
        });

        test('POST /api/practicas/:id/instrumentos debe rechazar con 403 si un estudiante no es propietario de la práctica', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'BORRADOR'
          });

          const res = await request(app)
            .post('/api/practicas/101/instrumentos')
            .set('Authorization', `Bearer ${otroEstudianteToken}`)
            .send({
              tipo: 'BANCO_TAREAS',
              nombre: 'Banco de tareas no autorizado'
            });

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
        });

        test('POST /api/practicas/:id/instrumentos debe rechazar con 400 si la práctica se encuentra CERRADA (RN06)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'CERRADA'
          });

          const res = await request(app)
            .post('/api/practicas/101/instrumentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              tipo: 'CUESTIONARIO_PRE_TEST',
              nombre: 'Cuestionario de entrada'
            });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('CERRADA');
        });

        test('POST /api/practicas/:id/instrumentos debe rechazar con 400 si el tipo de instrumento es inválido', async () => {
          const res = await request(app)
            .post('/api/practicas/101/instrumentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              tipo: 'TIPO_INVENTADO_NO_VALIDO',
              nombre: 'Instrumento inválido'
            });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
        });
      });

      // -----------------------------------------------------------------
      // DOCUMENTOS PDF: POST /api/documentos
      // -----------------------------------------------------------------
      describe('Carga de Documentos PDF (POST /api/documentos)', () => {
        test('POST /api/documentos debe permitir al estudiante propietario cargar un archivo PDF válido con magic bytes (%PDF-)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'BORRADOR'
          });

          let documentoCreado = null;
          jest.spyOn(prisma.documento, 'create').mockImplementation(({ data }) => {
            documentoCreado = data;
            return Promise.resolve({
              id: 88,
              ...data,
              creadoEn: new Date()
            });
          });

          // Buffer simulando archivo PDF real con magic bytes %PDF-
          const bufferPdfValido = Buffer.from('%PDF-1.4\n%Contenido simulado de prueba\n%%EOF');

          const res = await request(app)
            .post('/api/documentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .field('practicaId', '101')
            .field('tipo', 'CONSENTIMIENTO_INFORMADO')
            .attach('archivo', bufferPdfValido, 'consentimiento-firmado.pdf');

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.id).toBe(88);
          expect(res.body.datos.tipo).toBe('CONSENTIMIENTO_INFORMADO');
          expect(res.body.datos.practicaId).toBe(101);

          // Limpiar archivo que Multer escribió en disco durante el test
          if (documentoCreado?.ruta) {
            eliminarArchivoDisco(documentoCreado.ruta);
          }
        });

        test('POST /api/documentos debe rechazar con 400 si el archivo adjunto no es PDF', async () => {
          const bufferTexto = Buffer.from('Texto simple sin formato');

          const res = await request(app)
            .post('/api/documentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .field('practicaId', '101')
            .attach('archivo', bufferTexto, 'notas.txt');

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('formato PDF');
        });

        test('POST /api/documentos debe rechazar con 400 si el archivo tiene extensión .pdf pero magic bytes inválidos', async () => {
          // Archivo que engaña por extensión pero no inicia con %PDF-
          const bufferPdfFalsificado = Buffer.from('CONTENIDO_MALICIOSO_NO_PDF_REAL');

          const res = await request(app)
            .post('/api/documentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .field('practicaId', '101')
            .attach('archivo', bufferPdfFalsificado, 'archivo-falso.pdf');

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no es un PDF válido');
        });

        test('POST /api/documentos debe rechazar con 403 si el estudiante no es el propietario de la práctica', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: 999, // Dueño ajeno
            estado: 'BORRADOR'
          });

          const bufferPdfValido = Buffer.from('%PDF-1.4\nContenido de prueba\n%%EOF');

          const res = await request(app)
            .post('/api/documentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .field('practicaId', '101')
            .attach('archivo', bufferPdfValido, 'consentimiento.pdf');

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('No tienes permisos');
        });

        test('POST /api/documentos debe rechazar con 400 si la práctica se encuentra CERRADA (RN06)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'CERRADA'
          });

          const bufferPdfValido = Buffer.from('%PDF-1.4\nContenido de prueba\n%%EOF');

          const res = await request(app)
            .post('/api/documentos')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .field('practicaId', '101')
            .attach('archivo', bufferPdfValido, 'consentimiento.pdf');

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('cerrada');
        });
      });

      // -----------------------------------------------------------------
      // ENVÍO A REVISIÓN: PATCH /api/practicas/:id/enviar-revision (RN02)
      // -----------------------------------------------------------------
      describe('Envío a Revisión Docente (PATCH /api/practicas/:id/enviar-revision - RN02)', () => {
        test('PATCH /api/practicas/:id/enviar-revision debe rechazar con 400 si no tiene docente tutor asignado', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: null, // Sin docente
            estado: 'BORRADOR',
            instrumentos: [{ id: 1 }],
            documentos: [{ id: 1, tipo: 'CONSENTIMIENTO_INFORMADO' }]
          });

          const res = await request(app)
            .patch('/api/practicas/101/enviar-revision')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('docente tutor');
        });

        test('PATCH /api/practicas/:id/enviar-revision debe rechazar con 400 si faltan instrumentos o consentimiento informado', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'BORRADOR',
            instrumentos: [], // Sin instrumentos
            documentos: [] // Sin documentos
          });

          const res = await request(app)
            .patch('/api/practicas/101/enviar-revision')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('al menos un instrumento de evaluación y un documento de consentimiento informado');
        });

        test('PATCH /api/practicas/:id/enviar-revision debe transicionar exitosamente a EN_REVISION si cumple todos los prerrequisitos', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'BORRADOR',
            instrumentos: [{ id: 1, tipo: 'GUIA_OBSERVACION' }],
            documentos: [{ id: 1, tipo: 'CONSENTIMIENTO_INFORMADO' }],
            revisiones: []
          });

          jest.spyOn(prisma.practica, 'update').mockResolvedValue({
            id: 101,
            titulo: 'Práctica Completa',
            estado: 'EN_REVISION',
            estudianteId: estudianteId,
            docenteId: docenteId
          });

          jest.spyOn(prisma.notificacion, 'create').mockResolvedValue({
            id: 1,
            usuarioId: docenteId,
            titulo: 'Nueva práctica para revisión',
            mensaje: 'El estudiante ha enviado una práctica para tu revisión.',
            tipo: 'PRACTICA_ENVIADA_REVISION',
            referenciaEntidad: 'PRACTICA',
            referenciaId: 101,
            creadoEn: new Date()
          });

          jest.spyOn(prisma.dispositivoUsuario, 'findMany').mockResolvedValue([]);

          const res = await request(app)
            .patch('/api/practicas/101/enviar-revision')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.estado).toBe('EN_REVISION');

          // Pequeña espera para que la promesa asíncrona de notificación culmine limpiamente
          await new Promise((resolve) => setTimeout(resolve, 50));
        });
      });

      // -----------------------------------------------------------------
      // HISTORIAL DE REVISIONES: GET /api/practicas/:id/revisiones (CU10/HU07)
      // -----------------------------------------------------------------
      describe('Historial de Revisiones Docentes (GET /api/practicas/:id/revisiones - CU10/HU07)', () => {
        test('GET /api/practicas/:id/revisiones debe retornar 404 si la prÃ¡ctica no existe', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue(null);

          const res = await request(app)
            .get('/api/practicas/999/revisiones')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no existe');
        });

        test('GET /api/practicas/:id/revisiones debe retornar 403 si el usuario no es propietario, docente ni admin', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: docenteId
          });

          const res = await request(app)
            .get('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${otroEstudianteToken}`);

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('No tienes permisos');
        });

        test('GET /api/practicas/:id/revisiones debe retornar 200 con lista vacÃ­a si la prÃ¡ctica no tiene revisiones', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: docenteId
          });

          jest.spyOn(prisma.revision, 'findMany').mockResolvedValue([]);

          const res = await request(app)
            .get('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.exito).toBe(true);
          expect(Array.isArray(res.body.datos)).toBe(true);
          expect(res.body.datos.length).toBe(0);
        });

        test('GET /api/practicas/:id/revisiones debe retornar 200 con historial de revisiones para usuario autorizado', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            docenteId: docenteId
          });

          const revisionesSimuladas = [
            {
              id: 1,
              practicaId: 101,
              docenteId: docenteId,
              resultado: 'RECHAZADA',
              comentariosGenerales: 'Ajustar la guÃ­a de observaciÃ³n y banco de tareas',
              creadoEn: new Date('2026-10-25T10:00:00Z'),
              docente: { id: docenteId, nombres: 'Carlos', apellidos: 'Docente' },
              observaciones: [
                { id: 10, revisionId: 1, seccion: 'INSTRUMENTOS', detalle: 'La escala SUS debe tener 10 Ã­tems', resuelta: false }
              ]
            }
          ];

          jest.spyOn(prisma.revision, 'findMany').mockResolvedValue(revisionesSimuladas);

          const res = await request(app)
            .get('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${estudianteToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.length).toBe(1);
          expect(res.body.datos[0].resultado).toBe('RECHAZADA');
          expect(res.body.datos[0].observaciones.length).toBe(1);
          expect(res.body.datos[0].observaciones[0].resuelta).toBe(false);
        });
      });

      // -----------------------------------------------------------------
      // RESOLUCIÃ“N DE OBSERVACIONES: PATCH /api/practicas/:id/observaciones/:observacionId/resolver (CU11/HU12/RN04)
      // -----------------------------------------------------------------
      describe('ResoluciÃ³n de Observaciones Docentes (PATCH /api/practicas/:id/observaciones/:observacionId/resolver - CU11/HU12/RN04)', () => {
        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe retornar 404 si la prÃ¡ctica no existe', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue(null);

          const res = await request(app)
            .patch('/api/practicas/999/observaciones/10/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: true });

          expect(res.statusCode).toBe(404);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no existe');
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe retornar 403 si el usuario no es el dueÃ±o ni admin', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'RECHAZADA'
          });

          const res = await request(app)
            .patch('/api/practicas/101/observaciones/10/resolver')
            .set('Authorization', `Bearer ${otroEstudianteToken}`)
            .send({ resuelta: true });

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('No tienes permisos');
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe retornar 404 si la observaciÃ³n no existe', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'RECHAZADA'
          });

          jest.spyOn(prisma.observacion, 'findUnique').mockResolvedValue(null);

          const res = await request(app)
            .patch('/api/practicas/101/observaciones/999/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: true });

          expect(res.statusCode).toBe(404);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no existe');
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe retornar 404 si la observaciÃ³n pertenece a otra prÃ¡ctica', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'RECHAZADA'
          });

          jest.spyOn(prisma.observacion, 'findUnique').mockResolvedValue({
            id: 10,
            seccion: 'INSTRUMENTOS',
            detalle: 'Detalle de otra prÃ¡ctica',
            resuelta: false,
            revision: { id: 5, practicaId: 202 }
          });

          const res = await request(app)
            .patch('/api/practicas/101/observaciones/10/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: true });

          expect(res.statusCode).toBe(404);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no existe');
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe retornar 400 si el body tiene formato invÃ¡lido', async () => {
          const res = await request(app)
            .patch('/api/practicas/101/observaciones/10/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: 'no-es-booleano' });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe marcar como resuelta exitosamente (200)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'RECHAZADA'
          });

          jest.spyOn(prisma.observacion, 'findUnique').mockResolvedValue({
            id: 10,
            seccion: 'INSTRUMENTOS',
            detalle: 'Ajustar preguntas',
            resuelta: false,
            revision: { id: 1, practicaId: 101 }
          });

          jest.spyOn(prisma.observacion, 'update').mockResolvedValue({
            id: 10,
            seccion: 'INSTRUMENTOS',
            detalle: 'Ajustar preguntas',
            resuelta: true
          });

          const res = await request(app)
            .patch('/api/practicas/101/observaciones/10/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: true });

          expect(res.statusCode).toBe(200);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.resuelta).toBe(true);
        });

        test('PATCH /api/practicas/:id/observaciones/:observacionId/resolver debe permitir deshacer resoluciÃ³n a resuelta=false (200)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            estudianteId: estudianteId,
            estado: 'RECHAZADA'
          });

          jest.spyOn(prisma.observacion, 'findUnique').mockResolvedValue({
            id: 10,
            seccion: 'INSTRUMENTOS',
            detalle: 'Ajustar preguntas',
            resuelta: true,
            revision: { id: 1, practicaId: 101 }
          });

          jest.spyOn(prisma.observacion, 'update').mockResolvedValue({
            id: 10,
            seccion: 'INSTRUMENTOS',
            detalle: 'Ajustar preguntas',
            resuelta: false
          });

          const res = await request(app)
            .patch('/api/practicas/101/observaciones/10/resolver')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({ resuelta: false });

          expect(res.statusCode).toBe(200);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.resuelta).toBe(false);
        });
      });

      // -----------------------------------------------------------------
      // DICTAMEN DOCENTE: POST /api/practicas/:id/revisiones (PB4-B)
      // -----------------------------------------------------------------
      describe('EmisiÃ³n de Dictamen de RevisiÃ³n Docente (POST /api/practicas/:id/revisiones - PB4-B)', () => {
        const otroDocenteId = 31;
        const otroDocenteToken = generarTokenJwt({ usuarioId: otroDocenteId });
        const adminId = 1;
        const adminToken = generarTokenJwt({ usuarioId: adminId });

        beforeEach(() => {
          jest.spyOn(prisma.notificacion, 'create').mockResolvedValue({ id: 1, creadoEn: new Date() });
          jest.spyOn(prisma.dispositivoUsuario, 'findMany').mockResolvedValue([]);
        });

        // Caso 1: APROBADA
        test('Caso 1: POST /api/practicas/:id/revisiones debe emitir dictamen APROBADA exitosamente (201)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica UX Piloto',
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'EN_REVISION'
          });

          let estadoActualizado = null;
          jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback({
              revision: {
                create: jest.fn().mockImplementation(({ data }) => {
                  return Promise.resolve({
                    id: 50,
                    practicaId: 101,
                    docenteId: docenteId,
                    resultado: data.resultado,
                    comentariosGenerales: data.comentariosGenerales,
                    creadoEn: new Date(),
                    observaciones: []
                  });
                })
              },
              practica: {
                update: jest.fn().mockImplementation(({ data }) => {
                  estadoActualizado = data.estado;
                  return Promise.resolve({ id: 101, estado: data.estado });
                })
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'Propuesta metodolÃ³gica completa y vÃ¡lida para ejecuciÃ³n.'
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.resultado).toBe('APROBADA');
          expect(estadoActualizado).toBe('APROBADA');
        });

        // Caso 2: RECHAZADA con observaciones
        test('Caso 2: POST /api/practicas/:id/revisiones debe emitir dictamen RECHAZADA con observaciones no resueltas (201)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica UX Piloto',
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'EN_REVISION'
          });

          let estadoActualizado = null;
          jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback({
              revision: {
                create: jest.fn().mockImplementation(({ data }) => {
                  return Promise.resolve({
                    id: 51,
                    practicaId: 101,
                    docenteId: docenteId,
                    resultado: data.resultado,
                    comentariosGenerales: data.comentariosGenerales,
                    creadoEn: new Date(),
                    observaciones: (data.observaciones?.create || []).map((obs, idx) => ({
                      id: 200 + idx,
                      revisionId: 51,
                      seccion: obs.seccion,
                      detalle: obs.detalle,
                      resuelta: false
                    }))
                  });
                })
              },
              practica: {
                update: jest.fn().mockImplementation(({ data }) => {
                  estadoActualizado = data.estado;
                  return Promise.resolve({ id: 101, estado: data.estado });
                })
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'RECHAZADA',
              comentariosGenerales: 'Ajustar instrumentos antes de autorizar las pruebas de laboratorio.',
              observaciones: [
                { seccion: 'INSTRUMENTOS', detalle: 'Completar los 10 reactivos de la escala SUS.' },
                { seccion: 'METODOLOGIA', detalle: 'Definir el criterio de Ã©xito para cada tarea crÃ­tica.' }
              ]
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.resultado).toBe('RECHAZADA');
          expect(estadoActualizado).toBe('RECHAZADA');
          expect(res.body.datos.observaciones.length).toBe(2);
          expect(res.body.datos.observaciones[0].resuelta).toBe(false);
          expect(res.body.datos.observaciones[1].resuelta).toBe(false);
        });

        // Caso 3: RBAC (Estudiante rechazado 403, Administrador autorizado 201)
        test('Caso 3a: POST /api/practicas/:id/revisiones debe rechazar con 403 si el rol es ESTUDIANTE', async () => {
          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${estudianteToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'Intento no autorizado'
            });

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no tiene permisos');
        });

        test('Caso 3b: POST /api/practicas/:id/revisiones debe permitir dictamen por ADMINISTRADOR (201)', async () => {
          jest.spyOn(prisma.usuario, 'findUnique').mockImplementation(({ where }) => {
            if (where.id === adminId) {
              return Promise.resolve({
                id: adminId,
                nombres: 'Admin',
                apellidos: 'General',
                correoInstitucional: 'admin@unicolmayor.edu.co',
                activo: true,
                rolId: 1,
                rol: { nombre: 'ADMINISTRADOR' }
              });
            }
            return Promise.resolve(null);
          });

          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica UX Piloto',
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'EN_REVISION'
          });

          jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback({
              revision: {
                create: jest.fn().mockResolvedValue({
                  id: 52,
                  practicaId: 101,
                  docenteId: adminId,
                  resultado: 'APROBADA',
                  observaciones: []
                })
              },
              practica: {
                update: jest.fn().mockResolvedValue({ id: 101, estado: 'APROBADA' })
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'AprobaciÃ³n institucional por administrador.'
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
        });

        // Caso 4: Docente no asignado (403)
        test('Caso 4: POST /api/practicas/:id/revisiones debe rechazar con 403 si el docente no es el tutor asignado', async () => {
          jest.spyOn(prisma.usuario, 'findUnique').mockImplementation(({ where }) => {
            if (where.id === otroDocenteId) {
              return Promise.resolve({
                id: otroDocenteId,
                nombres: 'Otro',
                apellidos: 'Docente',
                correoInstitucional: 'otrodocente@unicolmayor.edu.co',
                activo: true,
                rolId: 2,
                rol: { nombre: 'DOCENTE' }
              });
            }
            return Promise.resolve(null);
          });

          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica UX Piloto',
            estudianteId: estudianteId,
            docenteId: docenteId, // Asignado a docenteId (30), no a otroDocenteId (31)
            estado: 'EN_REVISION'
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${otroDocenteToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'Dictamen de docente no asignado'
            });

          expect(res.statusCode).toBe(403);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('docente tutor asignado');
        });

        // Caso 5: Estado invÃ¡lido (400)
        test('Caso 5: POST /api/practicas/:id/revisiones debe rechazar con 400 si la prÃ¡ctica no estÃ¡ EN_REVISION', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica en Borrador',
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'BORRADOR' // Estado no evaluable
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'Dictamen prematuro'
            });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('EN_REVISION');
        });

        // Caso 6: PrÃ¡ctica inexistente (404)
        test('Caso 6: POST /api/practicas/:id/revisiones debe retornar 404 si la prÃ¡ctica no existe', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue(null);

          const res = await request(app)
            .post('/api/practicas/9999/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'APROBADA',
              comentariosGenerales: 'PrÃ¡ctica no encontrada'
            });

          expect(res.statusCode).toBe(404);
          expect(res.body.exito).toBe(false);
          expect(res.body.mensaje).toContain('no existe');
        });

        // Caso 7: Payload invÃ¡lido (400)
        test('Caso 7: POST /api/practicas/:id/revisiones debe retornar 400 si el resultado no es APROBADA ni RECHAZADA', async () => {
          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'MODIFICAR', // Invalido
              comentariosGenerales: 'Resultado fuera de enum'
            });

          expect(res.statusCode).toBe(400);
          expect(res.body.exito).toBe(false);
        });

        // Caso 8: Rechazo sin observaciones (Backend actual lo permite con array vacÃ­o y retorna 201)
        test('Caso 8: POST /api/practicas/:id/revisiones permite RECHAZADA sin observaciones explÃ­citas (201)', async () => {
          jest.spyOn(prisma.practica, 'findUnique').mockResolvedValue({
            id: 101,
            titulo: 'PrÃ¡ctica UX Piloto',
            estudianteId: estudianteId,
            docenteId: docenteId,
            estado: 'EN_REVISION'
          });

          jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback({
              revision: {
                create: jest.fn().mockResolvedValue({
                  id: 53,
                  practicaId: 101,
                  docenteId: docenteId,
                  resultado: 'RECHAZADA',
                  comentariosGenerales: 'Rechazo con comentarios generales sin lista de observaciones detallada',
                  observaciones: []
                })
              },
              practica: {
                update: jest.fn().mockResolvedValue({ id: 101, estado: 'RECHAZADA' })
              }
            });
          });

          const res = await request(app)
            .post('/api/practicas/101/revisiones')
            .set('Authorization', `Bearer ${docenteToken}`)
            .send({
              resultado: 'RECHAZADA',
              comentariosGenerales: 'Se rechaza por inconsistencias metodolÃ³gicas globales.'
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.exito).toBe(true);
          expect(res.body.datos.resultado).toBe('RECHAZADA');
        });
      });

    });
  });
});
