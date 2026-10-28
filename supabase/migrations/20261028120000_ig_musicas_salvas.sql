-- Músicas do Instagram salvas no sistema (a API não lista os áudios salvos no perfil).
create table if not exists public.ig_musicas_salvas (
  audio_id text primary key,
  titulo text not null default '',
  artista text not null default '',
  duracao integer,
  capa text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
alter table public.ig_musicas_salvas enable row level security;
create policy "autenticados leem e salvam musicas" on public.ig_musicas_salvas
  for all to authenticated using (true) with check (true);
