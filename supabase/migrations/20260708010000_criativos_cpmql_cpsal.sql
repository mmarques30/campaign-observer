-- Adiciona à view mads_v_criativos_metricas o cruzamento com o CRM por ad (utm_term = meta_ad_id):
-- MQL, SAL, ganhos, pipe ativo + métricas de custo CPMQL (custo por MQL) e CP SAL (custo por SAL).
-- CPL é MANTIDO (rebaixado no front, útil pra debug). Ordenação/decisão passa a priorizar CPMQL.
--
-- Atribuição: contacts.utm_term guarda o meta_ad_id do ad. Hoje há descasamento entre os ad-IDs
-- do CRM e os sincronizados em mads_ads, então a maioria dos ads sai como 'sem_dado' até o
-- ad-sync do Meta ser reconciliado. A estrutura já fica pronta e "acende" quando os IDs baterem.
--
-- MQL = qualification_status = 'mql' (estrito, decisão do produto).
-- SAL = deal com sal_qualified_at preenchido OU sal_outcome = 'aceito'.

CREATE OR REPLACE VIEW mads_v_criativos_metricas AS
 WITH agg AS (
         SELECT a.id AS ad_uuid,
            a.meta_ad_id,
            a.nome AS ad_nome,
            a.status AS ad_status,
            ads.nome AS adset_nome,
            c.nome AS campanha_nome,
            c.meta_campaign_id,
            sum(i.impressoes) AS impressoes,
            sum(i.alcance) AS alcance,
            sum(i.gasto_brl) AS gasto,
            sum(i.cliques_link) AS cliques_link,
            sum(i.lp_views) AS lp_views,
            sum(i.leads) AS leads,
            sum(i.video_plays) AS video_plays,
            sum(i.video_3s_views) AS video_3s,
            sum(i.video_p25_watched) AS video_p25,
            sum(i.video_p50_watched) AS video_p50,
            sum(i.video_p75_watched) AS video_p75,
            sum(i.video_p95_watched) AS video_p95,
            sum(i.video_p100_watched) AS video_p100,
            avg(i.video_avg_time_watched_sec) FILTER (WHERE i.video_avg_time_watched_sec > 0::numeric) AS avg_time_sec,
            min(i.dia) AS desde,
            max(i.dia) AS ate
           FROM mads_ads a
             JOIN mads_ad_sets ads ON ads.id = a.ad_set_id
             JOIN mads_campaigns c ON c.id = ads.campanha_id
             LEFT JOIN mads_insights_daily i ON i.ad_id = a.id AND i.dia > (CURRENT_DATE - 30)
          WHERE c.nome ~~* '%business%'::text OR c.nome ~~* '%contabil%'::text OR c.nome ~~* '%contábil%'::text
          GROUP BY a.id, a.meta_ad_id, a.nome, a.status, ads.nome, c.nome, c.meta_campaign_id
        ), crm AS (
         SELECT btrim(ct.utm_term) AS meta_ad_id,
            count(*) FILTER (WHERE d.qualification_status = 'mql'::text) AS mql_no_crm,
            count(*) FILTER (WHERE d.sal_qualified_at IS NOT NULL OR d.sal_outcome = 'aceito'::text) AS sal_no_crm,
            count(*) FILTER (WHERE d.is_won IS TRUE) AS ganhos_no_crm,
            count(*) FILTER (WHERE d.is_won IS NOT TRUE AND d.closed_at IS NULL) AS pipe_ativo,
            COALESCE(sum(d.amount) FILTER (WHERE d.is_won IS TRUE), 0::numeric) AS valor_ganho_brl
           FROM contacts ct
             JOIN deals d ON d.contact_id = ct.id
          WHERE btrim(ct.utm_term) ~ '^[0-9]+$'::text
          GROUP BY btrim(ct.utm_term)
        ), calc AS (
         SELECT agg.ad_uuid,
            agg.meta_ad_id,
            agg.ad_nome,
            agg.ad_status,
            agg.adset_nome,
            agg.campanha_nome,
            agg.meta_campaign_id,
            agg.impressoes,
            agg.alcance,
            agg.gasto,
            agg.cliques_link,
            agg.lp_views,
            agg.leads,
            agg.video_plays,
            agg.video_3s,
            agg.video_p25,
            agg.video_p50,
            agg.video_p75,
            agg.video_p95,
            agg.video_p100,
            agg.avg_time_sec,
            agg.desde,
            agg.ate,
            COALESCE(crm.mql_no_crm, 0::bigint) AS mql_no_crm,
            COALESCE(crm.sal_no_crm, 0::bigint) AS sal_no_crm,
            COALESCE(crm.ganhos_no_crm, 0::bigint) AS ganhos_no_crm,
            COALESCE(crm.pipe_ativo, 0::bigint) AS pipe_ativo,
            COALESCE(crm.valor_ganho_brl, 0::numeric) AS valor_ganho_brl,
                CASE
                    WHEN agg.impressoes > 0::numeric AND agg.video_plays > 0 THEN round(agg.video_plays::numeric / agg.impressoes * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS hook_rate_pct,
                CASE
                    WHEN agg.video_plays > 0 AND agg.video_3s > 0 THEN round(agg.video_3s::numeric / agg.video_plays::numeric * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS body_rate_pct,
                CASE
                    WHEN agg.video_3s > 0 AND agg.video_p75 > 0 THEN round(agg.video_p75::numeric / agg.video_3s::numeric * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS retencao_75_pct,
                CASE
                    WHEN agg.video_p75 > 0 AND agg.cliques_link > 0::numeric THEN round(agg.cliques_link / agg.video_p75::numeric * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS ctr_real_pct,
                CASE
                    WHEN agg.video_p75 > 0 AND agg.leads > 0 THEN round(agg.leads::numeric / agg.video_p75::numeric * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS cvr_pct,
                CASE
                    WHEN agg.leads > 0 THEN round(agg.gasto / agg.leads::numeric, 2)
                    ELSE NULL::numeric
                END AS cpl_brl,
                CASE
                    WHEN agg.leads > 0 THEN round(COALESCE(crm.mql_no_crm, 0::bigint)::numeric / agg.leads::numeric * 100::numeric, 1)
                    ELSE NULL::numeric
                END AS taxa_qualificacao_pct,
                CASE
                    WHEN COALESCE(crm.mql_no_crm, 0::bigint) > 0 THEN round(agg.gasto / crm.mql_no_crm::numeric, 2)
                    ELSE NULL::numeric
                END AS cpmql_brl,
                CASE
                    WHEN COALESCE(crm.sal_no_crm, 0::bigint) > 0 THEN round(agg.gasto / crm.sal_no_crm::numeric, 2)
                    ELSE NULL::numeric
                END AS cpsal_brl
           FROM agg
             LEFT JOIN crm ON crm.meta_ad_id = agg.meta_ad_id
        )
 SELECT ad_uuid,
    meta_ad_id,
    ad_nome,
    ad_status,
    adset_nome,
    campanha_nome,
    meta_campaign_id,
    impressoes,
    alcance,
    gasto,
    cliques_link,
    lp_views,
    leads,
    video_plays,
    video_3s,
    video_p25,
    video_p50,
    video_p75,
    video_p95,
    video_p100,
    avg_time_sec,
    desde,
    ate,
    hook_rate_pct,
    body_rate_pct,
    retencao_75_pct,
    ctr_real_pct,
    cvr_pct,
    cpl_brl,
        CASE
            WHEN hook_rate_pct >= 85::numeric THEN 'verde'::text
            WHEN hook_rate_pct >= 60::numeric THEN 'amarelo'::text
            WHEN hook_rate_pct >= 30::numeric THEN 'vermelho'::text
            WHEN hook_rate_pct IS NOT NULL THEN 'kill'::text
            ELSE 'sem_dado'::text
        END AS hook_semaforo,
        CASE
            WHEN body_rate_pct >= 50::numeric THEN 'verde'::text
            WHEN body_rate_pct >= 35::numeric THEN 'amarelo'::text
            WHEN body_rate_pct >= 25::numeric THEN 'vermelho'::text
            WHEN body_rate_pct IS NOT NULL THEN 'kill'::text
            ELSE 'sem_dado'::text
        END AS body_semaforo,
        CASE
            WHEN retencao_75_pct >= 25::numeric THEN 'verde'::text
            WHEN retencao_75_pct >= 15::numeric THEN 'amarelo'::text
            WHEN retencao_75_pct >= 10::numeric THEN 'vermelho'::text
            WHEN retencao_75_pct IS NOT NULL THEN 'kill'::text
            ELSE 'sem_dado'::text
        END AS retencao_semaforo,
        CASE
            WHEN ctr_real_pct >= 8::numeric AND ctr_real_pct <= 30::numeric THEN 'verde'::text
            WHEN ctr_real_pct > 30::numeric AND ctr_real_pct <= 60::numeric THEN 'amarelo'::text
            WHEN ctr_real_pct > 60::numeric THEN 'vermelho_desqualificado'::text
            WHEN ctr_real_pct >= 5::numeric AND ctr_real_pct < 8::numeric THEN 'amarelo'::text
            WHEN ctr_real_pct IS NOT NULL THEN 'kill'::text
            ELSE 'sem_dado'::text
        END AS ctr_semaforo,
        CASE
            WHEN cvr_pct >= 8::numeric THEN 'verde'::text
            WHEN cvr_pct >= 4::numeric THEN 'amarelo'::text
            WHEN cvr_pct >= 2::numeric THEN 'vermelho'::text
            WHEN cvr_pct IS NOT NULL THEN 'kill'::text
            ELSE 'sem_dado'::text
        END AS cvr_semaforo,
        CASE
            WHEN video_plays = 0 OR video_plays IS NULL THEN 'Sem vídeo (creative de imagem ou dados vazios)'::text
            WHEN hook_rate_pct < 30::numeric THEN 'HOOK ruim (thumb/1º frame não prende) — trocar arte inicial'::text
            WHEN retencao_75_pct < 10::numeric THEN 'RETENÇÃO ruim (meio do vídeo fraco) — cortar/reeditar meio'::text
            WHEN ctr_real_pct > 60::numeric THEN 'CTR DESQUALIFICADO (clique cedo, sem assistir) — mudar CTA ou audiência'::text
            WHEN body_rate_pct < 25::numeric THEN 'BODY ruim (primeiros 3s não prendem) — reescrever abertura'::text
            WHEN cvr_pct IS NOT NULL AND cvr_pct < 2::numeric THEN 'CVR ruim (LP ou audiência erradas)'::text
            WHEN cvr_pct >= 8::numeric AND ctr_real_pct >= 8::numeric AND ctr_real_pct <= 30::numeric THEN 'ESCALAR — funil saudável e converte'::text
            ELSE 'OK'::text
        END AS diagnostico,
    mql_no_crm,
    taxa_qualificacao_pct,
    cpmql_brl,
        CASE
            WHEN COALESCE(mql_no_crm, 0::bigint) = 0 THEN 'sem_dado'::text
            WHEN cpmql_brl <= 100::numeric THEN 'verde'::text
            WHEN cpmql_brl <= 200::numeric THEN 'amarelo'::text
            ELSE 'vermelho'::text
        END AS cpmql_semaforo,
    sal_no_crm,
    cpsal_brl,
        CASE
            WHEN COALESCE(sal_no_crm, 0::bigint) = 0 THEN 'sem_dado'::text
            WHEN cpsal_brl <= 300::numeric THEN 'verde'::text
            WHEN cpsal_brl <= 600::numeric THEN 'amarelo'::text
            ELSE 'vermelho'::text
        END AS cpsal_semaforo,
    ganhos_no_crm,
    pipe_ativo,
    valor_ganho_brl
   FROM calc
  ORDER BY cpmql_brl ASC NULLS LAST, gasto DESC NULLS LAST;
