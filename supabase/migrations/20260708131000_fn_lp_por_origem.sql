-- CVR por LP segmentado por origem de tráfego, parametrizável por janela.
CREATE OR REPLACE FUNCTION mads_f_lp_por_origem(p_since date, p_until date)
RETURNS TABLE (
  id uuid,
  visits_pago bigint, visits_organico bigint, visits_referral bigint, visits_direct bigint, visits_total bigint,
  leads_pago bigint, leads_organico bigint, leads_referral bigint, leads_direct bigint, leads_total bigint,
  cvr_pago numeric, cvr_organico numeric, cvr_total numeric, pct_pago numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH pv AS (
    SELECT regexp_replace(url, '[?#].*$'::text, ''::text) AS urlc, origem_trafego
    FROM mads_lp_pageviews_raw
    WHERE visitado_em::date >= p_since AND visitado_em::date <= p_until
  ), fd AS (
    SELECT regexp_replace(fs.page_url, '[?#].*$'::text, ''::text) AS urlc, ct.origem_trafego
    FROM form_submissions fs JOIN contacts ct ON ct.id = fs.contact_id
    WHERE fs.page_url IS NOT NULL AND fs.submitted_at::date >= p_since AND fs.submitted_at::date <= p_until
  )
  SELECT l.id,
    v.pago, v.organico, v.referral, v.direct, v.total,
    ld.pago, ld.organico, ld.referral, ld.direct, ld.total,
    CASE WHEN v.pago > 0 THEN round(ld.pago::numeric / v.pago * 100, 2) END,
    CASE WHEN v.organico > 0 THEN round(ld.organico::numeric / v.organico * 100, 2) END,
    CASE WHEN v.total > 0 THEN round(ld.total::numeric / v.total * 100, 2) END,
    CASE WHEN v.total > 0 THEN round(v.pago::numeric / v.total * 100, 1) END
  FROM mads_lps l
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE origem_trafego = 'pago') AS pago,
        count(*) FILTER (WHERE origem_trafego = 'organico') AS organico,
        count(*) FILTER (WHERE origem_trafego = 'referral') AS referral,
        count(*) FILTER (WHERE origem_trafego = 'direct') AS direct, count(*) AS total
      FROM pv WHERE pv.urlc = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text])
    ) v
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE origem_trafego = 'pago') AS pago,
        count(*) FILTER (WHERE origem_trafego = 'organico') AS organico,
        count(*) FILTER (WHERE origem_trafego = 'referral') AS referral,
        count(*) FILTER (WHERE origem_trafego = 'direct') AS direct, count(*) AS total
      FROM fd WHERE fd.urlc = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text])
    ) ld;
$$;
REVOKE ALL ON FUNCTION mads_f_lp_por_origem(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_lp_por_origem(date, date) TO authenticated;
