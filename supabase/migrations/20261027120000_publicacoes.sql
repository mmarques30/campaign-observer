-- Fila de publicações no Instagram (criativos e vídeos), com agendamento. Quem publica é a função
-- publicar-agendados, chamada pelo cron a cada 5 minutos.
create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  origem text not null check (origem in ('criativo','video')),
  ref_id uuid not null,
  nome text,
  tipo text not null check (tipo in ('imagem','carrossel','reel')),
  midias text[] not null default '{}',
  legenda text not null default '',
  agendado_para timestamptz not null default now(),
  status text not null default 'agendado' check (status in ('agendado','publicando','publicado','erro','cancelado')),
  tentativas int not null default 0,
  container_id text,
  container_em timestamptz,
  ig_media_id text,
  permalink text,
  publicado_em timestamptz,
  erro text
);
create index if not exists publicacoes_fila on public.publicacoes(status, agendado_para);
create index if not exists publicacoes_ref on public.publicacoes(ref_id);
alter table public.publicacoes enable row level security;
create policy "publicacoes autenticados" on public.publicacoes for all to authenticated using (true) with check (true);
select cron.schedule('publicacoes-agendadas', '*/5 * * * *', $$select net.http_get(url := 'https://ciwdlceyjsnlnunktqzx.supabase.co/functions/v1/publicar-agendados')$$);
-- Destino (Instagram/anúncio), vínculo com o anúncio e métricas.
alter table public.publicacoes add column if not exists destino text not null default 'instagram' check (destino in ('instagram','anuncio'));
alter table public.publicacoes add column if not exists meta_ad_id text;
alter table public.publicacoes add column if not exists metricas jsonb;
alter table public.publicacoes add column if not exists metricas_em timestamptz;
alter table public.publicacoes add column if not exists thumb text;
-- Música do Instagram (só Reels aceitam pela API) e carrossel virando Reel (slides em vídeo).
alter table public.publicacoes add column if not exists audio jsonb;
alter table public.publicacoes add column if not exists slides_seg numeric;
alter table public.publicacoes drop constraint if exists publicacoes_status_check;
alter table public.publicacoes add constraint publicacoes_status_check check (status in ('preparando','agendado','publicando','publicado','erro','cancelado'));
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs add constraint vedit_jobs_tipo_check check (tipo in ('proxy','recorte','voz','baixar','referencia','cria_referencia','slideshow'));
