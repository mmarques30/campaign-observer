-- Medição de luz/cor do vídeo gravado (tom de pele, exposição, contraste), feita no editor,
-- para dosar a correção de imagem ao aplicar referências e nos comandos /luz.
alter table public.vedit_projetos add column if not exists luz jsonb;
