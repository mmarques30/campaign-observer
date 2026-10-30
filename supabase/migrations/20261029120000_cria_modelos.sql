-- Modelos de criativo: a estrutura de um criativo pronto (slides, layouts, visuais, tema),
-- guardada como foto do momento. Um criativo novo pode partir de um modelo (modelo_id).
create table if not exists public.cria_modelos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  nome text not null,
  descricao text,
  tipo text not null default 'carrossel' check (tipo in ('carrossel','unico')),
  formato text not null default '4:5',
  design jsonb not null,
  origem_id uuid references public.cria_projetos(id) on delete set null
);
alter table public.cria_modelos enable row level security;
drop policy if exists "autenticados usam modelos" on public.cria_modelos;
create policy "autenticados usam modelos" on public.cria_modelos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.cria_modelos to authenticated;
alter table public.cria_projetos add column if not exists modelo_id uuid references public.cria_modelos(id) on delete set null;
notify pgrst, 'reload schema';
