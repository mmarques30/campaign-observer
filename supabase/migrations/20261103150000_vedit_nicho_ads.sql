-- Busca por tema na Biblioteca de Anúncios da Meta (anúncios de vídeo ativos), lida pelo worker.
create table if not exists public.vedit_nicho_ads (
  id text primary key,
  tema text not null,
  pais text not null default 'BR',
  anunciante text,
  inicio date,
  variantes int not null default 1,
  texto text,
  poster text,
  url text not null,
  referencia_id uuid references public.vedit_referencias(id) on delete set null,
  descartado boolean not null default false,
  buscado_em timestamptz not null default now()
);
create index if not exists vedit_nicho_ads_tema on public.vedit_nicho_ads (tema, inicio);
alter table public.vedit_nicho_ads enable row level security;
drop policy if exists "auth crud vedit_nicho_ads" on public.vedit_nicho_ads;
create policy "auth crud vedit_nicho_ads" on public.vedit_nicho_ads for all to authenticated using (true) with check (true);
notify pgrst, 'reload schema';

alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs add constraint vedit_jobs_tipo_check
  check (tipo in ('proxy','recorte','voz','baixar','referencia','cria_referencia','slideshow','ads_busca'));
