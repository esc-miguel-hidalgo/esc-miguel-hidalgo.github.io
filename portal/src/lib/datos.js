// Todas las lecturas/escrituras a Supabase pasan por aquí. Las reglas de quién
// puede qué viven en la base (supabase/migrations); este módulo no las repite.
import { supabase, ok, BUCKET } from './supabase.js';
import { comprimirImagen, esComprimible } from './imagen.js';

// ─── Personas y grupos ──────────────────────────────────────────────────────
export async function miPerfil(uid) {
  return ok(await supabase.from('perfiles').select('id, nombre, rol, activo').eq('id', uid).single());
}

export async function nombreDirectora() {
  const filas = ok(await supabase.from('perfiles').select('nombre').eq('rol', 'directora').eq('activo', true).limit(1));
  return filas[0]?.nombre || '';
}

/** Grupos visibles para quien consulta (la docente: los suyos; la directora: todos). */
export async function grupos() {
  return ok(await supabase
    .from('grupos')
    .select('id, ciclo, grado, grupo, docente_id, docente:perfiles(nombre)')
    .order('ciclo', { ascending: false })
    .order('grado')
    .order('grupo'));
}

// ─── Selecciones trimestrales ───────────────────────────────────────────────
const CAMPOS_SEL = 'id, folio, grupo_id, trimestre, estado, ejes, comentario, enviado_en, validado_en, validado_por, seleccion_pda(pda_id, estado, trabajado_en)';

export async function seleccionesDeGrupos(grupoIds) {
  if (!grupoIds.length) return [];
  return ok(await supabase.from('selecciones').select(CAMPOS_SEL).in('grupo_id', grupoIds));
}

export async function crearSeleccion(grupoId, trimestre) {
  return ok(await supabase.from('selecciones').insert({ grupo_id: grupoId, trimestre }).select(CAMPOS_SEL).single());
}

export async function agregarPda(seleccionId, pdaId) {
  ok(await supabase.from('seleccion_pda').insert({ seleccion_id: seleccionId, pda_id: pdaId }));
}

export async function quitarPda(seleccionId, pdaId) {
  ok(await supabase.from('seleccion_pda').delete().eq('seleccion_id', seleccionId).eq('pda_id', pdaId));
}

export async function guardarEjes(seleccionId, ejes) {
  ok(await supabase.from('selecciones').update({ ejes }).eq('id', seleccionId));
}

/** Transición de estado; la base decide si es válida (ver selecciones_reglas). */
export async function cambiarEstado(seleccionId, estado, comentario) {
  const cambios = comentario === undefined ? { estado } : { estado, comentario };
  return ok(await supabase.from('selecciones').update(cambios).eq('id', seleccionId).select(CAMPOS_SEL).single());
}

export async function marcarPda(seleccionId, pdaId, estado) {
  return ok(await supabase
    .from('seleccion_pda')
    .update({ estado })
    .eq('seleccion_id', seleccionId)
    .eq('pda_id', pdaId)
    .select('pda_id, estado, trabajado_en')
    .single());
}

// ─── Documentos ─────────────────────────────────────────────────────────────
export const TIPOS_DOC = [
  { id: 'planeacion', nombre: 'Planeación', plural: 'Planeaciones' },
  { id: 'diagnostico', nombre: 'Diagnóstico', plural: 'Diagnósticos' },
  { id: 'evidencia', nombre: 'Evidencia', plural: 'Evidencias' },
];
export const nombreTipo = (id) => TIPOS_DOC.find((t) => t.id === id)?.nombre || id;

export async function documentosDeGrupos(grupoIds) {
  if (!grupoIds.length) return [];
  return ok(await supabase
    .from('documentos')
    .select('id, grupo_id, tipo, trimestre, titulo, version, storage_path, nombre_archivo, mime, tamano, estado, comentario, creado_en, revisado_en')
    .in('grupo_id', grupoIds)
    .order('creado_en', { ascending: false }));
}

function nombreSeguro(nombre) {
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
  return limpio.slice(-80) || 'archivo';
}

/**
 * Sube el archivo al bucket privado y registra el documento. Si el registro
 * falla, borra el archivo para no dejar huérfanos.
 */
export async function subirDocumento({ grupo, tipo, trimestre, titulo, file }) {
  let cuerpo = file;
  let nombre = file.name;
  let mime = file.type || 'application/octet-stream';
  if (esComprimible(file)) {
    cuerpo = await comprimirImagen(file);
    nombre = nombre.replace(/\.\w+$/, '') + '.jpg';
    mime = 'image/jpeg';
  }
  const ruta = `${grupo.id}/${grupo.ciclo}/${tipo}/${crypto.randomUUID()}-${nombreSeguro(nombre)}`;
  ok(await supabase.storage.from(BUCKET).upload(ruta, cuerpo, { contentType: mime, upsert: false }));
  const r = await supabase
    .from('documentos')
    .insert({ grupo_id: grupo.id, tipo, trimestre, titulo, storage_path: ruta, nombre_archivo: nombre, mime, tamano: cuerpo.size })
    .select()
    .single();
  if (r.error) await supabase.storage.from(BUCKET).remove([ruta]);
  return ok(r);
}

/** URL temporal (1 h) para ver o descargar un archivo privado. */
export async function urlFirmada(ruta, descargar = false) {
  const opciones = descargar ? { download: true } : undefined;
  return ok(await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600, opciones)).signedUrl;
}

export async function borrarDocumento(d) {
  // RLS no da error al negar un borrado: simplemente no borra filas.
  const borrados = ok(await supabase.from('documentos').delete().eq('id', d.id).select('id'));
  if (!borrados.length) throw new Error('No se pudo borrar: la dirección ya lo revisó.');
  await supabase.storage.from(BUCKET).remove([d.storage_path]);
}

export async function revisarDocumento(id, estado, comentario) {
  return ok(await supabase.from('documentos').update({ estado, comentario }).eq('id', id).select().single());
}
