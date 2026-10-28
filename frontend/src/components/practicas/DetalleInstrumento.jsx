import React from 'react';

const ETIQUETAS_TIPO = {
  GUIA_OBSERVACION: 'Guía de Observación',
  CUESTIONARIO_PRE_TEST: 'Cuestionario Pre-Test',
  BANCO_TAREAS: 'Banco de Tareas',
  CUESTIONARIO_POST_TEST: 'Cuestionario Post-Test'
};

const ETIQUETAS_CLAVE = {
  preguntas: 'Preguntas',
  tareas: 'Tareas',
  opciones: 'Opciones',
  escalas: 'Escalas',
  instrucciones: 'Instrucciones',
  secciones: 'Secciones',
  metricas: 'Métricas'
};

function etiquetaTipo(tipo) {
  return ETIQUETAS_TIPO[tipo] || tipo;
}

function etiquetaClave(clave) {
  if (ETIQUETAS_CLAVE[clave]) return ETIQUETAS_CLAVE[clave];
  return String(clave)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

function esValorVacio(valor) {
  if (valor === null || valor === undefined || valor === '') return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

function esPrimitivo(valor) {
  return valor === null || ['string', 'number', 'boolean'].includes(typeof valor);
}

function ContenidoEstructurado({ valor }) {
  if (esValorVacio(valor)) {
    return (
      <p className="instrumento-contenido-vacio">
        Este instrumento no tiene contenido estructurado registrado.
      </p>
    );
  }

  if (esPrimitivo(valor)) {
    return <p className="instrumento-contenido-texto">{String(valor)}</p>;
  }

  if (Array.isArray(valor)) {
    const todosPrimitivos = valor.every(esPrimitivo);
    return (
      <ol className="instrumento-contenido-lista">
        {valor.map((item, indice) => (
          <li key={`item-${indice}`}>
            {todosPrimitivos || esPrimitivo(item) ? (
              String(item)
            ) : (
              <ContenidoEstructurado valor={item} />
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof valor === 'object') {
    return (
      <dl className="instrumento-contenido-lista-definicion">
        {Object.entries(valor).map(([clave, item]) => (
          <div key={clave} className="instrumento-contenido-entrada">
            <dt>{etiquetaClave(clave)}</dt>
            <dd>
              <ContenidoEstructurado valor={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <pre className="instrumento-contenido-fallback">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

/**
 * Presentación de un instrumento de evaluación (PB5-01).
 * Inspección/consulta: metadatos, expandir/colapsar y contenido estructurado.
 */
export function DetalleInstrumento({ instrumento, esEditable = false, onSolicitarEliminar }) {
  const tituloId = `inst-titulo-${instrumento.id}`;
  const contenidoId = `inst-contenido-${instrumento.id}`;
  const tieneContenido = !esValorVacio(instrumento.contenido);
  const nombreTipo = etiquetaTipo(instrumento.tipo);

  return (
    <article
      className="instrumento-card-item"
      role="listitem"
      aria-labelledby={tituloId}
    >
      <div className="instrumento-card-header">
        <span className="instrumento-tipo-badge">{nombreTipo}</span>
        {esEditable && (
          <button
            type="button"
            className="btn-icono-eliminar"
            onClick={(e) => onSolicitarEliminar(instrumento, e)}
            aria-label={`Eliminar instrumento ${instrumento.nombre}`}
            title="Eliminar instrumento"
          >
            &times;
          </button>
        )}
      </div>

      <h3 id={tituloId} className="instrumento-card-titulo">
        {instrumento.nombre}
      </h3>

      {instrumento.instrucciones && (
        <p className="instrumento-card-instrucciones">
          <span className="sr-only">Instrucciones: </span>
          {instrumento.instrucciones}
        </p>
      )}

      <details className="instrumento-detalle-contenido">
        <summary>
          {tieneContenido
            ? `Ver contenido de ${instrumento.nombre}`
            : `Contenido de ${instrumento.nombre} (sin datos estructurados)`}
        </summary>
        <div id={contenidoId} className="instrumento-contenido-cuerpo">
          <h4 className="instrumento-contenido-encabezado">Contenido estructurado</h4>
          {tieneContenido ? (
            <ContenidoEstructurado valor={instrumento.contenido} />
          ) : (
            <p className="instrumento-contenido-vacio">
              Este instrumento no tiene contenido estructurado registrado.
            </p>
          )}
        </div>
      </details>
    </article>
  );
}

export default DetalleInstrumento;
