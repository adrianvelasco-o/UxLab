import { clienteApi } from './api.js';

/**
 * Servicio para gestión y carga segura de documentos PDF metodológicos (PB3 / SB4).
 */
export const documentosService = {
  /**
   * Carga un archivo PDF asociado a una práctica mediante multipart/form-data.
   * Endpoint REAL: POST /api/documentos
   *
   * @param {object} parametros
   * @param {number} parametros.practicaId - ID de la práctica
   * @param {File|Blob} parametros.archivo - Archivo PDF binario
   * @param {'CONSENTIMIENTO_INFORMADO'|'PROTOCOLO_PRUEBA'|'GUIA_ACTIVIDAD'|'REPORTE_FINAL'|'EVIDENCIA'|'OTRO'} [parametros.tipo='CONSENTIMIENTO_INFORMADO']
   */
  async subirDocumentoPdf({ practicaId, archivo, tipo = 'CONSENTIMIENTO_INFORMADO' }) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('practicaId', String(practicaId));
    formData.append('tipo', tipo);

    // No se establece cabecera Content-Type para permitir que fetch configure el boundary
    const res = await clienteApi('/documentos', {
      method: 'POST',
      body: formData
    });

    return res.datos;
  },

  /**
   * Lista todos los documentos PDF adjuntos a una práctica.
   * Endpoint REAL: GET /api/documentos/practica/:id
   *
   * @param {number} practicaId
   */
  async listarPorPractica(practicaId) {
    const res = await clienteApi(`/documentos/practica/${practicaId}`, {
      method: 'GET'
    });
    return res.datos || [];
  },

  /**
   * Descarga un archivo PDF de forma segura mediante streaming binario.
   * Endpoint REAL: GET /api/documentos/:id/descargar
   *
   * @param {number} documentoId
   * @param {string} [nombreSugerido='documento.pdf']
   */
  async descargarDocumento(documentoId, nombreSugerido = 'documento.pdf') {
    const blob = await clienteApi(`/documentos/${documentoId}/descargar`, {
      method: 'GET',
      tipoRespuesta: 'blob'
    });

    // Desencadena descarga en el navegador
    if (typeof window !== 'undefined' && window.URL && window.document) {
      const urlBlob = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = urlBlob;
      enlace.download = nombreSugerido;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(urlBlob);
    }

    return blob;
  }
};

export default documentosService;
