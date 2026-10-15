# Portal docente + seguimiento curricular PDA

**Estado (15 oct 2026): construido y probado en local; falta crear el proyecto de Supabase y el piloto.**
El código vive en `portal/` (app) y `supabase/` (base de datos y reglas). Para ponerlo en marcha, ver
`CONTRIBUTING.md` → *Portal docente*.

---

## Contexto

La dirección de la escuela quiere que el sitio deje de ser solo informativo hacia afuera y sirva también hacia adentro: un espacio donde cada maestro entre con usuario y contraseña, registre información de su grupo, suba planeaciones didácticas, diagnósticos y evidencias de trabajo; y donde la directora vea de un vistazo el cumplimiento por docente, navegue por cada grupo/grado, y revise o descargue lo que suban.

A esto se suma un segundo requerimiento, más específico y pedagógico: un módulo de **seguimiento curricular** basado en el Plan de Estudios 2022 (Nueva Escuela Mexicana) — PDA (Procesos de Desarrollo de Aprendizaje), contenidos, ejes articuladores y orientaciones didácticas del programa sintético/analítico. La directora quiere que cada docente, al entrar, vea el catálogo completo correspondiente a su grado y vaya seleccionando qué va a trabajar en el trimestre; que esa selección se valide por la dirección **antes** de arrancar el trimestre; que se genere un documento imprimible/PDF con esa validación; y que se lleve un registro visible para ambos (docente y dirección) de qué PDA ya se trabajaron y cuáles siguen pendientes — como dos estados distintos: *planeado para el trimestre* y *trabajado/completado*.

La escuela ya tiene ese catálogo (PDA/contenidos/ejes articuladores/orientaciones didácticas por grado) digitalizado en algún formato editable (Word/Excel/PDF) — no hace falta transcribirlo desde cero de los documentos oficiales de la SEP, pero sí estructurarlo para cargarlo al sistema.

Es un salto real respecto a lo que existe hoy: el sitio es 100% estático (`index.html`, `huerto.html`, `inscripciones-2026-2027.html`) — sin backend, sin build step, sin `package.json`, hosteado gratis en GitHub Pages, actualizado a mano vía commits (ver `README.md`/`CONTRIBUTING.md`). No hay formularios ni integraciones externas, solo un `mailto:`. Login + subida de archivos + roles + panel de reportes requiere infraestructura que hoy no existe.

**Restricciones conocidas:**
- La escuela **no** tiene Google Workspace, Microsoft 365 ni cuentas institucionales — se parte de cero en identidad.
- Escuela pequeña (1-6 grupos), pocos usuarios (≈6-10 cuentas: maestros + directora).
- El sitio **debe seguir siendo gratuito** — sin presupuesto para hosting/servicios de paga.

## Qué cambió respecto al plan de agosto (y por qué)

El plan original era Firebase (plan gratuito Spark) cargado por `<script>`, sin build, y transcribir el catálogo
de los archivos de la escuela. Al revisarlo en octubre 2026 cambió en tres puntos:

| Antes | Ahora | Por qué |
|---|---|---|
| Firebase Spark | **Supabase Free, en una cuenta con correo de la escuela** | Firebase ya no da Storage en Spark para proyectos nuevos (pide el plan Blaze con tarjeta). Postgres + RLS se ajusta mejor a estados y matrices que Firestore. La cuenta queda a nombre de la escuela: sus datos no dependen de la cuenta personal de nadie. |
| Sin build, todo por CDN | **El sitio público sigue sin build; solo `portal/` usa Vite + React** | Se reutilizó el prototipo *programa-sintetico-nem* (explorador, selector de trimestre, PDF con firmas). Rehacerlo en JS plano costaba mucho más. Quien edita el sitio público no necesita tocar `portal/`. |
| Transcribir el catálogo de la escuela | **Catálogo del programa sintético ya digitalizado** (1,339 PDA, 6 grados, 4 campos) | Venía en ese mismo prototipo (`portal/datos-fuente/`). Faltan las **orientaciones didácticas**: esas sí hay que tomarlas de los archivos de la escuela. |

Riesgo nuevo de Supabase Free: pausa el proyecto tras 7 días sin uso. Lo cubre `.github/workflows/mantener-activo.yml`
(ping semanal); si aun así se pausa, se restaura desde el dashboard sin perder datos.

## Cómo está construido

- **Catálogo:** `portal/src/data/catalogo.json`, generado por `npm run catalogo` desde el JSON fuente. Cada PDA tiene un
  id estable (hash de grado + campo + contenido + texto); la base guarda solo ids. Ejes articuladores: los 7 oficiales
  (`portal/src/data/ejes.js`), elegidos por la docente para cada trimestre.
- **Base de datos** (`supabase/migrations/`): `perfiles`, `grupos` (un grupo por ciclo con su docente titular, así la
  docente conserva su historial), `selecciones` (una por grupo y trimestre, con folio), `seleccion_pda`, `documentos`
  (con versiones; nunca se sobrescribe), `bitacora` (la escriben triggers).
- **Flujo de la selección:** `borrador → enviado → validado | devuelto`. La docente envía o retira el envío; solo la
  directora valida, devuelve con comentario o reabre una validada. Al validar se registra quién y cuándo. Ya validada,
  la docente solo puede marcar cada PDA como *trabajado* (y desmarcarlo).
- **Seguridad:** todas las reglas están en la base (RLS + triggers), no en la app: la anon key es pública. La docente
  solo ve sus grupos; la directora ve todo. Archivos en un bucket **privado**; se abren con enlaces temporales de 1 hora.
  Las reglas se prueban contra Postgres real en `portal/test/reglas.test.js` (corre en cada publicación).
- **PDF:** `portal/src/lib/pdfValidacion.js`. Es el Programa Analítico del trimestre con los datos de la escuela, los ejes,
  los PDA agrupados por campo y contenido, el sello "Validado por la dirección" (nombre, fecha, folio) y las firmas
  *Elaboró / Vo. Bo.* Antes de validar sale marcado como "documento de trabajo".
- **Panel de la directora:** pendientes por validar y una matriz grupo × (programa analítico, avance de PDA,
  planeaciones, diagnósticos, evidencias) por trimestre. De cada grupo se entra al detalle.
- **Respaldos:** `.github/workflows/respaldo.yml` hace cada semana el volcado de la base y de los archivos, prueba la
  restauración y lo cifra. Se guarda 90 días.

## Pendiente

1. Crear la cuenta y el proyecto de Supabase, y cargar en GitHub las variables y secretos (pasos en `CONTRIBUTING.md`).
   Pages ya publica con GitHub Actions desde el 15 oct 2026. En el primer respaldo real, revisar que el workflow
   `respaldo.yml` termine bien: `supabase/setup-cli@v3` y `actions/upload-artifact@v7` se actualizaron sin poder probarse.
2. Que la dirección apruebe el aviso de privacidad (`portal/public/privacidad.html`, hoy es borrador) y el formato del PDF.
3. Piloto: la directora y 1 o 2 docentes de un grado durante unas semanas. Después, el resto.
4. Orientaciones didácticas del grado piloto, desde los archivos de la escuela.
5. Cuando el piloto funcione: enlace "Acceso docentes" en el footer de `index.html`. No se puso antes para no publicar
   un enlace a un portal sin configurar.
6. Fase 2, si se pide: recordatorios automáticos por correo.

## Ideas que siguen vigentes

- Evidencias por carpeta (mes / tipo) con miniaturas, si la lista se vuelve larga.
- Que la directora pueda dar de alta grupos desde el panel. Hoy es por SQL; son pocos y una vez por ciclo.
