---
name: close
description: Cierra una sesión de trabajo en el sitio de la Esc. Prim. "Miguel Hidalgo". Reconstruye lo hecho desde git, actualiza solo los documentos que quedaron obsoletos (README "Pendientes / roadmap", CONTRIBUTING, docs/portal-docente-pda.md) y la memoria del proyecto, verifica nombres y cifras contra el repo, corre las pruebas del portal si se tocó, y propone el commit de cierre sin commitear solo. Úsalo cuando el usuario diga "cerrar sesión", "cerremos" o similar en este proyecto.
user-invocable: true
---

# /close — Cierre de sesión del sitio de la escuela

Complemento de `/open` (`.claude/skills/open/SKILL.md`): lo que aquí se deja escrito es lo que `/open` lee
la próxima vez.

Adaptado del patrón `/close` de `seprn-sitio` y `barber-saas`, no copiado literal. Este repo no tiene
bitácora; `CLAUDE.md` guarda solo reglas permanentes (actualízalo si una regla cambió). El registro de la sesión queda en:

| Dónde | Qué va ahí |
|---|---|
| `git log` | Qué se hizo (commits `tipo: descripción`, ver CONTRIBUTING → "Convenciones de commits"). |
| `README.md` → "Pendientes / roadmap" | Lo que falta del sitio, con prioridad. |
| `docs/portal-docente-pda.md` | Estado, decisiones y pendientes del portal docente. |
| `CONTRIBUTING.md` | Procedimientos para mantener el sitio y el portal. Solo si un procedimiento cambió. |
| `README.md` (resto) | Stack, estructura, design system, decisiones técnicas. Solo si cambiaron. |
| Memoria del proyecto | Contexto que no está en el repo: por qué se decidió algo, preferencias de la escuela, qué quedó sin commitear. |

## 0. Reconstruir qué se hizo (no confíes en la conversación)

La conversación puede estar comprimida. La fuente de verdad es el repo:

```bash
git status
git diff --stat && git diff          # trabajo sin commitear
git log --oneline -12                # commits de esta sesión
git log origin/main..main --oneline  # commits sin push
```

Arma una lista concreta: qué se construyó o cambió, qué se corrigió, qué se decidió y quién lo decidió (la
directora vía el usuario, el usuario, o Claude), qué se descartó y por qué, y cómo se verificó.

## 1. Verificar antes de cerrar

- Si la sesión tocó `portal/` o `supabase/`, corre `cd portal && npm test && npm run build` y cita los
  números reales de la salida (pruebas pasadas o fallidas). Si algo falla, se reporta; no se "arregla rápido"
  durante el cierre.
- Si se tocaron páginas del sitio público, comprueba que no quedaron enlaces rotos a archivos que se
  renombraron o borraron:
  `grep -o 'src="[^"]*"\|href="[^"#]*"' <página>.html` y revisa que cada ruta local exista.

## 2. Decidir qué documento tocar (pregunta de sí o no, uno por uno)

- ¿Se terminó, se agregó o cambió de prioridad algún pendiente? → `README.md` "Pendientes / roadmap"
  (y la sección "Pendiente" de `docs/portal-docente-pda.md` si es del portal).
- ¿Cambió cómo se hace algo: publicar, altas de docentes, reemplazar inscripciones, respaldos? → `CONTRIBUTING.md`.
- ¿Cambió el stack, la estructura de archivos, el design system o una decisión técnica? → la sección
  correspondiente de `README.md`.
- ¿Cambió el diseño o el estado del portal? → `docs/portal-docente-pda.md`.

**No toques documentos que la sesión no volvió obsoletos.** Respeta el formato y el tono de cada archivo:
toma como plantilla lo que ya existe y no inventes secciones nuevas.

## 3. Nombres, rutas y cifras: verificados, nunca de memoria

Antes de escribir en un documento el nombre de un archivo, una clase CSS, una función, una tabla, un
workflow o una cifra, confírmalo:

```bash
grep -rn "<nombre>" *.html portal/src supabase .github CONTRIBUTING.md README.md
```

Las cifras salen de `git diff --stat`, `wc -l`, `ls` o la salida de las pruebas. Las fechas van en formato
absoluto (AAAA-MM-DD o "15 oct 2026"), nunca "ayer".

## 4. Memoria del proyecto

Actualiza solo lo que cambió y no se puede leer en el repo. Por ejemplo: el estado de un trabajo largo,
una decisión con su porqué, una preferencia nueva de la directora, algo que quedó sin commitear. Edita la
memoria existente (`proyecto_estado`, `portal_docente_pda`, `feedback_diseño_escuela`, `usuario_rol`) en vez
de duplicar, y mantén al día el índice `MEMORY.md`. No copies a la memoria lo que ya dicen los documentos.

## 5. Proponer el commit de cierre (nunca commitear solo)

El patrón real de cierres en este repo (`git log --oneline | grep -i cierre`) es:

```
docs: actualiza README y CONTRIBUTING con el cierre de la sesión
docs: registra plan de portal docente + seguimiento PDA con cierre de la sesión
```

Redacta el mensaje con ese patrón y termínalo con la línea de atribución que indique el entorno.
**Muéstralo y espera un sí explícito.** Antes de `git add`:

- Agrega rutas explícitas. **Nunca `git add .` ni `-A`** (README → "Flujo de trabajo"), para no subir `.DS_Store`.
- Revisa que no entre `portal/.env.local`, `portal/node_modules`, `portal/dist` ni `.playwright-mcp/`.

Pregunta aparte si se hace `git push`: en este repo el push **publica el sitio** en minutos
(workflow "Publicar sitio").

## 6. Resumen en el chat

Corto y en lenguaje llano: qué quedó hecho, cómo se verificó, qué decisiones tomó Claude que el usuario o la
directora deberían validar (resáltalas), qué depende de la escuela, y qué sigue.

## Lo que este skill NO hace

- No commitea ni hace push sin un sí explícito, cada uno por separado.
- No toca documentos que el trabajo de la sesión no volvió obsoletos, ni reestructura los existentes.
- No inventa números, nombres ni fechas: todo sale del repo.
- No hace refactors, "ya que estamos" ni tareas nuevas durante el cierre.
