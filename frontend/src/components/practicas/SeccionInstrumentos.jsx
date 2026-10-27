import React, { useState, useRef } from 'react';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar.jsx';

const TIPOS_INSTRUMENTO = [
  { valor: 'GUIA_OBSERVACION', etiqueta: 'GuÃ­a de ObservaciÃ³n' },
  { valor: 'CUESTIONARIO_PRE_TEST', etiqueta: 'Cuestionario Pre-Test' },
  { valor: 'BANCO_TAREAS', etiqueta: 'Banco de Tareas' },
  { valor: 'CUESTIONARIO_POST_TEST', etiqueta: 'Cuestionario Post-Test' }
];

/**
 * Componente modular para gestiÃ³n de instrumentos de evaluaciÃ³n UX (PB3 / SB4).
 */
export function SeccionInstrumentos({
  instrumentos = [],
  esEditable = false,
  onCrearInstrumento,
  onEliminarInstrumento
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState('GUIA_OBSERVACION');
  const [nombre, setNombre] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [contenido, setContenido] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Estados para modal accesible de confirmaciÃ³n de eliminaciÃ³n
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const triggerEliminarRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm('');

    if (!nombre.trim()) {
      setErrorForm('El nombre del instrumento es obligatorio.');
      return;
    }

    let contenidoParsed = null;
    if (contenido.trim()) {
      try {
        contenidoParsed = JSON.parse(contenido);
      } catch (err) {
        setErrorForm('El contenido estructurado debe ser un JSON vÃ¡lido o dejarse vacÃ­o.');
        return;
      }
    }

    setGuardando(true);
    try {
      await onCrearInstrumento({
        tipo,
        nombre: nombre.trim(),
        instrucciones: instrucciones.trim() || undefined,
        contenido: contenidoParsed || undefined
      });
      // Limpiar formulario al guardar con Ã©xito
      setNombre('');
      setInstrucciones('');
      setContenido('');
      setMostrarForm(false);
    } catch (err) {
      setErrorForm(err.message || 'Error al registrar el instrumento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirEliminar = (inst, e) => {
    triggerEliminarRef.current = e.currentTarget;
    setItemAEliminar(inst);
  };

  const handleConfirmarEliminar = async () => {
    if (!itemAEliminar) return;
    setEliminando(true);
    try {
      await onEliminarInstrumento(itemAEliminar.id, itemAEliminar.nombre);
      setItemAEliminar(null);
    } catch (err) {
      // Error manejado en componente padre
    } finally {
      setEliminando(false);
    }
  };

  return (
    <section className="detalle-instrumentos-card" aria-labelledby="seccion-instrumentos">
      <div className="seccion-header-flex">
        <h2 id="seccion-instrumentos" className="seccion-titulo-detalle">
          Instrumentos de EvaluaciÃ³n ({instrumentos.length})
        </h2>
        {esEditable && (
          <button
            type="button"
            className="btn-secundario"
            onClick={() => setMostrarForm(!mostrarForm)}
            aria-expanded={mostrarForm}
            aria-controls="form-nuevo-instrumento"
          >
            {mostrarForm ? 'Cancelar Nuevo Instrumento' : '+ Agregar Instrumento'}
          </button>
        )}
      </div>

      {/* Formulario de registro de nuevo instrumento */}
      {mostrarForm && esEditable && (
        <form
          id="form-nuevo-instrumento"
          onSubmit={handleSubmit}
          className="form-nuevo-instrumento-box"
          aria-labelledby="titulo-form-instrumento"
        >
          <h3 id="titulo-form-instrumento" className="form-subtitulo">
            Registrar Nuevo Instrumento de EvaluaciÃ³n
          </h3>

          {errorForm && (
            <div className="alerta-error" role="alert">
              {errorForm}
            </div>
          )}

          <div className="form-grupo">
            <label htmlFor="tipo-instrumento-sel">Tipo de Instrumento: *</label>
            <select
              id="tipo-instrumento-sel"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="select-campo"
              required
            >
              {TIPOS_INSTRUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grupo">
            <label htmlFor="nombre-instrumento-inp">Nombre del Instrumento: *</label>
            <input
              id="nombre-instrumento-inp"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input-campo"
              placeholder="Ej: GuÃ­a de observaciÃ³n tareas crÃ­ticas"
              required
            />
          </div>

          <div className="form-grupo">
            <label htmlFor="instrucciones-instrumento-txt">Instrucciones de aplicaciÃ³n (Opcional):</label>
            <textarea
              id="instrucciones-instrumento-txt"
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              className="textarea-campo"
              rows="3"
              placeholder="Instrucciones para el evaluador o participante..."
            />
          </div>

          <div className="form-grupo">
            <label htmlFor="contenido-instrumento-json">Contenido Estructurado JSON (Opcional):</label>
            <textarea
              id="contenido-instrumento-json"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="textarea-campo fuente-mono"
              rows="4"
              placeholder='Ej: { "preguntas": ["Â¿La interfaz fue clara?", "Â¿EncontrÃ³ obstÃ¡culos?"] }'
            />
          </div>

          <div className="form-botones-flex">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => setMostrarForm(false)}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primario"
              disabled={guardando}
              aria-busy={guardando ? 'true' : 'false'}
            >
              {guardando ? 'Guardando...' : 'Guardar Instrumento'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de instrumentos */}
      {instrumentos.length === 0 ? (
        <div className="sin-instrumentos-box">
          <p>
            No hay instrumentos de evaluaciÃ³n registrados aÃºn.{' '}
            {esEditable && 'Agregue al menos uno para poder solicitar la revisiÃ³n docente (RN02).'}
          </p>
        </div>
      ) : (
        <div className="instrumentos-grid-lista" role="list">
          {instrumentos.map((inst) => (
            <article
              key={inst.id}
              className="instrumento-card-item"
              role="listitem"
              aria-labelledby={`inst-titulo-${inst.id}`}
            >
              <div className="instrumento-card-header">
                <span className="instrumento-tipo-badge">{inst.tipo}</span>
                {esEditable && (
                  <button
                    type="button"
                    className="btn-icono-eliminar"
                    onClick={(e) => handleAbrirEliminar(inst, e)}
                    aria-label={`Eliminar instrumento ${inst.nombre}`}
                    title="Eliminar instrumento"
                  >
                    &times;
                  </button>
                )}
              </div>
              <h3 id={`inst-titulo-${inst.id}`} className="instrumento-card-titulo">
                {inst.nombre}
              </h3>
              {inst.instrucciones && (
                <p className="instrumento-card-instrucciones">{inst.instrucciones}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Modal accesible de confirmaciÃ³n para eliminar instrumento (Reemplazo WCAG de window.confirm) */}
      <ModalConfirmarEliminar
        abierto={Boolean(itemAEliminar)}
        titulo="Eliminar Instrumento de EvaluaciÃ³n"
        itemNombre={itemAEliminar?.nombre || ''}
        onCerrar={() => setItemAEliminar(null)}
        onConfirmar={handleConfirmarEliminar}
        eliminando={eliminando}
        triggerRef={triggerEliminarRef}
      />
    </section>
  );
}

export default SeccionInstrumentos;