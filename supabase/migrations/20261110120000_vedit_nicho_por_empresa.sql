-- Pesquisa de nicho por empresa: cada empresa tem o próprio nicho, perfis monitorados,
-- reels coletados e anúncios do nicho. O que já existe fica com a IAplicada.
-- Parte 1: colunas, preenchimento, índices, gatilho e RLS (sem remover nada).
do $$
declare t text;
begin
  foreach t in array array['vedit_nicho_config','vedit_nicho_perfis','vedit_nicho_reels','vedit_nicho_ads'] loop
    execute format('alter table public.%I add column if not exists empresa_id uuid references public.mads_empresas(id) on delete cascade', t);
    execute format('update public.%I set empresa_id = public.mads_iaplicada_id() where empresa_id is null', t);
    execute format('alter table public.%I alter column empresa_id set not null', t);
    execute format('create index if not exists %I on public.%I(empresa_id)', t || '_empresa_idx', t);
    execute format('create or replace trigger mads_set_empresa before insert on public.%I for each row execute function public.mads_set_empresa()', t);
  end loop;
end $$;

-- Configuração: uma linha por empresa (antes era só id = 1).
create sequence if not exists public.vedit_nicho_config_id_seq owned by public.vedit_nicho_config.id;
select setval('public.vedit_nicho_config_id_seq', greatest((select max(id) from public.vedit_nicho_config), 1));
alter table public.vedit_nicho_config alter column id set default nextval('public.vedit_nicho_config_id_seq');
create unique index if not exists vedit_nicho_config_empresa_uk on public.vedit_nicho_config(empresa_id);

-- Unicidade passa a ser por empresa (o mesmo perfil/reel pode ser monitorado por duas empresas).
create unique index if not exists vedit_nicho_perfis_empresa_username_uk on public.vedit_nicho_perfis(empresa_id, username);
create unique index if not exists vedit_nicho_reels_empresa_media_uk on public.vedit_nicho_reels(empresa_id, ig_media_id);

-- RLS: cada empresa só vê e mexe nos próprios dados.
alter policy "auth crud vedit_nicho_config" on public.vedit_nicho_config
  using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_nicho_perfis" on public.vedit_nicho_perfis
  using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_nicho_reels" on public.vedit_nicho_reels
  using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_nicho_ads" on public.vedit_nicho_ads
  using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
