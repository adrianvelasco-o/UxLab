import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { practicasService } from '../services/practicasService.js';
import { documentosService } from '../services/documentosService.js';

// ReutilizaciÃ³n directa de componentes especializados de PB4-A
import { HistorialRevisiones } from '../components/practicas/HistorialRevisiones.jsx';
import { SeccionInstrumentos } from '../components/practicas/SeccionInstrumentos.jsx';
import { SeccionDocumentos } from '../components/practicas/SeccionDocumentos.jsx';

/**
 * Vista de Detalle y EvaluaciÃ³n para el Docente Tutor (PB4-B-01).
 * Reutiliza los componentes atÃ³micos de instrumentos, documentos e historial en modo lectura (esEditable={false}).
 */
export function DetallePracticaDocente({ practicaId: propId }) {
  const { navegar } = useNavigation();

  // Obtener ID desde props o hash query (?id=...)
  const obtenerIdActivo = () => {
    if (propId) return propId;
    const hash = window.location.hash || '';
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    const id = params.get('id');
    return id ? parseInt(id, 10) : null;
  };

  const practicaId = obtenerIdActivo();

  const [practica, setPractica] = useState(null);
  const [instrumentos, setInstrumentos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [revisiones, setRevisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [anuncioLive, setAnuncioLive] = useState('');

  const cargarDetalle = useCallback(async () => {
    if (!practicaId) {
      setErrorGlobal('No se especificÃ³ un identificador de prÃ¡ctica vÃ¡lido.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setErrorGlobal('');
    try {
      const [datosPractica, datosRevisiones] = await Promise.all([
        practicasService.obtenerPorId(practicaId),
        practicasService.listarRevisiones(practicaId)
      ]);

      setPractica(datosPractica);
      setInstrumentos(datosPractica.instrumentos || []);
      setDocumentos(datosPractica.documentos || []);
      setRevisiones(datosRevisiones || []);
      setAnuncioLive(`PrÃ¡ctica "${datosPractica.titulo}" cargada para revisiÃ³n docente.`);
    } catch (err) {
      const msg = err.message || 'No fue posible cargar el detalle de la prÃ¡ctica solicitada.';
      setErrorGlobal(msg);
      setAnuncioLive(`Error: ${msg}`);
    } finally {
      setCargando(false);
    }
  }, [practicaId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  // Manejo de descarga de documentos PDF para el docente
  const handleDescargarDocumento = async (documentoId, nombreOriginal) => {
    try {
      const blob = await documentosService.descargarDocumento(documentoId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreOriginal || `documento-${documentoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setMensajeExito(`Descarga iniciada: ${nombreOriginal}`);
      setAnuncioLive(`Descarga iniciada para ${nombreOriginal}`);
    } catch (err) {
      setErrorGlobal(err.message || 'Error al descargar el documento.');
    }
  };

  if (cargando) {
    return (
      <div className="contenedor-detalle-practica" role="main">
        <p className="texto-cargando" role="status">Cargando prÃ¡ctica para revisiÃ³n docente...</p>
      </div>
    );
  }

  if (errorGlobal && !practica) {
    return (
      <div className="contenedor-detalle-practica" role="main">
        <div className="alerta-error" role="alert">
          <h2>Error al cargar la prÃ¡ctica</h2>
          <p>{errorGlobal}</p>
          <button
            type="button"
            className="btn-primario"
            onClick={() => navegar(RUTAS.DOCENTE)}
          >
            &larr; Volver a la Bandeja Docente
          </button>
        </div>
      </div>
    );
  }

  const esEnRevision = practica.estado === 'EN_REVISION';
  const esAprobada = practica.estado === 'APROBADA';
  const esRechazada = practica.estado === 'RECHAZADA';

  return (
    <div className="contenedor-detalle-practica" role="main" aria-labelledby="titulo-detalle-docente">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      {/* NavegaciÃ³n Contextual */}
      <nav className="migas-navegacion" aria-label="NavegaciÃ³n contextual">
        <button
          type="button"
          className="btn-volver-enlace"
          onClick={() => navegar(RUTAS.DOCENTE)}
        >
          &larr; Volver a la Bandeja de PrÃ¡cticas Docente
        </button>
      </nav>

      {/* Cabecera Principal de la PrÃ¡ctica */}
      <header className="detalle-header-card">
        <div className="detalle-header-top">
          <div className="detalle-header-titulos">
            <span className={`badge-estado badge-${practica.estado.toLowerCase()}`} role="status">
              Estado: {practica.estado.replace('_', ' ')}
            </span>
            <h1 id="titulo-detalle-docente" className="detalle-titulo-principal">
              {practica.titulo}
            </h1>
          </div>
        </div>

        <p className="detalle-descripcion-texto">{practica.descripcion}</p>

        <div className="detalle-meta-grid">
          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Estudiante Autor:</span>
            <strong className="meta-valor">
              {practica.estudiante
                ? `${practica.estudiante.nombres} ${practica.estudiante.apellidos}`
                : 'N/A'}
            </strong>
          </div>

          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Docente Tutor Asignado:</span>
            <span className="meta-valor">
              {practica.docente
                ? `${practica.docente.nombres} ${practica.docente.apellidos}`
                : 'Sin docente tutor asignado'}
            </span>
          </div>

          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Fecha de EnvÃ­o / ActualizaciÃ³n:</span>
            <span className="meta-valor">
              {practica.actualizadoEn
                ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(practica.actualizadoEn))
                : 'N/A'}
            </span>
          </div>
        </div>
      </header>

      {/* Mensajes de Ã©xito globales */}
      {mensajeExito && (
        <div className="alerta-exito" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {/* Banner de Estado para la RevisiÃ³n Docente */}
      {esEnRevision && (
        <div className="banner-estado-revision" role="status" style={{ borderLeft: '4px solid #0f766e', backgroundColor: '#f0fdfa', padding: '1rem', borderRadius: '6px', margin: '1.5rem 0' }}>
          <p>
            <strong>PrÃ¡ctica lista para dictamen docente:</strong> Esta propuesta fue enviada por el estudiante con sus instrumentos y consentimiento informado completos. Revise los elementos a continuaciÃ³n para proceder con la emisiÃ³n del dictamen metodolÃ³gico.
          </p>
          <p style={{ marginTop: '0.5rem', color: '#0f766e', fontSize: '0.9rem' }}>
            <em>(El formulario interactivo de emisiÃ³n de dictamen Aprobada/Rechazada se habilitarÃ¡ en la siguiente unidad PB4-B-02).</em>
          </p>
        </div>
      )}

      {esAprobada && (
        <div className="banner-estado-aprobada" role="status" style={{ borderLeft: '4px solid #16a34a', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '6px', margin: '1.5rem 0' }}>
          <p>
            <strong>PrÃ¡ctica Aprobada:</strong> Esta prÃ¡ctica ya cuenta con dictamen favorable y sus instrumentos han sido validados institucionalmente.
          </p>
        </div>
      )}

      {esRechazada && (
        <div className="banner-estado-rechazada" role="status" style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '6px', margin: '1.5rem 0' }}>
          <p>
            <strong>PrÃ¡ctica con Observaciones:</strong> El estudiante se encuentra subsanando las observaciones emitidas en revisiones anteriores.
          </p>
        </div>
      )}

      {/* Alcance MetodolÃ³gico */}
      <section className="detalle-metodologico-card" aria-labelledby="seccion-metodologia-doc">
        <h2 id="seccion-metodologia-doc" className="seccion-titulo-detalle">
          Alcance y Objetivo MetodolÃ³gico
        </h2>
        <div className="resumen-metodologico-grid">
          <div className="resumen-metodologico-item">
            <p><strong>Objetivo de Usabilidad a Evaluar:</strong></p>
            <p>{practica.objetivo}</p>
          </div>
        </div>
      </section>

      {/* ReutilizaciÃ³n de Componentes de PB4-A en Modo Solo Lectura (esEditable=false) */}
      <SeccionInstrumentos
        instrumentos={instrumentos}
        esEditable={false}
      />

      <SeccionDocumentos
        documentos={documentos}
        esEditable={false}
        onDescargarDocumento={handleDescargarDocumento}
      />

      <HistorialRevisiones
        revisiones={revisiones}
        cargando={false}
      />
    </div>
  );
}

export default DetallePracticaDocente;