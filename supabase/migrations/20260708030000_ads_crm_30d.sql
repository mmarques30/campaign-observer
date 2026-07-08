-- View de CRM por ad (TODOS os ads, todas as campanhas) para a tela /anuncios.
-- Atribuição por dupla-chave (mesma lógica de mads_v_criativos_metricas):
--   * adset: contacts.utm_term = mads_ad_sets.meta_adset_id
--   * ad:    form_submissions.raw_data->>'utm_content' = mads_ads.meta_ad_id (ou utm_content_slug)
-- Precisa por ad — NÃO ratea leads do adset entre ads (evita atribuir o mesmo lead a vários ads).
-- Ads sem utm_content atribuído aparecem como 0 / 'sem_dado' (sem número inventado).
--
-- SAL/Ganho por stage (definição desta tela): SAL = stages.name IN ('SAL','SAL_accepted','Proposta');
-- Ganho = stages.name = 'Ganho'. MQL = deals.qualification_status = 'mql'.
-- Janela: últimos 30 dias (casa com o gasto exibido em /anuncios).

CREATE OR REPLACE VIEW mads_v_ads_crm_30d AS
 WITH base AS (
         SELECT a.id AS ad_uuid,
            a.meta_ad_id,
            a.ad_set_id,
            a.utm_content_slug,
            COALESCE(sum(i.gasto_brl) FILTER (WHERE i.dia > (CURRENT_DATE - 30)), 0::numeric) AS gasto_30d
           FROM mads_ads a
             LEFT JOIN mads_insights_daily i ON i.ad_id = a.id
          GROUP BY a.id, a.meta_ad_id, a.ad_set_id, a.utm_content_slug
        )
 SELECT base.ad_uuid,
    base.gasto_30d,
    COALESCE(crm.leads_crm, 0::bigint) AS leads_crm,
    COALESCE(crm.mql, 0::bigint) AS mql,
    COALESCE(crm.sal, 0::bigint) AS sal,
    COALESCE(crm.ganho, 0::bigint) AS ganho,
        CASE
            WHEN COALESCE(crm.leads_crm, 0::bigint) > 0 THEN round(COALESCE(crm.mql, 0::bigint)::numeric / crm.leads_crm::numeric * 100::numeric, 1)
            ELSE NULL::numeric
        END AS taxa_qualif_pct,
        CASE
            WHEN COALESCE(crm.mql, 0::bigint) > 0 THEN round(base.gasto_30d / crm.mql::numeric, 2)
            ELSE NULL::numeric
        END AS cpmql_brl,
        CASE
            WHEN COALESCE(crm.mql, 0::bigint) = 0 THEN 'sem_dado'::text
            WHEN base.gasto_30d / crm.mql::numeric <= 100::numeric THEN 'verde'::text
            WHEN base.gasto_30d / crm.mql::numeric <= 200::numeric THEN 'amarelo'::text
            ELSE 'vermelho'::text
        END AS cpmql_semaforo,
        CASE
            WHEN COALESCE(crm.leads_crm, 0::bigint) = 0 THEN 'sem_dado'::text
            WHEN crm.mql::numeric / crm.leads_crm::numeric * 100::numeric >= 50::numeric THEN 'verde'::text
            WHEN crm.mql::numeric / crm.leads_crm::numeric * 100::numeric >= 20::numeric THEN 'amarelo'::text
            ELSE 'vermelho'::text
        END AS taxa_qualif_semaforo
   FROM base
     LEFT JOIN LATERAL (
         SELECT
            count(DISTINCT cts.id) AS leads_crm,
            count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'mql'::text) AS mql,
            count(DISTINCT cts.id) FILTER (WHERE s.name = ANY (ARRAY['SAL'::text, 'SAL_accepted'::text, 'Proposta'::text])) AS sal,
            count(DISTINCT cts.id) FILTER (WHERE s.name = 'Ganho'::text) AS ganho
           FROM (
                 SELECT DISTINCT ct.id
                   FROM contacts ct
                     JOIN form_submissions fs ON fs.contact_id = ct.id
                     JOIN mads_ad_sets ads_ct ON ads_ct.meta_adset_id = ct.utm_term
                  WHERE ct.created_at >= (CURRENT_DATE - 30)
                    AND (ct.utm_source ILIKE '%meta%'::text OR ct.utm_source = ANY (ARRAY['fb'::text, 'ig'::text]))
                    AND ads_ct.id = base.ad_set_id
                    AND (fs.raw_data ->> 'utm_content'::text = base.meta_ad_id OR fs.raw_data ->> 'utm_content'::text = base.utm_content_slug)
                ) cts
             LEFT JOIN deals d ON d.contact_id = cts.id
             LEFT JOIN stages s ON s.id = d.stage_id
     ) crm ON true;
