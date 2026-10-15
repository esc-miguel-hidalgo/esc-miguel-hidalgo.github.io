// Acceso al catálogo PDA estático (generado por scripts/generar-catalogo.mjs).
import catalogo from '../data/catalogo.json';

const indice = new Map();
for (const g of Object.values(catalogo.grados)) {
  for (const campo of g.campos) {
    for (const c of campo.contenidos) {
      for (const p of c.pdas) {
        indice.set(p.id, { ...p, grado: g.grado, campo: campo.nombre, color: campo.color, contenido: c.contenido, contenidoId: c.id });
      }
    }
  }
}

export const titulo = catalogo.titulo;

export function catalogoDeGrado(grado) {
  return catalogo.grados[grado] || null;
}

/** Datos completos de un PDA por id, o null si el id ya no existe en el catálogo. */
export function pda(id) {
  return indice.get(id) || null;
}

/**
 * Agrupa ids de PDA como los muestra el programa: campo → contenido → PDA,
 * respetando el orden del catálogo. Los ids desconocidos van en `huerfanos`.
 */
export function agrupar(ids) {
  const set = new Set(ids);
  const campos = [];
  const huerfanos = ids.filter((id) => !indice.has(id));
  const grados = new Set(ids.map((id) => indice.get(id)?.grado).filter(Boolean));
  for (const grado of [...grados].sort()) {
    for (const campo of catalogo.grados[grado].campos) {
      const contenidos = campo.contenidos
        .map((c) => ({ id: c.id, contenido: c.contenido, pdas: c.pdas.filter((p) => set.has(p.id)) }))
        .filter((c) => c.pdas.length);
      if (contenidos.length) campos.push({ nombre: campo.nombre, color: campo.color, contenidos });
    }
  }
  return { campos, huerfanos };
}

/** Búsqueda de texto dentro de un grado (contenido o PDA), sin acentos ni mayúsculas. */
export function buscar(grado, texto, limite = 40) {
  const q = normalizar(texto);
  if (q.length < 3) return [];
  const g = catalogo.grados[grado];
  if (!g) return [];
  const res = [];
  for (const campo of g.campos) {
    for (const c of campo.contenidos) {
      const enContenido = normalizar(c.contenido).includes(q);
      for (const p of c.pdas) {
        if (enContenido || normalizar(p.texto).includes(q)) {
          res.push(indice.get(p.id));
          if (res.length >= limite) return res;
        }
      }
    }
  }
  return res;
}

export function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** { pdaId: [trimestres donde también está] } para los PDA de `actual` presentes en otros trimestres. */
export function duplicados(seleccionPorTrimestre, actual) {
  const res = {};
  for (const id of seleccionPorTrimestre[actual] || []) {
    for (const t of [1, 2, 3]) {
      if (t !== actual && (seleccionPorTrimestre[t] || []).includes(id)) (res[id] ||= []).push(t);
    }
  }
  return res;
}
