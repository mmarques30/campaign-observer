-- Mapa de Conexões: liga o vídeo editado ao roteiro e à referência de nicho que o originaram,
-- para correlacionar referência → roteiro → vídeo → publicado → anúncio → funil.
-- Só adiciona colunas opcionais; nada é removido.
alter table public.vedit_projetos
  add column if not exists roteiro_id uuid references public.vedit_roteiros(id) on delete set null,
  add column if not exists referencia_id uuid references public.vedit_referencias(id) on delete set null;
create index if not exists vedit_projetos_roteiro_idx on public.vedit_projetos(roteiro_id);
create index if not exists vedit_projetos_referencia_idx on public.vedit_projetos(referencia_id);
