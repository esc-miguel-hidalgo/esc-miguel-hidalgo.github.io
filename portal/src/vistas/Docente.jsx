import { useState } from 'react';
import { grupos, seleccionesDeGrupos, documentosDeGrupos, nombreDirectora } from '../lib/datos.js';
import { TRIMESTRES, cicloDe, trimestreDe } from '../lib/ciclo.js';
import { Aviso, Chip, Pestanas, Progreso, useCarga } from '../componentes/comunes.jsx';
import Trimestre from './Trimestre.jsx';
import Documentos from './Documentos.jsx';

export default function PanelDocente({ perfil }) {
  const carga = useCarga(async () => {
    const gs = await grupos();
    const ids = gs.map((g) => g.id);
    const [sels, docs, directora] = await Promise.all([seleccionesDeGrupos(ids), documentosDeGrupos(ids), nombreDirectora()]);
    return { gs, sels, docs, directora };
  }, []);
  const [grupoId, setGrupoId] = useState(null);
  const [pestana, setPestana] = useState('programa');
  const [trimestre, setTrimestre] = useState(null);

  if (carga.cargando) return <p className="tenue">Cargando…</p>;
  if (carga.error && !carga.datos) return <Aviso tipo="error">{carga.error}</Aviso>;
  const { gs, sels, docs, directora } = carga.datos;

  if (!gs.length) {
    return (
      <Aviso tipo="alerta">
        Tu cuenta todavía no tiene un grupo asignado para este ciclo. Pídele a la dirección que te lo asigne.
      </Aviso>
    );
  }

  const ciclo = cicloDe();
  const grupo = gs.find((g) => g.id === grupoId) || gs.find((g) => g.ciclo === ciclo) || gs[0];
  const selsGrupo = sels.filter((s) => s.grupo_id === grupo.id);
  const datosComunes = { grupo, docente: perfil.nombre, directora, recargar: carga.recargar };

  if (trimestre) {
    return (
      <Trimestre
        {...datosComunes}
        trimestre={trimestre}
        selecciones={selsGrupo}
        onVolver={() => setTrimestre(null)}
      />
    );
  }

  return (
    <div>
      <div className="fila entre">
        <div>
          <h1 className="titulo-vista">Hola, {perfil.nombre || 'maestra/o'}</h1>
          <p className="tenue">{grupo.grado}° {grupo.grupo} · Ciclo {grupo.ciclo}</p>
        </div>
        {gs.length > 1 && (
          <div className="campo">
            <label htmlFor="grupo">Grupo</label>
            <select id="grupo" value={grupo.id} onChange={(e) => setGrupoId(e.target.value)}>
              {gs.map((g) => <option key={g.id} value={g.id}>{g.grado}° {g.grupo} · {g.ciclo}</option>)}
            </select>
          </div>
        )}
      </div>
      <Aviso tipo="error">{carga.error}</Aviso>

      <Pestanas
        opciones={[{ id: 'programa', nombre: 'Programa analítico' }, { id: 'documentos', nombre: 'Documentos' }]}
        actual={pestana}
        onCambio={setPestana}
      />

      {pestana === 'programa' ? (
        <div className="rejilla">
          {TRIMESTRES.map((t) => {
            const sel = selsGrupo.find((s) => s.trimestre === t.num);
            const pdas = sel?.seleccion_pda || [];
            const trabajados = pdas.filter((p) => p.estado === 'trabajado').length;
            const esActual = grupo.ciclo === ciclo && t.num === trimestreDe();
            return (
              <button key={t.num} className="tarjeta pila" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setTrimestre(t.num)}>
                <div className="fila entre">
                  <h2 style={{ fontSize: 20 }}>Trimestre {t.num}</h2>
                  <Chip estado={sel?.estado} />
                </div>
                <p className="tenue">{t.meses}{esActual ? ' · trimestre en curso' : ''}</p>
                {sel?.estado === 'validado' ? (
                  <Progreso hechos={trabajados} total={pdas.length} etiqueta="PDA trabajados" />
                ) : (
                  <p className="tenue">{pdas.length} PDA seleccionados</p>
                )}
                {sel?.estado === 'devuelto' && <p className="tenue" style={{ color: '#9B2C20' }}>La dirección pidió cambios.</p>}
              </button>
            );
          })}
        </div>
      ) : (
        <Documentos modo="docente" grupo={grupo} documentos={docs.filter((d) => d.grupo_id === grupo.id)} recargar={carga.recargar} />
      )}
    </div>
  );
}
