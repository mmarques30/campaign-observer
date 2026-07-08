-- Classificação de origem de tráfego (fonte única em SQL) + coluna origem_trafego em
-- contacts e mads_lp_pageviews_raw (via trigger BEFORE INSERT/UPDATE) + backfill.
CREATE OR REPLACE FUNCTION classify_traffic_origin(p_source text, p_medium text, p_referrer text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH n AS (
    SELECT nullif(lower(btrim(coalesce(p_source, ''))), '') AS src,
           lower(btrim(coalesce(p_medium, ''))) AS med,
           lower(btrim(coalesce(p_referrer, ''))) AS ref
  )
  SELECT CASE
    WHEN med IN ('paid', 'anuncio_pago', 'cpc', 'ppc') THEN 'pago'
    WHEN med IN ('organic', 'organic_bio', 'organic_social', 'social') THEN 'organico'
    WHEN (src IS NULL OR src IN ('direct', 'none')) AND ref ~ '(google|bing|duckduckgo|yahoo|ecosia)' THEN 'organico'
    WHEN med = 'referral' OR (src IS NOT NULL AND src ~ '\.') OR ((src IS NULL OR src IN ('direct', 'none')) AND ref <> '') THEN 'referral'
    WHEN (src IS NULL OR src IN ('direct', 'none')) AND ref = '' THEN 'direct'
    ELSE 'outros'
  END FROM n;
$$;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS origem_trafego text;
CREATE OR REPLACE FUNCTION trg_contacts_origem_trafego()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.origem_trafego := classify_traffic_origin(NEW.utm_source, NEW.utm_medium, NULL);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS contacts_origem_trafego ON contacts;
CREATE TRIGGER contacts_origem_trafego BEFORE INSERT OR UPDATE OF utm_source, utm_medium ON contacts
  FOR EACH ROW EXECUTE FUNCTION trg_contacts_origem_trafego();
UPDATE contacts SET origem_trafego = classify_traffic_origin(utm_source, utm_medium, NULL);

ALTER TABLE mads_lp_pageviews_raw ADD COLUMN IF NOT EXISTS origem_trafego text;
CREATE OR REPLACE FUNCTION trg_pageviews_origem_trafego()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.origem_trafego := classify_traffic_origin(NEW.utm_source, NEW.utm_medium, NEW.referrer);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS pageviews_origem_trafego ON mads_lp_pageviews_raw;
CREATE TRIGGER pageviews_origem_trafego BEFORE INSERT OR UPDATE OF utm_source, utm_medium, referrer ON mads_lp_pageviews_raw
  FOR EACH ROW EXECUTE FUNCTION trg_pageviews_origem_trafego();
UPDATE mads_lp_pageviews_raw SET origem_trafego = classify_traffic_origin(utm_source, utm_medium, referrer);
