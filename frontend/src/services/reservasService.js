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

/**
 * Radica una nueva solicitud de reserva de laboratorio para una prǭctica aprobada (PB10).
 * Consume el endpoint real: POST /api/reservas
 *
 * @param {object} params
 * @param {number} params.practicaId - ID de la prǭctica aprobada
 * @param {number} params.laboratorioId - ID del laboratorio
 * @param {number} params.horarioId - ID de la franja horaria
 * @param {string} params.fechaReserva - Fecha en formato AAAA-MM-DD
 * @returns {Promise<object>} Datos de la reserva creada
 */
export async function solicitarReserva({ practicaId, laboratorioId, horarioId, fechaReserva }) {
  const respuesta = await clienteApi('/reservas', {
    method: 'POST',
    body: JSON.stringify({
      practicaId,
      laboratorioId,
      horarioId,
      fechaReserva
    })
  });

  return respuesta?.datos;
}

export const reservasService = {
  obtenerLaboratoriosDisponibles,
  solicitarReserva
};

export default reservasService;

