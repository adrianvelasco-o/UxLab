import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function principal() {
  console.log('Iniciando proceso de seeding en base de datos PostgreSQL...');

  // 1. Crear Roles Maestros
  const rolesData = [
    {
      nombre: 'ADMINISTRADOR',
      descripcion: 'Administrador del sistema con control total de usuarios, roles y configuración'
    },
    {
      nombre: 'DOCENTE',
      descripcion: 'Docente tutor/revisor de prácticas de evaluación UX'
    },
    {
      nombre: 'ESTUDIANTE',
      descripcion: 'Estudiante responsable o evaluador de prácticas de usabilidad'
    }
  ];

  for (const rol of rolesData) {
    await prisma.rol.upsert({
      where: { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: rol
    });
  }
  console.log('Roles verificados/creados correctamente.');

  // Obtener roles registrados
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'ADMINISTRADOR' } });
  const rolDocente = await prisma.rol.findUnique({ where: { nombre: 'DOCENTE' } });
  const rolEstudiante = await prisma.rol.findUnique({ where: { nombre: 'ESTUDIANTE' } });

  // 2. Usuarios base. Los usuarios demo (contraseña común) NUNCA se crean en producción
  //    salvo que se active SEMBRAR_USUARIOS_DEMO=true de forma explícita.
  const esProduccion = process.env.NODE_ENV === 'production';
  const sembrarDemo = process.env.SEMBRAR_USUARIOS_DEMO === 'true' || (!esProduccion && process.env.SEMBRAR_USUARIOS_DEMO !== 'false');

  const usuariosBase = [];

  if (process.env.ADMIN_CONTRASENA) {
    usuariosBase.push({
      rolId: rolAdmin.id,
      nombres: process.env.ADMIN_NOMBRE || 'Administrador',
      apellidos: process.env.ADMIN_APELLIDO || 'Ux',
      correoInstitucional: process.env.ADMIN_CORREO || 'admin@unicolmayor.edu.co',
      contrasenaHash: await bcrypt.hash(process.env.ADMIN_CONTRASENA, 10),
      activo: true
    });
  } else if (esProduccion) {
    throw new Error('ADMIN_CONTRASENA es obligatoria en producción para crear el administrador inicial');
  }

  if (sembrarDemo) {
    const contrasenaComun = await bcrypt.hash('Ux2026*', 10);
    if (!process.env.ADMIN_CONTRASENA) {
      usuariosBase.push({
        rolId: rolAdmin.id,
        nombres: 'Administrador',
        apellidos: 'Ux',
        correoInstitucional: process.env.ADMIN_CORREO || 'admin@unicolmayor.edu.co',
        contrasenaHash: contrasenaComun,
        activo: true
      });
    }
    usuariosBase.push(
      {
        rolId: rolDocente.id,
        nombres: 'Víctor Hugo',
        apellidos: 'Pinto Rodríguez',
        correoInstitucional: 'vpinto@unicolmayor.edu.co',
        contrasenaHash: contrasenaComun,
        activo: true
      },
      {
        rolId: rolEstudiante.id,
        nombres: 'Adrián Esteban',
        apellidos: 'Velasco Obando',
        correoInstitucional: 'adrianvelasco@unicolmayor.edu.co',
        contrasenaHash: contrasenaComun,
        activo: true
      }
    );
  }

  for (const usuario of usuariosBase) {
    await prisma.usuario.upsert({
      where: { correoInstitucional: usuario.correoInstitucional },
      update: {
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        rolId: usuario.rolId,
        activo: usuario.activo
      },
      create: usuario
    });
  }
  console.log(`Usuarios registrados: ${usuariosBase.length}${sembrarDemo ? ' (incluye usuarios demo)' : ''}.`);

  // 3. Crear Laboratorios UX
  const lab1 = await prisma.laboratorio.upsert({
    where: { id: 1 },
    update: {
      nombre: 'Laboratorio de Usabilidad UX - Sala A',
      ubicacion: 'Edificio Bicentenario - Sala UX 301',
      capacidad: 5,
      descripcion: 'Espacio acondicionado con cámara Gesell, estaciones de seguimiento visual y software de registro'
    },
    create: {
      id: 1,
      nombre: 'Laboratorio de Usabilidad UX - Sala A',
      ubicacion: 'Edificio Bicentenario - Sala UX 301',
      capacidad: 5,
      descripcion: 'Espacio acondicionado con cámara Gesell, estaciones de seguimiento visual y software de registro'
    }
  });

  const lab2 = await prisma.laboratorio.upsert({
    where: { id: 2 },
    update: {
      nombre: 'Laboratorio de Usabilidad UX - Sala B',
      ubicacion: 'Edificio Bicentenario - Sala UX 302',
      capacidad: 4,
      descripcion: 'Espacio secundario para pruebas de usabilidad individuales y dispositivos móviles'
    },
    create: {
      id: 2,
      nombre: 'Laboratorio de Usabilidad UX - Sala B',
      ubicacion: 'Edificio Bicentenario - Sala UX 302',
      capacidad: 4,
      descripcion: 'Espacio secundario para pruebas de usabilidad individuales y dispositivos móviles'
    }
  });
  console.log('Laboratorios UX creados.');

  // 4. Crear Franjas Horarias Semanales para los Laboratorios
  const diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
  const bloquesHorarios = [
    { inicio: '1970-01-01T08:00:00.000Z', fin: '1970-01-01T10:00:00.000Z' },
    { inicio: '1970-01-01T10:00:00.000Z', fin: '1970-01-01T12:00:00.000Z' },
    { inicio: '1970-01-01T14:00:00.000Z', fin: '1970-01-01T16:00:00.000Z' },
    { inicio: '1970-01-01T16:00:00.000Z', fin: '1970-01-01T18:00:00.000Z' }
  ];

  for (const labId of [lab1.id, lab2.id]) {
    for (const dia of diasSemana) {
      for (const bloque of bloquesHorarios) {
        const existe = await prisma.horario.findFirst({
          where: {
            laboratorioId: labId,
            diaSemana: dia,
            horaInicio: new Date(bloque.inicio),
            horaFin: new Date(bloque.fin)
          }
        });

        if (!existe) {
          await prisma.horario.create({
            data: {
              laboratorioId: labId,
              diaSemana: dia,
              horaInicio: new Date(bloque.inicio),
              horaFin: new Date(bloque.fin),
              activo: true
            }
          });
        }
      }
    }
  }
  console.log('Franjas de horarios semanales configuradas.');

  console.log('Seeding completado exitosamente.');
}

principal()
  .catch((error) => {
    console.error('Error durante la ejecución del seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
