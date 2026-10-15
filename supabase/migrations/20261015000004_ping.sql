-- Portal docente — función mínima para el "keep alive".
--
-- Supabase Free pausa un proyecto tras 7 días sin actividad. En vacaciones nadie
-- entra al portal, así que .github/workflows/mantener-activo.yml llama esta
-- función cada semana con la anon key. No lee ni expone ningún dato.
create function public.ping() returns text
language sql stable as $$ select 'ok'::text $$;

grant execute on function public.ping() to anon;
