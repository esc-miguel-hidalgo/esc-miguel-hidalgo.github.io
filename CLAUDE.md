# Esc. Prim. "Miguel Hidalgo" — instrucciones para Claude

Sitio institucional de una primaria pública, mantenido por personal sin perfil técnico. Documentación completa en
`README.md` (técnica), `CONTRIBUTING.md` (tareas de contenido) y `docs/portal-docente-pda.md` (portal docente).
Todo en español: textos, commits, comentarios y nombres.

## Dos mundos separados

- **Sitio público** (`index.html`, `huerto.html`, `inscripciones-*.html`, `media/`): HTML/CSS/JS a mano, **sin
  framework, sin build, sin npm**. Así debe seguir: se edita en cualquier editor y se publica tal cual.
- **Portal docente** (`portal/` + `supabase/`): React 19 + Vite + Supabase. Es la única excepción y vive aislada.
  Cambiar el sitio público nunca debe requerir tocar el portal.

## Reglas de contenido (vienen de la dirección de la escuela)

- **Documentos de la escuela se publican tal cual.** Si la escuela da un cartel, lista de útiles o formato (JPG/PDF),
  se muestra la imagen o PDF original con Ver/Descargar/Imprimir. No transcribirlo ni rediseñarlo en HTML.
  Texto propio solo para lo que no está en ningún documento, y como texto simple.
- **Contenido de un ciclo escolar va en su propia página** (`inscripciones-AAAA-AAAA.html`), enlazada desde un CTA
  dentro de la sección permanente, nunca desde el nav.
- Los archivos de `media/` son originales: no se modifican ni se recomprimen sin que lo pidan.
- Emojis decorativos con `aria-hidden="true"`; `alt` describe lo que realmente se ve; contraste mínimo WCAG
  (ver "Contraste WCAG" en el README).

## Portal

```bash
cd portal
npm test        # reglas RLS (PGlite), catálogo y PDF — debe pasar antes de cada push (el deploy lo corre)
npm run demo    # app con Supabase falso: directora@demo.mx / docente1@demo.mx, cualquier contraseña
```

- La anon key es pública por diseño: **toda la seguridad está en RLS**. Cualquier cambio de esquema o política
  necesita su prueba en `portal/test/reglas.test.js`.
- Base de datos: agregar una migración **nueva** en `supabase/migrations/`; nunca editar una existente.
- Catálogo de PDA: editar `portal/datos-fuente/programa_sintetico_unificado.json` y correr `npm run catalogo`;
  `src/data/catalogo.json` es generado.
- `portal/.env.local` tiene claves reales y no se toca ni se commitea.

## Git

- Commits `tipo: descripción en español` (`contenido:`, `media:`, `fix:`, `estilo:`, `feat:`, `docs:`, `chore:`).
- Push a `main` publica en GitHub Pages (workflow "Publicar sitio"). No hacer push sin que lo pidan.
- Las sesiones se abren con `/open` y se cierran con `/close`.
