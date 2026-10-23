-- Edição → Pesquisa: Reels que mais viralizaram no nicho (Instagram Graph API, business discovery
-- + hashtags), por que funcionaram e roteiro original para a IAplicada.
create table if not exists public.vedit_nicho_config (
  id int primary key default 1 check (id = 1),
  nicho text,                       -- descrição do nicho (ex.: "IA aplicada a negócios para donos de empresa")
  publico text,                     -- quem assiste (ICP)
  hashtags text[] not null default '{}',
  dias_janela int not null default 90,
  ultima_busca timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.vedit_nicho_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.vedit_nicho_perfis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null unique,
  nome text,
  ig_user_id text,
  followers int,
  media_count int,
  ativo boolean not null default true,
  origem text not null default 'manual' check (origem in ('manual','sugerido')),
  mediana_engajamento numeric,      -- mediana de curtidas+comentários dos reels coletados
  ultima_coleta timestamptz,
  erro text
);

create table if not exists public.vedit_nicho_reels (
  id uuid primary key default gen_random_uuid(),
  coletado_em timestamptz not null default now(),
  perfil_id uuid references public.vedit_nicho_perfis(id) on delete cascade,
  origem text not null default 'perfil' check (origem in ('perfil','hashtag')),
  hashtag text,
  ig_media_id text not null unique,
  username text,
  permalink text,
  caption text,
  media_type text,
  media_product_type text,
  thumbnail_url text,
  media_url text,
  like_count int not null default 0,
  comments_count int not null default 0,
  publicado_em timestamptz,
  engajamento int generated always as (like_count + comments_count) stored,
  indice numeric,                   -- engajamento / mediana do perfil (quantas vezes acima do normal)
  taxa numeric,                     -- engajamento / seguidores
  analise jsonb,                    -- por que funcionou
  roteiro jsonb,                    -- roteiro original para a IAplicada
  content_item_id uuid,             -- quando virou roteiro na página de Marketing
  descartado boolean not null default false
);
create index if not exists vedit_nicho_reels_indice_idx on public.vedit_nicho_reels (indice desc nulls last);
create index if not exists vedit_nicho_reels_pub_idx on public.vedit_nicho_reels (publicado_em desc);

alter table public.vedit_nicho_config enable row level security;
alter table public.vedit_nicho_perfis enable row level security;
alter table public.vedit_nicho_reels enable row level security;
do $$ declare t text; begin
  foreach t in array array['vedit_nicho_config','vedit_nicho_perfis','vedit_nicho_reels'] loop
    execute format('drop policy if exists "auth crud %1$s" on public.%1$I', t);
    execute format('create policy "auth crud %1$s" on public.%1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
