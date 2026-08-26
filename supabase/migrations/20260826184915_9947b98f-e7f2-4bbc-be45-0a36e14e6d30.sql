ALTER TABLE public._tmp_b64_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._tmp_b64_chunks FROM anon, authenticated;