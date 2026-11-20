-- Marca: logo e perfil do negócio (o que faz, nicho, público, objetivo), usados pelo editor,
-- roteiro, legenda e criativos de cada empresa. "sugestoes" guarda a compatibilidade calculada
-- das referências compartilhadas com o negócio da empresa.
alter table public.vedit_marcas
  add column if not exists logo_path text,
  add column if not exists o_que_faz text,
  add column if not exists nicho text,
  add column if not exists publico text,
  add column if not exists objetivo text,
  add column if not exists sugestoes jsonb;

-- Referências da IAplicada (empresa interna) ficam visíveis para as outras empresas como
-- sugestão: só leitura (as regras de escrita continuam as de cada empresa).
create or replace function public.mads_empresa_e_interna(_id uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select interna from public.mads_empresas where id = _id), false) $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'vedit_referencias ler sugestoes') then
    create policy "vedit_referencias ler sugestoes" on public.vedit_referencias for select to authenticated
      using ((select public.mads_empresa_e_interna(empresa_id)));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'cria_referencias ler sugestoes') then
    create policy "cria_referencias ler sugestoes" on public.cria_referencias for select to authenticated
      using ((select public.mads_empresa_e_interna(empresa_id)));
  end if;
end $$;
