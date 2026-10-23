-- Edição → Referências: biblioteca de vídeos de referência analisados pelo Claude
-- (técnicas, estilo, ritmo, e o que já temos / adaptar / criar no nosso catálogo).
create table if not exists public.vedit_referencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  url text,
  plataforma text not null default 'instagram' check (plataforma in ('instagram','tiktok','youtube','arquivo')),
  codigo text,                         -- shortcode do post
  autor text,
  titulo text,
  legenda text,
  metricas jsonb not null default '{}'::jsonb,   -- {plays, likes, comentarios}
  notas text,                          -- por que a Mari salvou (o que chamou atenção)
  status text not null default 'nova'
    check (status in ('nova','enviando','transcrevendo','analisando','pronta','erro')),
  video_path text,
  audio_path text,
  duracao numeric,
  largura int,
  altura int,
  folhas text[] not null default '{}', -- caminhos das folhas de quadros no bucket
  palavras jsonb not null default '[]'::jsonb,
  transcricao_texto text,
  analise jsonb,                       -- resultado estruturado do Claude
  erro text
);
create index if not exists vedit_referencias_status_idx on public.vedit_referencias (status, created_at desc);
alter table public.vedit_referencias enable row level security;
drop policy if exists "auth crud vedit_referencias" on public.vedit_referencias;
create policy "auth crud vedit_referencias" on public.vedit_referencias
  for all to authenticated using (true) with check (true);
drop trigger if exists vedit_referencias_touch on public.vedit_referencias;
create trigger vedit_referencias_touch before update on public.vedit_referencias
  for each row execute function public.vedit_touch();
