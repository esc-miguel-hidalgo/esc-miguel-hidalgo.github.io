// Supabase falso en memoria para `npm run demo`: permite recorrer la interfaz sin
// proyecto real. NO aplica las reglas RLS (esas se prueban en test/reglas.test.js);
// solo imita lo mínimo de los triggers para que el flujo se vea como en producción.
// Nunca entra al build de producción (vite.config.js solo lo usa con --mode demo).
const ahora = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const PERSONAS = {
  'directora@demo.mx': { id: 'u-dir', nombre: 'Mtra. Directora Demo', rol: 'directora', activo: true },
  'docente1@demo.mx': { id: 'u-d1', nombre: 'Mtra. Ana Primero', rol: 'docente', activo: true },
  'docente2@demo.mx': { id: 'u-d2', nombre: 'Mtro. Beto Segundo', rol: 'docente', activo: true },
};
const ciclo = (() => { const d = new Date(); const y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; })();

const db = {
  perfiles: Object.values(PERSONAS),
  grupos: [
    { id: 'g1', ciclo, grado: 1, grupo: 'A', docente_id: 'u-d1' },
    { id: 'g2', ciclo, grado: 2, grupo: 'A', docente_id: 'u-d2' },
    { id: 'g3', ciclo, grado: 3, grupo: 'A', docente_id: null },
  ],
  selecciones: [],
  seleccion_pda: [],
  documentos: [],
};
const archivos = new Map();
let folio = 1;
let sesion = null;
const oyentes = new Set();

function expandir(tabla, fila) {
  if (tabla === 'grupos') return { ...fila, docente: db.perfiles.find((p) => p.id === fila.docente_id) || null };
  if (tabla === 'selecciones') return { ...fila, seleccion_pda: db.seleccion_pda.filter((p) => p.seleccion_id === fila.id).map((p) => ({ ...p })) };
  return { ...fila };
}

function alInsertar(tabla, fila) {
  if (tabla === 'selecciones') Object.assign(fila, { id: uuid(), folio: folio++, estado: 'borrador', ejes: [], comentario: null, enviado_en: null, validado_en: null, validado_por: null });
  if (tabla === 'seleccion_pda') {
    if (db.seleccion_pda.some((p) => p.seleccion_id === fila.seleccion_id && p.pda_id === fila.pda_id)) throw new Error('duplicate key');
    Object.assign(fila, { estado: 'planeado', trabajado_en: null });
  }
  if (tabla === 'documentos') {
    const previas = db.documentos.filter((d) => d.grupo_id === fila.grupo_id && d.tipo === fila.tipo && d.trimestre === fila.trimestre && d.titulo.toLowerCase() === fila.titulo.toLowerCase());
    Object.assign(fila, { id: uuid(), version: previas.length + 1, estado: 'entregado', comentario: null, creado_en: ahora(), revisado_en: null });
  }
  return fila;
}

function alActualizar(tabla, vieja, cambios) {
  const nueva = { ...vieja, ...cambios };
  if (tabla === 'selecciones' && cambios.estado && cambios.estado !== vieja.estado) {
    if (cambios.estado === 'enviado') nueva.enviado_en = ahora();
    if (cambios.estado === 'borrador') nueva.enviado_en = null;
    nueva.validado_en = cambios.estado === 'validado' ? ahora() : null;
  }
  if (tabla === 'seleccion_pda' && cambios.estado) nueva.trabajado_en = cambios.estado === 'trabajado' ? ahora() : null;
  return nueva;
}

class Consulta {
  constructor(tabla) { Object.assign(this, { tabla, filtros: [], op: 'select', unico: false, orden: [], lim: null }); }
  select() { if (this.op === 'select') this.op = 'select'; this.devolver = true; return this; }
  insert(v) { this.op = 'insert'; this.valores = v; return this; }
  update(v) { this.op = 'update'; this.valores = v; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filtros.push((f) => f[c] === v); return this; }
  in(c, vs) { this.filtros.push((f) => vs.includes(f[c])); return this; }
  order(c, o = {}) { this.orden.push([c, o.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.unico = true; return this; }
  then(ok, mal) { return new Promise((r) => setTimeout(r, 120)).then(() => this.ejecutar()).then(ok, mal); }

  ejecutar() {
    try {
      const filas = db[this.tabla];
      const pasa = (f) => this.filtros.every((fn) => fn(f));
      let res;
      if (this.op === 'insert') {
        res = [alInsertar(this.tabla, { ...this.valores })];
        filas.push(res[0]);
      } else if (this.op === 'update') {
        res = [];
        filas.forEach((f, i) => { if (pasa(f)) { filas[i] = alActualizar(this.tabla, f, this.valores); res.push(filas[i]); } });
      } else if (this.op === 'delete') {
        res = filas.filter(pasa);
        db[this.tabla] = filas.filter((f) => !pasa(f));
      } else {
        res = filas.filter(pasa);
        // Imitación mínima de RLS para que cada docente vea solo sus grupos en la demo.
        const yo = db.perfiles.find((p) => p.id === sesion?.user.id);
        if (this.tabla === 'grupos' && yo?.rol === 'docente') res = res.filter((g) => g.docente_id === yo.id);
        for (const [c, asc] of [...this.orden].reverse()) res = [...res].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
        if (this.lim) res = res.slice(0, this.lim);
      }
      res = res.map((f) => expandir(this.tabla, f));
      if (this.unico) return res.length === 1 ? { data: res[0], error: null } : { data: null, error: { message: 'Registro no encontrado' } };
      return { data: res, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }
}

const usuario = (correo) => ({ id: PERSONAS[correo].id, email: correo });
const avisar = (evento) => oyentes.forEach((fn) => fn(evento, sesion));

export const configurado = true;
export const BUCKET = 'documentos';
export { ok } from '../src/lib/supabase-ok.js';

export const supabase = {
  from: (tabla) => new Consulta(tabla),
  auth: {
    getSession: async () => ({ data: { session: sesion } }),
    onAuthStateChange: (fn) => { oyentes.add(fn); return { data: { subscription: { unsubscribe: () => oyentes.delete(fn) } } }; },
    signInWithPassword: async ({ email }) => {
      if (!PERSONAS[email]) return { data: null, error: { message: 'Invalid login credentials' } };
      sesion = { user: usuario(email) };
      avisar('SIGNED_IN');
      return { data: { session: sesion }, error: null };
    },
    signOut: async () => { sesion = null; avisar('SIGNED_OUT'); return { error: null }; },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: {}, error: null }),
  },
  storage: {
    from: () => ({
      upload: async (ruta, cuerpo) => { archivos.set(ruta, cuerpo); return { data: { path: ruta }, error: null }; },
      remove: async (rutas) => { rutas.forEach((r) => archivos.delete(r)); return { data: [], error: null }; },
      createSignedUrl: async (ruta) => {
        const b = archivos.get(ruta);
        return b ? { data: { signedUrl: URL.createObjectURL(b) }, error: null } : { data: null, error: { message: 'Object not found' } };
      },
    }),
  },
};
