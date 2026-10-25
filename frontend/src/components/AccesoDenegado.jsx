import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';

export function AccesoDenegado({ rolRequerido = 'Administrador' }) {
  const { usuario } = useAuth();
  const { navegar } = useNavigation();

  const obtenerRutaPanelRol = () => {
    switch (usuario?.rol) {
      case 'ADMINISTRADOR':
        return RUTAS.ADMIN;
      case 'DOCENTE':
        return RUTAS.DOCENTE;
      case 'ESTUDIANTE':
        return RUTAS.ESTUDIANTE;
      default:
        return RUTAS.INICIO;
    }
  };

  return (
    <div className="acceso-denegado-card" role="alert" aria-labelledby="titulo-acceso-denegado">
      <div className="denegado-icon-wrap" aria-hidden="true">
        🚫
      </div>
      <h1 id="titulo-acceso-denegado" className="denegado-titulo">
        Acceso no autorizado (403)
      </h1>
      <p className="denegado-descripcion">
        Su rol actual (<strong>{usuario?.rol || 'No autenticado'}</strong>) no cuenta con permisos para acceder a esta ruta.
        Esta sección se encuentra restringida exclusivamente para usuarios con rol{' '}
        <strong>{rolRequerido}</strong>.
      </p>
      <div className="denegado-acciones">
        <button
          type="button"
          onClick={() => navegar(obtenerRutaPanelRol(), 'Panel Principal')}
          className="btn-volver-panel"
        >
          Volver a mi panel principal
        </button>
      </div>
    </div>
  );
}

export default AccesoDenegado;
