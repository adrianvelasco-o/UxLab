import React, { useState, useRef } from 'react';

const TIPOS_DOCUMENTO = [
  { valor: 'CONSENTIMIENTO_INFORMADO', etiqueta: 'Consentimiento Informado (Requisito RN02)', destacado: true },
  { valor: 'PROTOCOLO_PRUEBA', etiqueta: 'Protocolo de Prueba UX' },
  { valor: 'GUIA_ACTIVIDAD', etiqueta: 'Guía de Actividades' },
  { valor: 'REPORTE_FINAL', etiqueta: 'Reporte Final' },
  { valor: 'EVIDENCIA', etiqueta: 'Evidencia Documental' },
  { valor: 'OTRO', etiqueta: 'Otro Documento' }
];

/**
 * Componente modular para gestión y carga de documentos PDF (PB3 / SB4).
 */
export function SeccionDocumentos({
  documentos = [],
  esEditable = false,
  onSubirDocumento,
  onDescargarDocumento
}) {
  const [tipoDocumento, setTipoDocumento] = useState('CONSENTIMIENTO_INFORMADO');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState('');
  const [descargandoId, setDescargandoId] = useState(null);
  const refInputArchivo = useRef(null);

  const tieneConsentimiento = documentos.some((d) => d.tipo === 'CONSENTIMIENTO_INFORMADO');

  const handleSeleccionarArchivo = (e) => {
    setErrorDocumento('');
    const archivo = e.target.files?.[0];
    if (!archivo) {
      setArchivoSeleccionado(null);
      return;
    }

    if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
      setErrorDocumento('Solo se admiten documentos en formato PDF (.pdf).');
      setArchivoSeleccionado(null);
      if (refInputArchivo.current) refInputArchivo.current.value = '';
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (archivo.size > maxBytes) {
      setErrorDocumento('El archivo supera el tamaño máximo permitido de 10 MB.');
      setArchivoSeleccionado(null);
      if (refInputArchivo.current) refInputArchivo.current.value = '';
      return;
    }

    setArchivoSeleccionado(archivo);
  };

  const handleSubirPdf = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      setErrorDocumento('Por favor seleccione un archivo PDF antes de subir.');
      return;
    }

    setSubiendoPdf(true);
    setErrorDocumento('');
    try {
      await onSubirDocumento(archivoSeleccionado, tipoDocumento);
      setArchivoSeleccionado(null);
      if (refInputArchivo.current) refInputArchivo.current.value = '';
    } catch (err) {
      setErrorDocumento(err.message || 'Error al subir el archivo PDF.');
    } finally {
      setSubiendoPdf(false);
    }
  };

  const handleDescargar = async (doc) => {
    setDescargandoId(doc.id);
    try {
      await onDescargarDocumento(doc.id, doc.nombreOriginal);
    } catch (err) {
      setErrorDocumento(err.message || 'No fue posible descargar el archivo.');
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <section className="detalle-documentos-card" aria-labelledby="seccion-documentos">
      <div className="seccion-header-flex">
        <h2 id="seccion-documentos" className="seccion-titulo-detalle">
          Documentos y Consentimientos PDF ({documentos.length})
        </h2>
        {tieneConsentimiento && (
          <span className="badge-consentimiento-ok" role="status">
            ✓ Consentimiento Informado Adjunto
          </span>
        )}
      </div>

      {/* Zona de subida de archivos PDF para la práctica */}
      {esEditable && (
        <form
          onSubmit={handleSubirPdf}
          className="form-subida-pdf-box"
          aria-labelledby="titulo-subida-pdf"
        >
          <h3 id="titulo-subida-pdf" className="form-subtitulo">
            Cargar Documento en Formato PDF
          </h3>

          {errorDocumento && (
            <div className="alerta-error" role="alert">
              {errorDocumento}
            </div>
          )}

          <div className="subida-pdf-grid">
            <div className="form-grupo">
              <label htmlFor="tipo-documento-sel">Tipo de Documento: *</label>
              <select
                id="tipo-documento-sel"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="select-campo"
                required
              >
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grupo">
              <label htmlFor="input-archivo-pdf">Archivo PDF (Máx. 10 MB): *</label>
              <input
                ref={refInputArchivo}
                id="input-archivo-pdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleSeleccionarArchivo}
                className="input-archivo-campo"
                required
              />
            </div>
          </div>

          <div className="subida-pdf-acciones">
            <button
              type="submit"
              className="btn-primario"
              disabled={subiendoPdf || !archivoSeleccionado}
              aria-busy={subiendoPdf ? 'true' : 'false'}
            >
              {subiendoPdf ? (
                <>
                  <span className="spinner-carga-btn" aria-hidden="true" />
                  <span>Subiendo PDF...</span>
                </>
              ) : (
                'Subir Archivo PDF'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Lista de documentos existentes */}
      {documentos.length === 0 ? (
        <div className="sin-instrumentos-box">
          <p>
            No hay documentos adjuntos a esta práctica aún.{' '}
            {esEditable && (
              <strong>
                Es obligatorio subir el documento de Consentimiento Informado en PDF para poder enviar la práctica a revisión docente (RN02).
              </strong>
            )}
          </p>
        </div>
      ) : (
        <div className="documentos-tabla-responsive">
          <table className="tabla-documentos" aria-label="Lista de documentos asociados a la práctica">
            <thead>
              <tr>
                <th scope="col">Tipo de Documento</th>
                <th scope="col">Nombre Original</th>
                <th scope="col">Tamaño</th>
                <th scope="col">Fecha de Carga</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                const esConsentimiento = doc.tipo === 'CONSENTIMIENTO_INFORMADO';
                const fechaCarga = doc.creadoEn
                  ? new Intl.DateTimeFormat('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    }).format(new Date(doc.creadoEn))
                  : 'N/A';

                return (
                  <tr key={doc.id} className={esConsentimiento ? 'fila-consentimiento-destacada' : ''}>
                    <td>
                      <span className={`badge-tipo-doc ${esConsentimiento ? 'badge-consentimiento' : ''}`}>
                        {doc.tipo}
                      </span>
                    </td>
                    <td>
                      <strong className="doc-nombre-texto">{doc.nombreOriginal}</strong>
                    </td>
                    <td>
                      {doc.tamanoBytes
                        ? `${(doc.tamanoBytes / 1024).toFixed(1)} KB`
                        : 'N/A'}
                    </td>
                    <td>{fechaCarga}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-descargar-doc"
                        disabled={descargandoId === doc.id}
                        onClick={() => handleDescargar(doc)}
                        aria-label={`Descargar archivo PDF ${doc.nombreOriginal}`}
                      >
                        {descargandoId === doc.id ? 'Descargando...' : 'Descargar PDF'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default SeccionDocumentos;