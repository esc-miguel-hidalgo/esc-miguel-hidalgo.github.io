#!/bin/bash
# PreToolUse (Edit|Write): bloquea cambios a archivos que no deben tocarse.
#   - portal/.env.local          → claves reales de Supabase
#   - media/** existentes        → documentos y fotos originales de la escuela (se publican tal cual)
#   - supabase/migrations/*.sql existentes → una migración aplicada no se edita; se agrega una nueva
# Salir con código 2 bloquea la herramienta y le devuelve el mensaje a Claude.

f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
rel=${f#"$CLAUDE_PROJECT_DIR"/}

case "$rel" in
  portal/.env.local|portal/.env)
    echo "Bloqueado: $rel tiene claves reales. Edítalo a mano; usa portal/.env.example como plantilla." >&2
    exit 2 ;;
  media/*)
    if [ -e "$f" ]; then
      echo "Bloqueado: $rel es un original de la escuela y se publica tal cual. No se modifica ni se reemplaza sin que lo pidan." >&2
      exit 2
    fi ;;
  supabase/migrations/*.sql)
    if [ -e "$f" ]; then
      echo "Bloqueado: $rel ya existe y pudo haberse aplicado. Crea una migración nueva (AAAAMMDDHHMMSS_nombre.sql) y su prueba en portal/test/reglas.test.js." >&2
      exit 2
    fi ;;
esac
exit 0
