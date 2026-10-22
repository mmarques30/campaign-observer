-- Sugestão automática (nome/objetivo/formato/estilo/duração) e estilos visuais.
alter table public.vedit_projetos
  add column if not exists content_item_id uuid references public.content_items(id) on delete set null,
  add column if not exists estilo text not null default 'viral',
  add column if not exists duracao_alvo int,
  add column if not exists sugestao jsonb,
  add column if not exists nome_automatico boolean not null default false;
alter table public.vedit_projetos alter column nome set default 'Novo vídeo';
