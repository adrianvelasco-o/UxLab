import React, { useEffect, useRef } from 'react';

/**
 * Modal accesible de confirmaciÃ³n para eliminaciÃ³n (Reemplazo de window.confirm).
 * Implementa role="alertdialog", aria-modal="true", y Focus Trap cÃ­clico.
 */
export function ModalConfirmarEliminar({
  abierto,
  titulo = 'Confirmar EliminaciÃ³n',
  mensaje = 'Â¿EstÃ¡ seguro de eliminar este elemento? Esta acciÃ³n no se puede deshacer.',
  itemNombre = '',
  onCerrar,
  onConfirmar,
  eliminando = false,
  triggerRef
}) {
  const modalRef = useRef(null);
  const cancelarBtnRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      cancelarBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!eliminando) {
          onCerrar();
          triggerRef?.current?.focus();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const selectores = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(modalRef.current.querySelectorAll(selectores));

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const primerElemento = focusableElements[0];
        const ultimoElemento = focusableElements[focusableElements.length - 1];

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
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto, eliminando, onCerrar, triggerRef]);

  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !eliminando) {
          onCerrar();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={modalRef}
        className="modal-contenido modal-alerta"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-eliminar"
        aria-describedby="desc-modal-eliminar"
      >
        <div className="modal-header">
          <h2 id="titulo-modal-eliminar" className="modal-titulo" style={{ color: '#991b1b' }}>
            {titulo}
          </h2>
          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={() => {
              if (!eliminando) {
                onCerrar();
                triggerRef?.current?.focus();
              }
            }}
            disabled={eliminando}
            aria-label="Cerrar ventana de confirmaciÃ³n"
          >
            &times;
          </button>
        </div>

        <div className="modal-cuerpo">
          <p id="desc-modal-eliminar">
            {itemNombre ? (
              <>
                Â¿EstÃ¡ seguro de eliminar <strong>"{itemNombre}"</strong>? Esta acciÃ³n no se puede deshacer.
              </>
            ) : (
              mensaje
            )}
          </p>
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
            disabled={eliminando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-guardar-modal"
            style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
            onClick={onConfirmar}
            disabled={eliminando}
            aria-busy={eliminando ? 'true' : 'false'}
          >
            {eliminando ? (
              <>
                <span className="spinner-carga-btn" aria-hidden="true" />
                <span>Eliminando...</span>
              </>
            ) : (
              <span>SÃ­, Eliminar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmarEliminar;