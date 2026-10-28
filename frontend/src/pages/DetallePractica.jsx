import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, RUTAS } from '../context/NavigationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { practicasService } from '../services/practicasService.js';
import { documentosService } from '../services/documentosService.js';

// Componentes modulares de práctica (PB3 / SB4 y PB4-A / SB5)
import { AccionRevisionEstudiante } from '../components/practicas/AccionRevisionEstudiante.jsx';
import { ModalConfirmarRevision } from '../components/practicas/ModalConfirmarRevision.jsx';
import { HistorialRevisiones } from '../components/practicas/HistorialRevisiones.jsx';
import { ObservacionesRevision } from '../components/practicas/ObservacionesRevision.jsx';
import { SeccionInstrumentos } from '../components/practicas/SeccionInstrumentos.jsx';
import { SeccionDocumentos } from '../components/practicas/SeccionDocumentos.jsx';

/**
 * Vista Orquestadora de Detalle de Práctica UX (PB3 / SB4 y PB4-A / SB5).
 * Coordina la carga de datos, estados de ciclo de vida y delega responsabilidades
 * en componentes modulares accesibles bajo WCAG 2.1.
 */
export function DetallePractica({ practicaId: propId }) {
  const { navegar } = useNavigation();
  const { usuario } = useAuth();

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

  // Estados de datos principales
  const [practica, setPractica] = useState(null);
  const [instrumentos, setInstrumentos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [revisiones, setRevisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoRevisiones, setCargandoRevisiones] = useState(false);

  // Estados de retroalimentación accesible (WCAG 3.3.1 y 4.1.3)
  const [errorGlobal, setErrorGlobal] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [anuncioLive, setAnuncioLive] = useState('');

  // Estados para Modal de Envío a Revisión Docente
  const [modalRevisionAbierto, setModalRevisionAbierto] = useState(false);
  const [enviandoRevision, setEnviandoRevision] = useState(false);
  const [errorModalRevision, setErrorModalRevision] = useState('');
  const [resolviendoObsId, setResolviendoObsId] = useState(null);

  // Referencia para gestión de retorno de foco tras modal
  const refBotonSolicitarRevision = useRef(null);

  // Mensaje accesible temporal
  const mostrarExito = useCallback((texto) => {
    setMensajeExito(texto);
    setAnuncioLive(texto);
    setTimeout(() => {
      setMensajeExito('');
    }, 6000);
  }, []);

  // Carga coordinada de los datos de la práctica
  const cargarDetalle = useCallback(async () => {
    if (!practicaId) {
      setErrorGlobal('No se especificó un identificador de práctica válido.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setErrorGlobal('');
    try {
      const datos = await practicasService.obtenerPorId(practicaId);
      setPractica(datos);
      setInstrumentos(datos.instrumentos || []);
      setDocumentos(datos.documentos || []);
      setAnuncioLive(`Detalle de práctica "${datos.titulo}" cargado exitosamente.`);
    } catch (err) {
      const mensaje = err.message || 'No fue posible cargar el detalle de la práctica.';
      setErrorGlobal(mensaje);
      setAnuncioLive(`Error: ${mensaje}`);
    } finally {
      setCargando(false);
    }
  }, [practicaId]);

  // Carga asíncrona del historial de revisiones docentes (CU10 / HU07)
  const cargarRevisiones = useCallback(async () => {
    if (!practicaId) return;
    setCargandoRevisiones(true);
    try {
      const revs = await practicasService.listarRevisiones(practicaId);
      setRevisiones(revs);
    } catch (err) {
      console.warn('Aviso: No fue posible consultar el historial de revisiones:', err.message);
    } finally {
      setCargandoRevisiones(false);
    }
  }, [practicaId]);

  useEffect(() => {
    cargarDetalle();
    cargarRevisiones();
  }, [cargarDetalle, cargarRevisiones]);

  // Manejo de creación de instrumento (PB3 / SB4)
  const handleCrearInstrumento = async (datosNuevo) => {
    const nuevo = await practicasService.crearInstrumento(practicaId, datosNuevo);
    setInstrumentos((prev) => [...prev, nuevo]);
    mostrarExito(`Instrumento "${nuevo.nombre}" registrado exitosamente.`);
  };

  // Manejo de eliminación de instrumento (PB3 / SB4 - Con modal accesible)
  const handleEliminarInstrumento = async (instrumentoId, nombre) => {
    await practicasService.eliminarInstrumento(practicaId, instrumentoId);
    setInstrumentos((prev) => prev.filter((i) => i.id !== instrumentoId));
    mostrarExito(`Instrumento "${nombre}" eliminado correctamente.`);
  };

  // Manejo de subida de PDF (PB3 / SB4)
  const handleSubirDocumento = async (archivo, tipo) => {
    const nuevoDoc = await documentosService.subirDocumentoPdf({
      practicaId,
      archivo,
      tipo
    });
    setDocumentos((prev) => [nuevoDoc, ...prev]);
    mostrarExito(`Documento PDF "${nuevoDoc.nombreOriginal}" subido exitosamente.`);
  };

  // Manejo de descarga de PDF (PB3 / SB4)
  const handleDescargarDocumento = async (documentoId, nombreOriginal) => {
    const blob = await documentosService.descargarDocumento(documentoId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreOriginal || `documento-${documentoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    mostrarExito(`Descarga iniciada: ${nombreOriginal}`);
  };

  // Manejo de resolución de observaciones docentes (CU11 / HU12 / RN04)
  const handleResolverObservacion = async (observacionId, nuevaResuelta) => {
    setResolviendoObsId(observacionId);
    try {
      await practicasService.resolverObservacion(practicaId, observacionId, nuevaResuelta);

      // Actualizar estado local reactivo inmediatamente
      setRevisiones((prevRevisiones) =>
        prevRevisiones.map((rev) => ({
          ...rev,
          observaciones: (rev.observaciones || []).map((obs) =>
            obs.id === observacionId ? { ...obs, resuelta: nuevaResuelta } : obs
          )
        }))
      );

      const mensaje = nuevaResuelta
        ? 'Observación marcada como resuelta.'
        : 'Observación reabierta como pendiente.';
      mostrarExito(mensaje);
    } catch (err) {
      setErrorGlobal(err.message || 'No fue posible actualizar el estado de la observación.');
    } finally {
      setResolviendoObsId(null);
    }
  };

  // Manejo de confirmación de envío a revisión docente (RN02 / RN04)
  const handleConfirmarEnvioRevision = async () => {
    setErrorModalRevision('');
    setEnviandoRevision(true);
    try {
      await practicasService.enviarARevision(practicaId);
      setModalRevisionAbierto(false);
      await cargarDetalle();
      await cargarRevisiones();
      mostrarExito('Práctica enviada a revisión docente exitosamente. Su tutor institucional ha sido notificado.');
      setAnuncioLive('Práctica enviada a revisión docente. Estado actualizado a En Revisión.');
      refBotonSolicitarRevision.current?.focus();
    } catch (err) {
      let mensajeAmigable = err.message || 'Error al enviar la práctica a revisión.';
      const codigo = err.datos?.error?.codigo;
      if (codigo === 'DOCUMENTACION_INCOMPLETA') {
        mensajeAmigable = 'La práctica debe contar con al menos un instrumento de evaluación y el documento de Consentimiento Informado en PDF adjunto antes de enviarse a revisión.';
      } else if (codigo === 'OBSERVACIONES_PENDIENTES') {
        mensajeAmigable = 'Todas las observaciones de revisiones previas deben estar resueltas antes de reenviar la práctica.';
      } else if (codigo === 'DOCENTE_NO_ASIGNADO') {
        mensajeAmigable = 'Debe seleccionar un docente tutor institucional asignado antes de enviar la práctica a revisión.';
      }
      setErrorModalRevision(mensajeAmigable);
    } finally {
      setEnviandoRevision(false);
    }
  };

  if (cargando) {
    return (
      <div className="contenedor-detalle-practica" role="main">
        <p className="texto-cargando" role="status">Cargando información detallada de la práctica...</p>
      </div>
    );
  }

  if (errorGlobal && !practica) {
    return (
      <div className="contenedor-detalle-practica" role="main">
        <div className="alerta-error" role="alert">
          <h2>Error al cargar la práctica</h2>
          <p>{errorGlobal}</p>
          <button
            type="button"
            className="btn-primario"
            onClick={() => navegar(RUTAS.ESTUDIANTE_PRACTICAS)}
          >
            Volver a mis prácticas
          </button>
        </div>
      </div>
    );
  }

  const esPropietario = Boolean(
    usuario &&
    practica &&
    (practica.estudianteId === usuario.id || usuario.rol === 'ADMINISTRADOR')
  );

  const esEditable = ['BORRADOR', 'RECHAZADA'].includes(practica.estado);
  const esRechazada = practica.estado === 'RECHAZADA';

  return (
    <div className="contenedor-detalle-practica" role="main" aria-labelledby="titulo-detalle-practica">
      {/* Región ARIA en vivo para anuncios de estado a lectores de pantalla */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncioLive}
      </div>

      {/* Navegación y Cabecera Principal */}
      <nav className="migas-navegacion" aria-label="Navegación contextual">
        <button
          type="button"
          className="btn-volver-enlace"
          onClick={() => navegar(RUTAS.ESTUDIANTE_PRACTICAS)}
        >
          &larr; Volver a Mis Prácticas de Usabilidad
        </button>
      </nav>

      <header className="detalle-header-card">
        <div className="detalle-header-top">
          <div className="detalle-header-titulos">
            <span className={`badge-estado badge-${practica.estado.toLowerCase()}`} role="status">
              Estado: {practica.estado.replace('_', ' ')}
            </span>
            <h1 id="titulo-detalle-practica" className="detalle-titulo-principal">
              {practica.titulo}
            </h1>
          </div>
        </div>

        <p className="detalle-descripcion-texto">{practica.descripcion}</p>

        <div className="detalle-meta-grid">
          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Docente Tutor Institucional:</span>
            <strong className="meta-valor">
              {practica.docente
                ? `${practica.docente.nombres} ${practica.docente.apellidos}`
                : 'Sin docente tutor asignado'}
            </strong>
          </div>

          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Fecha de Creación:</span>
            <span className="meta-valor">
              {practica.creadoEn
                ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(practica.creadoEn))
                : 'N/A'}
            </span>
          </div>

          <div className="detalle-meta-item">
            <span className="meta-etiqueta">Última Actualización:</span>
            <span className="meta-valor">
              {practica.actualizadoEn
                ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(practica.actualizadoEn))
                : 'N/A'}
            </span>
          </div>
        </div>
      </header>

      {/* Alertas globales de éxito y error */}
      {mensajeExito && (
        <div className="alerta-exito" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {errorGlobal && (
        <div className="alerta-error" role="alert">
          {errorGlobal}
        </div>
      )}

      {/* Sección 1: Alcance Metodológico y Acción de Envío a Revisión Docente (RN02 / RN04) */}
      <section className="detalle-metodologico-card" aria-labelledby="seccion-metodologia">
        <h2 id="seccion-metodologia" className="seccion-titulo-detalle">
          Alcance y Objetivo Metodológico
        </h2>
        <div className="resumen-metodologico-grid">
          <div className="resumen-metodologico-item">
            <p><strong>Objetivo de Usabilidad:</strong></p>
            <p>{practica.objetivo}</p>
          </div>
        </div>

        <AccionRevisionEstudiante
          practica={practica}
          esPropietario={esPropietario}
          instrumentos={instrumentos}
          documentos={documentos}
          revisiones={revisiones}
          onAbrirModal={() => {
            setErrorModalRevision('');
            setModalRevisionAbierto(true);
          }}
          modalRevisionAbierto={modalRevisionAbierto}
          botonRef={refBotonSolicitarRevision}
        />
      </section>

      {/* Sección 2: Observaciones Docentes en Prácticas Rechazadas (CU11 / HU12 / RN04) */}
      {esRechazada && (
        <ObservacionesRevision
          revisiones={revisiones}
          onResolverObservacion={handleResolverObservacion}
          resolviendoId={resolviendoObsId}
          esRechazada={esRechazada}
        />
      )}

      {/* Sección 3: Instrumentos de Evaluación (PB3 / SB4) */}
      <SeccionInstrumentos
        instrumentos={instrumentos}
        esEditable={esEditable}
        onCrearInstrumento={handleCrearInstrumento}
        onEliminarInstrumento={handleEliminarInstrumento}
      />

      {/* Sección 4: Documentos y Consentimientos Informados en PDF (PB3 / SB4) */}
      <SeccionDocumentos
        documentos={documentos}
        esEditable={esEditable}
        onSubirDocumento={handleSubirDocumento}
        onDescargarDocumento={handleDescargarDocumento}
      />

      {/* Sección 5: Historial de Revisiones Docentes (CU10 / HU07) */}
      <HistorialRevisiones
        revisiones={revisiones}
        cargando={cargandoRevisiones}
      />

      {/* Modal Accesible de Confirmación de Envío a Revisión (Focus Trap WCAG 2.1.2) */}
      <ModalConfirmarRevision
        abierto={modalRevisionAbierto}
        onCerrar={() => setModalRevisionAbierto(false)}
        onConfirmar={handleConfirmarEnvioRevision}
        enviando={enviandoRevision}
        error={errorModalRevision}
        esRechazada={esRechazada}
        triggerRef={refBotonSolicitarRevision}
      />
    </div>
  );
}

export default DetallePractica;