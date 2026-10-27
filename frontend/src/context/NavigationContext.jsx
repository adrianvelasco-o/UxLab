import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NavigationContext = createContext(null);

export const RUTAS = {
  INICIO: '/',
  ADMIN: '/admin',
  ADMIN_USUARIOS: '/admin/usuarios',
  DOCENTE: '/docente',
  DOCENTE_PRACTICA_DETALLE: '/docente/practica',
  ESTUDIANTE: '/estudiante',
  ESTUDIANTE_PRACTICAS: '/estudiante/practicas',
  ESTUDIANTE_PRACTICA_DETALLE: '/estudiante/practica'
};



export const ROLES_VALIDOS = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'];

function obtenerRutaDesdeHash() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : `/${hash}`;
}

export function NavigationProvider({ children }) {
  const [ruta, setRuta] = useState(obtenerRutaDesdeHash());
  const [anuncioAccesible, setAnuncioAccesible] = useState('');

  const navegar = useCallback((nuevaRuta, tituloPantalla = '') => {
    const rutaFormateada = nuevaRuta.startsWith('/') ? nuevaRuta : `/${nuevaRuta}`;
    window.location.hash = rutaFormateada;
    setRuta(rutaFormateada);

    if (tituloPantalla) {
      setAnuncioAccesible(`Navegando a: ${tituloPantalla}`);
    }
  }, []);

  useEffect(() => {
    function manejarCambioHash() {
      const rutaActual = obtenerRutaDesdeHash();
      setRuta(rutaActual);
    }

    window.addEventListener('hashchange', manejarCambioHash);
    return () => window.removeEventListener('hashchange', manejarCambioHash);
  }, []);

  const valor = {
    ruta,
    navegar,
    anuncioAccesible
  };

  return (
    <NavigationContext.Provider value={valor}>
      {children}
      {/* Región ARIA Live para anunciar cambios de página a tecnologías de asistencia (WCAG 4.1.2) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {anuncioAccesible}
      </div>
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation debe ser utilizado dentro de un NavigationProvider');
  }
  return context;
}
