-- Reduz falso positivo de "pixel/CAPI quebrado" (meta_nao_atribui): só acusa quando há
-- VOLUME relevante no CRM sem atribuição Meta (contacts_crm_30d >= 3), em vez de >= 1.
-- 1-2 leads soltos com Meta=0 passam a cair em 'ok' (divergência dentro da tolerância),
-- evitando alarme de CAPI para volume irrelevante. Único ponto alterado na view.
CREATE OR REPLACE VIEW mads_v_conversao_vs_crm AS
 WITH meta_perf AS (
         SELECT c.id AS campanha_uuid, c.nome AS campanha_nome, c.tipo_lead, c.status, c.pausada_em,
            c.utm_campaign, c.meta_campaign_id, c.orcamento_diario_centavos::numeric / 100.0 AS orcamento_diario_brl,
            COALESCE(sum(i.impressoes), 0::numeric) AS impressoes_30d,
            COALESCE(sum(i.alcance), 0::numeric) AS alcance_30d,
            COALESCE(sum(i.cliques_link), 0::numeric) AS cliques_link_30d,
            COALESCE(sum(i.lp_views), 0::numeric) AS lp_views_30d,
            COALESCE(sum(i.leads), 0::bigint) AS leads_meta_30d,
            COALESCE(sum(i.gasto_brl), 0::numeric) AS gasto_30d_brl
           FROM mads_campaigns c
             LEFT JOIN mads_insights_daily i ON i.campanha_id = c.id AND i.dia >= (CURRENT_DATE - 30)
          WHERE c.status <> 'arquivada'::text
          GROUP BY c.id, c.nome, c.tipo_lead, c.status, c.pausada_em, c.utm_campaign, c.meta_campaign_id, c.orcamento_diario_centavos
        ), crm_data AS (
         SELECT lower(TRIM(BOTH FROM contacts.utm_campaign)) AS utm_campaign_norm,
            count(DISTINCT contacts.id) AS contacts_crm_30d,
            count(*) FILTER (WHERE (contacts.utm_source = ANY (ARRAY['meta'::text, 'facebook'::text, 'instagram'::text])) OR contacts.utm_medium = 'paid'::text) AS contacts_crm_meta_30d
           FROM contacts
          WHERE contacts.created_at >= (now() - '30 days'::interval) AND contacts.utm_campaign IS NOT NULL
          GROUP BY (lower(TRIM(BOTH FROM contacts.utm_campaign)))
        ), form_data AS (
         SELECT lower(TRIM(BOTH FROM form_submissions.utm_campaign)) AS utm_campaign_norm,
            count(*) AS form_submissions_30d
           FROM form_submissions
          WHERE form_submissions.submitted_at >= (now() - '30 days'::interval) AND form_submissions.utm_campaign IS NOT NULL
          GROUP BY (lower(TRIM(BOTH FROM form_submissions.utm_campaign)))
        ), diagnose AS (
         SELECT mp.campanha_uuid, mp.campanha_nome, mp.tipo_lead, mp.status, mp.pausada_em, mp.utm_campaign,
            mp.meta_campaign_id, mp.orcamento_diario_brl, mp.impressoes_30d, mp.alcance_30d, mp.cliques_link_30d,
            mp.lp_views_30d, mp.leads_meta_30d, mp.gasto_30d_brl,
            COALESCE(crm.contacts_crm_30d, 0::bigint) AS contacts_crm_30d,
            COALESCE(crm.contacts_crm_meta_30d, 0::bigint) AS contacts_crm_meta_30d,
            COALESCE(fd.form_submissions_30d, 0::bigint) AS form_submissions_30d,
                CASE WHEN mp.lp_views_30d > 0::numeric THEN round(mp.leads_meta_30d::numeric / mp.lp_views_30d * 100::numeric, 2) ELSE NULL::numeric END AS taxa_conversao_meta_pct,
                CASE WHEN mp.lp_views_30d > 0::numeric THEN round(COALESCE(crm.contacts_crm_30d, 0::bigint)::numeric / mp.lp_views_30d * 100::numeric, 2) ELSE NULL::numeric END AS taxa_conversao_crm_pct,
                CASE WHEN mp.leads_meta_30d > 0 THEN round(mp.gasto_30d_brl / mp.leads_meta_30d::numeric, 2) ELSE NULL::numeric END AS cpl_meta_brl,
                CASE WHEN COALESCE(crm.contacts_crm_30d, 0::bigint) > 0 THEN round(mp.gasto_30d_brl / crm.contacts_crm_30d::numeric, 2) ELSE NULL::numeric END AS cpl_crm_brl,
            mp.leads_meta_30d - COALESCE(crm.contacts_crm_30d, 0::bigint) AS divergencia_meta_menos_crm,
            abs(mp.leads_meta_30d - COALESCE(crm.contacts_crm_30d, 0::bigint)) AS divergencia_absoluta,
                CASE
                    WHEN (mp.status = ANY (ARRAY['pausada'::text, 'arquivada'::text])) AND mp.gasto_30d_brl = 0::numeric AND mp.lp_views_30d = 0::numeric THEN 'pausada_inativa'::text
                    WHEN mp.utm_campaign IS NULL AND mp.gasto_30d_brl = 0::numeric THEN 'sem_utm_inativa'::text
                    WHEN mp.utm_campaign IS NULL THEN 'sem_utm_campaign'::text
                    WHEN mp.lp_views_30d = 0::numeric AND mp.leads_meta_30d = 0 AND mp.gasto_30d_brl = 0::numeric THEN 'sem_dados_meta'::text
                    WHEN mp.gasto_30d_brl > 50::numeric AND mp.lp_views_30d > 100::numeric AND COALESCE(fd.form_submissions_30d, 0::bigint) <= 1 AND mp.leads_meta_30d = 0 THEN 'lp_nao_converte'::text
                    WHEN COALESCE(crm.contacts_crm_30d, 0::bigint) >= 3 AND mp.leads_meta_30d = 0 THEN 'meta_nao_atribui'::text
                    WHEN COALESCE(crm.contacts_crm_30d, 0::bigint) = 0 AND mp.leads_meta_30d > 0 AND COALESCE(fd.form_submissions_30d, 0::bigint) = 0 THEN 'crm_nao_recebe'::text
                    WHEN mp.gasto_30d_brl > 0::numeric AND mp.leads_meta_30d = 0 AND COALESCE(crm.contacts_crm_30d, 0::bigint) = 0 THEN 'trafego_sem_conversao'::text
                    WHEN abs(mp.leads_meta_30d - COALESCE(crm.contacts_crm_30d, 0::bigint))::numeric <= GREATEST(3::numeric, mp.leads_meta_30d::numeric * 0.6) THEN 'ok'::text
                    WHEN abs(mp.leads_meta_30d - COALESCE(crm.contacts_crm_30d, 0::bigint))::numeric <= (mp.leads_meta_30d::numeric * 0.9) THEN 'divergente_aceitavel'::text
                    ELSE 'divergente_alto'::text
                END AS status_conexao
           FROM meta_perf mp
             LEFT JOIN crm_data crm ON crm.utm_campaign_norm = lower(TRIM(BOTH FROM mp.utm_campaign))
             LEFT JOIN form_data fd ON fd.utm_campaign_norm = lower(TRIM(BOTH FROM mp.utm_campaign))
        )
 SELECT campanha_uuid, campanha_nome, tipo_lead, status, utm_campaign, meta_campaign_id, orcamento_diario_brl,
    impressoes_30d, alcance_30d, cliques_link_30d, lp_views_30d, leads_meta_30d, gasto_30d_brl,
    contacts_crm_30d, contacts_crm_meta_30d, form_submissions_30d, taxa_conversao_meta_pct, taxa_conversao_crm_pct,
    cpl_meta_brl, cpl_crm_brl, divergencia_meta_menos_crm, divergencia_absoluta, status_conexao,
        CASE status_conexao
            WHEN 'pausada_inativa'::text THEN 'Pausada sem atividade nos últimos 30d — pode arquivar'::text
            WHEN 'sem_utm_inativa'::text THEN 'Sem UTM mas inativa — irrelevante'::text
            WHEN 'sem_utm_campaign'::text THEN 'Campanha rodando SEM utm_campaign — atribuição impossível, configurar UTM'::text
            WHEN 'sem_dados_meta'::text THEN 'Sem tráfego nos últimos 30d'::text
            WHEN 'lp_nao_converte'::text THEN ((((('LP NÃO CONVERTE: R$ '::text || round(gasto_30d_brl, 2)) || ' gasto, '::text) || lp_views_30d) || ' LP views, apenas '::text) || form_submissions_30d) || ' form(s). Tráfego chega mas não preenche.'::text
            WHEN 'meta_nao_atribui'::text THEN ('CRM='::text || contacts_crm_30d) || ', Meta=0 — pixel/CAPI quebrado'::text
            WHEN 'crm_nao_recebe'::text THEN ('Meta='::text || leads_meta_30d) || ' leads, CRM=0, form=0 — pixel dispara mas form não chega'::text
            WHEN 'trafego_sem_conversao'::text THEN ((('R$ '::text || round(gasto_30d_brl, 2)) || ' gasto, '::text) || lp_views_30d) || ' LP views, ZERO leads'::text
            WHEN 'ok'::text THEN (('OK: Meta='::text || leads_meta_30d) || ', CRM='::text) || contacts_crm_30d
            WHEN 'divergente_aceitavel'::text THEN ((('Atribuição cruzada esperada: Meta='::text || leads_meta_30d) || ' vs CRM='::text) || contacts_crm_30d) || '. Normal com pixel unificado entre LPs.'::text
            WHEN 'divergente_alto'::text THEN ((('DIVERGÊNCIA ALTA: Meta='::text || leads_meta_30d) || ' vs CRM='::text) || contacts_crm_30d) || '. Pode ser histórico sem UTM ou outra LP capturando leads.'::text
            ELSE 'Estado desconhecido'::text
        END AS diagnostico,
        CASE status_conexao
            WHEN 'pausada_inativa'::text THEN 'Pode arquivar — sem atividade'::text
            WHEN 'sem_utm_inativa'::text THEN 'Nenhuma ação — inativa'::text
            WHEN 'sem_utm_campaign'::text THEN 'Configurar utm_campaign nos ads'::text
            WHEN 'sem_dados_meta'::text THEN 'Verificar se campanha está realmente ativa no Meta Ads Manager'::text
            WHEN 'lp_nao_converte'::text THEN 'REVISAR LP: criar variação com mesma promessa do ad, simplificar form, testar CTA. Pausar ad enquanto isso.'::text
            WHEN 'meta_nao_atribui'::text THEN 'Verificar pixel da LP + CAPI server-side'::text
            WHEN 'crm_nao_recebe'::text THEN 'Investigar form da LP — pixel dispara mas form não chega no CRM'::text
            WHEN 'trafego_sem_conversao'::text THEN 'Auditar LP + criativos'::text
            WHEN 'ok'::text THEN 'Saudável — escalar se CPL bom'::text
            WHEN 'divergente_aceitavel'::text THEN 'Nenhuma ação — gap dentro do esperado pra pixel unificado'::text
            WHEN 'divergente_alto'::text THEN 'Verificar histórico de UTM e se outras LPs com mesmo pixel estão capturando leads'::text
            ELSE 'Investigar'::text
        END AS recomendacao_acao,
        CASE
            WHEN status = 'pausada'::text AND pausada_em IS NOT NULL AND pausada_em < (now() - '7 days'::interval) THEN false
            ELSE
            CASE status_conexao
                WHEN 'lp_nao_converte'::text THEN true
                WHEN 'meta_nao_atribui'::text THEN true
                WHEN 'crm_nao_recebe'::text THEN true
                WHEN 'trafego_sem_conversao'::text THEN true
                WHEN 'sem_utm_campaign'::text THEN true
                WHEN 'divergente_alto'::text THEN true
                ELSE false
            END
        END AS precisa_atencao,
        CASE status_conexao
            WHEN 'lp_nao_converte'::text THEN 'critica'::text
            WHEN 'meta_nao_atribui'::text THEN 'alta'::text
            WHEN 'crm_nao_recebe'::text THEN 'alta'::text
            WHEN 'trafego_sem_conversao'::text THEN 'media'::text
            WHEN 'sem_utm_campaign'::text THEN 'media'::text
            WHEN 'divergente_alto'::text THEN 'media'::text
            WHEN 'divergente_aceitavel'::text THEN 'baixa'::text
            ELSE 'baixa'::text
        END AS severidade
   FROM diagnose d;
