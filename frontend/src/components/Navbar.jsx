import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';

export function Navbar() {
  const { usuario, logout } = useAuth();
  const { ruta, navegar } = useNavigation();

  const formatearRol = (rol) => {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'DOCENTE':
        return 'Docente';
      case 'ESTUDIANTE':
        return 'Estudiante';
      default:
        return rol || 'Usuario';
    }
  };

  const rutaPanelBase = () => {
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
    <header className="app-navbar" role="banner">
      <div className="navbar-left">
        <button
          type="button"
          onClick={() => navegar(rutaPanelBase(), 'Panel Principal')}
          className="navbar-brand-btn"
          aria-label="Ir al panel principal de GesLab"
        >
          <div className="navbar-shield" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
            </svg>
          </div>
          <div className="navbar-titles">
            <span className="navbar-brand-name">GesLab</span>
            <span className="navbar-brand-sub">Unicolmayor</span>
          </div>
        </button>

        {/* Navegación por rol */}
        <nav className="navbar-nav-links" aria-label="Navegación principal">
          {usuario?.rol === 'ADMINISTRADOR' && (
            <>
              <button
                type="button"
                onClick={() => navegar(RUTAS.ADMIN, 'Panel Administrador')}
                className={`nav-link-btn ${ruta === RUTAS.ADMIN || ruta === RUTAS.INICIO ? 'activo' : ''}`}
                aria-current={ruta === RUTAS.ADMIN || ruta === RUTAS.INICIO ? 'page' : undefined}
              >
                Panel Administrador
              </button>
              <button
                type="button"
                onClick={() => navegar(RUTAS.ADMIN_USUARIOS, 'Gestión de Usuarios')}
                className={`nav-link-btn ${ruta === RUTAS.ADMIN_USUARIOS ? 'activo' : ''}`}
                aria-current={ruta === RUTAS.ADMIN_USUARIOS ? 'page' : undefined}
              >
                Gestión de Usuarios
              </button>
            </>
          )}

          {usuario?.rol === 'DOCENTE' && (
            <button
              type="button"
              onClick={() => navegar(RUTAS.DOCENTE, 'Panel Docente')}
              className={`nav-link-btn ${ruta === RUTAS.DOCENTE || ruta === RUTAS.INICIO ? 'activo' : ''}`}
              aria-current={ruta === RUTAS.DOCENTE || ruta === RUTAS.INICIO ? 'page' : undefined}
            >
              Panel Docente
            </button>
          )}

          {usuario?.rol === 'ESTUDIANTE' && (
            <button
              type="button"
              onClick={() => navegar(RUTAS.ESTUDIANTE, 'Panel Estudiante')}
              className={`nav-link-btn ${ruta === RUTAS.ESTUDIANTE || ruta === RUTAS.INICIO ? 'activo' : ''}`}
              aria-current={ruta === RUTAS.ESTUDIANTE || ruta === RUTAS.INICIO ? 'page' : undefined}
            >
              Panel Estudiante
            </button>
          )}
        </nav>
      </div>

      <div className="navbar-right">
        <div className="user-profile-badge" aria-label={`Usuario: ${usuario?.nombres} ${usuario?.apellidos}, Rol: ${formatearRol(usuario?.rol)}`}>
          <span className="user-display-name">
            {usuario?.nombres} {usuario?.apellidos}
          </span>
          <span className="user-display-role">{formatearRol(usuario?.rol)}</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="btn-logout-nav"
          title="Cerrar Sesión Segura"
          aria-label="Cerrar Sesión del sistema GesLab"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}

export default Navbar;
