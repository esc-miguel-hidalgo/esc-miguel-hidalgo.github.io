// Documentos de un grupo. La docente sube y borra (mientras no estén revisados);
// la directora ve, descarga y marca revisado con comentario.
import { useState } from 'react';
import { TIPOS_DOC, nombreTipo, subirDocumento, urlFirmada, borrarDocumento, revisarDocumento } from '../lib/datos.js';
import { TRIMESTRES, trimestreDe, fechaCorta } from '../lib/ciclo.js';
import { Aviso, BotonConfirmar, Chip, useAccion } from '../componentes/comunes.jsx';

const ACEPTA = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.pptx,.mp4';
const MAX = 25 * 1024 * 1024;

const peso = (b) => (b == null ? '' : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export default function Documentos({ modo, grupo, documentos, recargar }) {
  const accion = useAccion();
  const hacer = (fn) => accion.ejecutar(async () => { await fn(); await recargar(); });

  // Agrupa por tipo → (trimestre, título) → versiones (más reciente primero).
  const porTipo = TIPOS_DOC.map((t) => {
    const docs = documentos.filter((d) => d.tipo === t.id);
    const series = {};
    for (const d of docs) (series[`${d.trimestre ?? 0}|${d.titulo.toLowerCase()}`] ||= []).push(d);
    return { ...t, series: Object.values(series).map((v) => v.sort((a, b) => b.version - a.version)) };
  });

  const abrir = async (d, descargar) => {
    const ventana = descargar ? null : window.open('', '_blank'); // se abre ya para que el navegador no la bloquee
    const url = await accion.ejecutar(() => urlFirmada(d.storage_path, descargar));
    if (!url) return ventana?.close();
    if (ventana) ventana.location = url;
    else location.href = url;
  };

  return (
    <div className="pila">
      {modo === 'docente' && <Subir grupo={grupo} documentos={documentos} hacer={hacer} ocupado={accion.ocupado} />}
      <Aviso tipo="error">{accion.error}</Aviso>

      {porTipo.map((t) => (
        <section key={t.id} className="tarjeta">
          <h2 style={{ fontSize: 20 }}>{t.plural} <span className="tenue">({t.series.length})</span></h2>
          {t.series.length === 0 && <p className="tenue">Sin documentos.</p>}
          {t.series.map((versiones) => {
            const d = versiones[0];
            return (
              <div key={d.id} style={{ borderTop: '1px solid var(--borde)', padding: '10px 0' }}>
                <div className="fila entre">
                  <div>
                    <strong>{d.titulo}</strong>{' '}
                    <span className="tenue">{d.trimestre ? `T${d.trimestre} · ` : ''}v{d.version} · {fechaCorta(d.creado_en)} · {peso(d.tamano)}</span>{' '}
                    <Chip estado={d.estado} />
                  </div>
                  <div className="fila">
                    <button className="btn chico claro" onClick={() => abrir(d, false)}>Ver</button>
                    <button className="btn chico claro" onClick={() => abrir(d, true)}>Descargar</button>
                    {modo === 'docente' && d.estado === 'entregado' && (
                      <BotonConfirmar className="btn chico rojo" pregunta="¿Borrar esta versión?" disabled={accion.ocupado}
                        onConfirmar={() => hacer(() => borrarDocumento(d))}>Borrar</BotonConfirmar>
                    )}
                  </div>
                </div>
                {d.comentario && <p className="tenue">Comentario de dirección: {d.comentario}</p>}
                {modo === 'directora' && <Revisar d={d} hacer={hacer} ocupado={accion.ocupado} />}
                {versiones.length > 1 && (
                  <details style={{ marginTop: 6 }}>
                    <summary className="tenue" style={{ cursor: 'pointer' }}>Versiones anteriores ({versiones.length - 1})</summary>
                    {versiones.slice(1).map((v) => (
                      <div key={v.id} className="fila tenue" style={{ marginTop: 4 }}>
                        v{v.version} · {fechaCorta(v.creado_en)} · {v.nombre_archivo}
                        <button className="enlace" onClick={() => abrir(v, false)}>ver</button>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Subir({ grupo, documentos, hacer, ocupado }) {
  const [tipo, setTipo] = useState('planeacion');
  const [trimestre, setTrimestre] = useState(String(trimestreDe()));
  const [titulo, setTitulo] = useState('');
  const [file, setFile] = useState(null);
  const [aviso, setAviso] = useState(null);
  const titulos = [...new Set(documentos.filter((d) => d.tipo === tipo).map((d) => d.titulo))];

  const enviar = async (e) => {
    e.preventDefault();
    setAviso(null);
    if (file.size > MAX && !file.type.startsWith('image/')) return setAviso('El archivo pesa más de 25 MB. Comprímelo o divídelo.');
    const form = e.currentTarget;
    await hacer(async () => {
      await subirDocumento({ grupo, tipo, trimestre: trimestre ? Number(trimestre) : null, titulo: titulo.trim(), file });
      form.reset();
      setTitulo('');
      setFile(null);
      setAviso('ok');
    });
  };

  return (
    <form className="tarjeta pila" onSubmit={enviar}>
      <h2 style={{ fontSize: 20 }}>Subir documento</h2>
      <div className="rejilla">
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_DOC.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="trim">Trimestre</label>
          <select id="trim" value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
            {TRIMESTRES.map((t) => <option key={t.num} value={t.num}>Trimestre {t.num}</option>)}
            <option value="">No aplica</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="titulo">Título</label>
          <input id="titulo" list="titulos" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Planeación semana 3" />
          <datalist id="titulos">{titulos.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
      </div>
      <p className="tenue">Si usas un título que ya existe, se guarda como versión nueva y la anterior se conserva.</p>
      <div className="campo">
        <label htmlFor="archivo">Archivo (PDF, foto, Word, Excel, PowerPoint o video corto · máx. 25 MB)</label>
        <input id="archivo" type="file" accept={ACEPTA} required onChange={(e) => setFile(e.target.files[0] || null)} />
      </div>
      <Aviso tipo="exito">{aviso === 'ok' && 'Documento subido.'}</Aviso>
      <Aviso tipo="error">{aviso !== 'ok' && aviso}</Aviso>
      <button className="btn" disabled={ocupado || !file}>{ocupado ? 'Subiendo…' : 'Subir'}</button>
      <p className="tenue">Las fotos se reducen automáticamente antes de subirlas. Solo tú y la dirección pueden ver estos archivos.</p>
    </form>
  );
}

function Revisar({ d, hacer, ocupado }) {
  const [comentario, setComentario] = useState(d.comentario || '');
  return (
    <div className="fila" style={{ marginTop: 6 }}>
      <input aria-label="Comentario para la docente" placeholder="Comentario (opcional)" value={comentario}
        onChange={(e) => setComentario(e.target.value)} style={{ flex: 1, minWidth: 180, border: '1.5px solid var(--borde)', borderRadius: 8, padding: '5px 10px' }} />
      {d.estado === 'entregado' ? (
        <button className="btn chico verde" disabled={ocupado} onClick={() => hacer(() => revisarDocumento(d.id, 'revisado', comentario || null))}>Marcar revisado</button>
      ) : (
        <>
          <button className="btn chico claro" disabled={ocupado} onClick={() => hacer(() => revisarDocumento(d.id, 'revisado', comentario || null))}>Guardar comentario</button>
          <button className="btn chico claro" disabled={ocupado} onClick={() => hacer(() => revisarDocumento(d.id, 'entregado', comentario || null))}>Quitar revisado</button>
        </>
      )}
    </div>
  );
}
