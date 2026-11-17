-- Ads: as regras de acesso (RLS) chamavam auth.uid()/is_admin()/is_team_member() para CADA
-- linha lida. Embrulhar em (select ...) faz o Postgres calcular uma vez por consulta.
-- Mesma lógica de acesso, só mais rápido. Recomendação oficial do Supabase (auth_rls_initplan).
do $$
declare
  r record;
  q text;
  c text;
  emb constant text := '(SELECT auth.uid())';
  fn text;
begin
  for r in
    select c.relname as tabela, p.polname,
           pg_get_expr(p.polqual, p.polrelid) as usando,
           pg_get_expr(p.polwithcheck, p.polrelid) as checa
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('mads_campaigns','mads_ad_sets','mads_ads','mads_insights_daily','mads_creatives',
        'mads_usuarios','mads_empresas','mads_empresa_membros','mads_permissoes','mads_acessos','mads_lps',
        'mads_lp_metrics_daily','mads_lp_health_log','mads_audiences','mads_execution_log',
        'mads_lp_credentials','api_usage_log')
  loop
    q := r.usando;
    c := r.checa;
    foreach fn in array array['usando', 'checa'] loop
      declare e text := case fn when 'usando' then q else c end;
      begin
        if e is null or e like '%(SELECT auth.%' then continue; end if;
        -- funções só do usuário: viram uma subconsulta inteira (calculada uma vez)
        e := regexp_replace(e, '\m(is_admin|is_team_member)\(auth\.uid\(\)\)', '(SELECT \1(auth.uid()))', 'g');
        e := replace(e, 'auth.uid()', emb);
        e := replace(e, 'auth.role()', '(SELECT auth.role())');
        if fn = 'usando' then q := e; else c := e; end if;
      end;
    end loop;
    if q is distinct from r.usando or c is distinct from r.checa then
      execute format('alter policy %I on public.%I %s %s', r.polname, r.tabela,
        case when q is not null then format('using (%s)', q) else '' end,
        case when c is not null then format('with check (%s)', c) else '' end);
    end if;
  end loop;
end $$;
