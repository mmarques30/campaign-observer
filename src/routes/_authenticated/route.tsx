import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { limparPermissoesCache } from "@/lib/permissoes";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Acesso ao Ads é liberado pelo administrador (mads_usuarios.ativo) ou por
    // ser admin — não depende mais do domínio do e-mail.
    const { data: ok } = await (supabase as any).rpc("mads_tem_acesso", { _user_id: data.user.id });
    if (!ok) {
      limparPermissoesCache();
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { motivo: "sem_acesso" } as any });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
