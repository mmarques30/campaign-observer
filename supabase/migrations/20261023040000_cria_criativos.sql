-- Já aplicada em produção em 23/10/2026.
-- Edição de criativos: carrosséis e posts únicos, estúdio de fotos com IA e referências.
create table if not exists public.cria_fotos (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  nome text,
  descricao text,
  origem text not null default 'upload' check (origem in ('upload', 'ia', 'referencia')),
  base_id uuid references public.cria_fotos(id) on delete set null,
  prompt text,
  largura int,
  altura int,
  favorita boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.cria_referencias (
  id uuid primary key default gen_random_uuid(),
  url text,
  autor text,
  legenda text,
  imagens text[] not null default '{}',
  analise jsonb,
  status text not null default 'nova' check (status in ('nova', 'analisando', 'pronta', 'erro')),
  erro text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.cria_projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Novo criativo',
  tipo text not null default 'carrossel' check (tipo in ('carrossel', 'unico')),
  formato text not null default '4:5' check (formato in ('4:5', '1:1', '9:16')),
  objetivo text not null default 'organico' check (objetivo in ('organico', 'anuncio')),
  briefing text,
  referencia_id uuid references public.cria_referencias(id) on delete set null,
  design jsonb not null default '{}'::jsonb,
  versao int not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho', 'gerando', 'pronto', 'erro')),
  erro text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cria_versoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.cria_projetos(id) on delete cascade,
  versao int not null,
  design jsonb not null,
  resumo text,
  created_at timestamptz not null default now()
);

create table if not exists public.cria_mensagens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.cria_projetos(id) on delete cascade,
  papel text not null check (papel in ('usuario', 'claude', 'sistema')),
  conteudo text not null,
  created_at timestamptz not null default now()
);

create index if not exists cria_mensagens_projeto on public.cria_mensagens (projeto_id, created_at);
create index if not exists cria_versoes_projeto on public.cria_versoes (projeto_id, versao);

do $$
declare t text;
begin
  foreach t in array array['cria_fotos', 'cria_referencias', 'cria_projetos', 'cria_versoes', 'cria_mensagens'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'auth crud ' || t) then
      execute format('create policy "auth crud %1$s" on public.%1$I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;
