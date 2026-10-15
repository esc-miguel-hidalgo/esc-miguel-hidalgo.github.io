// Genera src/data/catalogo.json a partir del programa sintético unificado.
//
// Cada PDA recibe un id estable: hash de (grado, campo, contenido, texto del PDA).
// La base de datos guarda solo ese id, así que reordenar el JSON fuente no rompe
// nada; corregir el TEXTO de un PDA sí le cambia el id (el script avisa si un id
// que ya existía desaparece, para no dejar selecciones huérfanas sin darse cuenta).
//
// Uso:  node scripts/generar-catalogo.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = join(raiz, 'datos-fuente/programa_sintetico_unificado.json');
const SALIDA = join(raiz, 'src/data/catalogo.json');

export function idDe(...partes) {
  return createHash('sha1').update(partes.join('|')).digest('hex').slice(0, 10);
}

export function construirCatalogo(fuente) {
  const grados = {};
  for (const fase of fuente.fases) {
    for (const etiqueta of fase.grados) {
      const num = parseInt(etiqueta, 10);
      grados[num] = { grado: num, etiqueta, fase: fase.fase, campos: [] };
    }
    for (const campo of fase.campos_formativos) {
      for (const etiqueta of fase.grados) {
        const num = parseInt(etiqueta, 10);
        const usados = new Set();
        const contenidos = [];
        for (const item of campo.contenidos) {
          const textos = item.pda?.[etiqueta] || [];
          if (textos.length === 0) continue;
          const pdas = textos.map((texto) => {
            let id = 'p' + idDe(num, campo.nombre, item.contenido, texto);
            // El catálogo trae al menos un PDA repetido literal dentro del mismo
            // contenido; el sufijo lo distingue de forma determinista.
            for (let n = 2; usados.has(id); n++) id = 'p' + idDe(num, campo.nombre, item.contenido, texto, n);
            usados.add(id);
            return { id, texto };
          });
          contenidos.push({ id: 'c' + idDe(num, campo.nombre, item.contenido), contenido: item.contenido, pdas });
        }
        grados[num].campos.push({ nombre: campo.nombre, color: campo.color, contenidos });
      }
    }
  }
  return { titulo: fuente.titulo, grados };
}

function idsDe(catalogo) {
  const ids = new Set();
  for (const g of Object.values(catalogo.grados))
    for (const c of g.campos) for (const ct of c.contenidos) for (const p of ct.pdas) ids.add(p.id);
  return ids;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const nuevo = construirCatalogo(JSON.parse(readFileSync(FUENTE, 'utf8')));
  if (existsSync(SALIDA)) {
    const nuevos = idsDe(nuevo);
    const perdidos = [...idsDe(JSON.parse(readFileSync(SALIDA, 'utf8')))].filter((id) => !nuevos.has(id));
    if (perdidos.length) {
      console.warn(`⚠ ${perdidos.length} ids de PDA dejan de existir. Si ya hay selecciones guardadas con ellos, quedarán sin texto:`);
      console.warn(perdidos.slice(0, 20).join(', ') + (perdidos.length > 20 ? ' …' : ''));
    }
  }
  writeFileSync(SALIDA, JSON.stringify(nuevo));
  console.log(`Catálogo generado: ${idsDe(nuevo).size} PDA → ${SALIDA}`);
}
