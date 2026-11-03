-- Pesquisa de nicho: cada reel ganha uma nota de relevância (0 a 3) para o tema digitado, para a
-- busca responder ao assunto e não só ao que os perfis monitorados postaram.
alter table public.vedit_nicho_reels
  add column if not exists relevancia smallint,
  add column if not exists relevancia_tema text;
alter table public.vedit_nicho_config add column if not exists tema_buscado text;
notify pgrst, 'reload schema';
