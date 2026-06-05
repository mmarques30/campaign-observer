import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/rotinas")({
  component: Rotinas,
});

function Rotinas() {
  const logs = useQuery({
    queryKey: ["mads", "logs-completo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mads_execution_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link to="/ads/saude" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Saúde
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Rotinas automáticas</h1>
        <p className="text-sm text-muted-foreground">Log completo de execução (sync, health check, clarity e mutações)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs de execução</CardTitle>
          <CardDescription>Últimas 200 execuções, mais recentes primeiro</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>Origem</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Duração</TableHead><TableHead>Mensagem</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {(logs.data ?? []).map((l: any) => (
                <TableRow key={l.id} className={l.sucesso === false ? "bg-red-500/5" : ""}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-xs">{l.acao ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entidade_tipo ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.origem ?? "—"}</TableCell>
                  <TableCell>
                    {l.sucesso ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">OK</Badge>
                      : <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/30">FAIL</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{l.duracao_ms != null ? `${l.duracao_ms} ms` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">{l.erro_mensagem ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!logs.isLoading && logs.data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Sem logs.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
