-- ─────────────────────────────────────────────────────────────────────────────
-- IAplicada Ads · Multiempresa
--
-- A IAplicada passa a cadastrar empresas clientes e liberar módulos para cada uma.
-- Modelo:
--   mads_empresas          empresa (IAplicada = interna, vê tudo) + recursos liberados
--   mads_empresa_membros   quem é de qual empresa (papel admin|membro)
--   mads_usuarios.empresa_ativa_id   empresa escolhida no login / no seletor
--
-- Isolamento: as tabelas de Edição de vídeos e Edição de criativos ganham
-- empresa_id e a RLS passa a mostrar só a empresa ATIVA do usuário. Assim todas
-- as telas existentes ficam escopadas sem mudar uma linha de consulta no front.
-- Registros novos recebem a empresa ativa automaticamente (trigger).
--
-- Compartilhado com as empresas: catálogo de efeitos (código), biblioteca de
-- trilhas (bucket) e os modelos de criativo da IAplicada (somente leitura).
-- Não compartilhado: projetos, vídeos, referências, roteiros, marca, fotos,
-- publicados — cada empresa constrói os seus.
--
-- IAplicada continua exatamente como antes: todos os dados atuais pertencem a
-- ela e todos os usuários atuais são membros dela, com ela como empresa ativa.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Empresas e membros ─────────────────────────────────────────────────────────
create table if not exists public.mads_empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique,
  interna boolean not null default false,
  ativo boolean not null default true,
  recursos text[] not null default '{}',
  logo_url text,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mads_empresas_uma_interna on public.mads_empresas ((interna)) where interna;

create table if not exists public.mads_empresa_membros (
  empresa_id uuid not null references public.mads_empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'membro' check (papel in ('admin','membro')),
  created_at timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index if not exists mads_empresa_membros_user_idx on public.mads_empresa_membros(user_id);

alter table public.mads_usuarios
  add column if not exists empresa_ativa_id uuid references public.mads_empresas(id) on delete set null;

insert into public.mads_empresas (nome, slug, interna)
values ('IAplicada', 'iaplicada', true)
on conflict (slug) do nothing;

create or replace function public.mads_iaplicada_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.mads_empresas where interna limit 1;
$$;

insert into public.mads_empresa_membros (empresa_id, user_id)
select public.mads_iaplicada_id(), user_id from public.mads_usuarios
on conflict do nothing;

update public.mads_usuarios set empresa_ativa_id = public.mads_iaplicada_id()
where empresa_ativa_id is null;

-- 2) Funções de acesso ──────────────────────────────────────────────────────────
-- Pode entrar na empresa? (admin IAplicada entra em qualquer uma; demais, se membro)
create or replace function public.mads_pode_empresa(_uid uuid, _emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    _uid is not null and _emp is not null
    and public.mads_tem_acesso(_uid)
    and exists (select 1 from public.mads_empresas e where e.id = _emp and e.ativo)
    and (public.is_admin(_uid)
         or exists (select 1 from public.mads_empresa_membros m where m.user_id = _uid and m.empresa_id = _emp)),
    false);
$$;

-- Empresa ativa de um usuário (a escolhida, se ainda válida; senão a primeira que ele pode ver).
create or replace function public.mads_empresa_ativa_de(_uid uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v uuid;
begin
  if _uid is null then return null; end if;
  select empresa_ativa_id into v from public.mads_usuarios where user_id = _uid;
  if v is not null and public.mads_pode_empresa(_uid, v) then return v; end if;
  select m.empresa_id into v
    from public.mads_empresa_membros m join public.mads_empresas e on e.id = m.empresa_id
   where m.user_id = _uid and e.ativo
   order by e.interna desc, e.nome limit 1;
  if v is not null and public.mads_pode_empresa(_uid, v) then return v; end if;
  if public.is_admin(_uid) then return public.mads_iaplicada_id(); end if;
  return null;
end;
$$;

create or replace function public.mads_empresa_ativa()
returns uuid language sql stable security definer set search_path = public as $$
  select public.mads_empresa_ativa_de(auth.uid());
$$;

-- Nível efetivo num recurso dentro de uma empresa: limitado aos módulos liberados
-- para a empresa; admin IAplicada e admin da empresa editam tudo que está liberado.
create or replace function public.mads_nivel_empresa(_uid uuid, _emp uuid, _recurso text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  e record;
  n text;
begin
  if not public.mads_pode_empresa(_uid, _emp) then return 'none'; end if;
  select interna, recursos into e from public.mads_empresas where id = _emp;
  if not e.interna and not (_recurso = any (e.recursos)) then return 'none'; end if;
  if public.is_admin(_uid) then return 'edit'; end if;
  if exists (select 1 from public.mads_empresa_membros m where m.user_id = _uid and m.empresa_id = _emp and m.papel = 'admin') then
    return 'edit';
  end if;
  select nivel into n from public.mads_permissoes where user_id = _uid and recurso = _recurso
     and coalesce(empresa_id, public.mads_iaplicada_id()) = _emp;
  return coalesce(n, 'none');
end;
$$;

-- Troca a empresa ativa (login / seletor no topo do menu).
create or replace function public.mads_trocar_empresa(_emp uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.mads_pode_empresa(auth.uid(), _emp) then
    raise exception 'Sem acesso a esta empresa' using errcode = '42501';
  end if;
  insert into public.mads_usuarios (user_id, ativo, empresa_ativa_id)
  values (auth.uid(), true, _emp)
  on conflict (user_id) do update set empresa_ativa_id = excluded.empresa_ativa_id, updated_at = now();
  return _emp;
end;
$$;

-- Empresas que o usuário logado pode abrir.
create or replace function public.mads_minhas_empresas()
returns table (id uuid, nome text, slug text, interna boolean, recursos text[], logo_url text, papel text, ativa boolean)
language sql stable security definer set search_path = public as $$
  with ativa as (select public.mads_empresa_ativa() as id)
  select e.id, e.nome, e.slug, e.interna, e.recursos, e.logo_url,
         coalesce(m.papel, case when public.is_admin(auth.uid()) then 'admin' end) as papel,
         e.id = (select id from ativa) as ativa
    from public.mads_empresas e
    left join public.mads_empresa_membros m on m.empresa_id = e.id and m.user_id = auth.uid()
   where e.ativo
     and public.mads_tem_acesso(auth.uid())
     and (public.is_admin(auth.uid()) or m.user_id is not null)
   order by e.interna desc, e.nome;
$$;

grant execute on function public.mads_iaplicada_id(), public.mads_pode_empresa(uuid, uuid), public.mads_empresa_ativa_de(uuid),
  public.mads_empresa_ativa(), public.mads_nivel_empresa(uuid, uuid, text), public.mads_trocar_empresa(uuid),
  public.mads_minhas_empresas() to authenticated;

-- RLS das tabelas novas
alter table public.mads_empresas enable row level security;
alter table public.mads_empresa_membros enable row level security;

create policy mads_empresas_admin on public.mads_empresas for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy mads_empresas_membro_le on public.mads_empresas for select
  using (public.mads_pode_empresa(auth.uid(), id));
create policy mads_membros_admin on public.mads_empresa_membros for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy mads_membros_self on public.mads_empresa_membros for select
  using (user_id = auth.uid());

grant select on public.mads_empresas, public.mads_empresa_membros to authenticated;
grant insert, update, delete on public.mads_empresas, public.mads_empresa_membros to authenticated;

-- 3) Permissões por empresa ─────────────────────────────────────────────────────
alter table public.mads_permissoes
  add column if not exists empresa_id uuid references public.mads_empresas(id) on delete cascade;
update public.mads_permissoes set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
alter table public.mads_permissoes alter column empresa_id set default public.mads_iaplicada_id();
alter table public.mads_permissoes alter column empresa_id set not null;
create index if not exists mads_permissoes_empresa_idx on public.mads_permissoes(user_id, empresa_id);

-- mads_nivel passa a considerar a empresa ativa.
create or replace function public.mads_nivel(_user_id uuid, _recurso text)
returns text language sql stable security definer set search_path = public as $$
  select public.mads_nivel_empresa(_user_id, public.mads_empresa_ativa_de(_user_id), _recurso);
$$;

-- View de usuários do admin: telas liberadas na IAplicada + empresas da pessoa.
create or replace view public.mads_v_usuarios with (security_invoker = true) as
select
  p.id as user_id,
  p.email,
  p.full_name as nome,
  p.is_admin,
  coalesce(u.ativo, true) as ativo,
  u.ultimo_acesso_em,
  u.created_at as liberado_em,
  (select count(*) from public.mads_acessos a where a.user_id = p.id and a.created_at >= now() - interval '7 days') as acessos_7d,
  (select count(*) from public.mads_permissoes m where m.user_id = p.id and m.nivel <> 'none' and m.empresa_id = public.mads_iaplicada_id()) as recursos_liberados,
  (select coalesce(array_agg(e.nome order by e.interna desc, e.nome), '{}')
     from public.mads_empresa_membros em join public.mads_empresas e on e.id = em.empresa_id
    where em.user_id = p.id) as empresas
from public.profiles p
left join public.mads_usuarios u on u.user_id = p.id;

-- 4) empresa_id nas tabelas de Edição de vídeos / Edição de criativos ─────────
-- Trigger: preenche a empresa de registros novos. Ordem: empresa ativa de quem
-- está logado → pai (projeto/referência) → empresa ativa do criador → IAplicada.
create or replace function public.mads_set_empresa()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v uuid;
  j jsonb := to_jsonb(new);
  ref uuid;
  criador uuid;
begin
  if new.empresa_id is not null then return new; end if;

  v := public.mads_empresa_ativa_de(auth.uid());

  if v is null and tg_table_name = 'vedit_jobs' then
    if (j->>'projeto_id') is not null then
      select empresa_id into v from public.vedit_projetos where id = (j->>'projeto_id')::uuid;
    end if;
    if v is null and (j->'params'->>'referencia_id') is not null then
      begin ref := (j->'params'->>'referencia_id')::uuid; exception when others then ref := null; end;
      if ref is not null then
        select empresa_id into v from public.vedit_referencias where id = ref;
        if v is null then select empresa_id into v from public.cria_referencias where id = ref; end if;
      end if;
    end if;
  end if;

  if v is null and tg_table_name = 'api_usage_log' then
    begin
      if (j->'metadata'->>'empresa_id') is not null then v := (j->'metadata'->>'empresa_id')::uuid; end if;
      if v is null and (j->'metadata'->>'vedit_projeto_id') is not null then
        select empresa_id into v from public.vedit_projetos where id = (j->'metadata'->>'vedit_projeto_id')::uuid;
      end if;
      if v is null and (j->'metadata'->>'vedit_referencia_id') is not null then
        select empresa_id into v from public.vedit_referencias where id = (j->'metadata'->>'vedit_referencia_id')::uuid;
      end if;
    exception when others then v := null;
    end;
  end if;

  if v is null and (j->>'created_by') is not null then
    begin criador := (j->>'created_by')::uuid; exception when others then criador := null; end;
    if criador is not null then v := public.mads_empresa_ativa_de(criador); end if;
  end if;

  new.empresa_id := coalesce(v, public.mads_iaplicada_id());
  return new;
end;
$$;

do $$
declare
  t text;
  topo text[] := array['vedit_projetos','vedit_referencias','vedit_roteiros','vedit_marcas','vedit_jobs',
                       'cria_projetos','cria_referencias','cria_fotos','cria_modelos',
                       'publicacoes','ig_musicas_salvas'];
begin
  foreach t in array topo loop
    execute format('alter table public.%I add column if not exists empresa_id uuid references public.mads_empresas(id)', t);
    execute format('create index if not exists %I on public.%I(empresa_id)', t || '_empresa_idx', t);
    execute format('create or replace trigger trg_mads_set_empresa before insert on public.%I for each row execute function public.mads_set_empresa()', t);
  end loop;
end $$;

-- Backfill: tudo que existe hoje é da IAplicada (jobs herdam do projeto quando houver).
update public.vedit_projetos    set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.vedit_referencias set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.vedit_roteiros    set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.vedit_marcas      set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.cria_projetos     set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.cria_referencias  set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.cria_fotos        set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.cria_modelos      set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.publicacoes       set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.ig_musicas_salvas set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
update public.vedit_jobs j set empresa_id = coalesce(
    (select p.empresa_id from public.vedit_projetos p where p.id = j.projeto_id), public.mads_iaplicada_id())
  where empresa_id is null;

do $$
declare t text;
begin
  foreach t in array array['vedit_projetos','vedit_referencias','vedit_roteiros','vedit_marcas','vedit_jobs',
                           'cria_projetos','cria_referencias','cria_fotos','cria_modelos','publicacoes','ig_musicas_salvas'] loop
    execute format('alter table public.%I alter column empresa_id set not null', t);
  end loop;
end $$;

-- 5) RLS: só a empresa ativa ─────────────────────────────────────────────────────
-- (ALTER nas políticas existentes; o "(select …)" faz a função rodar uma vez por consulta.)
alter policy "auth crud vedit_projetos"    on public.vedit_projetos    using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_referencias" on public.vedit_referencias using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_roteiros"    on public.vedit_roteiros    using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_marcas"      on public.vedit_marcas      using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud vedit_jobs"        on public.vedit_jobs        using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud cria_projetos"     on public.cria_projetos     using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud cria_referencias"  on public.cria_referencias  using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "auth crud cria_fotos"        on public.cria_fotos        using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));
alter policy "publicacoes autenticados"    on public.publicacoes       using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()));

-- Modelos de criativo: a empresa lê os seus + os da IAplicada (estrutura compartilhada);
-- só altera os seus.
alter policy "autenticados usam modelos" on public.cria_modelos
  using (empresa_id = (select public.mads_empresa_ativa()) or (empresa_id = (select public.mads_iaplicada_id()) and (select public.mads_empresa_ativa()) is not null))
  with check (empresa_id = (select public.mads_empresa_ativa()));

-- Tabelas filhas: seguem o projeto (a RLS do projeto vale dentro do exists).
alter policy "auth crud vedit_mensagens" on public.vedit_mensagens using (exists (select 1 from public.vedit_projetos p where p.id = projeto_id)) with check (exists (select 1 from public.vedit_projetos p where p.id = projeto_id));
alter policy "auth crud vedit_versoes"   on public.vedit_versoes   using (exists (select 1 from public.vedit_projetos p where p.id = projeto_id)) with check (exists (select 1 from public.vedit_projetos p where p.id = projeto_id));
alter policy "auth crud vedit_midias"    on public.vedit_midias    using (exists (select 1 from public.vedit_projetos p where p.id = projeto_id)) with check (exists (select 1 from public.vedit_projetos p where p.id = projeto_id));
alter policy "auth crud vedit_renders"   on public.vedit_renders   using (exists (select 1 from public.vedit_projetos p where p.id = projeto_id)) with check (exists (select 1 from public.vedit_projetos p where p.id = projeto_id));
alter policy "auth crud cria_mensagens"  on public.cria_mensagens  using (exists (select 1 from public.cria_projetos p where p.id = projeto_id))  with check (exists (select 1 from public.cria_projetos p where p.id = projeto_id));
alter policy "auth crud cria_versoes"    on public.cria_versoes    using (exists (select 1 from public.cria_projetos p where p.id = projeto_id))  with check (exists (select 1 from public.cria_projetos p where p.id = projeto_id));

-- Músicas salvas do Instagram: política existente pode ter outro nome; trata dinamicamente.
do $$
declare pol text;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'ig_musicas_salvas' loop
    execute format('alter policy %I on public.ig_musicas_salvas using (empresa_id = (select public.mads_empresa_ativa())) with check (empresa_id = (select public.mads_empresa_ativa()))', pol);
  end loop;
end $$;

-- 6) Storage (bucket video-edicao): usuários das empresas também usam o bucket.
alter policy "vedit auth read"   on storage.objects using ((bucket_id = 'video-edicao') and (public.is_team_member(auth.uid()) or public.mads_tem_acesso(auth.uid())));
alter policy "vedit auth write"  on storage.objects with check ((bucket_id = 'video-edicao') and (public.is_team_member(auth.uid()) or public.mads_tem_acesso(auth.uid())));
alter policy "vedit auth update" on storage.objects using ((bucket_id = 'video-edicao') and (public.is_team_member(auth.uid()) or public.mads_tem_acesso(auth.uid()))) with check ((bucket_id = 'video-edicao') and (public.is_team_member(auth.uid()) or public.mads_tem_acesso(auth.uid())));
alter policy "vedit auth delete" on storage.objects using ((bucket_id = 'video-edicao') and (public.is_team_member(auth.uid()) or public.mads_tem_acesso(auth.uid())));

-- 7) Gasto de API por empresa ────────────────────────────────────────────────────
alter table public.api_usage_log add column if not exists empresa_id uuid references public.mads_empresas(id);
create index if not exists api_usage_log_empresa_idx on public.api_usage_log(empresa_id, data);
update public.api_usage_log set empresa_id = public.mads_iaplicada_id() where empresa_id is null;
create or replace trigger trg_mads_set_empresa before insert on public.api_usage_log
  for each row execute function public.mads_set_empresa();

-- Fechamento por semana (segunda a domingo) da empresa ativa, ou de uma empresa
-- específica / todas (só admin IAplicada). Ignora as linhas "anthropic-admin"
-- (fatura agregada da Anthropic, que duplicaria o consumo por chamada).
create or replace function public.mads_f_gastos_api(p_since date, p_until date, p_empresa uuid default null, p_todas boolean default false)
returns table (semana date, empresa_id uuid, empresa_nome text, origem text, provider text, model text,
               chamadas bigint, input_tokens bigint, output_tokens bigint, custo_usd numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  emp uuid := coalesce(p_empresa, public.mads_empresa_ativa());
begin
  if p_todas then
    if not public.is_admin(auth.uid()) then raise exception 'Apenas administradores' using errcode = '42501'; end if;
  else
    if emp is null or public.mads_nivel_empresa(auth.uid(), emp, 'gastos') = 'none' then
      raise exception 'Sem acesso ao gasto de API desta empresa' using errcode = '42501';
    end if;
  end if;

  return query
  select date_trunc('week', l.data::timestamp)::date as semana,
         l.empresa_id, e.nome, l.origem, l.provider, l.model,
         count(*)::bigint,
         coalesce(sum(l.input_tokens), 0)::bigint,
         coalesce(sum(l.output_tokens), 0)::bigint,
         round(coalesce(sum(l.custo_usd), 0)::numeric, 4)
    from public.api_usage_log l
    join public.mads_empresas e on e.id = l.empresa_id
   where l.data between p_since and p_until
     and l.provider <> 'anthropic-admin'
     and (p_todas or l.empresa_id = emp)
   group by 1, 2, 3, 4, 5, 6;
end;
$$;
grant execute on function public.mads_f_gastos_api(date, date, uuid, boolean) to authenticated;
