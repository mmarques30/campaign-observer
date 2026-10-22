-- Módulo Edição (editor de vídeo com IA) do IAplicada Ads.
-- Tudo novo e isolado (prefixo vedit_): não toca nas tabelas mads_.

create table if not exists public.vedit_marcas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  padrao boolean not null default false,
  marca jsonb not null default '{}'::jsonb,      -- cores e fontes (mesmo formato de timeline.marca)
  legenda_estilo text not null default 'karaoke',
  instrucoes text                                -- guia de estilo em texto livre p/ o Claude
);

create table if not exists public.vedit_projetos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  nome text not null,
  objetivo text not null default 'organico' check (objetivo in ('anuncio','organico')),
  formato text not null default '9:16' check (formato in ('9:16','4:5','1:1')),
  status text not null default 'rascunho'
    check (status in ('rascunho','enviando','transcrevendo','pronto_para_editar','editando','renderizando','renderizado','publicado','erro')),
  fonte_path text,
  fonte_duracao numeric,
  fonte_largura int,
  fonte_altura int,
  audio_path text,
  palavras jsonb not null default '[]'::jsonb,   -- [{p,i,f}] transcrição palavra a palavra
  transcricao_texto text,
  timeline jsonb,
  storyboard jsonb,
  versao int not null default 0,
  marca_id uuid references public.vedit_marcas(id) on delete set null,
  render_path text,
  meta_video_id text,
  mads_creative_id uuid,
  ig_media_id text,
  publicado_em timestamptz,
  erro text
);

create table if not exists public.vedit_versoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  projeto_id uuid not null references public.vedit_projetos(id) on delete cascade,
  versao int not null,
  timeline jsonb not null,
  origem text not null default 'claude' check (origem in ('claude','manual','desfazer')),
  resumo text
);
create index if not exists vedit_versoes_proj on public.vedit_versoes(projeto_id, versao desc);

create table if not exists public.vedit_mensagens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  projeto_id uuid not null references public.vedit_projetos(id) on delete cascade,
  papel text not null check (papel in ('usuario','claude','sistema')),
  conteudo text not null,
  comando text,
  storyboard jsonb,
  versao int
);
create index if not exists vedit_mensagens_proj on public.vedit_mensagens(projeto_id, created_at);

create table if not exists public.vedit_midias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  projeto_id uuid not null references public.vedit_projetos(id) on delete cascade,
  tipo text not null check (tipo in ('imagem','video','audio')),
  nome text not null,
  path text not null,
  duracao numeric,
  descricao text
);
create index if not exists vedit_midias_proj on public.vedit_midias(projeto_id);

create table if not exists public.vedit_renders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  projeto_id uuid not null references public.vedit_projetos(id) on delete cascade,
  versao int,
  status text not null default 'fila' check (status in ('fila','renderizando','pronto','erro','cancelado')),
  progresso numeric not null default 0,
  props jsonb not null,           -- ReelProps completas (com paths, não URLs assinadas)
  output_path text,
  erro text,
  worker text,
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index if not exists vedit_renders_fila on public.vedit_renders(status, created_at);

-- updated_at automático
create or replace function public.vedit_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists vedit_projetos_touch on public.vedit_projetos;
create trigger vedit_projetos_touch before update on public.vedit_projetos for each row execute function public.vedit_touch();

-- Worker pega o próximo render da fila sem corrida entre workers.
create or replace function public.vedit_pegar_render(p_worker text)
returns setof public.vedit_renders language sql security definer set search_path = public as $$
  update public.vedit_renders r set status = 'renderizando', iniciado_em = now(), worker = p_worker
  where r.id = (
    select id from public.vedit_renders where status = 'fila' order by created_at
    for update skip locked limit 1
  )
  returning r.*;
$$;
revoke all on function public.vedit_pegar_render(text) from public, anon, authenticated;

-- RLS: equipe autenticada edita tudo (mesmo padrão de creative_items).
alter table public.vedit_marcas enable row level security;
alter table public.vedit_projetos enable row level security;
alter table public.vedit_versoes enable row level security;
alter table public.vedit_mensagens enable row level security;
alter table public.vedit_midias enable row level security;
alter table public.vedit_renders enable row level security;
do $$ declare t text; begin
  foreach t in array array['vedit_marcas','vedit_projetos','vedit_versoes','vedit_mensagens','vedit_midias','vedit_renders'] loop
    execute format('drop policy if exists "auth crud %1$s" on public.%1$I', t);
    execute format('create policy "auth crud %1$s" on public.%1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Bucket privado para brutos, mídias e renders (até 1 GB por arquivo).
insert into storage.buckets (id, name, public, file_size_limit)
values ('video-edicao', 'video-edicao', false, 1073741824)
on conflict (id) do nothing;
drop policy if exists "vedit auth read" on storage.objects;
drop policy if exists "vedit auth write" on storage.objects;
drop policy if exists "vedit auth update" on storage.objects;
drop policy if exists "vedit auth delete" on storage.objects;
create policy "vedit auth read" on storage.objects for select to authenticated using (bucket_id = 'video-edicao');
create policy "vedit auth write" on storage.objects for insert to authenticated with check (bucket_id = 'video-edicao');
create policy "vedit auth update" on storage.objects for update to authenticated using (bucket_id = 'video-edicao');
create policy "vedit auth delete" on storage.objects for delete to authenticated using (bucket_id = 'video-edicao');

-- Progresso ao vivo na tela.
do $$ begin
  begin alter publication supabase_realtime add table public.vedit_renders; exception when others then null; end;
  begin alter publication supabase_realtime add table public.vedit_projetos; exception when others then null; end;
end $$;

-- Marca padrão.
insert into public.vedit_marcas (nome, padrao, marca, legenda_estilo, instrucoes)
select 'IAplicada', true,
  '{"primaria":"#6C2BD9","destaque":"#C6F432","texto":"#FFFFFF","fundo":"#0B0B0F","fonteTitulo":"Bricolage Grotesque","fonteLegenda":"Inter","fonteSerif":"Instrument Serif"}'::jsonb,
  'karaoke',
  'Marca IAplicada. Tom direto, humano, sem jargão de consultor. Nunca usar emojis no vídeo. Nunca escrever "PME": usar "empresa". CTA de agendamento é "com a IAplicada", nunca "com a Mari". Público: donos de empresa que faturam R$3M+.'
where not exists (select 1 from public.vedit_marcas);
