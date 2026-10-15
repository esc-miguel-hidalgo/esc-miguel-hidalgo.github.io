import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construirCatalogo } from '../scripts/generar-catalogo.mjs';
import catalogo from '../src/data/catalogo.json';
import { pda, agrupar, buscar, duplicados, catalogoDeGrado } from '../src/lib/catalogo.js';
import { cicloDe, trimestreDe } from '../src/lib/ciclo.js';

const fuente = JSON.parse(readFileSync(join(import.meta.dirname, '../datos-fuente/programa_sintetico_unificado.json'), 'utf8'));
const todos = Object.values(catalogo.grados).flatMap((g) => g.campos.flatMap((c) => c.contenidos.flatMap((ct) => ct.pdas)));

describe('catálogo', () => {
  it('el JSON comiteado coincide con lo que genera el script (nadie lo editó a mano)', () => {
    expect(construirCatalogo(fuente)).toEqual(catalogo);
  });

  it('trae los 6 grados y los 1,339 PDA, con ids únicos y con el formato que acepta la base', () => {
    expect(Object.keys(catalogo.grados)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(todos).toHaveLength(1339);
    expect(new Set(todos.map((p) => p.id)).size).toBe(1339);
    for (const p of todos) expect(p.id).toMatch(/^p[0-9a-f]{10}$/);
  });

  it('los ids no dependen del orden del JSON fuente', () => {
    const invertido = structuredClone(fuente);
    for (const f of invertido.fases) for (const c of f.campos_formativos) c.contenidos.reverse();
    const ids = (cat) => new Set(Object.values(cat.grados).flatMap((g) => g.campos.flatMap((c) => c.contenidos.flatMap((ct) => ct.pdas.map((p) => p.id)))));
    expect(ids(construirCatalogo(invertido))).toEqual(ids(catalogo));
  });

  it('cada grado tiene los 4 campos formativos', () => {
    for (let g = 1; g <= 6; g++) expect(catalogoDeGrado(g).campos.map((c) => c.nombre)).toHaveLength(4);
  });

  it('agrupa en orden de catálogo y separa ids desconocidos', () => {
    const ids = catalogoDeGrado(1).campos.flatMap((c) => c.contenidos[0].pdas.slice(0, 1).map((p) => p.id));
    const { campos, huerfanos } = agrupar([...ids].reverse().concat('pffffffffff'));
    expect(campos.map((c) => c.nombre)).toEqual(catalogoDeGrado(1).campos.map((c) => c.nombre));
    expect(huerfanos).toEqual(['pffffffffff']);
  });

  it('busca sin importar acentos ni mayúsculas, solo dentro del grado', () => {
    const r = buscar(3, 'LECTURA');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.grado === 3)).toBe(true);
    expect(buscar(3, 'ab')).toEqual([]);
  });

  it('detecta PDA repetidos en otros trimestres', () => {
    const [a, b] = todos;
    expect(duplicados({ 1: [a.id, b.id], 2: [a.id], 3: [a.id] }, 1)).toEqual({ [a.id]: [2, 3] });
    expect(pda(a.id).texto).toBe(a.texto);
  });
});

describe('ciclo escolar', () => {
  it('el ciclo cambia en agosto', () => {
    expect(cicloDe(new Date(2026, 6, 31))).toBe('2025-2026');
    expect(cicloDe(new Date(2026, 7, 1))).toBe('2026-2027');
  });
  it('trimestres: ago–nov, dic–mar, abr–jul', () => {
    expect([7, 10, 11, 0, 2, 3, 6].map((m) => trimestreDe(new Date(2026, m, 15)))).toEqual([1, 1, 2, 2, 2, 3, 3]);
  });
});
