/** Lanza el error de Supabase con un mensaje legible; devuelve `data` si no hubo error. */
export function ok({ data, error }) {
  if (error) throw new Error(traducir(error.message));
  return data;
}

function traducir(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'La cuenta aún no está confirmada. Revisa tu correo.';
  if (/row-level security|permission denied/i.test(msg)) return 'No tienes permiso para hacer esto.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  if (/Payload too large|exceeded the maximum/i.test(msg)) return 'El archivo es demasiado grande (máximo 25 MB).';
  if (/mime type/i.test(msg)) return 'Ese tipo de archivo no se acepta. Usa PDF, imagen, Word, Excel o PowerPoint.';
  return msg;
}
