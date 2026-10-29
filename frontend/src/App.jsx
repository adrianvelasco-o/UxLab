import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NavigationProvider, useNavigation, RUTAS } from './context/NavigationContext.jsx';
import { Login } from './pages/Login.jsx';
import { Navbar } from './components/Navbar.jsx';
import { RutaProtegida } from './components/RutaProtegida.jsx';
import { PanelAdmin } from './pages/PanelAdmin.jsx';
import { UsuariosAdmin } from './pages/UsuariosAdmin.jsx';
import { PanelDocente } from './pages/PanelDocente.jsx';
import { DetallePracticaDocente } from './pages/DetallePracticaDocente.jsx';
import { PanelEstudiante } from './pages/PanelEstudiante.jsx';
import { PracticasEstudiante } from './pages/PracticasEstudiante.jsx';
import { DetallePractica } from './pages/DetallePractica.jsx';
import { DisponibilidadLaboratorio } from './pages/DisponibilidadLaboratorio.jsx';
import { SolicitudReserva } from './pages/SolicitudReserva.jsx';
import './App.css';

function EnrutadorPrincipal() {
  const { usuario } = useAuth();
  const { ruta } = useNavigation();

  // 1. Ruta: Gestión de Usuarios (Exclusiva de Administrador)
  if (ruta === RUTAS.ADMIN_USUARIOS) {
    return (
      <RutaProtegida rolesPermitidos={['ADMINISTRADOR']}>
        <UsuariosAdmin />
      </RutaProtegida>
    );
  }

  // 2. Ruta: Panel de Administrador (/admin)
  if (ruta === RUTAS.ADMIN) {
    return (
      <RutaProtegida rolesPermitidos={['ADMINISTRADOR']}>
        <PanelAdmin />
      </RutaProtegida>
    );
  }

  // 3. Ruta: Detalle y Revisión de Práctica del Docente (/docente/practica?id=...)
  if (ruta.startsWith('/docente/practica')) {
    return (
      <RutaProtegida rolesPermitidos={['DOCENTE', 'ADMINISTRADOR']}>
        <DetallePracticaDocente />
      </RutaProtegida>
    );
  }

  // 3b. Ruta: Panel y Bandeja de Docente (/docente)
  if (ruta === RUTAS.DOCENTE) {
    return (
      <RutaProtegida rolesPermitidos={['DOCENTE']}>
        <PanelDocente />
      </RutaProtegida>
    );
  }

  // 4. Ruta: Gestión de Prácticas del Estudiante (/estudiante/practicas)
  if (ruta === RUTAS.ESTUDIANTE_PRACTICAS) {
    return (
      <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
        <PracticasEstudiante />
      </RutaProtegida>
    );
  }

  // 5. Ruta: Detalle y Gestión de Práctica del Estudiante (/estudiante/practica?id=...)
  if (ruta.startsWith('/estudiante/practica?') || ruta === RUTAS.ESTUDIANTE_PRACTICA_DETALLE) {
    return (
      <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
        <DetallePractica />
      </RutaProtegida>
    );
  }

  // 6. Ruta: Panel de Estudiante (/estudiante)
  if (ruta === RUTAS.ESTUDIANTE) {
    return (
      <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
        <PanelEstudiante />
      </RutaProtegida>
    );
  }

  // 7. Ruta: Consulta de Disponibilidad de Laboratorios UX (/estudiante/reservas)
  if (ruta === RUTAS.ESTUDIANTE_RESERVAS) {
    return (
      <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
        <DisponibilidadLaboratorio />
      </RutaProtegida>
    );
  }

  // 8. Ruta: Solicitud de Reserva de Laboratorio (/estudiante/reservas/solicitar - PB10 / PB10-03)
  if (ruta === RUTAS.ESTUDIANTE_RESERVA_SOLICITAR) {
    return (
      <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
        <SolicitudReserva />
      </RutaProtegida>
    );
  }



  // 5. Ruta raíz (/) o ruta predeterminada según el rol del usuario autenticado
  switch (usuario?.rol) {
    case 'ADMINISTRADOR':
      return <PanelAdmin />;
    case 'DOCENTE':
      return <PanelDocente />;
    case 'ESTUDIANTE':
      return <PanelEstudiante />;
    default:
      return (
        <div className="panel-container">
          <div className="content-welcome-card" role="alert">
            <h2>Rol no reconocido</h2>
            <p>
              Su cuenta no tiene asignado uno de los roles oficiales de GesLab (Administrador, Docente, Estudiante). Comuníquese con la administración institucional.
            </p>
          </div>
        </div>
      );
  }
}

function ContenidoApp() {
  const { autenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner-large" aria-hidden="true"></div>
        <p>Cargando sesión de GesLab...</p>
      </div>
    );
  }

  if (!autenticado) {
    return <Login />;
  }

  return (
    <div className="dashboard-layout">
      {/* Enlace de salto accesible para usuarios de teclado y lectores de pantalla (WCAG 2.4.1) */}
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* Barra superior de navegación accesible */}
      <Navbar />

      {/* Contenedor principal para la vista activa */}
      <main id="contenido-principal" tabIndex="-1" className="dashboard-content">
        <EnrutadorPrincipal />
      </main>

      <footer className="dashboard-footer" role="contentinfo">
        © 2026 GesLab - Institución Universitaria Colegio Mayor del Cauca.
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <ContenidoApp />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
