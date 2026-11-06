-- Montar: grava os cortes (na ordem em que tocam) num arquivo de vídeo novo.
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs add constraint vedit_jobs_tipo_check check (tipo = any (array[
  'proxy','recorte','voz','baixar','referencia','cria_referencia','slideshow','ads_busca','juntar','montar'
]));
