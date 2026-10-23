-- Voz limpa: novo tipo de job no worker (já aplicado em produção em 23/10/2026).
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs
  add constraint vedit_jobs_tipo_check check (tipo = any (array['proxy', 'recorte', 'voz']));
