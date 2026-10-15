---
name: open
description: Abre una sesión de trabajo en el sitio de la Esc. Prim. "Miguel Hidalgo". Primero revisa las sesiones vinculadas (identidad de git y remote de la escuela, cuenta de gh, últimos despliegues de GitHub Pages, salud del portal docente/Supabase, vigencia de la página de inscripciones) y después lee solo los pendientes del README y de docs/portal-docente-pda.md. Termina con un informe corto y espera instrucciones. Úsalo cuando el usuario escriba /open, "abramos sesión" o similar en este proyecto.
user-invocable: true
---

# /open — Apertura de sesión del sitio de la escuela

Complemento de `/close` (`.claude/skills/close/SKILL.md`). `/close` deja al día los pendientes en
`README.md` (sección "Pendientes / roadmap") y en `docs/portal-docente-pda.md` (sección "Pendiente");
`/open` los retoma.

Adaptado del patrón `/open` de `seprn-sitio` y `barber-saas`, no copiado literal. Este repo no tiene
`CLAUDE.md`, `BITACORA.md`, `MASTER_PLAN.md` ni Vercel. Las convenciones viven en `README.md` y
`CONTRIBUTING.md`, y el estado de sesiones anteriores en la memoria del proyecto, que se carga sola.

## 0. Sesiones vinculadas (antes de leer nada)

El usuario trabaja en varios proyectos desde la misma Mac con cuentas distintas: `educaneza` (SEPRN),
`auliamx` (Aulia) y `albertobonillat-collab` (barber-saas). Las sesiones globales pueden haber quedado en
otra cuenta. Revisa cada punto y repórtalo en una tabla al final. Si un comando falla por red o falta de
login, repórtalo y sigue: esto no bloquea la apertura.

1. **Git local (lo que de verdad publica):** solo se revisa, no se cambia.
   - `git remote get-url origin` debe ser `git@github-escuela:esc-miguel-hidalgo/esc-miguel-hidalgo.github.io.git`
     (alias SSH con la llave de la escuela; ver README → "Git y despliegue").
   - `git config user.name` debe ser `esc-miguel-hidalgo` y `git config user.email` debe ser
     `15dpr0560i@gmail.com`. Si es otro, **no lo corrijas**: avisa.
   - `git fetch origin` y `git status -sb`: reporta si `main` va adelante o atrás, o si hay cambios sin commitear.
     No hagas pull ni push.
2. **GitHub (`gh`):** el push no usa `gh` (va por SSH), y el repo es público, así que `gh run list`
   funciona con cualquier cuenta. Lo que sí requiere la cuenta `esc-miguel-hidalgo` son las escrituras:
   Settings, relanzar workflows, variables y secretos. Esa cuenta normalmente **no** está en `gh`.
   ```
   gh auth status --active --hostname github.com
   ```
   Solo informa qué cuenta está activa. No hagas `gh auth switch` ni `gh auth login`: el cambio es
   global y afecta a las otras terminales. Si la sesión necesita escribir en GitHub, se hace desde Chrome
   con la sesión de `esc-miguel-hidalgo`, o el usuario agrega la cuenta a `gh`.
3. **GitHub Pages / Actions:**
   ```
   gh run list -R esc-miguel-hidalgo/esc-miguel-hidalgo.github.io -L 6
   gh api repos/esc-miguel-hidalgo/esc-miguel-hidalgo.github.io/pages --jq .build_type
   ```
   - `build_type` debe ser `workflow`. Si dice `legacy`, Pages volvió a "Deploy from a branch" y `/portal/`
     puede publicarse sin compilar: avísalo.
   - Avisa si "Publicar sitio", "Mantener activo Supabase" o "Respaldo del portal" terminaron en `failure`.
     No relances ni canceles nada sin que el usuario lo pida.
   - Si el último "Mantener activo Supabase" o "Respaldo del portal" tiene más de 2 semanas, quizá GitHub los
     desactivó por 60 días sin commits (ver CONTRIBUTING → *Si Supabase se pausa*).
4. **Portal docente / Supabase:** saca la URL de Supabase del JS publicado. Nunca imprimas claves.
   ```
   js=$(curl -s https://esc-miguel-hidalgo.github.io/portal/ | grep -o 'assets/index-[^"]*\.js' | head -1)
   u=$(curl -s "https://esc-miguel-hidalgo.github.io/portal/$js" | grep -o 'https://[a-z0-9]*\.supabase\.co' | head -1)
   echo "${u:-portal sin configurar}"
   [ -n "$u" ] && curl -s -m 15 -o /dev/null -w '%{http_code}\n' "$u/auth/v1/health"
   ```
   - Sin URL: el portal sigue sin configurar. Es lo esperado mientras no se cree el proyecto de Supabase.
   - `401`: Supabase está despierto. Falta la apikey, y eso es lo esperado.
   - `5xx` o `000`: está pausado. El usuario debe pulsar **Restore** en supabase.com/dashboard; desde aquí no se puede.
5. **Contenido temporal:** la página de inscripciones es por ciclo (`inscripciones-AAAA-AAAA.html`;
   CONTRIBUTING → "Actualizar Inscripciones y Útiles"). Compara el ciclo del nombre del archivo contra el
   ciclo actual (cambia en agosto). Si ya no coincide, avisa que toca reemplazarla.

## 1–2. Lectura mínima

1. La memoria del proyecto ya se carga sola: no la releas, pero **verifica contra el repo** lo que afirme
   (por ejemplo, si dice que algo no estaba commiteado, compruébalo con `git status`).
2. Lee **solo**:
   - `README.md`, sección "Pendientes / roadmap": `sed -n '/^## Pendientes/,/^---/p' README.md`
   - `docs/portal-docente-pda.md`, la línea **Estado** y la sección "Pendiente".
   - `git log --oneline -8`, para saber qué se hizo al final de la última sesión.

   No cargues `index.html` completo ni todo `docs/`.

## 3. Informe y espera

Muestra en el chat, en lenguaje llano y breve:

- **Sesiones:** tabla `servicio | estado | acción tomada` (git local, gh, Pages/Actions, Supabase, inscripciones).
- **Dónde estamos:** el último commit relevante y el estado del portal docente.
- **Pendientes del usuario o de la escuela:** lo que depende de ellos y no de código. Por ejemplo: crear Supabase,
  aprobación de la directora, orientaciones didácticas, piloto. Resalta lo que bloquea a lo demás.
- **Propuesta:** el siguiente pendiente de mayor prioridad del README o del portal.

Después **para y espera** a que el usuario diga qué se hace. Las decisiones de diseño y contenido las toma
la directora a través del usuario (ver memoria).

## Lo que este skill NO hace

- No escribe en `README.md`, `CONTRIBUTING.md`, `docs/` ni en la memoria. Eso es trabajo de `/close`.
- No hace pull, push ni commit, ni cambia la config de git o la cuenta de `gh`.
- No relanza ni cancela workflows, ni toca Settings de GitHub o el dashboard de Supabase.
- No empieza a trabajar en ninguna tarea por su cuenta.
