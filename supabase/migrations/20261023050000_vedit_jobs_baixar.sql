-- Já aplicada em produção em 23/10/2026.
-- Job "baixar": o worker baixa o vídeo de referência pelo link (yt-dlp) e devolve o caminho no bucket.
alter table public.vedit_jobs add column if not exists params jsonb, add column if not exists resultado jsonb;
alter table public.vedit_jobs alter column projeto_id drop not null;
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs
  add constraint vedit_jobs_tipo_check check (tipo = any (array['proxy', 'recorte', 'voz', 'baixar']));
