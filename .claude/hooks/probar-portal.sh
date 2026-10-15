#!/bin/bash
# PostToolUse (Edit|Write): si cambió el portal o una migración, corre las pruebas del portal.
# Si fallan, sale con código 2 para que Claude vea el error y lo corrija en el momento.

f=$(jq -r '.tool_input.file_path // empty')
rel=${f#"$CLAUDE_PROJECT_DIR"/}

case "$rel" in
  portal/src/*|portal/test/*|portal/lib/*|supabase/migrations/*|supabase/tests/*) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR/portal" || exit 0
[ -d node_modules ] || { echo "Pruebas del portal omitidas: falta npm install en portal/." >&2; exit 0; }

if ! salida=$(npx vitest run --reporter=dot 2>&1); then
  echo "Las pruebas del portal fallaron tras editar $rel:" >&2
  echo "$salida" | tail -40 >&2
  exit 2
fi
exit 0
