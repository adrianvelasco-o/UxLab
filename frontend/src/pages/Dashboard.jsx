import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function Dashboard() {
  const { usuario, logout } = useAuth();

  const formatearRol = (rol) => {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'DOCENTE':
        return 'Docente';
      case 'ESTUDIANTE':
        return 'Estudiante';
      default:
        return rol;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Barra superior de navegación */}
      <header className="app-navbar">
        <div className="navbar-left">
          <div className="navbar-shield">
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
        </div>

        <div className="navbar-right">
          <div className="user-profile-badge">
            <span className="user-display-name">
              {usuario?.nombres} {usuario?.apellidos}
            </span>
            <span className="user-display-role">{formatearRol(usuario?.rol)}</span>
          </div>
          <button onClick={logout} className="btn-logout-nav" title="Cerrar Sesión">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido funcional */}
      <main className="dashboard-content">
        <div className="content-welcome-card">
          <h2>Panel de Gestión — {formatearRol(usuario?.rol)}</h2>
          <p>
            Bienvenido al Sistema de Gestión de Prácticas y Laboratorios de Experiencia de Usuario.
          </p>
        </div>

        {/* Módulos de funcionalidad del sistema */}
        <div className="system-modules-grid">
          <div className="module-card">
            <div className="module-icon-wrap">📋</div>
            <div className="module-info">
              <h3>Prácticas UX</h3>
              <p>Formulación de prácticas de usabilidad, gestión de estados y objetivos.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap">🔬</div>
            <div className="module-info">
              <h3>Laboratorios y Salas</h3>
              <p>Consulta de espacios acondicionados, estaciones de prueba y cámara Gesell.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap">📅</div>
            <div className="module-info">
              <h3>Franjas y Reservas</h3>
              <p>Agendamiento de horarios semanales y confirmación de disponibilidad.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap">📄</div>
            <div className="module-info">
              <h3>Documentos y Protocolos</h3>
              <p>Gestión de consentimientos informados, guías metodológicas y evidencias.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap">🔔</div>
            <div className="module-info">
              <h3>Notificaciones</h3>
              <p>Historial de observaciones de revisión docente y aprobaciones.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        © 2026 GesLab - Institución Universitaria Colegio Mayor del Cauca.
      </footer>
    </div>
  );
}
