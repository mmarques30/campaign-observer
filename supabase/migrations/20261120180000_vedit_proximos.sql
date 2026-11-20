-- Próximos conteúdos: sugestões geradas a partir do desempenho dos posts orgânicos e dos anúncios
-- (com o resultado no CRM). Uma linha por geração; a tela mostra a mais recente da empresa ativa.
create table if not exists public.vedit_proximos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.mads_empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'gerando',
  erro text,
  dados jsonb,
  sugestoes jsonb
);
create index if not exists vedit_proximos_empresa_idx on public.vedit_proximos (empresa_id, created_at desc);
alter table public.vedit_proximos enable row level security;
create policy "vedit_proximos ler da empresa" on public.vedit_proximos
  for select to authenticated using (empresa_id = public.mads_empresa_ativa());
