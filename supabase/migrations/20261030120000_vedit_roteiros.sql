-- Roteiros feitos a partir de um vídeo de referência (reel da Pesquisa e/ou referência salva):
-- mesmo esqueleto (blocos, tempos e pausas), assunto e idioma escolhidos, com conversa de ajustes.
create table if not exists public.vedit_roteiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  reel_id uuid references public.vedit_nicho_reels(id) on delete set null,
  referencia_id uuid references public.vedit_referencias(id) on delete set null,
  tema text not null,
  idioma text not null default 'pt-BR',
  finalidade text not null default 'organico',
  notas text,
  status text not null default 'gerando' check (status in ('gerando','pronto','erro')),
  erro text,
  estrutura jsonb,
  roteiro jsonb,
  mensagens jsonb not null default '[]'::jsonb,
  versao integer not null default 0,
  content_item_id uuid
);
alter table public.vedit_roteiros enable row level security;
drop policy if exists "auth crud vedit_roteiros" on public.vedit_roteiros;
create policy "auth crud vedit_roteiros" on public.vedit_roteiros
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.vedit_roteiros to authenticated;

-- Reel da Pesquisa salvo como referência de edição.
alter table public.vedit_nicho_reels
  add column if not exists referencia_id uuid references public.vedit_referencias(id) on delete set null;
notify pgrst, 'reload schema';
