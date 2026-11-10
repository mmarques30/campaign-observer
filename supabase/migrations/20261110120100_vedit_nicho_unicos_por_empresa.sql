-- Parte 2: remove a unicidade global antiga (substituída pelos índices por empresa da parte 1).
alter table public.vedit_nicho_perfis drop constraint if exists vedit_nicho_perfis_username_key;
alter table public.vedit_nicho_reels drop constraint if exists vedit_nicho_reels_ig_media_id_key;
