import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/ads/campanhas/$id")({
  component: CampanhaDetail,
});

function CampanhaDetail() {
  const { id } = Route.useParams();

  const camp = useQuery({
    queryKey: ["mads", "camp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*").eq("campanha_uuid", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const funil = useQuery({
    queryKey: ["mads", "funil", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_funil_diario").select("*").eq("campanha_uuid", id).order("dia");
      if (error) throw error;
      return data ?? [];
    },
  });

  const adSets = useQuery({
    queryKey: ["mads", "adsets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ad_sets").select("*").eq("campaign_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ads = useQuery({
    queryKey: ["mads", "ads", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ads").select("*").eq("campaign_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = useQuery({
    enabled: !!camp.data?.utm_campaign,
    queryKey: ["contacts", camp.data?.utm_campaign],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, cargo, faixa_de_faturamento, created_at")
        .eq("utm_campaign", camp.data!.utm_campaign!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const c = camp.data;

  return (
    <div className="space-y-6">
      <Link to="/ads/campanhas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{c?.campanha_nome ?? "Carregando..."}</h1>
          <div className="flex items-center gap-2 mt-2">
            {c?.status && <Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge>}
            {c?.tipo_lead && <Badge variant="outline">{c.tipo_lead}</Badge>}
            {c?.status_conexao && <Badge variant="outline" className={healthColor(c.status_conexao)}>{healthLabel(c.status_conexao)}</Badge>}
          </div>
          {c?.diagnostico && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{c.diagnostico}</p>}
        </div>
        <Button variant="outline" disabled>
          <MessageSquare className="h-4 w-4 mr-2" /> Falar com Claude para gerenciar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Gasto 30d" value={brl(c?.gasto_30d_brl)} />
        <Kpi label="LP Views" value={num(c?.lp_views_30d)} />
        <Kpi label="Leads Meta" value={num(c?.leads_meta_30d)} />
        <Kpi label="Contacts CRM" value={num(c?.contacts_crm_30d)} />
        <Kpi label="CPL Meta" value={brl(c?.cpl_meta_brl)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Evolução diária</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={funil.data ?? []}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => d?.slice(5)} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="leads_meta" stroke="#3b82f6" strokeWidth={2} name="Leads Meta" dot={false} />
              <Line type="monotone" dataKey="contacts_crm" stroke="#10b981" strokeWidth={2} name="Contacts CRM" dot={false} />
              <Line type="monotone" dataKey="lp_views" stroke="#f59e0b" strokeWidth={2} name="LP Views" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ad Sets ({adSets.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Orçamento diário</TableHead></TableRow></TableHeader>
            <TableBody>
              {(adSets.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome ?? a.name}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{brl(a.orcamento_diario_brl ?? a.daily_budget_brl)}</TableCell>
                </TableRow>
              ))}
              {adSets.data?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem ad sets.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anúncios ({ads.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(ads.data ?? []).slice(0, 50).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome ?? a.name}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {ads.data?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Sem anúncios.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads atribuídos no CRM</CardTitle>
          <CardDescription>Contatos com utm_campaign = <code className="text-xs">{c?.utm_campaign ?? "—"}</code></CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Faturamento</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
            <TableBody>
              {(contacts.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell className="text-xs">{p.email}</TableCell>
                  <TableCell className="text-xs">{p.cargo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.faixa_de_faturamento ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                </TableRow>
              ))}
              {contacts.data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum contato atribuído.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </CardContent></Card>
  );
}
