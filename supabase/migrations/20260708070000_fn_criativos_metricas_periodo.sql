-- Versão parametrizável por janela de mads_v_criativos_metricas, para o /criativos responder
-- ao filtro de período (igual às outras telas), em vez de 30d fixo.
-- Retorna o MESMO formato da view (SETOF), só troca os filtros de data por p_since/p_until:
--   * métricas de vídeo/gasto: mads_insights_daily.dia BETWEEN p_since AND p_until
--   * CRM (dupla-chave): contacts.created_at BETWEEN p_since AND p_until
-- SECURITY DEFINER; EXECUTE só para authenticated.
CREATE OR REPLACE FUNCTION mads_f_criativos_metricas(p_since date, p_until date)
RETURNS SETOF mads_v_criativos_metricas
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
 WITH agg AS (
         SELECT a.id AS ad_uuid, a.meta_ad_id, a.ad_set_id, a.utm_content_slug,
            a.nome AS ad_nome, a.status AS ad_status, ads.nome AS adset_nome,
            c.nome AS campanha_nome, c.meta_campaign_id,
            sum(i.impressoes) AS impressoes, sum(i.alcance) AS alcance, sum(i.gasto_brl) AS gasto,
            sum(i.cliques_link) AS cliques_link, sum(i.lp_views) AS lp_views, sum(i.leads) AS leads,
            sum(i.video_plays) AS video_plays, sum(i.video_3s_views) AS video_3s,
            sum(i.video_p25_watched) AS video_p25, sum(i.video_p50_watched) AS video_p50,
            sum(i.video_p75_watched) AS video_p75, sum(i.video_p95_watched) AS video_p95,
            sum(i.video_p100_watched) AS video_p100,
            avg(i.video_avg_time_watched_sec) FILTER (WHERE i.video_avg_time_watched_sec > 0::numeric) AS avg_time_sec,
            min(i.dia) AS desde, max(i.dia) AS ate
           FROM mads_ads a
             JOIN mads_ad_sets ads ON ads.id = a.ad_set_id
             JOIN mads_campaigns c ON c.id = ads.campanha_id
             LEFT JOIN mads_insights_daily i ON i.ad_id = a.id AND i.dia >= p_since AND i.dia <= p_until
          WHERE c.nome ~~* '%business%'::text OR c.nome ~~* '%contabil%'::text OR c.nome ~~* '%contábil%'::text
          GROUP BY a.id, a.meta_ad_id, a.ad_set_id, a.utm_content_slug, a.nome, a.status, ads.nome, c.nome, c.meta_campaign_id
        ), calc AS (
         SELECT agg.ad_uuid, agg.meta_ad_id, agg.ad_nome, agg.ad_status, agg.adset_nome, agg.campanha_nome,
            agg.meta_campaign_id, agg.impressoes, agg.alcance, agg.gasto, agg.cliques_link, agg.lp_views, agg.leads,
            agg.video_plays, agg.video_3s, agg.video_p25, agg.video_p50, agg.video_p75, agg.video_p95, agg.video_p100,
            agg.avg_time_sec, agg.desde, agg.ate,
            COALESCE(crm.mql, 0::bigint) AS mql_no_crm, COALESCE(crm.sal, 0::bigint) AS sal_no_crm,
            COALESCE(crm.ganho, 0::bigint) AS ganhos_no_crm, COALESCE(crm.pipe_ativo, 0::bigint) AS pipe_ativo,
            COALESCE(crm.valor_ganho_brl, 0::numeric) AS valor_ganho_brl, COALESCE(crm.leads_crm, 0::bigint) AS leads_crm,
            COALESCE(crm.sql_qualif, 0::bigint) AS sql_no_crm,
                CASE WHEN agg.impressoes > 0::numeric AND agg.video_plays > 0 THEN round(agg.video_plays::numeric / agg.impressoes * 100::numeric, 1) ELSE NULL::numeric END AS hook_rate_pct,
                CASE WHEN agg.video_plays > 0 AND agg.video_3s > 0 THEN round(agg.video_3s::numeric / agg.video_plays::numeric * 100::numeric, 1) ELSE NULL::numeric END AS body_rate_pct,
                CASE WHEN agg.video_3s > 0 AND agg.video_p75 > 0 THEN round(agg.video_p75::numeric / agg.video_3s::numeric * 100::numeric, 1) ELSE NULL::numeric END AS retencao_75_pct,
                CASE WHEN agg.video_p75 > 0 AND agg.cliques_link > 0::numeric THEN round(agg.cliques_link / agg.video_p75::numeric * 100::numeric, 1) ELSE NULL::numeric END AS ctr_real_pct,
                CASE WHEN agg.video_p75 > 0 AND agg.leads > 0 THEN round(agg.leads::numeric / agg.video_p75::numeric * 100::numeric, 1) ELSE NULL::numeric END AS cvr_pct,
                CASE WHEN agg.leads > 0 THEN round(agg.gasto / agg.leads::numeric, 2) ELSE NULL::numeric END AS cpl_brl,
                CASE WHEN COALESCE(crm.leads_crm, 0::bigint) > 0 THEN round(COALESCE(crm.mql, 0::bigint)::numeric / crm.leads_crm::numeric * 100::numeric, 1) ELSE NULL::numeric END AS taxa_qualificacao_pct,
                CASE WHEN COALESCE(crm.mql, 0::bigint) > 0 THEN round(agg.gasto / crm.mql::numeric, 2) ELSE NULL::numeric END AS cpmql_brl,
                CASE WHEN COALESCE(crm.sal, 0::bigint) > 0 THEN round(agg.gasto / crm.sal::numeric, 2) ELSE NULL::numeric END AS cpsal_brl
           FROM agg
             LEFT JOIN LATERAL ( SELECT count(DISTINCT cts.id) AS leads_crm,
                    count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'mql'::text) AS mql,
                    count(DISTINCT cts.id) FILTER (WHERE d.qualification_status = 'sql'::text) AS sql_qualif,
                    count(DISTINCT cts.id) FILTER (WHERE d.sal_qualified_at IS NOT NULL AND d.sal_outcome = 'aceito'::text) AS sal,
                    count(DISTINCT cts.id) FILTER (WHERE d.is_won IS TRUE) AS ganho,
                    count(DISTINCT cts.id) FILTER (WHERE (d.qualification_status = ANY (ARRAY['mql'::text, 'sql'::text])) AND d.is_won IS NOT TRUE AND d.closed_at IS NULL) AS pipe_ativo,
                    COALESCE(sum(d.amount) FILTER (WHERE d.is_won IS TRUE), 0::numeric) AS valor_ganho_brl
                   FROM ( SELECT DISTINCT ct.id
                           FROM contacts ct
                             JOIN form_submissions fs ON fs.contact_id = ct.id
                             JOIN mads_ad_sets ads_ct ON ads_ct.meta_adset_id = ct.utm_term
                          WHERE ct.created_at::date >= p_since AND ct.created_at::date <= p_until
                            AND (ct.utm_source ~~* '%meta%'::text OR (ct.utm_source = ANY (ARRAY['fb'::text, 'ig'::text])))
                            AND ads_ct.id = agg.ad_set_id
                            AND ((fs.raw_data ->> 'utm_content'::text) = agg.meta_ad_id OR (fs.raw_data ->> 'utm_content'::text) = agg.utm_content_slug)) cts
                     LEFT JOIN deals d ON d.contact_id = cts.id) crm ON true
        )
 SELECT ad_uuid, meta_ad_id, ad_nome, ad_status, adset_nome, campanha_nome, meta_campaign_id,
    impressoes, alcance, gasto, cliques_link, lp_views, leads, video_plays, video_3s, video_p25, video_p50,
    video_p75, video_p95, video_p100, avg_time_sec, desde, ate, hook_rate_pct, body_rate_pct, retencao_75_pct,
    ctr_real_pct, cvr_pct, cpl_brl,
        CASE WHEN hook_rate_pct >= 85::numeric THEN 'verde'::text WHEN hook_rate_pct >= 60::numeric THEN 'amarelo'::text WHEN hook_rate_pct >= 30::numeric THEN 'vermelho'::text WHEN hook_rate_pct IS NOT NULL THEN 'kill'::text ELSE 'sem_dado'::text END AS hook_semaforo,
        CASE WHEN body_rate_pct >= 50::numeric THEN 'verde'::text WHEN body_rate_pct >= 35::numeric THEN 'amarelo'::text WHEN body_rate_pct >= 25::numeric THEN 'vermelho'::text WHEN body_rate_pct IS NOT NULL THEN 'kill'::text ELSE 'sem_dado'::text END AS body_semaforo,
        CASE WHEN retencao_75_pct >= 25::numeric THEN 'verde'::text WHEN retencao_75_pct >= 15::numeric THEN 'amarelo'::text WHEN retencao_75_pct >= 10::numeric THEN 'vermelho'::text WHEN retencao_75_pct IS NOT NULL THEN 'kill'::text ELSE 'sem_dado'::text END AS retencao_semaforo,
        CASE WHEN ctr_real_pct >= 8::numeric AND ctr_real_pct <= 30::numeric THEN 'verde'::text WHEN ctr_real_pct > 30::numeric AND ctr_real_pct <= 60::numeric THEN 'amarelo'::text WHEN ctr_real_pct > 60::numeric THEN 'vermelho_desqualificado'::text WHEN ctr_real_pct >= 5::numeric AND ctr_real_pct < 8::numeric THEN 'amarelo'::text WHEN ctr_real_pct IS NOT NULL THEN 'kill'::text ELSE 'sem_dado'::text END AS ctr_semaforo,
        CASE WHEN cvr_pct >= 8::numeric THEN 'verde'::text WHEN cvr_pct >= 4::numeric THEN 'amarelo'::text WHEN cvr_pct >= 2::numeric THEN 'vermelho'::text WHEN cvr_pct IS NOT NULL THEN 'kill'::text ELSE 'sem_dado'::text END AS cvr_semaforo,
        CASE WHEN video_plays = 0 OR video_plays IS NULL THEN 'Sem vídeo (creative de imagem ou dados vazios)'::text
            WHEN hook_rate_pct < 30::numeric THEN 'HOOK ruim (thumb/1º frame não prende) — trocar arte inicial'::text
            WHEN retencao_75_pct < 10::numeric THEN 'RETENÇÃO ruim (meio do vídeo fraco) — cortar/reeditar meio'::text
            WHEN ctr_real_pct > 60::numeric THEN 'CTR DESQUALIFICADO (clique cedo, sem assistir) — mudar CTA ou audiência'::text
            WHEN body_rate_pct < 25::numeric THEN 'BODY ruim (primeiros 3s não prendem) — reescrever abertura'::text
            WHEN cvr_pct IS NOT NULL AND cvr_pct < 2::numeric THEN 'CVR ruim (LP ou audiência erradas)'::text
            WHEN cvr_pct >= 8::numeric AND ctr_real_pct >= 8::numeric AND ctr_real_pct <= 30::numeric THEN 'ESCALAR — funil saudável e converte'::text
            ELSE 'OK'::text END AS diagnostico,
    mql_no_crm, taxa_qualificacao_pct, cpmql_brl,
        CASE WHEN COALESCE(mql_no_crm, 0::bigint) = 0 THEN 'sem_dado'::text WHEN cpmql_brl <= 100::numeric THEN 'verde'::text WHEN cpmql_brl <= 200::numeric THEN 'amarelo'::text ELSE 'vermelho'::text END AS cpmql_semaforo,
    sal_no_crm, cpsal_brl,
        CASE WHEN COALESCE(sal_no_crm, 0::bigint) = 0 THEN 'sem_dado'::text WHEN cpsal_brl <= 300::numeric THEN 'verde'::text WHEN cpsal_brl <= 600::numeric THEN 'amarelo'::text ELSE 'vermelho'::text END AS cpsal_semaforo,
    ganhos_no_crm, pipe_ativo, valor_ganho_brl, leads_crm, sql_no_crm
   FROM calc
  ORDER BY cpmql_brl, gasto DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION mads_f_criativos_metricas(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_criativos_metricas(date, date) TO authenticated;
