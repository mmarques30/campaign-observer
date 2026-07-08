-- Atribuição CRM->ad parametrizável por janela [p_since, p_until], para o /insights dinâmico.
-- Dupla-chave (adset: contacts.utm_term=meta_adset_id; ad: form_submissions.raw_data->utm_content).
-- SAL = régua unificada: sal_qualified_at IS NOT NULL AND sal_outcome='aceito'. MQL = qualification_status='mql'.
CREATE OR REPLACE FUNCTION mads_f_ads_crm(p_since date, p_until date)
RETURNS TABLE (
  ad_uuid uuid, ad_nome text, status text, meta_ad_id text, ad_set_id uuid, adset_nome text,
  campanha_nome text, produto text,
  gasto numeric, leads_meta numeric, leads_crm bigint, mql bigint, sal bigint, ganho bigint,
  cpmql_brl numeric, cpsal_brl numeric, taxa_qualif_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    SELECT i.ad_id, COALESCE(sum(i.gasto_brl), 0) AS gasto, COALESCE(sum(i.leads), 0) AS leads_meta
    FROM mads_insights_daily i
    WHERE i.dia >= p_since AND i.dia <= p_until
    GROUP BY i.ad_id
  )
  SELECT a.id, a.nome, a.status, a.meta_ad_id, a.ad_set_id, ads.nome, c.nome, c.tipo_lead,
    COALESCE(ins.gasto, 0), COALESCE(ins.leads_meta, 0),
    COALESCE(crm.leads_crm, 0), COALESCE(crm.mql, 0), COALESCE(crm.sal, 0), COALESCE(crm.ganho, 0),
    CASE WHEN COALESCE(crm.mql, 0) > 0 THEN round(COALESCE(ins.gasto, 0) / crm.mql, 2) END,
    CASE WHEN COALESCE(crm.sal, 0) > 0 THEN round(COALESCE(ins.gasto, 0) / crm.sal, 2) END,
    CASE WHEN COALESCE(crm.leads_crm, 0) > 0 THEN round(COALESCE(crm.mql, 0)::numeric / crm.leads_crm * 100, 1) END
  FROM mads_ads a
    JOIN mads_ad_sets ads ON ads.id = a.ad_set_id
    JOIN mads_campaigns c ON c.id = ads.campanha_id
    LEFT JOIN ins ON ins.ad_id = a.id
    LEFT JOIN LATERAL (
      SELECT
        count(DISTINCT cts.id) AS leads_crm,
        count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'mql') AS mql,
        count(DISTINCT cts.id) FILTER (WHERE d.sal_qualified_at IS NOT NULL AND d.sal_outcome = 'aceito') AS sal,
        count(DISTINCT cts.id) FILTER (WHERE d.is_won IS TRUE) AS ganho
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

REVOKE ALL ON FUNCTION mads_f_ads_crm(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_ads_crm(date, date) TO authenticated;
