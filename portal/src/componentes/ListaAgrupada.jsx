import { agrupar } from '../lib/catalogo.js';
import { Aviso } from './comunes.jsx';

/** PDA seleccionados agrupados campo → contenido, con un render por PDA. */
export default function ListaAgrupada({ ids, renderPda }) {
  const { campos, huerfanos } = agrupar(ids);
  return (
    <div>
      {campos.map((campo) => (
        <section key={campo.nombre}>
          <div className="campo-formativo" style={{ '--color': campo.color }}>
            <h3>{campo.nombre}</h3>
          </div>
          {campo.contenidos.map((c) => (
            <div key={c.id}>
              <p className="contenido-titulo">{c.contenido}</p>
              {c.pdas.map((p) => <div key={p.id}>{renderPda(p)}</div>)}
            </div>
          ))}
        </section>
      ))}
      {huerfanos.length > 0 && (
        <Aviso tipo="alerta">
          {huerfanos.length} PDA guardados ya no existen en el catálogo actual (se corrigió su texto).
          Avísale al administrador del portal.
        </Aviso>
      )}
    </div>
  );
}
