-- Criativo preso em "gerando": quando o servidor encerra a tarefa no meio (limite de CPU/tempo),
-- nada volta o status e a tela fica travada. A cada 5 min, o que está gerando há mais de
-- 15 min (nenhuma geração real dura isso) vira erro com aviso, e a tela libera para pedir de novo.
select cron.schedule(
  'cria-destravar-geracao',
  '*/5 * * * *',
  $$update public.cria_projetos
      set status = 'erro',
          erro = 'A geração parou no meio (o servidor encerrou a tarefa). Peça de novo pelo chat.'
    where status in ('gerando', 'aguardando')
      and updated_at < now() - interval '15 minutes'$$
);
