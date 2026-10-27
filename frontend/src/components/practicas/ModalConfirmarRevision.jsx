import React, { useEffect, useRef } from 'react';

/**
 * Modal accesible de confirmaciÃ³n para envÃ­o a revisiÃ³n docente.
 * Cumple WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7 y 4.1.2 con Focus Trap cÃ­clico estricto.
 */
export function ModalConfirmarRevision({
  abierto,
  onCerrar,
  onConfirmar,
  enviando = false,
  error = '',
  esRechazada = false,
  triggerRef
}) {
  const modalRef = useRef(null);
  const cancelarBtnRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    // 1. Prevenir scroll del fondo mientras el modal estÃ¡ activo
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 2. Foco inicial al botÃ³n de cancelaciÃ³n
    const timer = setTimeout(() => {
      cancelarBtnRef.current?.focus();
    }, 50);

    // 3. Focus Trap estricto (Tab / Shift+Tab) y cierre con Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!enviando) {
          onCerrar();
          triggerRef?.current?.focus();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;

        const selectores = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(modalRef.current.querySelectorAll(selectores));

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const primerElemento = focusableElements[0];
        const ultimoElemento = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: si estÃ¡ en el primero, cicla al Ãºltimo
          if (document.activeElement === primerElemento) {
            e.preventDefault();
            ultimoElemento.focus();
          }
        } else {
          // Tab: si estÃ¡ en el Ãºltimo, cicla al primero
          if (document.activeElement === ultimoElemento) {
            e.preventDefault();
            primerElemento.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto, enviando, onCerrar, triggerRef]);

  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) {
          onCerrar();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={modalRef}
        className="modal-contenido"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-revision"
        aria-describedby="desc-modal-revision"
      >
        <div className="modal-header">
          <h2 id="titulo-modal-revision" className="modal-titulo">
            {esRechazada ? 'Confirmar ReenvÃ­o a RevisiÃ³n Docente' : 'Confirmar EnvÃ­o a RevisiÃ³n Docente'}
          </h2>
          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={() => {
              if (!enviando) {
                onCerrar();
                triggerRef?.current?.focus();
              }
            }}
            disabled={enviando}
            aria-label="Cerrar modal de confirmaciÃ³n"
          >
            &times;
          </button>
        </div>

        <div className="modal-cuerpo">
          <p id="desc-modal-revision">
            {esRechazada
              ? 'Â¿EstÃ¡ seguro de reenviar esta prÃ¡ctica a revisiÃ³n docente? Todas las observaciones previas han sido marcadas como resueltas. El docente tutor recibirÃ¡ una notificaciÃ³n para dictaminar nuevamente la prÃ¡ctica.'
              : 'Â¿EstÃ¡ seguro de enviar esta prÃ¡ctica a revisiÃ³n docente? Una vez enviada, la prÃ¡ctica pasarÃ¡ al estado "En RevisiÃ³n" y no podrÃ¡ modificarse hasta que el docente tutor emita su dictamen metodolÃ³gico.'}
          </p>

          {error && (
            <div className="alerta-error" role="alert" tabIndex="-1" style={{ marginTop: '1rem' }}>
              <strong>No fue posible enviar:</strong> {error}
            </div>
          )}
        </div>

        <div className="modal-acciones">
          <button
            ref={cancelarBtnRef}
            type="button"
            className="btn-cancelar-modal"
            onClick={() => {
              onCerrar();
              triggerRef?.current?.focus();
            }}
            disabled={enviando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-guardar-modal"
            onClick={onConfirmar}
            disabled={enviando}
            aria-busy={enviando ? 'true' : 'false'}
          >
            {enviando ? (
              <>
                <span className="spinner-carga-btn" aria-hidden="true" />
                <span>Enviando solicitud...</span>
              </>
            ) : (
              <span>Confirmar y Enviar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmarRevision;