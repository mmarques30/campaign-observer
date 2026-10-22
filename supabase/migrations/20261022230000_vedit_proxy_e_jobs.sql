-- Versão leve 1080p para o preview + fila de trabalhos do worker (proxy; futuro: recorte).
alter table public.vedit_projetos
  add column if not exists fonte_proxy_path text,
  add column if not exists upload_progresso int not null default 0;

create table if not exists public.vedit_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  projeto_id uuid not null references public.vedit_projetos(id) on delete cascade,
  tipo text not null check (tipo in ('proxy','recorte')),
  status text not null default 'fila' check (status in ('fila','rodando','pronto','erro')),
  erro text, worker text, iniciado_em timestamptz, concluido_em timestamptz
);
create index if not exists vedit_jobs_fila on public.vedit_jobs(status, created_at);
alter table public.vedit_jobs enable row level security;
drop policy if exists "auth crud vedit_jobs" on public.vedit_jobs;
create policy "auth crud vedit_jobs" on public.vedit_jobs for all to authenticated using (true) with check (true);

create or replace function public.vedit_pegar_job(p_worker text)
returns setof public.vedit_jobs language sql security definer set search_path = public as $$
  update public.vedit_jobs j set status = 'rodando', iniciado_em = now(), worker = p_worker
  where j.id = (select id from public.vedit_jobs where status = 'fila' order by created_at for update skip locked limit 1)
  returning j.*;
$$;
revoke all on function public.vedit_pegar_job(text) from public, anon, authenticated;
