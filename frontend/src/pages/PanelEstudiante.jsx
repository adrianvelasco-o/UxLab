import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function PanelEstudiante() {
  const { usuario } = useAuth();

  return (
    <div className="panel-container">
      <div className="content-welcome-card">
        <h1>Panel del Estudiante — GesLab</h1>
        <p>
          Bienvenido(a), <strong>{usuario?.nombres} {usuario?.apellidos}</strong>. Formule sus prácticas de usabilidad, cargue instrumentos y solicite reservas de laboratorio.
        </p>
      </div>

      <section aria-labelledby="seccion-modulos-estudiante">
        <h2 id="seccion-modulos-estudiante" className="sr-only">Módulos de Estudiante</h2>

        <div className="system-modules-grid">
          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📋</div>
            <div className="module-info">
              <h3>Mis Prácticas UX</h3>
              <p>Formulación de prácticas de grado o asignaturas, definición de objetivos y selección de docente tutor.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📄</div>
            <div className="module-info">
              <h3>Documentos e Instrumentos</h3>
              <p>Carga de guías de actividad, consentimientos informados y pre-tests en formato PDF.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📅</div>
            <div className="module-info">
              <h3>Reservas de Espacios</h3>
              <p>Agendamiento de estaciones de prueba y cámara Gesell tras aprobación docente.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PanelEstudiante;
