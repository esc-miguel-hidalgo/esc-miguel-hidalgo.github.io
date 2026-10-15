// PDF del Programa Analítico trimestral con la validación de la dirección.
// Adaptado de programa-sintetico-nem/src/components/Export/generatePDF.js
// (generateAnaliticoPDF + addSignatures), con los colores del sitio de la escuela
// y el sello de validación del portal.
//
// Ojo: las fuentes estándar de jsPDF (helvetica) solo cubren Latin-1. Nada de
// emojis ni símbolos como ⚠ o ✓ en los textos: salen como basura.
import { jsPDF } from 'jspdf';
import { agrupar } from './catalogo.js';
import { fechaLarga } from './ciclo.js';
import { nombreEje } from '../data/ejes.js';
import { ESCUELA } from '../data/escuela.js';

const NAVY = [27, 42, 74];
const AMBAR = [232, 168, 56];
const GRIS_BORDE = [189, 195, 199];
const GRIS_FONDO = [240, 242, 245];
const GRIS_TEXTO = [80, 80, 80];
const NEGRO = [26, 26, 26];
const VERDE = [46, 125, 50];

const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const LIMITE = 255;

function encabezado(doc, titulo) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 216, 22, 'F');
  doc.setFillColor(...AMBAR);
  doc.rect(0, 22, 216, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, 108, 14, { align: 'center' });
  return 34;
}

function seccion(doc, label, y) {
  doc.setFillColor(...GRIS_FONDO);
  doc.setDrawColor(...GRIS_BORDE);
  doc.setLineWidth(0.4);
  doc.rect(15, y, 186, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(label, 18, y + 5.5);
  return y + 13;
}

function datosGenerales(doc, campos, y) {
  campos.forEach((c, i) => {
    const x = i % 2 === 0 ? 15 : 113;
    const fy = y + Math.floor(i / 2) * 11;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(`${c.label}:`, x, fy);
    const ancho = doc.getTextWidth(`${c.label}: `); // medido en negrita, antes de cambiar de fuente
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...NEGRO);
    doc.text(String(c.value || ''), x + ancho, fy);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setLineWidth(0.3);
    doc.line(x, fy + 2, x + 88, fy + 2);
  });
  return y + Math.ceil(campos.length / 2) * 11 + 4;
}

function pie(doc, folio) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setLineWidth(0.4);
    doc.line(15, 268, 201, 268);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(`${ESCUELA.nombre} - Portal docente - Folio ${folio}`, 15, 273);
    doc.text(`Página ${i} de ${total}`, 201, 273, { align: 'right' });
  }
}

function sello(doc, y, sel, directora) {
  if (y > 225) { doc.addPage(); y = 25; }
  const validado = sel.estado === 'validado';
  const color = validado ? VERDE : GRIS_TEXTO;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.rect(15, y, 186, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...color);
  doc.text(validado ? 'VALIDADO POR LA DIRECCIÓN' : 'SIN VALIDAR - DOCUMENTO DE TRABAJO', 108, y + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const linea = validado
    ? `${directora || 'Director(a)'} - ${fechaLarga(sel.validado_en)} - Folio ${sel.folio}`
    : `Estado actual: ${sel.estado}. Este documento no sustituye la validación de la dirección.`;
  doc.text(linea, 108, y + 13.5, { align: 'center' });
  return y + 26;
}

function firmas(doc, y, docente, directora) {
  if (y > 240) { doc.addPage(); y = 30; }
  y += 14;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.5);
  doc.line(15, y, 100, y);
  doc.line(116, y, 201, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text('Elaboró', 57.5, y + 5, { align: 'center' });
  doc.text('Vo. Bo. Director(a)', 158.5, y + 5, { align: 'center' });
  doc.setTextColor(...NEGRO);
  doc.text(docente || 'Nombre y firma del docente', 57.5, y + 10, { align: 'center' });
  doc.text(directora || 'Nombre, firma y sello', 158.5, y + 10, { align: 'center' });
}

/**
 * @param sel       fila de `selecciones` (folio, trimestre, estado, ejes, validado_en)
 * @param pdaIds    ids de PDA seleccionados
 * @param grupo     { ciclo, grado, grupo }
 * @param docente   nombre de la docente
 * @param directora nombre de la directora
 * @param guardar   false para devolver el jsPDF sin descargarlo (pruebas)
 */
export function generarPdfValidacion({ sel, pdaIds, grupo, docente, directora, guardar = true }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  let y = encabezado(doc, `PROGRAMA ANALÍTICO - TRIMESTRE ${sel.trimestre}`);

  y = seccion(doc, 'DATOS GENERALES', y);
  y = datosGenerales(doc, [
    { label: 'Escuela', value: ESCUELA.nombre },
    { label: 'CCT', value: ESCUELA.cct },
    { label: 'Zona escolar', value: ESCUELA.zona },
    { label: 'Sector', value: ESCUELA.sector },
    { label: 'Docente', value: docente },
    { label: 'Grado y grupo', value: `${grupo.grado}° ${grupo.grupo}` },
    { label: 'Director(a)', value: directora },
    { label: 'Ciclo escolar', value: grupo.ciclo },
  ], y);

  y = seccion(doc, 'EJES ARTICULADORES', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO);
  const ejes = sel.ejes?.length ? sel.ejes.map(nombreEje).join(' - ') : '(Sin ejes seleccionados)';
  const ejesL = doc.splitTextToSize(ejes, 180);
  doc.text(ejesL, 18, y);
  y += ejesL.length * 5 + 5;

  y = seccion(doc, `CONTENIDOS Y PROCESOS DE DESARROLLO DE APRENDIZAJE (${pdaIds.length} PDA)`, y);
  const { campos } = agrupar(pdaIds);
  for (const campo of campos) {
    if (y > 240) { doc.addPage(); y = 25; }
    const color = hexARgb(campo.color);
    doc.setFillColor(...GRIS_FONDO);
    doc.rect(15, y, 186, 8, 'F');
    doc.setDrawColor(...color);
    doc.setLineWidth(2.5);
    doc.line(15, y, 15, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(campo.nombre, 19, y + 5.5);
    y += 12;

    for (const c of campo.contenidos) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      const cl = doc.splitTextToSize(`Contenido: ${c.contenido}`, 178);
      // El contenido no se queda solo al pie de página: baja junto con su primer PDA.
      const primerPda = doc.splitTextToSize(c.pdas[0].texto, 169).length * 4.6 + 6;
      if (y + cl.length * 4.6 + primerPda > LIMITE) { doc.addPage(); y = 25; }
      doc.setTextColor(...GRIS_TEXTO);
      doc.text(cl, 19, y);
      y += cl.length * 4.6 + 2;

      for (const p of c.pdas) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const pl = doc.splitTextToSize(p.texto, 169);
        const h = pl.length * 4.6 + 4;
        if (y + h > LIMITE) { doc.addPage(); y = 25; }
        doc.setDrawColor(...GRIS_BORDE);
        doc.setLineWidth(0.3);
        doc.rect(19, y - 1, 182, h);
        doc.setDrawColor(...color);
        doc.setLineWidth(1.5);
        doc.line(19, y - 1, 19, y - 1 + h);
        doc.setTextColor(...NEGRO);
        doc.text(pl, 23, y + 3.2);
        y += h + 2;
      }
      y += 2;
    }
    y += 3;
  }

  y = sello(doc, y + 4, sel, directora);
  firmas(doc, y, docente, directora);
  pie(doc, sel.folio);
  if (!guardar) return doc;
  doc.save(`programa-analitico-${grupo.ciclo}-${grupo.grado}${grupo.grupo}-T${sel.trimestre}.pdf`);
}
