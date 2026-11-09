-- Permissão passa a ser por (usuário, empresa, tela).
alter table public.mads_permissoes drop constraint mads_permissoes_pkey;
alter table public.mads_permissoes add constraint mads_permissoes_pkey primary key (user_id, empresa_id, recurso);
