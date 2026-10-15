import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { catalogoDeGrado } from '../src/lib/catalogo.js';
import { generarPdfValidacion } from '../src/lib/pdfValidacion.js';

describe('PDF de validación', () => {
  it('genera un PDF de varias páginas con todos los campos del grado', () => {
    const ids = catalogoDeGrado(4).campos.flatMap((c) => c.contenidos.slice(0, 3).flatMap((ct) => ct.pdas.map((p) => p.id)));
    const doc = generarPdfValidacion({
      sel: { folio: 12, trimestre: 2, estado: 'validado', ejes: ['inclusion', 'lectura_escritura'], validado_en: '2026-11-28T17:00:00Z' },
      pdaIds: ids,
      grupo: { ciclo: '2026-2027', grado: 4, grupo: 'A' },
      docente: 'Mtra. Ana Pérez Núñez',
      directora: 'Mtra. Directora Ejemplo',
      guardar: false,
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const texto = doc.output();
    expect(texto).toContain('VALIDADO POR LA DIRECCI');
    if (process.env.PDF_SALIDA) writeFileSync(process.env.PDF_SALIDA, Buffer.from(doc.output('arraybuffer')));
  });
});
