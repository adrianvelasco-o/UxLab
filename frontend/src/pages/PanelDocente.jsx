import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function PanelDocente() {
  const { usuario } = useAuth();

  return (
    <div className="panel-container">
      <div className="content-welcome-card">
        <h1>Panel del Docente — GesLab</h1>
        <p>
          Bienvenido(a), profesor(a) <strong>{usuario?.nombres} {usuario?.apellidos}</strong>. Gestione revisiones metodológicas y asesoría de prácticas de usabilidad.
        </p>
      </div>

      <section aria-labelledby="seccion-modulos-docente">
        <h2 id="seccion-modulos-docente" className="sr-only">Módulos de Docencia</h2>

        <div className="system-modules-grid">
          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">📝</div>
            <div className="module-info">
              <h3>Revisión de Prácticas (HU03)</h3>
              <p>Revisión de propuestas enviadas por estudiantes, emisión de observaciones y aprobación de protocolos.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">🔍</div>
            <div className="module-info">
              <h3>Instrumentos UX</h3>
              <p>Validación de consentimientos informados, guías heurísticas y bancos de tareas asociados.</p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-icon-wrap" aria-hidden="true">🔔</div>
            <div className="module-info">
              <h3>Notificaciones de Asignación</h3>
              <p>Alertas automáticas cuando un estudiante lo seleccione como tutor de su práctica.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PanelDocente;
