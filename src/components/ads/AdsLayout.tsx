import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Image, Activity, RefreshCw, LogOut, Leaf, Globe, Menu, PanelLeftClose, PanelLeftOpen, X, Users, Webhook, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/ads", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/ads/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { to: "/ads/anuncios", label: "Anúncios", icon: Image, exact: false },
  { to: "/ads/criativos", label: "Criativos", icon: Film, exact: false },
  { to: "/ads/insights", label: "Insights", icon: Sparkles, exact: false },
  { to: "/ads/capi-events", label: "Eventos CAPI", icon: Webhook, exact: false },
  { to: "/ads/lps", label: "Landing Pages", icon: Globe, exact: false },
  { to: "/ads/audiencias", label: "Audiências", icon: Users, exact: false },
  { to: "/ads/saude", label: "Saúde", icon: Activity, exact: false },
];

const COLLAPSE_KEY = "ads-sidebar-collapsed";

export function AdsLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [tick, setTick] = useState(0);

  // Desktop: icon-only collapse. Mobile: off-canvas drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setCollapsed(saved === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [path]);

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

  // On mobile the sidebar is never icon-collapsed; it is full-width inside the drawer.
  const showLabels = isMobile ? true : !collapsed;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Backdrop for the mobile drawer */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300 ease-in-out",
          isMobile
            ? cn("fixed inset-y-0 left-0 w-64 shadow-xl", mobileOpen ? "translate-x-0" : "-translate-x-full")
            : cn("sticky top-0 h-screen", collapsed ? "w-[4.5rem]" : "w-60"),
        )}
      >
        <div className={cn("h-16 flex items-center gap-2.5 border-b border-sidebar-border", showLabels ? "px-5" : "px-0 justify-center")}>
          <div className="h-9 w-9 shrink-0 rounded-xl bg-foreground flex items-center justify-center shadow-sm">
            <Leaf className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold tracking-tight truncate">ADS IAplicada</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Read-only</div>
            </div>
          )}
          {isMobile && (
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              title={showLabels ? undefined : n.label}
              className={cn(
                "flex items-center gap-3 rounded-md text-sm transition-colors",
                showLabels ? "px-3 py-2" : "px-0 py-2 justify-center",
                isActive(n.to, n.exact)
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {showLabels && <span className="truncate">{n.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            title={showLabels ? undefined : "Sair"}
            className={cn("w-full text-muted-foreground", showLabels ? "justify-start" : "justify-center px-0")}
          >
            <LogOut className={cn("h-4 w-4", showLabels && "mr-2")} />
            {showLabels && "Sair"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between gap-4 px-4 sm:px-6 sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((c) => !c))}
            aria-label={isMobile ? "Abrir menu" : collapsed ? "Expandir menu" : "Ocultar menu"}
          >
            {isMobile ? <Menu className="h-5 w-5" /> : collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate" key={tick}>
              Última sincronização: há {formatDistanceToNow(lastSync, { locale: ptBR })}
            </span>
            <Button size="sm" variant="outline" onClick={refresh} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4 sm:mr-2", syncing && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar dados</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 w-full">
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
