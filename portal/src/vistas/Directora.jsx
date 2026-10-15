// Panel de la dirección: pendientes de validar, matriz de cumplimiento por grupo
// y detalle de cada grupo (validar/devolver selecciones, revisar documentos).
import { useState } from 'react';
import { grupos, seleccionesDeGrupos, documentosDeGrupos, cambiarEstado, TIPOS_DOC } from '../lib/datos.js';
import { TRIMESTRES, cicloDe, trimestreDe, fechaLarga } from '../lib/ciclo.js';
import { nombreEje } from '../data/ejes.js';
import { Aviso, Chip, Pestanas, Progreso, useAccion, useCarga } from '../componentes/comunes.jsx';
import ListaAgrupada from '../componentes/ListaAgrupada.jsx';
import Documentos from './Documentos.jsx';

export default function PanelDirectora({ perfil }) {
  const carga = useCarga(async () => {
    const gs = await grupos();
    const ids = gs.map((g) => g.id);
    const [sels, docs] = await Promise.all([seleccionesDeGrupos(ids), documentosDeGrupos(ids)]);
    return { gs, sels, docs };
  }, []);
  const [cicloElegido, setCiclo] = useState(null);
  const [trimestre, setTrimestre] = useState(trimestreDe());
  const [detalle, setDetalle] = useState(null); // { grupoId, trimestre }

  if (carga.cargando) return <p className="tenue">Cargando…</p>;
  if (carga.error && !carga.datos) return <Aviso tipo="error">{carga.error}</Aviso>;
  const { gs, sels, docs } = carga.datos;

  const ciclos = [...new Set(gs.map((g) => g.ciclo))];
  const ciclo = cicloElegido || (ciclos.includes(cicloDe()) ? cicloDe() : ciclos[0]);
  const delCiclo = gs.filter((g) => g.ciclo === ciclo);
  const selDe = (g, t) => sels.find((s) => s.grupo_id === g.id && s.trimestre === t);

  if (detalle) {
    const grupo = gs.find((g) => g.id === detalle.grupoId);
    return (
      <DetalleGrupo
        grupo={grupo}
        trimestreInicial={detalle.trimestre}
        selecciones={sels.filter((s) => s.grupo_id === grupo.id)}
        documentos={docs.filter((d) => d.grupo_id === grupo.id)}
        directora={perfil.nombre}
        recargar={carga.recargar}
        onVolver={() => setDetalle(null)}
      />
    );
  }

  const pendientes = sels.filter((s) => s.estado === 'enviado' && delCiclo.some((g) => g.id === s.grupo_id));

  return (
    <div>
      <h1 className="titulo-vista">Panel de dirección</h1>
      <Aviso tipo="error">{carga.error}</Aviso>
      <div className="fila" style={{ margin: '12px 0' }}>
        <div className="campo">
          <label htmlFor="ciclo">Ciclo escolar</label>
          <select id="ciclo" value={ciclo || ''} onChange={(e) => setCiclo(e.target.value)}>
            {ciclos.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="trimestre">Trimestre</label>
          <select id="trimestre" value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
            {TRIMESTRES.map((t) => <option key={t.num} value={t.num}>Trimestre {t.num} ({t.meses})</option>)}
          </select>
        </div>
      </div>

      {!delCiclo.length && <Aviso tipo="alerta">No hay grupos dados de alta para este ciclo. Ver CONTRIBUTING.md → Portal docente.</Aviso>}

      {pendientes.length > 0 && (
        <section className="tarjeta pila" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>Por validar ({pendientes.length})</h2>
          {pendientes.map((s) => {
            const g = gs.find((x) => x.id === s.grupo_id);
            return (
              <div key={s.id} className="fila entre">
                <span>{g.grado}° {g.grupo} · {g.docente?.nombre} · Trimestre {s.trimestre} · {s.seleccion_pda.length} PDA · enviado el {fechaLarga(s.enviado_en)}</span>
                <button className="btn chico ambar" onClick={() => setDetalle({ grupoId: g.id, trimestre: s.trimestre })}>Revisar</button>
              </div>
            );
          })}
        </section>
      )}

      <h2 style={{ fontSize: 20, margin: '8px 0' }}>Cumplimiento · Trimestre {trimestre}</h2>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Grupo</th><th>Docente</th><th>Programa analítico</th><th>Avance PDA</th>
              {TIPOS_DOC.map((t) => <th key={t.id} className="centro">{t.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {delCiclo.map((g) => {
              const s = selDe(g, trimestre);
              const pdas = s?.seleccion_pda || [];
              const trabajados = pdas.filter((p) => p.estado === 'trabajado').length;
              return (
                <tr key={g.id} className="clic" tabIndex={0}
                  onClick={() => setDetalle({ grupoId: g.id, trimestre })}
                  onKeyDown={(e) => e.key === 'Enter' && setDetalle({ grupoId: g.id, trimestre })}>
                  <td><strong>{g.grado}° {g.grupo}</strong></td>
                  <td>{g.docente?.nombre || <span className="tenue">Sin asignar</span>}</td>
                  <td><Chip estado={s?.estado} /></td>
                  <td>{s?.estado === 'validado' ? `${trabajados} / ${pdas.length}` : <span className="tenue">—</span>}</td>
                  {TIPOS_DOC.map((t) => {
                    const ds = docs.filter((d) => d.grupo_id === g.id && d.tipo === t.id && d.trimestre === trimestre);
                    const rev = ds.filter((d) => d.estado === 'revisado').length;
                    return (
                      <td key={t.id} className="centro">
                        {ds.length ? <>{ds.length} <span className="tenue">({rev} rev.)</span></> : <span className="tenue">0</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tenue" style={{ marginTop: 6 }}>Toca un grupo para ver su detalle. Los documentos cuentan todas las versiones subidas.</p>
    </div>
  );
}

function DetalleGrupo({ grupo, trimestreInicial, selecciones, documentos, directora, recargar, onVolver }) {
  const [pestana, setPestana] = useState('programa');
  const [trimestre, setTrimestre] = useState(trimestreInicial);
  return (
    <div>
      <button className="enlace" onClick={onVolver}>← Volver al panel</button>
      <h1 className="titulo-vista" style={{ marginTop: 10 }}>{grupo.grado}° {grupo.grupo} · {grupo.docente?.nombre || 'Sin docente'}</h1>
      <p className="tenue">Ciclo {grupo.ciclo}</p>
      <Pestanas
        opciones={[{ id: 'programa', nombre: 'Programa analítico' }, { id: 'documentos', nombre: 'Documentos' }]}
        actual={pestana}
        onCambio={setPestana}
      />
      {pestana === 'programa' ? (
        <>
          <Pestanas
            opciones={TRIMESTRES.map((t) => ({ id: t.num, nombre: `Trimestre ${t.num}` }))}
            actual={trimestre}
            onCambio={setTrimestre}
          />
          <RevisarSeleccion
            key={trimestre}
            sel={selecciones.find((s) => s.trimestre === trimestre)}
            grupo={grupo}
            directora={directora}
            recargar={recargar}
          />
        </>
      ) : (
        <Documentos modo="directora" grupo={grupo} documentos={documentos} recargar={recargar} />
      )}
    </div>
  );
}

function RevisarSeleccion({ sel, grupo, directora, recargar }) {
  const [comentario, setComentario] = useState(sel?.comentario || '');
  const accion = useAccion();
  if (!sel) return <p className="tenue">La docente aún no empieza la selección de este trimestre.</p>;

  const ids = sel.seleccion_pda.map((p) => p.pda_id);
  const estados = Object.fromEntries(sel.seleccion_pda.map((p) => [p.pda_id, p]));
  const trabajados = sel.seleccion_pda.filter((p) => p.estado === 'trabajado').length;
  const hacer = (estado) => accion.ejecutar(async () => { await cambiarEstado(sel.id, estado, comentario.trim() || null); await recargar(); });
  const pdf = async () => (await import('../lib/pdfValidacion.js')).generarPdfValidacion({ sel, pdaIds: ids, grupo, docente: grupo.docente?.nombre, directora });

  const formulario = (
    <>
      <div className="campo">
        <label htmlFor="comentario">{sel.estado === 'enviado' ? 'Comentario para la docente (obligatorio si la devuelves)' : 'Motivo para reabrir'}</label>
        <textarea id="comentario" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
      </div>
      <div className="fila">
        {sel.estado === 'enviado' && (
          <button className="btn verde" disabled={accion.ocupado} onClick={() => hacer('validado')}>Validar</button>
        )}
        <button className="btn rojo" disabled={accion.ocupado || !comentario.trim()} onClick={() => hacer('devuelto')}>
          {sel.estado === 'enviado' ? 'Devolver con comentario' : 'Reabrir para cambios'}
        </button>
      </div>
    </>
  );

  return (
    <div className="pila">
      <div className="fila entre">
        <div>
          <Chip estado={sel.estado} /> <span className="tenue">Folio {sel.folio}
            {sel.enviado_en && ` · enviado el ${fechaLarga(sel.enviado_en)}`}
            {sel.validado_en && ` · validado el ${fechaLarga(sel.validado_en)}`}</span>
        </div>
        {ids.length > 0 && <button className="btn claro" onClick={pdf}>Descargar PDF</button>}
      </div>
      <Aviso tipo="error">{accion.error}</Aviso>

      {sel.estado === 'enviado' && (
        <div className="tarjeta pila">{formulario}</div>
      )}
      {sel.estado === 'validado' && (
        <details className="tarjeta">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>¿Hay que corregir algo? Reabrir para cambios</summary>
          <div className="pila" style={{ marginTop: 12 }}>
            {formulario}
          </div>
        </details>
      )}
      {sel.estado === 'borrador' && <Aviso>La docente está armando su selección; aún no la envía.</Aviso>}
      {sel.estado === 'devuelto' && <Aviso tipo="alerta">Devuelta con el comentario: {sel.comentario}</Aviso>}

      <div className="tarjeta pila">
        <p><strong>Ejes articuladores:</strong> {sel.ejes.length ? sel.ejes.map(nombreEje).join(' · ') : 'ninguno'}</p>
        {sel.estado === 'validado' && <Progreso hechos={trabajados} total={ids.length} etiqueta="PDA trabajados" />}
        <ListaAgrupada ids={ids} renderPda={(p) => (
          <div className={`pda ${estados[p.id].estado === 'trabajado' ? 'trabajado' : ''}`}>
            <span>
              {p.texto}
              {sel.estado === 'validado' && (
                <span className="tenue" style={{ display: 'block' }}>
                  {estados[p.id].estado === 'trabajado' ? `Trabajado · ${fechaLarga(estados[p.id].trabajado_en)}` : 'Planeado'}
                </span>
              )}
            </span>
          </div>
        )} />
      </div>
    </div>
  );
}
