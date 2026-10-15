# Guía de mantenimiento de contenido

Referencia rápida para las tareas más comunes de actualización del sitio. Para documentación técnica completa ver `README.md`.

---

## Actualizar datos de contacto / horario

Editar directamente en `index.html`, sección `#horarios` (buscar `<!-- ═══ DATOS ESCOLARES ═══ -->`):

```html
<div class="data-row"><span class="lbl">Entrada</span><span class="val-d">08:00 h</span></div>
<div class="data-row"><span class="lbl">Salida</span><span class="val-d">16:00 h</span></div>
```

El teléfono y correo aparecen en tres lugares — buscar y reemplazar los tres:
- Top bar (arriba del nav)
- Sección `#contacto`
- Sección `#inscripcion` (botones CTA)

```bash
# Verificar todas las ocurrencias antes de editar
grep -n "595 923 4856\|dpr0560i" index.html
```

---

## Agregar una foto al carrusel de instalaciones

1. Copiar la foto a `media/Instalaciones/foto13.jpg` (o el número que siga)
2. En `index.html`, dentro de `<div class="fw-carousel" id="carInst">`, agregar:

```html
<div class="fw-slide fw-slide-photo">
  <img src="media/Instalaciones/foto13.jpg" alt="Descripción real de lo que se ve en la foto" loading="lazy">
  <div class="fw-slide-info"><h4>Nombre del espacio</h4></div>
</div>
```

3. El JS genera los dots automáticamente — no hay que tocar nada más.

**Recomendaciones de imagen:**
- Formato: JPG
- Resolución mínima: 1280 × 720 px
- Orientación: horizontal (landscape)
- Peso máximo recomendado: 300 KB (usar [Squoosh](https://squoosh.app) para comprimir)
- El `alt` debe describir lo que se ve realmente (no "Instalaciones foto 13") — es lo único que perciben los lectores de pantalla de esa foto.

---

## Agregar un evento al carrusel de eventos

El carrusel `#carEvents` (dentro de `<div class="fw-carousel" id="carEvents">`) usa una "facade" para no cargar el reproductor de YouTube hasta que alguien haga clic — ahorra datos móviles a quien nunca ve el video:

```html
<div class="fw-slide fw-slide-video" data-yt-id="ID_DEL_VIDEO" data-yt-title="Descripción del video">
  <button class="yt-facade" aria-label="Reproducir video: Descripción del video">
    <img src="https://i.ytimg.com/vi/ID_DEL_VIDEO/hqdefault.jpg" alt="" loading="lazy">
    <span class="yt-play-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>
  </button>
</div>
```

El `ID_DEL_VIDEO` es el que aparece en la URL de YouTube (`youtube.com/watch?v=ESTE_ID`). El JS (`.yt-facade` click handler, al final del `<script>`) reemplaza el botón por el iframe real con autoplay al hacer clic — no hay que tocar nada más.

Si en vez de un video quieres una foto (sin caption ni forma dedicada):

```html
<div class="fw-slide fw-slide-photo">
  <img src="media/eventos/nombre-evento.jpg" alt="Descripción real de la foto" loading="lazy">
  <div class="fw-slide-info">
    <h4>Nombre del evento</h4>
    <p>Descripción breve</p>
  </div>
</div>
```

---

## Actualizar la planta docente (`#maestros`)

Cada card de maestro sigue esta estructura. Buscar `<!-- ═══ MAESTROS ═══ -->` en `index.html`:

```html
<div class="staff-card rv" style="transition-delay:Nms">
  <div class="staff-avatar">
    <span aria-hidden="true">👤</span>  <!-- reemplazar con <img> cuando haya foto -->
  </div>
  <h4>Nombre completo</h4>
  <p class="staff-role">Grado / Función</p>
  <p class="staff-note">Especialidad o dato relevante</p>
</div>
```

Para usar foto real en lugar del emoji:
```html
<div class="staff-avatar">
  <img src="media/maestros/nombre.jpg" alt="Nombre del maestro" loading="lazy">
</div>
```

---

## Actualizar el video de drone / YouTube

En `index.html`, buscar `<!-- ═══ DRONE VIDEO ═══ -->` y reemplazar el `src` del iframe:

```html
<iframe
  src="https://www.youtube.com/embed/NUEVO_ID_VIDEO?rel=0&modestbranding=1&playsinline=1"
  allow="autoplay; encrypted-media"
  allowfullscreen
  title="Descripción del video">
</iframe>
```

El ID del video está en la URL de YouTube: `youtube.com/watch?v=ESTE_ES_EL_ID`.

Lo mismo aplica para el video del huerto en `huerto.html` (buscar `reel-embed`).

---

## Agregar fotos a la galería del huerto (`huerto.html`)

1. Copiar la foto a `media/huerto/foto8.jpg` (o el número siguiente)
2. En `huerto.html`, dentro de `<div class="gallery-grid rv-scale">`, agregar:

```html
<div class="gallery-item">
  <img src="media/huerto/foto8.jpg" alt="Descripción real de lo que muestra la foto" loading="lazy">
</div>
```

**Importante:** usar `alt` descriptivo — evitar "Huerto escolar 8". Ejemplo: `alt="Alumnos de 3° sembrando jitomate en el huerto"`.

---

## Actualizar Inscripciones y Útiles (`inscripciones-2026-2027.html`)

Esta página es **temporal** — vive fuera de `index.html` a propósito, para que cada ciclo escolar se pueda reemplazar sin tocar la página principal.

**Cada ciclo nuevo (ej. cuando llegue 2027–2028):**
1. Crear el archivo nuevo (ej. `inscripciones-2027-2028.html`) copiando la estructura del actual.
2. Subir las imágenes/PDFs nuevos a `media/Inscripciones-2027-2028/`.
3. En `index.html`, actualizar los 3 links que apuntan a la página del ciclo anterior: la insignia clicable del hero (`.campaign-badge`), el botón dentro de la tarjeta `.campaign-cta` en `#inscripcion`, y el `<title>`/badge del ciclo si cambió.
4. Decidir si la página del ciclo anterior se borra o se deja archivada (sin enlazar desde ningún lado).

**Dentro del mismo ciclo** (agregar un documento nuevo, corregir una imagen, etc.):
- Las imágenes de requisitos/útiles y los PDFs viven todos en `media/Inscripciones-2026-2027/`.
- Cada imagen en la página tiene su propio bloque `.doc-image-card` con botones Ver/Descargar/Imprimir — copiar un bloque existente como plantilla.
- El botón "Imprimir" usa `onclick="printImage('ruta/a/la/imagen.jpg','Título para la pestaña')"` — no requiere tocar CSS de impresión.
- Las pestañas de útiles por grado usan el mismo patrón `showUtiles('1A')` / `id="utiles-1A"` que documenta la sección de carrusel de este archivo — agregar un botón + un panel nuevo para un grupo nuevo.

---

## Agregar una nueva sección

1. Agregar el link en el nav desktop (buscar `<nav class="nav-links">`):
```html
<a href="#mi-seccion">Mi Sección</a>
```

2. Agregar el link en el menú móvil (buscar `id="mobileMenu"`):
```html
<a href="#mi-seccion" class="mob-link">Mi Sección</a>
```

3. Agregar el link en el footer (buscar `<nav class="footer-nav">`):
```html
<a href="#mi-seccion">Mi Sección</a>
```

4. Crear la sección en el HTML:
```html
<section class="sec sec-sand" id="mi-seccion">
  <div class="container">
    <div class="sec-title rv">
      <h2>Título de la sección</h2>
      <span class="accent"></span>
      <p>Subtítulo opcional</p>
    </div>
    <!-- contenido con class="rv" en elementos que deben animarse -->
  </div>
</section>
```

---

## Emojis decorativos — regla de accesibilidad

Cualquier emoji que sea solo decorativo (no transmite información que no esté ya en el texto) debe llevar `aria-hidden="true"`:

```html
<!-- Correcto -->
<span aria-hidden="true">📚</span> Biblioteca

<!-- Incorrecto — el lector de pantalla leería "libro abierto Biblioteca" -->
📚 Biblioteca
```

---

## Publicar cambios

```bash
git add index.html huerto.html
# Si se agregaron imágenes:
git add media/

git commit -m "descripción breve de qué cambió"
git push
```

El sitio se actualiza en **1-2 minutos** en https://esc-miguel-hidalgo.github.io.

Para verificar el despliegue: GitHub → repositorio → pestaña **Actions** → ver el workflow "Publicar sitio". Si sale en rojo, el sitio anterior sigue publicado; revisar el error (casi siempre es una prueba del portal).

---

## Portal docente (`portal/`)

Espacio con login para docentes y dirección: selección trimestral de PDA, validación, PDF y documentos.
Diseño y razones en `docs/portal-docente-pda.md`. **Editar el sitio público no requiere tocar nada de esto.**

A diferencia del resto del sitio, el portal sí se compila (Vite + React). GitHub lo hace solo en cada push
(`.github/workflows/pages.yml`) y lo publica en https://esc-miguel-hidalgo.github.io/portal/.

### Puesta en marcha (una sola vez)

1. **Cuenta de Supabase con un correo de la escuela** (no personal) en https://supabase.com. Crear un proyecto.
   Guardar la contraseña de la base en un lugar seguro.
2. **SQL Editor** → pegar y ejecutar, en orden, cada archivo de `supabase/migrations/`.
3. **Authentication → Sign In / Providers**: desactivar *Allow new users to sign up*. Nadie se registra solo.
   **Authentication → URL Configuration**: *Site URL* y *Redirect URLs* = `https://esc-miguel-hidalgo.github.io/portal/`
   (lo usa el enlace de "¿Olvidaste tu contraseña?").
4. **GitHub → Settings → Pages → Source: GitHub Actions.** *(Hecho el 15 oct 2026.)*
5. **GitHub → Settings → Secrets and variables → Actions**:
   - *Variables*: `SUPABASE_URL` y `SUPABASE_ANON_KEY` (Supabase → Project Settings → API). Son públicas por diseño.
   - *Secrets* (para el respaldo): `SUPABASE_DB_URL` (Connect → *Session pooler*), `SUPABASE_SERVICE_ROLE_KEY` y
     `BACKUP_PASSPHRASE`. La passphrase debe ser de 4 o más palabras al azar, y hay que guardarla también fuera de
     GitHub: sin ella el respaldo no se abre. **El repo es público**: los respaldos se pueden descargar, y lo único que
     los protege es esa contraseña.
6. Correr a mano *Actions → Publicar sitio*, *Mantener activo Supabase* y *Respaldo del portal* (botón *Run workflow*)
   para confirmar que los tres salen en verde.

### Altas, bajas y grupos (SQL Editor de Supabase)

Crear la cuenta en **Authentication → Users → Add user → Create new user** (marcar *Auto confirm*) y después:

```sql
-- Nombre como debe salir en el PDF
update perfiles set nombre = 'Mtra. Nombre Apellido'
 where id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Solo para la directora
update perfiles set rol = 'directora'
 where id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Grupo del ciclo (uno por grado/grupo/ciclo). Cada ciclo nuevo se crean grupos nuevos;
-- los del ciclo anterior se quedan como historial.
insert into grupos (ciclo, grado, grupo, docente_id)
values ('2026-2027', 3, 'A', (select id from auth.users where email = 'correo@ejemplo.com'));

-- Cambiar de docente un grupo
update grupos set docente_id = (select id from auth.users where email = 'nueva@ejemplo.com')
 where ciclo = '2026-2027' and grado = 3 and grupo = 'A';

-- Baja: la cuenta deja de entrar; sus documentos se quedan en el grupo
update perfiles set activo = false
 where id = (select id from auth.users where email = 'correo@ejemplo.com');
```

Desde el SQL Editor no aplican las reglas de la app: se puede corregir cualquier dato, así que hay que tener cuidado.

### Si Supabase se pausa

Supabase Free pausa el proyecto tras 7 días sin uso. El workflow *Mantener activo Supabase* lo evita, pero:

- Si *Mantener activo* sale en rojo, el proyecto ya está pausado. Entrar al dashboard y pulsar **Restore**. Los datos no se pierden.
- GitHub **desactiva los workflows programados** de un repo sin commits en 60 días (avisa por correo).
  Si llega ese aviso: *Actions → Mantener activo Supabase → Enable workflow*. Lo mismo con *Respaldo del portal*.

### Restaurar un respaldo

1. *Actions → Respaldo del portal →* la ejecución que se quiera *→ Artifacts*: descargar el `.gpg`.
2. `gpg -d portal-respaldo-AAAA-MM-DD.tar.gz.gpg | tar -xzf -` (pide la passphrase).
3. Base: en un proyecto vacío, ejecutar `respaldo/roles.sql`, `respaldo/schema.sql` y luego `respaldo/data.sql` con
   `psql` (es el mismo orden que usa el simulacro de `respaldo.yml`).
4. Archivos: `respaldo/archivos/` tiene la misma estructura de carpetas del bucket `documentos`. Se suben de nuevo
   respetando las rutas.

### Desarrollo local

```bash
cd portal
npm install
npm test          # reglas de la base (Postgres en memoria), catálogo y PDF
npm run demo      # la app con un Supabase falso en memoria: directora@demo.mx, docente1@demo.mx (cualquier contraseña)
cp .env.example .env.local && npm run dev   # contra el Supabase real
```

- **Cambiar la base de datos:** agregar un archivo **nuevo** en `supabase/migrations/` (nunca editar uno ya aplicado),
  agregar su prueba en `portal/test/reglas.test.js` y ejecutarlo en el SQL Editor.
- **Cambiar el catálogo de PDA:** editar `portal/datos-fuente/programa_sintetico_unificado.json` y correr
  `npm run catalogo`. Si avisa que hay ids que desaparecen, los PDA guardados con esos ids aparecerán como
  "ya no existen en el catálogo".

---

## Convenciones de commits

```
tipo: descripción corta en español

Ejemplos:
  contenido: actualiza horario ciclo 2026-2027
  media: agrega fotos evento Día de Muertos
  fix: corrige link roto en footer
  estilo: ajusta contraste en sección de contacto
```
