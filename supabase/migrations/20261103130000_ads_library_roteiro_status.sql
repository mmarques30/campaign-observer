-- Referências por link da Biblioteca de Anúncios da Meta + aprovação de roteiros.
alter table public.vedit_referencias drop constraint if exists vedit_referencias_plataforma_check;
alter table public.vedit_referencias
  add constraint vedit_referencias_plataforma_check
  check (plataforma in ('instagram','tiktok','youtube','arquivo','ads_library'));

alter table public.vedit_roteiros
  add column if not exists aprovacao text not null default 'rascunho'
    check (aprovacao in ('rascunho','aprovado','reprovado')),
  add column if not exists aprovacao_em timestamptz,
  add column if not exists aprovacao_nota text;
notify pgrst, 'reload schema';
