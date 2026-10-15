// Ciclo escolar y trimestres (calendario SEP: ciclo de agosto a julio).
export const TRIMESTRES = [
  { num: 1, meses: 'Agosto – Noviembre' },
  { num: 2, meses: 'Diciembre – Marzo' },
  { num: 3, meses: 'Abril – Julio' },
];

export function cicloDe(fecha = new Date()) {
  const y = fecha.getFullYear();
  return fecha.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function trimestreDe(fecha = new Date()) {
  const m = fecha.getMonth(); // 0 = enero
  if (m >= 7 && m <= 10) return 1;
  if (m === 11 || m <= 2) return 2;
  return 3;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "14 de octubre de 2026" — a partir de un timestamp ISO, en hora local. */
export function fechaLarga(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
