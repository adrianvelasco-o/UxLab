import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { AccesoDenegado } from './AccesoDenegado.jsx';

export function RutaProtegida({ rolesPermitidos = [], children }) {
  const { usuario, autenticado } = useAuth();

  if (!autenticado || !usuario) {
    return null;
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
    const rolesTexto = rolesPermitidos.join(', ');
    return <AccesoDenegado rolRequerido={rolesTexto} />;
  }

  return children;
}

export default RutaProtegida;
