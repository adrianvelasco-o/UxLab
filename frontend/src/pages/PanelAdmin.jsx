import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';

export function PanelAdmin() {
  const { usuario } = useAuth();
  const { navegar } = useNavigation();

  return (
    <div className="panel-container">
      <div className="content-welcome-card">
        <h1>Panel de Administración Institucional</h1>
        <p>
          Bienvenido(a), <strong>{usuario?.nombres} {usuario?.apellidos}</strong>. Administre cuentas institucionales, asignación de roles y parámetros operativos de GesLab.
        </p>
      </div>

      <section aria-labelledby="seccion-acciones-admin">
        <h2 id="seccion-acciones-admin" className="sr-only">Módulos de Gestión de Administrador</h2>

        <div className="system-modules-grid">
          {/* Módulo destacado de Gestión de Usuarios y Roles (PB2 / SB3) */}
          <div className="module-card module-card-action">
            <div className="module-icon-wrap" aria-hidden="true">👥</div>
            <div className="module-info">
              <h3>Gestión de Usuarios y Roles</h3>
              <p>Alta de usuarios institucionales, cambio de roles oficiales (Administrador, Docente, Estudiante) y control de estado activo/inactivo.</p>
              <button
                type="button"
                onClick={() => navegar(RUTAS.ADMIN_USUARIOS, 'Gestión de Usuarios')}
                className="btn-modulo-admin"
              >
                Abrir Gestión de Usuarios →
              </button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">🔬</div>
            <div className="module-info">
              <h3>Laboratorios y Salas</h3>
              <p>Configuración de capacidad, equipos de laboratorio de usabilidad y estaciones de prueba.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📅</div>
            <div className="module-info">
              <h3>Franjas Horarias</h3>
              <p>Definición de bloques de agendamiento semanal y disponibilidad para el laboratorio.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📊</div>
            <div className="module-info">
              <h3>Auditoría y Trazabilidad</h3>
              <p>Registro de eventos de seguridad, control de accesos y actividad del sistema.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PanelAdmin;
