-- Zona do rosto detectada no navegador (fração 0–1 do quadro). Os grafismos desviam dela.
alter table public.vedit_projetos add column if not exists rosto jsonb;
