-- Já aplicada em produção em 23/10/2026.
-- Job "referencia" (o worker baixa, monta quadros/áudio, transcreve e analisa) e fila paralela
-- de jobs rápidos, que não espera o render terminar.
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs
  add constraint vedit_jobs_tipo_check check (tipo = any (array['proxy', 'recorte', 'voz', 'baixar', 'referencia']));

create or replace function public.vedit_pegar_job_tipos(p_worker text, p_tipos text[])
returns setof public.vedit_jobs language sql security definer set search_path to 'public' as $$
  update public.vedit_jobs j set status = 'rodando', iniciado_em = now(), worker = p_worker
  where j.id = (select id from public.vedit_jobs where status = 'fila' and tipo = any(p_tipos)
                order by created_at for update skip locked limit 1)
  returning j.*;
$$;
revoke execute on function public.vedit_pegar_job_tipos(text, text[]) from public, anon, authenticated;
