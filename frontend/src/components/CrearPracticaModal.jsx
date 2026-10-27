import React, { useState, useEffect, useRef } from 'react';
import { practicasService } from '../services/practicasService.js';

/**
 * Modal accesible para la formulación y alta de una nueva práctica por el Estudiante (PB3 / SB4).
 * Cumple WCAG 2.1: 1.3.1, 1.3.2, 2.1.1, 2.1.2, 2.4.3, 3.3.1, 3.3.2, 4.1.2.
 */
export function CrearPracticaModal({
  abierto,
  alCerrar,
  alCrearExitoso,
  docentes = [],
  cargandoDocentes = false
}) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [docenteId, setDocenteId] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const [errores, setErrores] = useState({});

  const refPrimerInput = useRef(null);
  const refModal = useRef(null);

  // Reiniciar estado al abrir o cerrar
  useEffect(() => {
    if (abierto) {
      setTitulo('');
      setDescripcion('');
      setObjetivo('');
      setDocenteId('');
      setErrores({});
      setErrorServidor('');

      // Enfocar primer campo tras renderizado (WCAG 2.4.3)
      setTimeout(() => {
        if (refPrimerInput.current) {
          refPrimerInput.current.focus();
        }
      }, 50);
    }
  }, [abierto]);

  // Trampa de foco accesible y cierre con tecla Escape (WCAG 2.1.1, 2.1.2)
  useEffect(() => {
    if (!abierto) return;

    function manejarTeclado(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        alCerrar();
        return;
      }

      if (e.key === 'Tab') {
        const modal = refModal.current;
        if (!modal) return;

        const elementosFoco = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const primerElemento = elementosFoco[0];
        const ultimoElemento = elementosFoco[elementosFoco.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === primerElemento) {
            e.preventDefault();
            ultimoElemento.focus();
          }
        } else {
          if (document.activeElement === ultimoElemento) {
            e.preventDefault();
            primerElemento.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  // Validación previa en frontend
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!titulo.trim()) {
      nuevosErrores.titulo = 'El título de la práctica es obligatorio.';
    } else if (titulo.trim().length < 3) {
      nuevosErrores.titulo = 'El título debe tener al menos 3 caracteres.';
    }

    if (!descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria.';
    } else if (descripcion.trim().length < 5) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 5 caracteres.';
    }

    if (!objetivo.trim()) {
      nuevosErrores.objetivo = 'El objetivo metodológico es obligatorio.';
    } else if (objetivo.trim().length < 5) {
      nuevosErrores.objetivo = 'El objetivo debe tener al menos 5 caracteres.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setErrorServidor('');

    if (!validarFormulario()) {
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivo: objetivo.trim(),
        docenteId: docenteId ? parseInt(docenteId, 10) : null
      };

      const nuevaPractica = await practicasService.crear(payload);
      alCrearExitoso(nuevaPractica);
      alCerrar();
    } catch (err) {
      setErrorServidor(
        err.message || 'No fue posible registrar la práctica. Verifique los datos e intente nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div
        className="modal-contenido modal-lg"
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-crear-practica"
        aria-describedby="descripcion-modal-crear-practica"
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 id="titulo-modal-crear-practica">Formular Nueva Práctica de Usabilidad</h2>
            <p id="descripcion-modal-crear-practica" className="modal-subtitulo">
              Registre los datos iniciales de su práctica. Quedará guardada en estado <strong>Borrador</strong> para asociar posteriormente instrumentos y documentos.
            </p>
          </div>
          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={alCerrar}
            aria-label="Cerrar modal de formulación de práctica"
          >
            ✕
          </button>
        </div>

        {errorServidor && (
          <div className="mensaje-alerta error" role="alert">
            <span aria-hidden="true" className="icono-alerta">⚠️</span>
            <span>{errorServidor}</span>
          </div>
        )}

        <form onSubmit={manejarEnvio} noValidate className="formulario-modal">
          {/* Campo Título */}
          <div className={`campo-grupo ${errores.titulo ? 'con-error' : ''}`}>
            <label htmlFor="campo-titulo-practica">
              Título de la Práctica <span className="campo-obligatorio" aria-hidden="true">*</span>
            </label>
            <input
              id="campo-titulo-practica"
              ref={refPrimerInput}
              type="text"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                if (errores.titulo) setErrores({ ...errores, titulo: '' });
              }}
              placeholder="Ej: Evaluación de usabilidad de la pasarela de pagos"
              aria-required="true"
              aria-invalid={errores.titulo ? 'true' : 'false'}
              aria-describedby={errores.titulo ? 'error-titulo-practica' : 'ayuda-titulo-practica'}
              disabled={guardando}
            />
            <span id="ayuda-titulo-practica" className="texto-ayuda">
              Nombre claro y descriptivo del proyecto o prueba a ejecutar (mín. 3 caracteres).
            </span>
            {errores.titulo && (
              <span id="error-titulo-practica" className="texto-error" role="alert">
                {errores.titulo}
              </span>
            )}
          </div>

          {/* Campo Descripción */}
          <div className={`campo-grupo ${errores.descripcion ? 'con-error' : ''}`}>
            <label htmlFor="campo-descripcion-practica">
              Descripción General <span className="campo-obligatorio" aria-hidden="true">*</span>
            </label>
            <textarea
              id="campo-descripcion-practica"
              rows="3"
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                if (errores.descripcion) setErrores({ ...errores, descripcion: '' });
              }}
              placeholder="Describa el contexto, público objetivo y alcance de la prueba de laboratorio..."
              aria-required="true"
              aria-invalid={errores.descripcion ? 'true' : 'false'}
              aria-describedby={errores.descripcion ? 'error-desc-practica' : 'ayuda-desc-practica'}
              disabled={guardando}
            />
            <span id="ayuda-desc-practica" className="texto-ayuda">
              Contexto general y justificación de la prueba UX (mín. 5 caracteres).
            </span>
            {errores.descripcion && (
              <span id="error-desc-practica" className="texto-error" role="alert">
                {errores.descripcion}
              </span>
            )}
          </div>

          {/* Campo Objetivo */}
          <div className={`campo-grupo ${errores.objetivo ? 'con-error' : ''}`}>
            <label htmlFor="campo-objetivo-practica">
              Objetivo Metodológico <span className="campo-obligatorio" aria-hidden="true">*</span>
            </label>
            <textarea
              id="campo-objetivo-practica"
              rows="3"
              value={objetivo}
              onChange={(e) => {
                setObjetivo(e.target.value);
                if (errores.objetivo) setErrores({ ...errores, objetivo: '' });
              }}
              placeholder="Ej: Evaluar la tasa de éxito de tareas y satisfacción subjetiva mediante métricas SUS..."
              aria-required="true"
              aria-invalid={errores.objetivo ? 'true' : 'false'}
              aria-describedby={errores.objetivo ? 'error-obj-practica' : 'ayuda-obj-practica'}
              disabled={guardando}
            />
            <span id="ayuda-obj-practica" className="texto-ayuda">
              Meta concreta medible que se validará con los instrumentos (mín. 5 caracteres).
            </span>
            {errores.objetivo && (
              <span id="error-obj-practica" className="texto-error" role="alert">
                {errores.objetivo}
              </span>
            )}
          </div>

          {/* Campo Docente Tutor */}
          <div className="campo-grupo">
            <label htmlFor="campo-docente-practica">
              Docente Tutor Asignado <span className="texto-opcional">(Opcional al formular)</span>
            </label>
            <select
              id="campo-docente-practica"
              value={docenteId}
              onChange={(e) => setDocenteId(e.target.value)}
              disabled={guardando || cargandoDocentes}
              aria-describedby="ayuda-docente-practica"
            >
              <option value="">
                {cargandoDocentes
                  ? 'Cargando lista de docentes activos...'
                  : '-- Seleccionar docente tutor institucional (opcional) --'}
              </option>
              {docentes.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.nombres} {docente.apellidos} ({docente.correoInstitucional})
                </option>
              ))}
            </select>
            <span id="ayuda-docente-practica" className="texto-ayuda">
              Puede asignar el tutor ahora o posteriormente antes de enviar la práctica a revisión docente.
            </span>
          </div>

          {/* Acciones del Modal */}
          <div className="modal-acciones">
            <button
              type="button"
              className="btn btn-secundario"
              onClick={alCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primario"
              disabled={guardando}
              aria-busy={guardando ? 'true' : 'false'}
            >
              {guardando ? (
                <>
                  <span className="spinner-small" aria-hidden="true"></span>
                  <span>Guardando Práctica...</span>
                </>
              ) : (
                'Crear Práctica en Borrador'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrearPracticaModal;
