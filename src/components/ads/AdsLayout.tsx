import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Image, Activity, RefreshCw, LogOut, Leaf, Globe, Menu, PanelLeftClose, PanelLeftOpen, X, Users, Webhook, Film, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any; exact?: boolean };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

// Item avulso no topo.
const DASHBOARD: NavItem = { to: "/ads", label: "Dashboard", icon: LayoutDashboard, exact: true };

// Menus agrupados por assunto (colapsáveis).
const GROUPS: NavGroup[] = [
  {
    id: "midia", label: "Mídia paga", icon: Megaphone, items: [
      { to: "/ads/campanhas", label: "Campanhas", icon: Megaphone },
      { to: "/ads/anuncios", label: "Anúncios", icon: Image },
      { to: "/ads/criativos", label: "Criativos", icon: Film },
      { to: "/ads/audiencias", label: "Audiências", icon: Users },
    ],
  },
  {
    id: "conversao", label: "Conversão", icon: Globe, items: [
      { to: "/ads/lps", label: "Landing Pages", icon: Globe },
      { to: "/ads/capi-events", label: "Eventos CAPI", icon: Webhook },
    ],
  },
  {
    id: "analise", label: "Análise & Saúde", icon: Sparkles, items: [
      { to: "/ads/insights", label: "Insights", icon: Sparkles },
      { to: "/ads/saude", label: "Saúde", icon: Activity },
    ],
  },
];

// Lista achatada (usada no modo recolhido, só ícones).
const ALL_ITEMS: NavItem[] = [DASHBOARD, ...GROUPS.flatMap((g) => g.items)];

const COLLAPSE_KEY = "ads-sidebar-collapsed";
const GROUPS_KEY = "ads-sidebar-groups";

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setCollapsed(saved === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(openGroups)); } catch { /* ignore */ }
  }, [openGroups]);

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

  const isActive = (to: string, exact = false) => exact ? path === to : path === to || path.startsWith(to + "/");

  // Grupo da página atual — sempre aberto (auto-expand), sem fechar os que o usuário abriu.
  const activeGroupId = useMemo(() => GROUPS.find((g) => g.items.some((it) => isActive(it.to)))?.id, [path]);
  useEffect(() => {
    if (activeGroupId) setOpenGroups((o) => (o[activeGroupId] ? o : { ...o, [activeGroupId]: true }));
  }, [activeGroupId]);

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

  // On mobile the sidebar is never icon-collapsed; it is full-width inside the drawer.
  const showLabels = isMobile ? true : !collapsed;

  const itemClass = (active: boolean, indent = false) => cn(
    "flex items-center gap-3 rounded-md text-sm transition-colors",
    showLabels ? (indent ? "pl-9 pr-3 py-2" : "px-3 py-2") : "px-0 py-2 justify-center",
    active
      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

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
              <div className="text-sm font-bold tracking-tight truncate">IAplicada Ads</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Gestão de mídia</div>
            </div>
          )}
          {isMobile && (
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Modo recolhido (só ícones): lista achatada, sem grupos. */}
          {!showLabels ? (
            ALL_ITEMS.map((n) => (
              <Link key={n.to} to={n.to} title={n.label} className={itemClass(isActive(n.to, n.exact))}>
                <n.icon className="h-4 w-4 shrink-0" />
              </Link>
            ))
          ) : (
            <>
              <Link to={DASHBOARD.to} className={itemClass(isActive(DASHBOARD.to, DASHBOARD.exact))}>
                <DASHBOARD.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{DASHBOARD.label}</span>
              </Link>

              {GROUPS.map((g) => {
                const open = !!openGroups[g.id];
                const groupActive = g.items.some((it) => isActive(it.to));
                return (
                  <div key={g.id} className="pt-1">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((o) => ({ ...o, [g.id]: !o[g.id] }))}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        groupActive ? "text-foreground font-semibold" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                      aria-expanded={open}
                    >
                      <g.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 text-left">{g.label}</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "rotate-180" : "")} />
                    </button>
                    {open && (
                      <div className="mt-1 space-y-1">
                        {g.items.map((it) => (
                          <Link key={it.to} to={it.to} className={itemClass(isActive(it.to), true)}>
                            <it.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{it.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
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
            Sincronização automática dos dados Meta a cada 5 min. Criação, edição e pausa de campanhas disponíveis no painel.
          </footer>
        </div>
      </main>
    </div>
  );
}
