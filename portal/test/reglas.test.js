// Prueba las reglas de acceso (RLS + triggers) contra Postgres real (PGlite),
// aplicando las mismas migraciones que van a Supabase. Si una regla se rompe,
// aquí truena antes de llegar a producción.
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SUPA = join(import.meta.dirname, '../../supabase');
const A = '00000000-0000-0000-0000-00000000000a'; // docente de 1° A
const B = '00000000-0000-0000-0000-00000000000b'; // docente de 2° A
const D = '00000000-0000-0000-0000-00000000000d'; // directora
const GA = '10000000-0000-0000-0000-00000000000a';
const GB = '10000000-0000-0000-0000-00000000000b';
const PDA1 = 'p0000000001';
const PDA2 = 'p0000000002';

let db;

async function como(uid, sql, params) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
const filas = async (uid, sql, params) => (await como(uid, sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(SUPA, 'tests/stub-supabase.sql'), 'utf8'));
  for (const f of readdirSync(join(SUPA, 'migrations')).sort()) {
    await db.exec(readFileSync(join(SUPA, 'migrations', f), 'utf8'));
  }
  await db.exec(`
    insert into auth.users (id, raw_user_meta_data) values
      ('${A}', '{"nombre":"Docente A"}'), ('${B}', '{"nombre":"Docente B"}'), ('${D}', '{"nombre":"Directora"}');
    update perfiles set rol = 'directora' where id = '${D}';
    insert into grupos (id, ciclo, grado, grupo, docente_id) values
      ('${GA}', '2026-2027', 1, 'A', '${A}'), ('${GB}', '2026-2027', 2, 'A', '${B}');
  `);
});

describe('perfiles y grupos', () => {
  it('el trigger crea el perfil con el nombre de los metadatos', async () => {
    const r = await db.query(`select nombre from perfiles where id = $1`, [A]);
    expect(r.rows[0].nombre).toBe('Docente A');
  });

  it('cada docente solo ve su grupo; la directora ve todos', async () => {
    expect((await filas(A, 'select id from grupos')).map((g) => g.id)).toEqual([GA]);
    expect(await filas(D, 'select id from grupos')).toHaveLength(2);
  });

  it('una docente ve su perfil y el de la directora, no el de otra docente', async () => {
    const ids = (await filas(A, 'select id from perfiles')).map((p) => p.id).sort();
    expect(ids).toEqual([A, D].sort());
  });

  it('nadie se cambia el rol a sí mismo', async () => {
    await como(A, `update perfiles set rol = 'directora' where id = $1`, [A]);
    const r = await db.query(`select rol from perfiles where id = $1`, [A]);
    expect(r.rows[0].rol).toBe('docente');
  });
});

describe('flujo de selección trimestral', () => {
  let sel;

  it('la docente crea su selección en borrador aunque intente forzar otro estado', async () => {
    const r = await filas(A,
      `insert into selecciones (grupo_id, trimestre, estado) values ($1, 1, 'validado') returning id, estado`, [GA]);
    sel = r[0].id;
    expect(r[0].estado).toBe('borrador');
  });

  it('otra docente no puede crear selecciones en un grupo ajeno', async () => {
    await expect(como(B, `insert into selecciones (grupo_id, trimestre) values ($1, 2)`, [GA])).rejects.toThrow();
  });

  it('agrega PDA y ejes en borrador', async () => {
    await como(A, `insert into seleccion_pda (seleccion_id, pda_id) values ($1, $2), ($1, $3)`, [sel, PDA1, PDA2]);
    await como(A, `update selecciones set ejes = '{inclusion}' where id = $1`, [sel]);
    expect(await filas(A, 'select * from seleccion_pda where seleccion_id = $1', [sel])).toHaveLength(2);
  });

  it('otra docente no ve ni modifica la selección ajena', async () => {
    expect(await filas(B, 'select * from selecciones')).toHaveLength(0);
    expect(await filas(B, 'select * from seleccion_pda')).toHaveLength(0);
    await como(B, `delete from seleccion_pda where seleccion_id = $1`, [sel]);
    expect((await db.query('select count(*)::int n from seleccion_pda')).rows[0].n).toBe(2);
  });

  it('no se marca trabajado antes de la validación', async () => {
    await expect(como(A, `update seleccion_pda set estado = 'trabajado' where seleccion_id = $1`, [sel]))
      .rejects.toThrow(/validó/);
  });

  it('la docente no puede validarse sola', async () => {
    await expect(como(A, `update selecciones set estado = 'validado' where id = $1`, [sel])).rejects.toThrow(/no permitido/);
  });

  it('la docente envía; queda bloqueada para agregar o quitar PDA y ejes', async () => {
    const r = await filas(A, `update selecciones set estado = 'enviado' where id = $1 returning enviado_en`, [sel]);
    expect(r[0].enviado_en).not.toBeNull();
    await expect(como(A, `insert into seleccion_pda (seleccion_id, pda_id) values ($1, 'p0000000003')`, [sel])).rejects.toThrow(/enviada/);
    await expect(como(A, `delete from seleccion_pda where seleccion_id = $1`, [sel])).rejects.toThrow(/enviada/);
    await expect(como(A, `update selecciones set ejes = '{}' where id = $1`, [sel])).rejects.toThrow(/enviada/);
  });

  it('la docente no puede escribir el comentario de la directora', async () => {
    await como(A, `update selecciones set comentario = 'aprobado por mí' where id = $1`, [sel]);
    expect((await db.query('select comentario from selecciones where id = $1', [sel])).rows[0].comentario).toBeNull();
  });

  it('la directora devuelve con comentario y la docente puede corregir', async () => {
    await como(D, `update selecciones set estado = 'devuelto', comentario = 'Falta un PDA de Lenguajes' where id = $1`, [sel]);
    await como(A, `insert into seleccion_pda (seleccion_id, pda_id) values ($1, 'p0000000003')`, [sel]);
    await como(A, `update selecciones set estado = 'enviado' where id = $1`, [sel]);
  });

  it('la directora valida; queda registrado quién y cuándo', async () => {
    const r = await filas(D, `update selecciones set estado = 'validado' where id = $1 returning validado_por, validado_en`, [sel]);
    expect(r[0].validado_por).toBe(D);
    expect(r[0].validado_en).not.toBeNull();
  });

  it('una validada no admite cambios de PDA, pero sí marcar trabajado', async () => {
    await expect(como(A, `delete from seleccion_pda where seleccion_id = $1 and pda_id = $2`, [sel, PDA1])).rejects.toThrow();
    const r = await filas(A,
      `update seleccion_pda set estado = 'trabajado' where seleccion_id = $1 and pda_id = $2 returning trabajado_en`, [sel, PDA1]);
    expect(r[0].trabajado_en).not.toBeNull();
  });

  it('la directora no puede marcar PDA trabajados (solo lee)', async () => {
    const r = await como(D, `update seleccion_pda set estado = 'trabajado' where seleccion_id = $1 and pda_id = $2`, [sel, PDA2]);
    expect(r.affectedRows).toBe(0);
  });

  it('la docente no puede regresar una validada a borrador', async () => {
    await expect(como(A, `update selecciones set estado = 'borrador' where id = $1`, [sel])).rejects.toThrow(/no permitido/);
  });

  it('la bitácora registró cada cambio de estado y solo la directora la lee', async () => {
    const estados = (await filas(D, `select detalle->>'estado' e from bitacora where tabla = 'selecciones' order by id`)).map((r) => r.e);
    expect(estados).toEqual(['borrador', 'enviado', 'devuelto', 'enviado', 'validado']);
    expect(await filas(A, 'select * from bitacora')).toHaveLength(0);
  });
});

describe('documentos y archivos', () => {
  const ruta = (g, n) => `${g}/2026-2027/planeacion/${n}.pdf`;

  async function subir(uid, grupo, nombre, titulo = 'Planeación semana 1') {
    await como(uid, `insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [ruta(grupo, nombre)]);
    return filas(uid,
      `insert into documentos (grupo_id, tipo, trimestre, titulo, storage_path, nombre_archivo)
       values ($1, 'planeacion', 1, $2, $3, $4) returning id, version, estado`,
      [grupo, titulo, ruta(grupo, nombre), nombre + '.pdf']);
  }

  it('la docente sube a su grupo; resubir el mismo título crea versión 2', async () => {
    expect((await subir(A, GA, 'v1'))[0].version).toBe(1);
    expect((await subir(A, GA, 'v2', 'planeación semana 1 '))[0].version).toBe(2);
  });

  it('no puede subir archivos ni registros a un grupo ajeno', async () => {
    await expect(como(A, `insert into storage.objects (bucket_id, name) values ('documentos', $1)`, [ruta(GB, 'x')])).rejects.toThrow();
    await expect(como(A,
      `insert into documentos (grupo_id, tipo, titulo, storage_path, nombre_archivo) values ($1, 'evidencia', 't', $2, 'x')`,
      [GB, ruta(GB, 'x')])).rejects.toThrow();
  });

  it('un registro no puede apuntar a una ruta fuera de su grupo', async () => {
    await expect(como(A,
      `insert into documentos (grupo_id, tipo, titulo, storage_path, nombre_archivo) values ($1, 'evidencia', 't', $2, 'x')`,
      [GA, ruta(GB, 'y')])).rejects.toThrow();
  });

  it('otra docente no ve los archivos ni registros ajenos; la directora sí', async () => {
    expect(await filas(B, 'select * from storage.objects')).toHaveLength(0);
    expect(await filas(B, 'select * from documentos')).toHaveLength(0);
    expect(await filas(D, 'select * from storage.objects')).toHaveLength(2);
    expect(await filas(D, 'select * from documentos')).toHaveLength(2);
  });

  it('rutas mal formadas se rechazan', async () => {
    await expect(como(A, `insert into storage.objects (bucket_id, name) values ('documentos', 'no-es-uuid/x.pdf')`)).rejects.toThrow();
  });

  it('la docente no puede marcarse revisado; la directora sí, sin poder alterar el archivo', async () => {
    const r1 = await como(A, `update documentos set estado = 'revisado'`);
    expect(r1.affectedRows).toBe(0);
    const r = await filas(D,
      `update documentos set estado = 'revisado', storage_path = 'otro', comentario = 'Bien' where version = 1 returning storage_path, revisado_por`);
    expect(r[0].storage_path).toBe(ruta(GA, 'v1'));
    expect(r[0].revisado_por).toBe(D);
  });

  it('un documento revisado ya no se puede borrar; uno entregado sí', async () => {
    await como(A, `delete from storage.objects where name = $1`, [ruta(GA, 'v1')]);
    await como(A, `delete from documentos where version = 1`);
    expect((await db.query(`select count(*)::int n from storage.objects where name = $1`, [ruta(GA, 'v1')])).rows[0].n).toBe(1);
    expect((await db.query(`select count(*)::int n from documentos where version = 1`)).rows[0].n).toBe(1);

    await como(A, `delete from documentos where version = 2`);
    expect((await db.query(`select count(*)::int n from documentos where version = 2`)).rows[0].n).toBe(0);
  });

  it('el rol anon no ve nada (solo puede llamar ping)', async () => {
    await db.exec('set role anon');
    try {
      expect((await db.query('select public.ping() r')).rows[0].r).toBe('ok');
      await expect(db.query('select * from documentos')).rejects.toThrow(/permission/);
      await expect(db.query('select * from perfiles')).rejects.toThrow(/permission/);
    } finally {
      await db.exec('reset role');
    }
  });
});
