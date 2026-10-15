-- Imitación mínima de lo que Supabase ya trae (roles, auth, storage), solo para
-- correr las migraciones y probar las reglas en PGlite. NO se aplica en Supabase.

create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
