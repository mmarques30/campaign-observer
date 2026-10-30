-- Automação de comentários do Instagram (estilo ManyChat), versão robusta:
-- várias respostas públicas (sorteadas), DM em blocos (texto, imagem, link, passo a passo),
-- fila para os blocos que só podem sair depois que a pessoa responde na DM, e captação no CRM.
-- As tabelas instagram_automations / instagram_comment_logs já existiam (CRM); aqui ganham campos.

alter table public.instagram_automations
  add column if not exists nome text,
  add column if not exists publicacao_id uuid references public.publicacoes(id) on delete set null,
  add column if not exists palavras text[] not null default '{}',   -- vazio = qualquer comentário
  add column if not exists respostas text[] not null default '{}',  -- variantes da resposta pública (sorteio)
  add column if not exists dm jsonb not null default '[]'::jsonb,    -- blocos: {tipo: texto|imagem|link|passos, ...}
  add column if not exists so_seguidores boolean not null default false,
  add column if not exists dms_enviadas integer not null default 0,
  add column if not exists dms_pendentes integer not null default 0,
  add column if not exists ultimo_erro text,
  add column if not exists varrido_em timestamptz,
  add column if not exists created_by uuid default auth.uid();

alter table public.instagram_comment_logs
  add column if not exists ig_media_id text,
  add column if not exists resposta_enviada text,
  add column if not exists resposta_erro text,
  add column if not exists dm_blocos_total integer not null default 0,
  add column if not exists dm_blocos_enviados integer not null default 0,
  add column if not exists dm_pendente boolean not null default false,
  add column if not exists dm_concluida_em timestamptz,
  add column if not exists origem text not null default 'webhook'; -- webhook | varredura

create unique index if not exists instagram_comment_logs_comment_id_idx
  on public.instagram_comment_logs (comment_id);
create index if not exists instagram_comment_logs_pendente_idx
  on public.instagram_comment_logs (commenter_ig_id) where dm_pendente;

-- Só usuários logados mexem (as políticas antigas liberavam anon).
drop policy if exists "Public read/write instagram_automations" on public.instagram_automations;
drop policy if exists "Public read/write instagram_comment_logs" on public.instagram_comment_logs;
drop policy if exists "auth crud instagram_automations" on public.instagram_automations;
drop policy if exists "auth crud instagram_comment_logs" on public.instagram_comment_logs;
create policy "auth crud instagram_automations" on public.instagram_automations
  for all to authenticated using (true) with check (true);
create policy "auth crud instagram_comment_logs" on public.instagram_comment_logs
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.instagram_automations, public.instagram_comment_logs to authenticated;

-- Mensagens recebidas na DM (para a fila de blocos e, depois, a captação pela DM).
create table if not exists public.instagram_dm_eventos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ig_user_id text not null,
  mid text unique,
  texto text,
  tipo text not null default 'texto',
  bruto jsonb
);
alter table public.instagram_dm_eventos enable row level security;
drop policy if exists "auth le instagram_dm_eventos" on public.instagram_dm_eventos;
create policy "auth le instagram_dm_eventos" on public.instagram_dm_eventos
  for select to authenticated using (true);
grant select on public.instagram_dm_eventos to authenticated;

notify pgrst, 'reload schema';

-- Token de verificação do webhook (a Meta chama GET com hub.verify_token; a tela mostra o valor).
create table if not exists public.instagram_config (
  id integer primary key default 1 check (id = 1),
  verify_token text not null,
  webhook_recebido_em timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.instagram_config enable row level security;
drop policy if exists "auth le instagram_config" on public.instagram_config;
create policy "auth le instagram_config" on public.instagram_config for select to authenticated using (true);
grant select on public.instagram_config to authenticated;
insert into public.instagram_config (id, verify_token)
  values (1, 'iaplicada-' || replace(gen_random_uuid()::text, '-', ''))
  on conflict (id) do nothing;
notify pgrst, 'reload schema';
