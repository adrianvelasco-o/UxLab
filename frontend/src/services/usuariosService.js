import { clienteApi } from './api.js';

/**
 * Servicio de Gestión de Usuarios y Roles para GesLab.
 */
export const usuariosService = {
  /**
   * Lista usuarios con filtros opcionales.
   * @param {object} [filtros]
   * @param {string} [filtros.rol]
   * @param {boolean} [filtros.activo]
   */
  async listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.rol && filtros.rol !== 'TODOS') {
      params.append('rol', filtros.rol);
    }
    if (filtros.activo !== undefined && filtros.activo !== 'TODOS') {
      params.append('activo', filtros.activo === 'ACTIVOS' || filtros.activo === true);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await clienteApi(`/usuarios${query}`, { method: 'GET' });
    return res.datos || [];
  },

  /**
   * Crea un nuevo usuario institucional por el Administrador.
   * @param {object} datos
   * @param {string} datos.nombres
   * @param {string} datos.apellidos
   * @param {string} datos.correoInstitucional
   * @param {string} datos.contrasena
   * @param {'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE'} datos.rolNombre
   * @param {boolean} [datos.activo=true]
   */
  async crearUsuario(datos) {
    const res = await clienteApi('/usuarios', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    return res.datos;
  },

  /**
   * Cambia el rol de un usuario existente.
   * @param {number} usuarioId
   * @param {'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE'} rolNombre
   */
  async cambiarRol(usuarioId, rolNombre) {
    const res = await clienteApi(`/usuarios/${usuarioId}/rol`, {
      method: 'PATCH',
      body: JSON.stringify({ rolNombre })
    });
    return res.datos;
  },

  /**
   * Activa o desactiva la cuenta de un usuario.
   * @param {number} usuarioId
   * @param {boolean} activo
   */
  async cambiarEstado(usuarioId, activo) {
    const res = await clienteApi(`/usuarios/${usuarioId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ activo })
    });
    return res.datos;
  }
};

export default usuariosService;
