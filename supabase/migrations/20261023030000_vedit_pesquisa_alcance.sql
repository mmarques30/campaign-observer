-- Pesquisa de nicho: onde buscar (Brasil / internacional / ambos) e região de cada perfil.
-- Já aplicado em produção em 23/10/2026.
alter table public.vedit_nicho_config
  add column if not exists alcance text not null default 'ambos'
  check (alcance in ('brasil', 'internacional', 'ambos'));
alter table public.vedit_nicho_perfis add column if not exists regiao text;
