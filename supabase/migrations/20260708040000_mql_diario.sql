-- MQL novos por dia (pela data de criação do contato no CRM) — usado nos KPIs por período do dashboard.
-- MQL = contato com deal em qualification_status='mql'. Leve (poucas centenas de linhas).
CREATE OR REPLACE VIEW mads_v_mql_diario AS
 SELECT (ct.created_at)::date AS dia,
        count(DISTINCT ct.id) AS mql
   FROM contacts ct
     JOIN deals d ON d.contact_id = ct.id
  WHERE d.qualification_status = 'mql'::text
  GROUP BY (ct.created_at)::date;
