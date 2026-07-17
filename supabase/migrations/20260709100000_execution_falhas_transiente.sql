-- Classifica se um erro de execução é transiente (instabilidade Meta, retry resolve) — em SQL.
-- Não altera mads_execution_log: todos os erros seguem logados; só a exibição no widget muda.
CREATE OR REPLACE FUNCTION mads_error_is_transient(p_msg text, p_meta jsonb, p_status int)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  WITH b AS (SELECT lower(coalesce(p_msg, '') || ' ' || coalesce(p_meta::text, '')) AS s)
  SELECT COALESCE(p_status IN (500, 502, 503, 504), false)
    OR (SELECT
         s ~ '"is_transient"\s*:\s*true'
         OR s ~ '(unexpected error|please retry|temporarily unavailable|an unknown error has occurred)'
         OR s ~ '"code"\s*:\s*(1|2|4|17|341|613)\b'
         OR s ~ '(500|502|503|504)\s*:'
       FROM b);
$$;

CREATE OR REPLACE VIEW mads_v_execution_falhas AS
 SELECT id, created_at, acao, entidade_tipo, origem, duracao_ms, iniciado_por,
    erro_mensagem, status_code,
    mads_error_is_transient(erro_mensagem, meta_response, status_code) AS is_transient
   FROM mads_execution_log
  WHERE sucesso = false;
