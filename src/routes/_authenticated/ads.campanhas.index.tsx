import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { brl, num, pct, statusBadge, healthColor, healthLabel } from "@/lib/ads-utils";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/ads/campanhas/")({
  component: CampanhasList,
});

function CampanhasList() {
  const { data, isLoading } = useQuery({
    queryKey: ["mads", "conversao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [status, setStatus] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [health, setHealth] = useState("all");

  const tipos = useMemo(() => [...new Set((data ?? []).map((d) => d.tipo_lead).filter(Boolean))] as string[], [data]);
  const statuses = useMemo(() => [...new Set((data ?? []).map((d) => d.status).filter(Boolean))] as string[], [data]);
  const healths = useMemo(() => [...new Set((data ?? []).map((d) => d.status_conexao).filter(Boolean))] as string[], [data]);

  const rows = (data ?? []).filter((r) =>
    (status === "all" || r.status === status) &&
    (tipo === "all" || r.tipo_lead === tipo) &&
    (health === "all" || r.status_conexao === health)
  ).sort((a, b) => (b.gasto_30d_brl ?? 0) - (a.gasto_30d_brl ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Performance vs CRM nos últimos 30 dias</p>
        </div>
        <Button asChild>
          <Link to="/ads/campanhas/nova"><Plus className="h-4 w-4 mr-2" /> Nova campanha</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Filter v={status} on={setStatus} placeholder="Status" opts={statuses} />
        <Filter v={tipo} on={setTipo} placeholder="Tipo" opts={tipos} />
        <Filter v={health} on={setHealth} placeholder="Health" opts={healths} labelFn={healthLabel} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gasto 30d</TableHead>
                <TableHead className="text-right">LP Views</TableHead>
                <TableHead className="text-right">Leads Meta</TableHead>
                <TableHead className="text-right">Contacts CRM</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead>Diagnóstico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada.</TableCell></TableRow>}
              {rows.map((c) => {
                const ok = c.status_conexao === "ok";
                return (
                  <TableRow key={c.campanha_uuid} className="cursor-pointer">
                    <TableCell>
                      <Link to="/ads/campanhas/$id" params={{ id: c.campanha_uuid ?? "" }} className="font-medium hover:underline">
                        {c.campanha_nome}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.tipo_lead ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{brl(c.gasto_30d_brl)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.lp_views_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.leads_meta_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.contacts_crm_30d)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(c.taxa_conversao_meta_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(c.cpl_meta_brl)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[280px]">
                        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />}
                        <span className={`text-xs ${healthColor(c.status_conexao).split(" ")[1]}`}>{c.diagnostico ?? healthLabel(c.status_conexao)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({ v, on, placeholder, opts, labelFn }: { v: string; on: (s: string) => void; placeholder: string; opts: string[]; labelFn?: (s: string) => string }) {
  return (
    <Select value={v} onValueChange={on}>
      <SelectTrigger className="w-[200px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos — {placeholder}</SelectItem>
        {opts.map((o) => <SelectItem key={o} value={o}>{labelFn ? labelFn(o) : o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
