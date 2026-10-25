import fs from 'fs';
import path from 'path';
import * as documentosRepository from './documentos.repository.js';
import * as practicasRepository from '../practicas/practicas.repository.js';
import { AppError } from '../../errors/AppError.js';
import { CODIGOS_ERROR } from '../../constants/codigosError.js';
import { eliminarArchivoDisco } from '../../middlewares/subidaArchivos.js';
import { CONFIG } from '../../config/ambiente.js';

/** Comprueba la firma real del archivo (%PDF-), sin fiarse del mimetype ni de la extensión que envía el cliente. */
function esPdfReal(rutaArchivo) {
  let descriptor;
  try {
    descriptor = fs.openSync(rutaArchivo, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(descriptor, buffer, 0, 5, 0);
    return buffer.toString('latin1') === '%PDF-';
  } catch {
    return false;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

export async function registrarDocumentoPdf({ practicaId, tipo, archivo, usuario }) {
  if (!archivo) {
    throw new AppError('Debe adjuntar un archivo en formato PDF', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  if (!esPdfReal(archivo.path)) {
    throw new AppError('El archivo adjunto no es un PDF válido', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  const idNum = parseInt(practicaId, 10);
  if (isNaN(idNum)) {
    throw new AppError('El practicaId debe ser un número entero válido', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  // 1. Verificar que la práctica exista
  const practica = await practicasRepository.buscarPracticaPorId(idNum);
  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // 2. Validar que la práctica no esté cerrada (RN06)
  if (practica.estado === 'CERRADA') {
    throw new AppError('No se pueden adjuntar documentos a una práctica cerrada', 400, CODIGOS_ERROR.PRACTICA_NO_EDITABLE);
  }

  // 3. Verificar permisos: El estudiante debe ser el dueño de la práctica (o admin)
  const puedeSubir =
    usuario.rolNombre === 'ADMINISTRADOR' ||
    practica.estudianteId === usuario.id;

  if (!puedeSubir) {
    throw new AppError('No tienes permisos para adjuntar documentos a esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  // 4. Guardar metadatos en PostgreSQL con limpieza garantizada ante fallos
  try {
    return await documentosRepository.crearDocumento({
      practicaId: idNum,
      subidoPorUsuarioId: usuario.id,
      tipo: tipo || 'CONSENTIMIENTO_INFORMADO',
      nombreOriginal: archivo.originalname,
      nombreAlmacenamiento: archivo.filename,
      ruta: archivo.path.replace(/\\/g, '/'),
      tipoMime: archivo.mimetype,
      tamanoBytes: archivo.size
    });
  } catch (errorDb) {
    if (archivo?.path) {
      eliminarArchivoDisco(archivo.path);
    }
    throw errorDb;
  }
}

export async function obtenerDocumentosDePractica(practicaId, usuario) {
  const idNum = parseInt(practicaId, 10);
  const practica = await practicasRepository.buscarPracticaPorId(idNum);

  if (!practica) {
    throw new AppError('La práctica especificada no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  const tienePermiso =
    ['ADMINISTRADOR', 'DOCENTE'].includes(usuario.rolNombre) ||
    practica.estudianteId === usuario.id;

  if (!tienePermiso) {
    throw new AppError('No tienes permisos para consultar los documentos de esta práctica', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  return documentosRepository.listarDocumentosPorPracticaId(idNum);
}

export async function obtenerArchivoParaDescarga(documentoId, usuario) {
  const idNum = parseInt(documentoId, 10);
  if (isNaN(idNum) || idNum <= 0) {
    throw new AppError('El id del documento debe ser un número entero positivo', 400, CODIGOS_ERROR.DATOS_INVALIDOS);
  }

  const documento = await documentosRepository.buscarDocumentoPorId(idNum);
  if (!documento) {
    throw new AppError('El documento solicitado no existe', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  // 1. Verificar permisos y pertenencia según reglas de negocio
  const tienePermiso =
    usuario.rolNombre === 'ADMINISTRADOR' ||
    usuario.id === documento.subidoPorUsuarioId ||
    (documento.practica &&
      (documento.practica.estudianteId === usuario.id ||
        (usuario.rolNombre === 'DOCENTE' &&
          (documento.practica.docenteId === usuario.id || !documento.practica.docenteId))));

  if (!tienePermiso) {
    throw new AppError('No tienes permisos para descargar este documento', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  // 2. Prevenir Path Traversal / LFI asegurando que la ruta esté en el directorio de subidas
  const dirSubidas = path.resolve(CONFIG.DIRECTORIO_SUBIDAS);
  const rutaAbsoluta = path.resolve(documento.ruta);

  if (!rutaAbsoluta.startsWith(dirSubidas + path.sep)) {
    throw new AppError('Acceso a ruta de archivo no permitida', 403, CODIGOS_ERROR.ACCESO_DENEGADO);
  }

  // 3. Verificar existencia física del archivo
  if (!fs.existsSync(rutaAbsoluta)) {
    throw new AppError('El archivo físico no se encuentra disponible en el servidor', 404, CODIGOS_ERROR.RECURSO_NO_ENCONTRADO);
  }

  return {
    rutaAbsoluta,
    nombreOriginal: documento.nombreOriginal,
    tipoMime: documento.tipoMime
  };
}

