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
2. En `index.html`, dentro de `<div class="fw-track" id="carInst">`, agregar:

```html
<div class="fw-slide fw-slide-photo"
     style="background-image:url('media/Instalaciones/foto13.jpg')">
  <div class="fw-slide-info"><h4>Nombre del espacio</h4></div>
</div>
```

3. El JS genera los dots automáticamente — no hay que tocar nada más.

**Recomendaciones de imagen:**
- Formato: JPG
- Resolución mínima: 1280 × 720 px
- Orientación: horizontal (landscape)
- Peso máximo recomendado: 300 KB (usar [Squoosh](https://squoosh.app) para comprimir)

---

## Agregar un evento al carrusel de eventos

El carrusel `#carEvents` acepta slides con imagen de fondo o con contenido HTML:

```html
<!-- Slide con imagen -->
<div class="fw-slide fw-slide-photo"
     style="background-image:url('media/eventos/nombre-evento.jpg')">
  <div class="fw-slide-info">
    <h4>Nombre del evento</h4>
    <p>Descripción breve</p>
  </div>
</div>

<!-- Slide con contenido HTML (sin imagen) -->
<div class="fw-slide fw-slide-event">
  <div class="fw-event-content">
    <h3>Título del evento</h3>
    <p>Descripción del evento...</p>
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

Para verificar el despliegue: GitHub → repositorio → pestaña **Actions** → ver el workflow "pages build and deployment".

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
