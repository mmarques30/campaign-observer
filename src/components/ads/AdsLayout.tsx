import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Image, Activity, RefreshCw, LogOut, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const nav = [
  { to: "/ads", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/ads/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { to: "/ads/anuncios", label: "Anúncios", icon: Image, exact: false },
  { to: "/ads/saude", label: "Saúde", icon: Activity, exact: false },
];

export function AdsLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      qc.invalidateQueries();
      setLastSync(new Date());
    }, 5 * 60 * 1000);
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => { clearInterval(i); clearInterval(t); };
  }, [qc]);

  async function refresh() {
    setSyncing(true);
    toast.info("Sincronizando dados Meta...");
    try {
      const r = await fetch("https://ciwdlceyjsnlnunktqzx.supabase.co/functions/v1/meta-sync-insights?secret=sync-iaplicada-2026&days=7");
      if (!r.ok) throw new Error(`Sync falhou (${r.status})`);
      await qc.invalidateQueries();
      setLastSync(new Date());
      toast.success("Sincronizado!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const isActive = (to: string, exact: boolean) => exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 border-r border-border bg-card/40 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">IAplicada Ads</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Read-only</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive(n.to, n.exact) ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-end gap-4 px-6">
          <span className="text-xs text-muted-foreground" key={tick}>
            Última sincronização: há {formatDistanceToNow(lastSync, { locale: ptBR })}
          </span>
          <Button size="sm" variant="outline" onClick={refresh} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Atualizar dados
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
          <footer className="border-t border-border mt-8 py-4 px-6 text-center text-xs text-muted-foreground">
            Para criar, editar ou pausar campanhas, fale com a Claude no chat principal. Este dashboard é só para visualização.
          </footer>
        </div>
      </main>
    </div>
  );
}
