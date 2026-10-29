import { clienteApi } from './api.js';

/**
 * Servicio para consulta de disponibilidad y gestión de reservas del UXLab (PB9 / PB10).
 */

/**
 * Obtiene la lista de laboratorios y su disponibilidad horaria.
 * Consume el endpoint real: GET /api/reservas/laboratorios?fecha=AAAA-MM-DD
 *
 * @param {string} [fecha] - Fecha en formato AAAA-MM-DD (opcional)
 * @returns {Promise<Array>} Lista de laboratorios con franjas horarias y estado de cupos
 */
export async function obtenerLaboratoriosDisponibles(fecha) {
  const params = new URLSearchParams();
  if (fecha) {
    params.append('fecha', fecha);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const respuesta = await clienteApi(`/reservas/laboratorios${query}`, {
    method: 'GET'
  });

  return respuesta?.datos ?? [];
}

export const reservasService = {
  obtenerLaboratoriosDisponibles
};

export default reservasService;

