-- Referência de criativos baixada pelo servidor (yt-dlp) e roteiro no projeto de criativo.
alter table public.vedit_jobs drop constraint if exists vedit_jobs_tipo_check;
alter table public.vedit_jobs add constraint vedit_jobs_tipo_check check (tipo in ('proxy','recorte','voz','baixar','referencia','cria_referencia'));
alter table public.cria_projetos add column if not exists roteiro text;
-- "baixando": o servidor de vídeo está trazendo as imagens; "aguardando": criativo esperando a referência ficar pronta.
alter table public.cria_referencias drop constraint if exists cria_referencias_status_check;
alter table public.cria_referencias add constraint cria_referencias_status_check check (status in ('nova','baixando','analisando','pronta','erro'));
alter table public.cria_projetos drop constraint if exists cria_projetos_status_check;
alter table public.cria_projetos add constraint cria_projetos_status_check check (status in ('rascunho','aguardando','gerando','pronto','erro'));
