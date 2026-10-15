-- Portal docente — archivos (Supabase Storage).
--
-- Bucket PRIVADO: los archivos solo se abren con URLs firmadas de vida corta
-- (createSignedUrl), nunca con getPublicUrl. Puede haber fotos de alumnos.
-- Ruta obligatoria: {grupo_id}/{ciclo}/{tipo}/{uuid}-{nombre}
-- No hay política de UPDATE: un archivo subido no se sobrescribe (versiones).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 26214400,  -- 25 MB
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/msword', 'application/vnd.ms-excel', 'video/mp4'])
on conflict (id) do nothing;

create policy documentos_archivo_leer on storage.objects for select to authenticated
  using (bucket_id = 'documentos'
         and (public.es_directora() or public.es_docente_de(public.grupo_de_ruta(name))));

create policy documentos_archivo_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.es_docente_de(public.grupo_de_ruta(name)));

create policy documentos_archivo_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos'
         and public.es_docente_de(public.grupo_de_ruta(name))
         and not exists (select 1 from public.documentos d
                          where d.storage_path = name and d.estado = 'revisado'));
