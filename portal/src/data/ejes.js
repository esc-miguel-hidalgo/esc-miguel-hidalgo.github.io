// Los 7 ejes articuladores del Plan de Estudios 2022 (lista oficial).
// Tomado de programa-sintetico-nem/src/data/ejes.js, sin la heurística de palabras clave.
export const EJES = [
  { id: 'inclusion', nombre: 'Inclusión' },
  { id: 'pensamiento_critico', nombre: 'Pensamiento crítico' },
  { id: 'interculturalidad', nombre: 'Interculturalidad crítica' },
  { id: 'igualdad_genero', nombre: 'Igualdad de género' },
  { id: 'vida_saludable', nombre: 'Vida saludable' },
  { id: 'lectura_escritura', nombre: 'Apropiación de las culturas a través de la lectura y la escritura' },
  { id: 'artes', nombre: 'Artes y experiencias estéticas' },
];

export const nombreEje = (id) => EJES.find((e) => e.id === id)?.nombre || id;
