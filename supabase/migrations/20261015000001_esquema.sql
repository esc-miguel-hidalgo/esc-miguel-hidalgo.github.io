-- Portal docente — esquema base.
-- Fuente de verdad del modelo de datos. Se aplica en el SQL Editor de Supabase
-- (o con `supabase db push`) en orden de nombre de archivo.
--
-- El catálogo de PDA NO vive aquí: es JSON estático en portal/src/data/catalogo.json.
-- La base solo guarda los ids de PDA (texto, p. ej. 'p1a2b3c4d5').


create type public.rol_usuario      as enum ('docente', 'directora');
create type public.estado_seleccion as enum ('borrador', 'enviado', 'validado', 'devuelto');
create type public.estado_pda       as enum ('planeado', 'trabajado');
create type public.tipo_documento   as enum ('planeacion', 'diagnostico', 'evidencia');
create type public.estado_documento as enum ('entregado', 'revisado');

-- Una fila por persona con cuenta. Se crea sola al dar de alta el usuario en
-- Authentication (trigger al final); el rol se cambia a mano para la directora.
create table public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text not null default '',
  rol       public.rol_usuario not null default 'docente',
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Un grupo pertenece a un ciclo y tiene una docente titular. Al cambiar de ciclo
-- se crean grupos nuevos: la docente conserva acceso a su historial.
create table public.grupos (
  id         uuid primary key default gen_random_uuid(),
  ciclo      text not null check (ciclo ~ '^\d{4}-\d{4}$'),
  grado      smallint not null check (grado between 1 and 6),
  grupo      text not null default 'A',
  docente_id uuid references public.perfiles (id) on delete set null,
  unique (ciclo, grado, grupo)
);

-- Selección trimestral de PDA. Flujo: borrador → enviado → validado | devuelto.
create table public.selecciones (
  id           uuid primary key default gen_random_uuid(),
  folio        bigint generated always as identity unique,
  grupo_id     uuid not null references public.grupos (id) on delete cascade,
  trimestre    smallint not null check (trimestre between 1 and 3),
  estado       public.estado_seleccion not null default 'borrador',
  ejes         text[] not null default '{}',
  comentario   text,
  enviado_en   timestamptz,
  validado_por uuid references public.perfiles (id),
  validado_en  timestamptz,
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (grupo_id, trimestre)
);

create table public.seleccion_pda (
  seleccion_id uuid not null references public.selecciones (id) on delete cascade,
  pda_id       text not null check (pda_id ~ '^p[0-9a-f]{10}$'),
  estado       public.estado_pda not null default 'planeado',
  trabajado_en timestamptz,
  nota         text,
  primary key (seleccion_id, pda_id)
);

-- Documentos subidos. Nunca se sobrescriben: cada resubida es una versión nueva.
create table public.documentos (
  id             uuid primary key default gen_random_uuid(),
  grupo_id       uuid not null references public.grupos (id) on delete cascade,
  tipo           public.tipo_documento not null,
  trimestre      smallint check (trimestre between 1 and 3),
  titulo         text not null check (length(trim(titulo)) > 0),
  version        integer not null default 1,
  storage_path   text not null unique,
  nombre_archivo text not null,
  mime           text,
  tamano         bigint,
  estado         public.estado_documento not null default 'entregado',
  comentario     text,
  subido_por     uuid not null default auth.uid() references public.perfiles (id),
  revisado_por   uuid references public.perfiles (id),
  revisado_en    timestamptz,
  creado_en      timestamptz not null default now()
);
create index documentos_grupo_idx on public.documentos (grupo_id, tipo, trimestre);

-- Bitácora de cambios relevantes. Solo la escriben triggers; solo la lee la directora.
create table public.bitacora (
  id          bigint generated always as identity primary key,
  actor       uuid default auth.uid(),
  tabla       text not null,
  registro_id text not null,
  accion      text not null,
  detalle     jsonb,
  en          timestamptz not null default now()
);

-- ─── Funciones de apoyo para las reglas ─────────────────────────────────────
-- security definer + search_path fijo: leen perfiles/grupos sin pasar por RLS
-- (si no, las políticas que las usan se llamarían a sí mismas).

create function public.es_directora() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'directora' and activo);
$$;

create function public.es_docente_de(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from grupos gr join perfiles p on p.id = gr.docente_id
    where gr.id = g and p.id = auth.uid() and p.activo
  );
$$;

create function public.grupo_de_seleccion(s uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select grupo_id from selecciones where id = s;
$$;

create function public.estado_de_seleccion(s uuid) returns public.estado_seleccion
language sql stable security definer set search_path = public as $$
  select estado from selecciones where id = s;
$$;

-- Primer segmento de la ruta en Storage ('{grupo_id}/...') como uuid, o null si no lo es.
create function public.grupo_de_ruta(ruta text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(ruta, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- ─── Alta automática de perfil ──────────────────────────────────────────────
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre) values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  return new;
end;
$$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();
