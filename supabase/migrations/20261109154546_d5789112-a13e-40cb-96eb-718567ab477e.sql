ALTER POLICY "candidato_respostas_anon_insert" ON public.candidato_respostas TO anon
  WITH CHECK (candidato_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.candidatos c WHERE c.id = candidato_id));
DROP FUNCTION IF EXISTS public.candidato_aceita_respostas(uuid);
REVOKE EXECUTE ON FUNCTION public.form_aceita_envio(uuid) FROM authenticated;