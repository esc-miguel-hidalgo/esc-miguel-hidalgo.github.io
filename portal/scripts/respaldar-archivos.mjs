// Descarga todos los archivos del bucket privado `documentos` a una carpeta local.
// Lo usa .github/workflows/respaldo.yml; también sirve a mano:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/respaldar-archivos.mjs ./salida
//
// La service role key salta RLS: NUNCA va en el navegador ni en el repo, solo
// en los secretos de GitHub o en la terminal de quien administra.
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const destino = process.argv[2];
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !destino) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/respaldar-archivos.mjs <carpeta>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = supabase.storage.from('documentos');

async function listar(prefijo = '') {
  const rutas = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefijo, { limit: 1000, offset });
    if (error) throw error;
    for (const e of data) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
      // Las "carpetas" vienen sin id; los archivos con id.
      if (e.id) rutas.push(ruta);
      else rutas.push(...(await listar(ruta)));
    }
    if (data.length < 1000) return rutas;
  }
}

const rutas = await listar();
let bytes = 0;
for (const ruta of rutas) {
  const { data, error } = await bucket.download(ruta);
  if (error) throw new Error(`${ruta}: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  mkdirSync(dirname(join(destino, ruta)), { recursive: true });
  writeFileSync(join(destino, ruta), buf);
  bytes += buf.length;
}
writeFileSync(join(destino, 'LISTA.txt'), rutas.sort().join('\n') + '\n');
console.log(`${rutas.length} archivos, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${destino}`);
