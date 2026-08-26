# Plan: Portal docente + seguimiento curricular PDA

**Estado: planeado, no implementado.** Este documento registra el contexto y el diseño acordado en sesión de trabajo (agosto 2026) para cuando se decida ejecutarlo. No modifica el sitio actual.

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

## Evaluación de la idea

Es un paso lógico, pero cambia la naturaleza del proyecto: de página informativa a aplicación con cuentas, permisos y archivos privados de terceros (incluye, indirectamente, evidencia de trabajo con menores). Implica mantenimiento continuo — altas/bajas de maestros, revisar permisos, resolver accesos — no una función que se construye una vez y queda lista. Vale la pena que la dirección lo tenga claro desde el inicio.

Dado el tamaño (pocos usuarios) y la restricción de presupuesto cero, es viable sin pagar nada con el plan gratuito de **Firebase** (Google):

- **Firebase Authentication** — login por correo/contraseña para cada maestro y la directora. No requiere Google Workspace: se crean cuentas individuales manualmente.
- **Firestore** — datos del grupo, metadatos de cada documento subido (quién, cuándo, tipo, estado) y roles (`docente` vs `directora`).
- **Firebase Storage** — archivos reales (PDFs de planeaciones/diagnósticos, fotos/videos de evidencias).
- **Reglas de seguridad** (Firestore/Storage rules) — cada maestro solo lee/escribe en su propio grupo; la directora tiene lectura total. Se configuran declarativamente, sin escribir un servidor.

El SDK de Firebase se carga por `<script>` (como un CDN más), sin bundler ni Node — mantiene la filosofía "sin framework, sin build step" del repo. GitHub Pages sigue sirviendo el HTML/CSS/JS estático; Firebase solo provee auth + datos + archivos desde el navegador. El plan gratuito ("Spark") cubre por mucho este volumen de usuarios y tráfico.

**Trade-off a comunicar a la dirección:** por primera vez el sitio dependerá de un servicio externo (cuenta de Google/Firebase) y de que alguien mantenga esa consola — altas/bajas, reglas de seguridad, vigilar que el uso no rebase el nivel gratuito (poco probable con 6-10 usuarios). "Evidencias de trabajo" puede incluir fotos de alumnos: el acceso debe quedar restringido solo a personal autenticado, nunca público.

## Ideas para nutrir la idea original

1. **Panel de la directora como matriz, no como lista** — filas = maestros/grupos, columnas = tipo de documento, celdas con estado (entregado / pendiente / revisado). Da el panorama de cumplimiento de un vistazo; de cada celda se navega al detalle del grupo.
2. **Historial de versiones simple** — al resubir una planeación, no sobrescribir: guardar con fecha y dejar ver versiones anteriores.
3. **Evidencias organizadas por carpeta** (grupo → mes → tipo) con miniaturas, en vez de lista plana.
4. **Pensado para celular** — los maestros subirán evidencias desde el teléfono en el momento; la interfaz de subida debe funcionar bien en móvil desde el día uno.
5. **Bitácora de quién subió qué y cuándo** — trazabilidad, viene gratis de los metadatos en Firestore.
6. **Piloto antes de rollout completo** — arrancar con la directora + 1-2 maestros, ajustar la experiencia, y luego extender a todo el plantel.
7. **Recordatorios automáticos** (avisar si a un maestro le falta subir algo) requeriría Cloud Functions, que en Firebase obliga a vincular una tarjeta (plan "Blaze", aunque con capa gratuita) — fuera del alcance inicial por el requisito de cero costo; posible fase 2.

## Módulo de seguimiento curricular (PDA)

**Modelo de datos adicional en Firestore:**
- `catalogo_pda` — dato de referencia, solo lectura para todos: por grado → campo formativo → eje articulador → { contenido, PDA, orientaciones didácticas }. Se carga una sola vez (se actualiza si cambia el programa oficial), no lo edita el docente ni la directora desde la UI.
- `seleccion_trimestral` — por grupo/docente/trimestre: lista de PDA elegidos del catálogo de su grado, con `estado` (`borrador` → `enviado a validar` → `validado por dirección`, con fecha y quién validó).
- `progreso_pda` — por grupo/PDA: `estado` (`planeado` / `trabajado`), fecha en que el docente lo marcó como trabajado. Distinto de la selección trimestral: seleccionar planea, marcar como trabajado confirma que ya se impartió.

**Flujo:**
1. El docente entra, ve el catálogo completo de su grado (agrupado por campo formativo/eje articulador) y selecciona qué PDA trabajará ese trimestre → queda "enviado a validar".
2. La directora revisa la selección de cada grupo (antes de que arranque el trimestre) y valida — puede ver todos los grupos.
3. Al validar, se genera un documento imprimible/PDF con la selección y el sello de validación de la dirección (fecha, nombre), generado del lado del cliente con una librería como jsPDF vía CDN — sin backend adicional.
4. Durante el trimestre, el docente marca cada PDA seleccionado como "trabajado" conforme lo imparte.
5. Docente y directora ven en todo momento el registro: seleccionados vs. trabajados vs. pendientes, por grupo y trimestre — reutiliza la lógica de matriz de cumplimiento del panel general.

**Carga inicial del catálogo:** pedir a la escuela el archivo digitalizado (Word/Excel/PDF) y transformarlo a una estructura de datos consistente; arrancar con un solo grado como piloto antes de replicar a los seis.

## Alcance propuesto para la primera implementación

1. Crear proyecto Firebase (Auth + Firestore + Storage) en el plan gratuito.
2. Nueva página `portal.html` (o subcarpeta `portal/`) en el mismo repo, enlazada desde el nav — con pantalla de login.
3. Modelo de datos mínimo en Firestore: `usuarios` (uid → rol, grupo asignado), `grupos` (grado/grupo, maestro), `documentos` (grupo, tipo, archivo en Storage, fecha, estado).
4. Vista "maestro": su grupo, botón para subir planeación/diagnóstico/evidencia, lista de lo ya subido.
5. Vista "directora": matriz de cumplimiento + navegación a cada grupo + descarga de archivos.
6. Reglas de seguridad Firestore/Storage que aíslen a cada maestro a su propio grupo y den lectura total a la directora.
7. Alta manual de las ~6-10 cuentas iniciales (maestros + directora) en la consola de Firebase Auth.
8. Estructurar y cargar el catálogo de PDA de un grado piloto (`catalogo_pda`), a partir del archivo que comparta la escuela.
9. Vista de selección trimestral para el docente (piloto de ese grado) + flujo de validación de la directora + generación del PDF.
10. Marcado de "trabajado" por PDA y vista de registro (seleccionados/trabajados/pendientes) para docente y dirección.
11. Una vez validado el piloto, replicar la carga del catálogo a los grados restantes.

## Verificación al implementar

- Login como maestro → subir un documento de prueba → verificar que aparece en Storage/Firestore.
- Login como directora → confirmar que ve todos los grupos y puede descargar el archivo subido por el maestro de prueba.
- Confirmar que un maestro **no** puede ver ni acceder a los documentos de otro grupo (verificar las reglas de seguridad, no solo la UI).
- Subida de evidencias desde un celular real (foto tomada en el momento).
- Flujo de PDA de punta a punta: seleccionar PDA como docente → validar como directora → generar y revisar el PDF → marcar PDA como trabajado → confirmar que el registro se refleja igual para docente y dirección.
