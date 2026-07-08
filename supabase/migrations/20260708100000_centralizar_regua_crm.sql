-- Centraliza a régua de atribuição CRM->ad (MQL/SAL/ganho/pipe) numa ÚNICA função
-- mads_f_crm_por_ad(since, until). As 2 funções (ads_crm / criativos) e as 2 views
-- (ads_crm_30d / criativos_metricas) passam a chamar essa função, eliminando a lógica
-- duplicada em 4 lugares. Verificado: nenhum número muda (mql/sal/ganho/leads idênticos).
--
-- Régua única: MQL = qualification_status='mql'; SAL = sal_qualified_at IS NOT NULL AND
-- sal_outcome='aceito'; Ganho = is_won; atribuição por dupla-chave (adset via utm_term + ad
-- via form_submissions.raw_data->utm_content). Trocar a régua no futuro = editar só aqui.

-- 1) Função central (fonte única da verdade)
CREATE OR REPLACE FUNCTION mads_f_crm_por_ad(p_since date, p_until date)
RETURNS TABLE (
  ad_uuid uuid, leads_crm bigint, mql bigint, sql_qualif bigint, sal bigint, ganho bigint,
  pipe_ativo bigint, valor_ganho_brl numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id,
    COALESCE(crm.leads_crm, 0), COALESCE(crm.mql, 0), COALESCE(crm.sql_qualif, 0),
    COALESCE(crm.sal, 0), COALESCE(crm.ganho, 0), COALESCE(crm.pipe_ativo, 0),
    COALESCE(crm.valor_ganho_brl, 0::numeric)
  FROM mads_ads a
    LEFT JOIN LATERAL (
      SELECT
        count(DISTINCT cts.id) AS leads_crm,
        count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'mql') AS mql,
        count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'sql') AS sql_qualif,
        count(DISTINCT cts.id) FILTER (WHERE d.sal_qualified_at IS NOT NULL AND d.sal_outcome = 'aceito') AS sal,
        count(DISTINCT cts.id) FILTER (WHERE d.is_won IS TRUE) AS ganho,
        count(DISTINCT cts.id) FILTER (WHERE d.qualification_status IN ('mql','sql') AND d.is_won IS NOT TRUE AND d.closed_at IS NULL) AS pipe_ativo,
        COALESCE(sum(d.amount) FILTER (WHERE d.is_won IS TRUE), 0::numeric) AS valor_ganho_brl
      FROM (
        SELECT DISTINCT ct.id
        FROM contacts ct
          JOIN form_submissions fs ON fs.contact_id = ct.id
          JOIN mads_ad_sets ads_ct ON ads_ct.meta_adset_id = ct.utm_term
        WHERE ct.created_at::date >= p_since AND ct.created_at::date <= p_until
          AND (ct.utm_source ILIKE '%meta%' OR ct.utm_source IN ('fb', 'ig'))
          AND ads_ct.id = a.ad_set_id
          AND (fs.raw_data ->> 'utm_content' = a.meta_ad_id OR fs.raw_data ->> 'utm_content' = a.utm_content_slug)
      ) cts
      LEFT JOIN deals d ON d.contact_id = cts.id
    ) crm ON true;
$$;
REVOKE ALL ON FUNCTION mads_f_crm_por_ad(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_crm_por_ad(date, date) TO authenticated;

-- 2) mads_f_ads_crm passa a chamar a central (mantém métricas Meta por janela)
CREATE OR REPLACE FUNCTION mads_f_ads_crm(p_since date, p_until date)
RETURNS TABLE (
  ad_uuid uuid, ad_nome text, status text, meta_ad_id text, ad_set_id uuid, adset_nome text,
  campanha_nome text, produto text,
  gasto numeric, leads_meta numeric,
  impressoes numeric, cliques_link numeric, lp_views numeric, ctr_pct numeric, cpc_brl numeric, cpl_brl numeric,
  leads_crm bigint, mql bigint, sal bigint, ganho bigint,
  cpmql_brl numeric, cpsal_brl numeric, taxa_qualif_pct numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ins AS (
    SELECT i.ad_id,
      COALESCE(sum(i.gasto_brl), 0) AS gasto, COALESCE(sum(i.leads), 0) AS leads_meta,
      COALESCE(sum(i.impressoes), 0) AS impressoes, COALESCE(sum(i.cliques_link), 0) AS cliques_link,
      COALESCE(sum(i.lp_views), 0) AS lp_views
    FROM mads_insights_daily i
    WHERE i.dia >= p_since AND i.dia <= p_until
    GROUP BY i.ad_id
  )
  SELECT a.id, a.nome, a.status, a.meta_ad_id, a.ad_set_id, ads.nome, c.nome, c.tipo_lead,
    COALESCE(ins.gasto, 0), COALESCE(ins.leads_meta, 0),
    COALESCE(ins.impressoes, 0), COALESCE(ins.cliques_link, 0), COALESCE(ins.lp_views, 0),
    CASE WHEN COALESCE(ins.impressoes, 0) > 0 THEN round(ins.cliques_link / ins.impressoes * 100, 2) END,
    CASE WHEN COALESCE(ins.cliques_link, 0) > 0 THEN round(ins.gasto / ins.cliques_link, 2) END,
    CASE WHEN COALESCE(ins.leads_meta, 0) > 0 THEN round(ins.gasto / ins.leads_meta, 2) END,
    crm.leads_crm, crm.mql, crm.sal, crm.ganho,
    CASE WHEN crm.mql > 0 THEN round(COALESCE(ins.gasto, 0) / crm.mql, 2) END,
    CASE WHEN crm.sal > 0 THEN round(COALESCE(ins.gasto, 0) / crm.sal, 2) END,
    CASE WHEN crm.leads_crm > 0 THEN round(crm.mql::numeric / crm.leads_crm * 100, 1) END
  FROM mads_ads a
    JOIN mads_ad_sets ads ON ads.id = a.ad_set_id
    JOIN mads_campaigns c ON c.id = ads.campanha_id
    LEFT JOIN ins ON ins.ad_id = a.id
    JOIN mads_f_crm_por_ad(p_since, p_until) crm ON crm.ad_uuid = a.id;
$$;
REVOKE ALL ON FUNCTION mads_f_ads_crm(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_ads_crm(date, date) TO authenticated;

-- 3) mads_v_ads_crm_30d passa a chamar a central
CREATE OR REPLACE VIEW mads_v_ads_crm_30d AS
 WITH base AS (
         SELECT a.id AS ad_uuid,
            COALESCE(sum(i.gasto_brl) FILTER (WHERE i.dia > (CURRENT_DATE - 30)), 0::numeric) AS gasto_30d
           FROM mads_ads a LEFT JOIN mads_insights_daily i ON i.ad_id = a.id
          GROUP BY a.id
        )
 SELECT base.ad_uuid, base.gasto_30d, crm.leads_crm, crm.mql, crm.sal, crm.ganho,
        CASE WHEN crm.leads_crm > 0 THEN round(crm.mql::numeric / crm.leads_crm::numeric * 100::numeric, 1) ELSE NULL::numeric END AS taxa_qualif_pct,
        CASE WHEN crm.mql > 0 THEN round(base.gasto_30d / crm.mql::numeric, 2) ELSE NULL::numeric END AS cpmql_brl,
        CASE WHEN crm.mql = 0 THEN 'sem_dado'::text WHEN base.gasto_30d / crm.mql::numeric <= 100::numeric THEN 'verde'::text WHEN base.gasto_30d / crm.mql::numeric <= 200::numeric THEN 'amarelo'::text ELSE 'vermelho'::text END AS cpmql_semaforo,
        CASE WHEN crm.leads_crm = 0 THEN 'sem_dado'::text WHEN crm.mql::numeric / crm.leads_crm::numeric * 100::numeric >= 50::numeric THEN 'verde'::text WHEN crm.mql::numeric / crm.leads_crm::numeric * 100::numeric >= 20::numeric THEN 'amarelo'::text ELSE 'vermelho'::text END AS taxa_qualif_semaforo
   FROM base JOIN mads_f_crm_por_ad((CURRENT_DATE - 30), CURRENT_DATE) crm ON crm.ad_uuid = base.ad_uuid;

-- 4) e 5): mads_v_criativos_metricas e mads_f_criativos_metricas também passam a chamar a central.
-- (Corpo completo aplicado no banco; idêntico ao anterior trocando o LATERAL de CRM por
--  JOIN mads_f_crm_por_ad(...). Ver migrations view_criativos_usa_central / fn_criativos_usa_central.)
