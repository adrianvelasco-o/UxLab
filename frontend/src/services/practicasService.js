import { clienteApi } from './api.js';

/**
 * Servicio para gestión de Prácticas de Usabilidad e Instrumentos de Evaluación (PB3 / SB4 / PB4-A).
 */
export const practicasService = {
  /**
   * Lista las prácticas del usuario autenticado (si es estudiante, sus propias prácticas).
   * @param {object} [filtros]
   * @param {string} [filtros.estado]
   */
  async listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.estado && filtros.estado !== 'TODOS') {
      params.append('estado', filtros.estado);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await clienteApi(`/practicas${query}`, { method: 'GET' });
    return res.datos || [];
  },

  /**
   * Obtiene el detalle completo de una práctica por su ID.
   * @param {number} practicaId
   */
  async obtenerPorId(practicaId) {
    const res = await clienteApi(`/practicas/${practicaId}`, { method: 'GET' });
    return res.datos;
  },

  /**
   * Crea una nueva práctica en estado inicial BORRADOR.
   * @param {object} datos
   * @param {string} datos.titulo - Título de la práctica (mín. 3 caracteres)
   * @param {string} datos.descripcion - Descripción del propósito (mín. 5 caracteres)
   * @param {string} datos.objetivo - Objetivo metodológico (mín. 5 caracteres)
   * @param {number|null} [datos.docenteId] - ID del docente tutor asignado
   */
  async crear(datos) {
    const res = await clienteApi('/practicas', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    return res.datos;
  },

  /**
   * Actualiza los datos de una práctica en estado BORRADOR o RECHAZADA.
   * @param {number} practicaId
   * @param {object} datos
   */
  async actualizar(practicaId, datos) {
    const res = await clienteApi(`/practicas/${practicaId}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
    return res.datos;
  },

  /**
   * Registra un instrumento de evaluación estructurado para la práctica.
   * @param {number} practicaId
   * @param {object} instrumento
   * @param {'GUIA_OBSERVACION'|'CUESTIONARIO_PRE_TEST'|'BANCO_TAREAS'|'CUESTIONARIO_POST_TEST'} instrumento.tipo
   * @param {string} instrumento.nombre
   * @param {string} [instrumento.instrucciones]
   * @param {object} [instrumento.contenido]
   */
  async crearInstrumento(practicaId, instrumento) {
    const res = await clienteApi(`/practicas/${practicaId}/instrumentos`, {
      method: 'POST',
      body: JSON.stringify(instrumento)
    });
    return res.datos;
  },

  /**
   * Lista los instrumentos de evaluación asociados a una práctica.
   * @param {number} practicaId
   */
  async listarInstrumentos(practicaId) {
    const res = await clienteApi(`/practicas/${practicaId}/instrumentos`, {
      method: 'GET'
    });
    return res.datos || [];
  },

  /**
   * Elimina un instrumento de evaluación de la práctica.
   * @param {number} practicaId
   * @param {number} instrumentoId
   */
  async eliminarInstrumento(practicaId, instrumentoId) {
    const res = await clienteApi(`/practicas/${practicaId}/instrumentos/${instrumentoId}`, {
      method: 'DELETE'
    });
    return res.datos;
  },

  /**
   * Envía la práctica a revisión docente (Valida prerrequisitos de RN02 / RN04).
   * @param {number} practicaId
   */
  async enviarARevision(practicaId) {
    const res = await clienteApi(`/practicas/${practicaId}/enviar-revision`, {
      method: 'PATCH'
    });
    return res.datos;
  },

  /**
   * Consulta el historial de revisiones docentes de una práctica (CU10 / HU07).
   * @param {number} practicaId
   */
  async listarRevisiones(practicaId) {
    const res = await clienteApi(`/practicas/${practicaId}/revisiones`, {
      method: 'GET'
    });
    return res.datos || [];
  },

  /**
   * Marca una observación de revisión como resuelta o pendiente (CU11 / HU12 / RN04).
   * @param {number} practicaId
   * @param {number} observacionId
   * @param {boolean} [resuelta=true]
   */
  async resolverObservacion(practicaId, observacionId, resuelta = true) {
    const res = await clienteApi(`/practicas/${practicaId}/observaciones/${observacionId}/resolver`, {
      method: 'PATCH',
      body: JSON.stringify({ resuelta })
    });
    return res.datos;
  },

  /**
   * Obtiene el listado de docentes activos para asignar como tutor a la práctica.
   */
  /**
   * Emite el dictamen formal de revisión docente para una práctica (APROBADA o RECHAZADA) (PB4-B).
   * @param {number} practicaId
   * @param {object} datos
   * @param {'APROBADA'|'RECHAZADA'} datos.resultado
   * @param {string} [datos.comentariosGenerales]
   * @param {Array<{seccion: string, detalle: string}>} [datos.observaciones]
   */
  async registrarRevision(practicaId, datos) {
    const res = await clienteApi(`/practicas/${practicaId}/revisiones`, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    return res.datos;
  },

  async listarDocentesDisponibles() {
    const res = await clienteApi('/usuarios/docentes', { method: 'GET' });
    return res.datos || [];
  }
};

export default practicasService;
