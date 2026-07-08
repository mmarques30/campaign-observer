-- Estende mads_f_lp_performance com MQL por LP: contatos que preencheram um form NAQUELA LP
-- (match por page_url) e viraram MQL no CRM (qualification_status='mql', régua padrão).
DROP FUNCTION IF EXISTS mads_f_lp_performance(date, date);

CREATE FUNCTION mads_f_lp_performance(p_since date, p_until date)
RETURNS TABLE (id uuid, meta_lp_views numeric, gasto_meta numeric, submissions bigint, submissions_meta bigint, mql bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH meta_data AS (
    SELECT regexp_replace(c.lp_destino, '[?#].*$'::text, ''::text) AS lp_url_clean, i.gasto_brl, i.lp_views
    FROM mads_campaigns c
      JOIN mads_insights_daily i ON i.campanha_id = c.id
    WHERE c.lp_destino IS NOT NULL AND i.dia >= p_since AND i.dia <= p_until
  ), form_data AS (
    SELECT regexp_replace(fs.page_url, '[?#].*$'::text, ''::text) AS lp_url_clean, fs.utm_source, fs.contact_id
    FROM form_submissions fs
    WHERE fs.page_url IS NOT NULL AND fs.submitted_at::date >= p_since AND fs.submitted_at::date <= p_until
  ), mql_contacts AS (
    SELECT DISTINCT d.contact_id FROM deals d WHERE d.qualification_status = 'mql' AND d.contact_id IS NOT NULL
  )
  SELECT l.id,
    (SELECT COALESCE(sum(m.lp_views), 0::numeric) FROM meta_data m WHERE m.lp_url_clean = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text])),
    (SELECT COALESCE(sum(m.gasto_brl), 0::numeric)::numeric(10,2) FROM meta_data m WHERE m.lp_url_clean = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text])),
    (SELECT count(*) FROM form_data f WHERE f.lp_url_clean = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text])),
    (SELECT count(*) FROM form_data f WHERE f.lp_url_clean = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text]) AND f.utm_source = ANY (ARRAY['meta'::text, 'facebook'::text, 'instagram'::text])),
    (SELECT count(DISTINCT f.contact_id) FROM form_data f WHERE f.lp_url_clean = ANY (ARRAY[l.url, rtrim(l.url, '/'::text), l.url || '/'::text]) AND f.contact_id IN (SELECT contact_id FROM mql_contacts))
  FROM mads_lps l;
$$;
REVOKE ALL ON FUNCTION mads_f_lp_performance(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mads_f_lp_performance(date, date) TO authenticated;
