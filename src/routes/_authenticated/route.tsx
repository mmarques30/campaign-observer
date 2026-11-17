import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { carregarPermissoes, limparPermissoesCache } from "@/lib/permissoes";

let acessoOk: string | null = null;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sessão local (sem ida ao servidor a cada troca de tela); o banco valida o token em
    // toda consulta de qualquer forma.
    const { data: s } = await supabase.auth.getSession();
    const user = s.session?.user;
    if (!user) throw redirect({ to: "/auth" });

    // Acesso ao Ads é liberado pelo administrador (mads_usuarios.ativo) ou por
    // ser admin — e a pessoa precisa estar em pelo menos uma empresa ativa.
    // Conferido uma vez por sessão/usuário, não a cada tela.
    if (acessoOk !== user.id) {
      const { data: ok } = await (supabase as any).rpc("mads_tem_acesso", { _user_id: user.id });
      if (ok) acessoOk = user.id;
    }
    const ok = acessoOk === user.id;
    const p = ok ? await carregarPermissoes() : null;
    if (!ok || !p?.empresa) {
      acessoOk = null;
      limparPermissoesCache();
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { motivo: "sem_acesso" } as any });
    }
    return { user };
  },
  component: () => <Outlet />,
});
