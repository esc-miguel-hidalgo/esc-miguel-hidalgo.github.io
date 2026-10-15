-- Portal docente — reglas de acceso (RLS) y reglas de negocio (triggers).
--
-- Principio: la app web usa la anon key pública; TODA la seguridad está aquí.
--   · La docente solo ve y modifica lo de sus grupos.
--   · La directora lee todo; es la única que valida/devuelve y que marca revisado.
--   · Una selección enviada o validada no se edita (salvo marcar PDA trabajados,
--     y eso solo cuando ya está validada).
--
-- Los triggers se saltan sus validaciones cuando quien ejecuta NO es el rol
-- `authenticated` (p. ej. el administrador desde el SQL Editor), para poder
-- corregir datos a mano. Ver CONTRIBUTING.md.

-- ─── Permisos base ──────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.perfiles      enable row level security;
alter table public.grupos        enable row level security;
alter table public.selecciones   enable row level security;
alter table public.seleccion_pda enable row level security;
alter table public.documentos    enable row level security;
alter table public.bitacora      enable row level security;

-- ─── perfiles / grupos (altas y cambios: solo el administrador) ────────────
create policy perfiles_leer on public.perfiles for select to authenticated
  using (id = auth.uid() or rol = 'directora' or public.es_directora());

create policy grupos_leer on public.grupos for select to authenticated
  using (docente_id = auth.uid() or public.es_directora());

-- ─── selecciones ────────────────────────────────────────────────────────────
create policy selecciones_leer on public.selecciones for select to authenticated
  using (public.es_docente_de(grupo_id) or public.es_directora());

create policy selecciones_crear on public.selecciones for insert to authenticated
  with check (public.es_docente_de(grupo_id));

create policy selecciones_editar on public.selecciones for update to authenticated
  using (public.es_docente_de(grupo_id) or public.es_directora())
  with check (public.es_docente_de(grupo_id) or public.es_directora());

create function public.selecciones_reglas() returns trigger
language plpgsql set search_path = public as $$
declare
  dir boolean;
  doc boolean;
begin
  if current_user <> 'authenticated' then return new; end if;

  if tg_op = 'INSERT' then
    new.estado := 'borrador';
    new.comentario := null; new.enviado_en := null;
    new.validado_por := null; new.validado_en := null;
    return new;
  end if;

  dir := es_directora();
  doc := es_docente_de(old.grupo_id);

  if new.grupo_id <> old.grupo_id or new.trimestre <> old.trimestre or new.folio <> old.folio then
    raise exception 'No se puede cambiar el grupo, trimestre o folio de una selección';
  end if;

  -- Campos que solo cambian como efecto de una transición.
  new.enviado_en   := old.enviado_en;
  new.validado_por := old.validado_por;
  new.validado_en  := old.validado_en;
  new.creado_en    := old.creado_en;

  if new.estado is distinct from old.estado then
    if doc and ((old.estado in ('borrador', 'devuelto') and new.estado = 'enviado')
                or (old.estado = 'enviado' and new.estado = 'borrador')) then
      new.enviado_en := case when new.estado = 'enviado' then now() end;
    elsif dir and ((old.estado = 'enviado' and new.estado in ('validado', 'devuelto'))
                   or (old.estado = 'validado' and new.estado = 'devuelto')) then
      if new.estado = 'validado' then
        new.validado_por := auth.uid();
        new.validado_en  := now();
      else
        new.validado_por := null;
        new.validado_en  := null;
      end if;
    else
      raise exception 'Cambio de estado no permitido: % → %', old.estado, new.estado;
    end if;
  end if;

  if not dir then
    new.comentario := old.comentario;
  end if;

  if new.ejes is distinct from old.ejes and not (doc and old.estado in ('borrador', 'devuelto')) then
    raise exception 'La selección ya fue enviada a dirección; no se puede modificar';
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

create trigger selecciones_reglas before insert or update on public.selecciones
  for each row execute function public.selecciones_reglas();

-- ─── seleccion_pda ──────────────────────────────────────────────────────────
create policy seleccion_pda_leer on public.seleccion_pda for select to authenticated
  using (public.es_docente_de(public.grupo_de_seleccion(seleccion_id)) or public.es_directora());

create policy seleccion_pda_crear on public.seleccion_pda for insert to authenticated
  with check (public.es_docente_de(public.grupo_de_seleccion(seleccion_id)));

create policy seleccion_pda_editar on public.seleccion_pda for update to authenticated
  using (public.es_docente_de(public.grupo_de_seleccion(seleccion_id)))
  with check (public.es_docente_de(public.grupo_de_seleccion(seleccion_id)));

create policy seleccion_pda_quitar on public.seleccion_pda for delete to authenticated
  using (public.es_docente_de(public.grupo_de_seleccion(seleccion_id)));

create function public.seleccion_pda_reglas() returns trigger
language plpgsql set search_path = public as $$
declare
  st estado_seleccion;
begin
  if current_user <> 'authenticated' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  st := estado_de_seleccion(case when tg_op = 'DELETE' then old.seleccion_id else new.seleccion_id end);

  if tg_op in ('INSERT', 'DELETE') then
    if st not in ('borrador', 'devuelto') then
      raise exception 'La selección ya fue enviada a dirección; no se pueden agregar ni quitar PDA';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    new.estado := 'planeado';
    new.trabajado_en := null;
    return new;
  end if;

  if new.seleccion_id <> old.seleccion_id or new.pda_id <> old.pda_id then
    raise exception 'No se puede cambiar el PDA de un registro; quítalo y agrega otro';
  end if;
  if new.estado is distinct from old.estado then
    if st <> 'validado' then
      raise exception 'Solo se marcan PDA como trabajados cuando la dirección ya validó la selección';
    end if;
    new.trabajado_en := case when new.estado = 'trabajado' then now() end;
  else
    new.trabajado_en := old.trabajado_en;
  end if;
  return new;
end;
$$;

create trigger seleccion_pda_reglas before insert or update or delete on public.seleccion_pda
  for each row execute function public.seleccion_pda_reglas();

-- ─── documentos ─────────────────────────────────────────────────────────────
create policy documentos_leer on public.documentos for select to authenticated
  using (public.es_docente_de(grupo_id) or public.es_directora());

create policy documentos_subir on public.documentos for insert to authenticated
  with check (public.es_docente_de(grupo_id) and storage_path like grupo_id::text || '/%');

create policy documentos_revisar on public.documentos for update to authenticated
  using (public.es_directora()) with check (public.es_directora());

create policy documentos_borrar on public.documentos for delete to authenticated
  using (public.es_docente_de(grupo_id) and estado = 'entregado');

create function public.documentos_reglas() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' then return new; end if;

  if tg_op = 'INSERT' then
    new.estado := 'entregado';
    new.comentario := null; new.revisado_por := null; new.revisado_en := null;
    new.subido_por := auth.uid();
    new.creado_en := now();
    new.titulo := trim(new.titulo);
    select coalesce(max(d.version), 0) + 1 into new.version
      from documentos d
     where d.grupo_id = new.grupo_id and d.tipo = new.tipo
       and d.trimestre is not distinct from new.trimestre
       and lower(d.titulo) = lower(new.titulo);
    return new;
  end if;

  -- UPDATE (solo la directora llega aquí por RLS): únicamente estado y comentario.
  new.id := old.id; new.grupo_id := old.grupo_id; new.tipo := old.tipo;
  new.trimestre := old.trimestre; new.titulo := old.titulo; new.version := old.version;
  new.storage_path := old.storage_path; new.nombre_archivo := old.nombre_archivo;
  new.mime := old.mime; new.tamano := old.tamano; new.subido_por := old.subido_por;
  new.creado_en := old.creado_en;
  if new.estado is distinct from old.estado then
    new.revisado_por := case when new.estado = 'revisado' then auth.uid() end;
    new.revisado_en  := case when new.estado = 'revisado' then now() end;
  else
    new.revisado_por := old.revisado_por;
    new.revisado_en  := old.revisado_en;
  end if;
  return new;
end;
$$;

create trigger documentos_reglas before insert or update on public.documentos
  for each row execute function public.documentos_reglas();

-- ─── bitácora ───────────────────────────────────────────────────────────────
create policy bitacora_leer on public.bitacora for select to authenticated
  using (public.es_directora());

create function public.registrar_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fila jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  if tg_table_name = 'selecciones' and tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
    return null;  -- solo interesan los cambios de estado
  end if;
  insert into bitacora (tabla, registro_id, accion, detalle)
  values (tg_table_name, fila ->> 'id', lower(tg_op),
          case tg_table_name
            when 'selecciones' then jsonb_build_object('estado', fila ->> 'estado', 'trimestre', fila ->> 'trimestre', 'grupo_id', fila ->> 'grupo_id')
            else jsonb_build_object('tipo', fila ->> 'tipo', 'titulo', fila ->> 'titulo', 'version', fila ->> 'version', 'estado', fila ->> 'estado', 'grupo_id', fila ->> 'grupo_id')
          end);
  return null;
end;
$$;

create trigger selecciones_bitacora after insert or update on public.selecciones
  for each row execute function public.registrar_bitacora();
create trigger documentos_bitacora after insert or update or delete on public.documentos
  for each row execute function public.registrar_bitacora();
