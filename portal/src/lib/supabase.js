import { createClient } from '@supabase/supabase-js';

// Valores públicos (la anon key está hecha para ir en el navegador; la seguridad
// la dan las reglas RLS de supabase/migrations). Se definen en portal/.env.local
// para desarrollo y como variables del repositorio en GitHub para el despliegue.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && anonKey);
export const supabase = configurado ? createClient(url, anonKey) : null;

export const BUCKET = 'documentos';

export { ok } from './supabase-ok.js';
