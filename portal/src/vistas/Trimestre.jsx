// Vista de la docente para un trimestre: armar la selección (borrador/devuelto),
// esperar validación (enviado) o llevar el seguimiento planeado → trabajado (validado).
import { useMemo, useState } from 'react';
import { catalogoDeGrado, buscar, duplicados } from '../lib/catalogo.js';
import { crearSeleccion, agregarPda, quitarPda, guardarEjes, cambiarEstado, marcarPda } from '../lib/datos.js';
import { TRIMESTRES, fechaLarga } from '../lib/ciclo.js';
import { EJES } from '../data/ejes.js';
import { Aviso, BotonConfirmar, Chip, Pestanas, Progreso, useAccion } from '../componentes/comunes.jsx';
import ListaAgrupada from '../componentes/ListaAgrupada.jsx';

export default function Trimestre({ grupo, trimestre, selecciones, docente, directora, recargar, onVolver }) {
  const sel = selecciones.find((s) => s.trimestre === trimestre);
  const accion = useAccion();
  const t = TRIMESTRES[trimestre - 1];

  const porTrimestre = useMemo(() => {
    const m = { 1: [], 2: [], 3: [] };
    for (const s of selecciones) m[s.trimestre] = s.seleccion_pda.map((p) => p.pda_id);
    return m;
  }, [selecciones]);
  const dups = duplicados(porTrimestre, trimestre);

  const hacer = (fn) => accion.ejecutar(async () => { await fn(); await recargar(); });
  const pdf = async () => (await import('../lib/pdfValidacion.js')).generarPdfValidacion({ sel, pdaIds: porTrimestre[trimestre], grupo, docente, directora });

  return (
    <div>
      <button className="enlace" onClick={onVolver}>← Volver a mis trimestres</button>
      <div className="fila entre" style={{ marginTop: 10 }}>
        <div>
          <h1 className="titulo-vista">Trimestre {trimestre} <Chip estado={sel?.estado} /></h1>
          <p className="tenue">{grupo.grado}° {grupo.grupo} · {t.meses} · Ciclo {grupo.ciclo}{sel ? ` · Folio ${sel.folio}` : ''}</p>
        </div>
        {sel && porTrimestre[trimestre].length > 0 && <button className="btn claro" onClick={pdf}>Descargar PDF</button>}
      </div>

      <Aviso tipo="error">{accion.error}</Aviso>
      {sel?.estado === 'devuelto' && (
        <Aviso tipo="alerta"><strong>La dirección pidió cambios:</strong> {sel.comentario || '(sin comentario)'}</Aviso>
      )}

      {!sel ? (
        <div className="tarjeta pila" style={{ marginTop: 16 }}>
          <p>Aún no empiezas la selección de PDA de este trimestre.</p>
          <button className="btn" disabled={accion.ocupado} onClick={() => hacer(() => crearSeleccion(grupo.id, trimestre))}>
            Empezar selección
          </button>
        </div>
      ) : sel.estado === 'borrador' || sel.estado === 'devuelto' ? (
        <Editor sel={sel} grupo={grupo} ids={porTrimestre[trimestre]} dups={dups} accion={accion} hacer={hacer} />
      ) : sel.estado === 'enviado' ? (
        <div className="pila" style={{ marginTop: 16 }}>
          <Aviso>Enviada a dirección el {fechaLarga(sel.enviado_en)}. Mientras no la validen puedes retirarla para corregir algo.</Aviso>
          <BotonConfirmar className="btn claro" disabled={accion.ocupado} pregunta="¿Retirar el envío y volver a borrador?"
            onConfirmar={() => hacer(() => cambiarEstado(sel.id, 'borrador'))}>
            Retirar envío
          </BotonConfirmar>
          <Resumen sel={sel} ids={porTrimestre[trimestre]} />
        </div>
      ) : (
        <Seguimiento sel={sel} accion={accion} hacer={hacer} />
      )}
    </div>
  );
}

function Resumen({ sel, ids }) {
  return (
    <div className="tarjeta">
      <p className="tenue">Ejes articuladores: {sel.ejes.length ? sel.ejes.map((e) => EJES.find((x) => x.id === e)?.nombre).join(' · ') : 'ninguno'}</p>
      <ListaAgrupada ids={ids} renderPda={(p) => <div className="pda">{p.texto}</div>} />
    </div>
  );
}

function Editor({ sel, grupo, ids, dups, accion, hacer }) {
  const cat = catalogoDeGrado(grupo.grado);
  const [campo, setCampo] = useState(cat.campos[0].nombre);
  const [q, setQ] = useState('');
  const [verSeleccion, setVerSeleccion] = useState(false);
  const elegidos = new Set(ids);
  const resultados = buscar(grupo.grado, q);

  const alternar = (id) => hacer(() => (elegidos.has(id) ? quitarPda(sel.id, id) : agregarPda(sel.id, id)));
  const alternarEje = (id) => hacer(() => guardarEjes(sel.id, sel.ejes.includes(id) ? sel.ejes.filter((e) => e !== id) : [...sel.ejes, id]));

  const fila = (p) => (
    <label className={`pda ${elegidos.has(p.id) ? 'marcado' : ''}`}>
      <input type="checkbox" checked={elegidos.has(p.id)} disabled={accion.ocupado} onChange={() => alternar(p.id)} />
      <span>
        {p.texto}
        {dups[p.id] && <span className="dup">También en el trimestre {dups[p.id].join(' y ')}</span>}
      </span>
    </label>
  );

  const campoActual = cat.campos.find((c) => c.nombre === campo);

  return (
    <div style={{ marginTop: 16 }}>
      <fieldset className="tarjeta" style={{ border: '1px solid var(--borde)' }}>
        <legend style={{ fontWeight: 700, color: 'var(--navy)', padding: '0 6px' }}>Ejes articuladores que vas a trabajar</legend>
        <div className="rejilla" style={{ gap: 4 }}>
          {EJES.map((e) => (
            <label key={e.id} className="pda">
              <input type="checkbox" checked={sel.ejes.includes(e.id)} disabled={accion.ocupado} onChange={() => alternarEje(e.id)} />
              <span>{e.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="campo" style={{ marginTop: 16 }}>
        <label htmlFor="buscar">Buscar en el programa de {cat.etiqueta}</label>
        <input id="buscar" type="search" placeholder="Escribe al menos 3 letras…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {q.trim().length >= 3 ? (
        <div className="tarjeta" style={{ marginTop: 12 }}>
          <p className="tenue">{resultados.length} resultado(s){resultados.length === 40 ? ' (se muestran los primeros 40)' : ''}</p>
          {resultados.map((p) => (
            <div key={p.id}>
              <p className="contenido-titulo"><span style={{ color: p.color, fontWeight: 700 }}>{p.campo}</span> · {p.contenido}</p>
              {fila(p)}
            </div>
          ))}
        </div>
      ) : verSeleccion ? (
        <div className="tarjeta" style={{ marginTop: 12 }}>
          {ids.length ? <ListaAgrupada ids={ids} renderPda={fila} /> : <p className="tenue">Todavía no eliges ningún PDA.</p>}
        </div>
      ) : (
        <>
          <Pestanas opciones={cat.campos.map((c) => ({ id: c.nombre, nombre: c.nombre }))} actual={campo} onCambio={setCampo} />
          {campoActual.contenidos.map((c) => {
            const n = c.pdas.filter((p) => elegidos.has(p.id)).length;
            return (
              <details key={c.id} className="contenido" style={{ borderLeft: `4px solid ${campoActual.color}` }}>
                <summary>
                  <span>{c.contenido}</span>
                  <span className="cuenta tenue">{n ? `${n} de ` : ''}{c.pdas.length} PDA</span>
                </summary>
                <div className="cuerpo">{c.pdas.map((p) => <div key={p.id}>{fila(p)}</div>)}</div>
              </details>
            );
          })}
        </>
      )}

      <div className="pie-fijo">
        <span>
          <strong>{ids.length}</strong> PDA seleccionados{' '}
          <button className="enlace" onClick={() => { setVerSeleccion(!verSeleccion); setQ(''); }}>
            {verSeleccion ? 'volver al programa' : 'ver mi selección'}
          </button>
        </span>
        <BotonConfirmar className="btn ambar" disabled={accion.ocupado || ids.length === 0}
          pregunta="Ya no podrás cambiarla hasta que la dirección la revise."
          onConfirmar={() => hacer(() => cambiarEstado(sel.id, 'enviado'))}>
          Enviar a dirección
        </BotonConfirmar>
      </div>
    </div>
  );
}

function Seguimiento({ sel, accion, hacer }) {
  const estados = Object.fromEntries(sel.seleccion_pda.map((p) => [p.pda_id, p]));
  const ids = sel.seleccion_pda.map((p) => p.pda_id);
  const trabajados = sel.seleccion_pda.filter((p) => p.estado === 'trabajado').length;

  return (
    <div className="pila" style={{ marginTop: 16 }}>
      <Aviso tipo="exito">Validada por la dirección el {fechaLarga(sel.validado_en)}. Marca cada PDA cuando lo hayas trabajado con el grupo.</Aviso>
      <div className="tarjeta pila">
        <Progreso hechos={trabajados} total={ids.length} etiqueta="PDA trabajados" />
        <ListaAgrupada ids={ids} renderPda={(p) => {
          const e = estados[p.id];
          const hecho = e.estado === 'trabajado';
          return (
            <label className={`pda ${hecho ? 'trabajado' : ''}`}>
              <input type="checkbox" checked={hecho} disabled={accion.ocupado}
                onChange={() => hacer(() => marcarPda(sel.id, p.id, hecho ? 'planeado' : 'trabajado'))} />
              <span>
                {p.texto}
                <span className="tenue" style={{ display: 'block' }}>
                  {hecho ? `Trabajado · ${fechaLarga(e.trabajado_en)}` : 'Planeado'}
                </span>
              </span>
            </label>
          );
        }} />
      </div>
    </div>
  );
}
