-- Unifica a régua de SAL do /anuncios com a do /criativos e da função mads_f_ads_crm:
-- SAL = sal_qualified_at IS NOT NULL AND sal_outcome='aceito' (qualificação humana pós-call),
-- em vez de stages.name IN ('SAL','SAL_accepted','Proposta') (que pegava falso positivo de
-- movimentação manual de estágio). Ganho passa a usar is_won (equivale ao stage 'Ganho').
-- Remove o join em stages. Demais colunas/lógica inalteradas.
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
            count(DISTINCT cts.id) FILTER (WHERE d.sal_qualified_at IS NOT NULL AND d.sal_outcome = 'aceito'::text) AS sal,
            count(DISTINCT cts.id) FILTER (WHERE d.is_won IS TRUE) AS ganho
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
     ) crm ON true;
