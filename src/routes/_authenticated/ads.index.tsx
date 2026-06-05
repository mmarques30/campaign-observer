import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { CheckCircle2, AlertTriangle, DollarSign, Users, TrendingUp, UserPlus } from "lucide-react";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/ads/")({
  component: Dashboard,
});

function Dashboard() {
  const conv = useQuery({
    queryKey: ["mads", "conversao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const health = useQuery({
    queryKey: ["mads", "health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_health_check").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const funil = useQuery({
    queryKey: ["mads", "funil"],
    queryFn: async () => {
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("mads_v_funil_diario")
        .select("dia, leads_meta, contacts_crm, gasto_brl")
        .gte("dia", since);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalGasto = conv.data?.reduce((a, c) => a + (c.gasto_30d_brl ?? 0), 0) ?? 0;
  const totalLeadsMeta = conv.data?.reduce((a, c) => a + (c.leads_meta_30d ?? 0), 0) ?? 0;
  const totalCrm = conv.data?.reduce((a, c) => a + (c.contacts_crm_30d ?? 0), 0) ?? 0;
  const totalLp = conv.data?.reduce((a, c) => a + (c.lp_views_30d ?? 0), 0) ?? 0;
  const taxa = totalLp > 0 ? (totalLeadsMeta / totalLp) * 100 : 0;

  const okCount = health.data?.find((h) => h.status_conexao === "ok")?.total_campanhas ?? 0;
  const problemHealth = health.data?.filter((h) => h.status_conexao !== "ok") ?? [];
  const problemCount = problemHealth.reduce((a, h) => a + (h.total_campanhas ?? 0), 0);

  // aggregate funil by day
  const byDay = new Map<string, { dia: string; leads_meta: number; contacts_crm: number; gasto_brl: number }>();
  for (const r of funil.data ?? []) {
    const k = r.dia ?? "";
    const cur = byDay.get(k) ?? { dia: k, leads_meta: 0, contacts_crm: 0, gasto_brl: 0 };
    cur.leads_meta += r.leads_meta ?? 0;
    cur.contacts_crm += r.contacts_crm ?? 0;
    cur.gasto_brl += r.gasto_brl ?? 0;
    byDay.set(k, cur);
  }
  const funilAgg = [...byDay.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  const top5 = [...(conv.data ?? [])].sort((a, b) => (b.gasto_30d_brl ?? 0) - (a.gasto_30d_brl ?? 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={DollarSign} label="Gasto 30d" value={brl(totalGasto)} />
        <Kpi icon={Users} label="Leads Meta 30d" value={num(totalLeadsMeta)} />
        <Kpi icon={UserPlus} label="Contatos CRM 30d" value={num(totalCrm)} />
        <Kpi icon={TrendingUp} label="Conversão média" value={pct(taxa)} />
        <Card className={problemCount > 0 ? "border-red-500/40" : "border-emerald-500/40"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {problemCount > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              Health check
            </div>
            <div className="mt-2 text-lg font-semibold tabular-nums">
              {okCount} OK · <span className={problemCount > 0 ? "text-red-400" : ""}>{problemCount} problema</span>
            </div>
            <Link to="/ads/saude" className="text-xs text-primary hover:underline">Ver detalhes →</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funil diário — Meta vs CRM</CardTitle>
          <CardDescription>Leads atribuídos pela Meta vs contatos novos no CRM, com gasto diário</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {funil.isLoading ? <Skel /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={funilAgg}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => d?.slice(5)} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="leads_meta" stroke="#3b82f6" strokeWidth={2} name="Leads Meta" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="contacts_crm" stroke="#10b981" strokeWidth={2} name="Contacts CRM" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="gasto_brl" stroke="#f59e0b" strokeWidth={2} name="Gasto R$" dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 campanhas por gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {top5.map((c) => (
              <Link key={c.campanha_uuid} to="/ads/campanhas/$id" params={{ id: c.campanha_uuid ?? "" }} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.campanha_nome}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge>
                    <Badge variant="outline" className={healthColor(c.status_conexao)}>{healthLabel(c.status_conexao)}</Badge>
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-semibold">{brl(c.gasto_30d_brl)}</div>
                  <div className="text-xs text-muted-foreground">{num(c.leads_meta_30d)} leads</div>
                </div>
              </Link>
            ))}
            {top5.length === 0 && !conv.isLoading && <Empty msg="Sem campanhas." />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
function Skel() { return <div className="h-full w-full animate-pulse bg-muted/30 rounded-md" />; }
function Empty({ msg }: { msg: string }) { return <div className="text-sm text-muted-foreground text-center py-8">{msg}</div>; }
