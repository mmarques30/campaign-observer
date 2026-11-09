import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, CalendarRange, Activity, Download, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Kpi, Section, EmptyState, MiniBar, deltaPct, useChartTheme } from "@/components/ads/kit";
import { supabase } from "@/integrations/supabase/client";
import { usePermissoes } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/gastos")({
  component: GastosApi,
});

type Linha = {
  semana: string;
  empresa_id: string;
  empresa_nome: string;
  origem: string;
  provider: string;
  model: string | null;
  chamadas: number;
  input_tokens: number;
  output_tokens: number;
  custo_usd: number;
};

const SEMANAS = [4, 8, 12, 26] as const;

const usd = (n: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compacto = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  : n >= 1_000 ? `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  : n.toLocaleString("pt-BR");

/** Nome de negócio para cada função que consome IA. */
function funcionalidade(origem: string): string {
  const base = (origem ?? "").split(":")[0];
  const mapa: Record<string, string> = {
    "vedit-agente": origem.endsWith(":sugerir") ? "Editor de vídeo · sugestões" : "Editor de vídeo",
    "vedit-referencia": "Análise de referências",
    "vedit-roteiro": "Roteiros",
    "vedit-pesquisa": "Pesquisa de nicho",
    "cria-agente": "Edição de criativos",
  };
  return mapa[base] ?? base;
}

const rotuloSemana = (iso: string) => {
  const ini = new Date(iso + "T00:00:00");
  return `${format(ini, "dd/MM", { locale: ptBR })} – ${format(addDays(ini, 6), "dd/MM", { locale: ptBR })}`;
};

function GastosApi() {
  const perm = usePermissoes();
  const ct = useChartTheme();
  const [semanas, setSemanas] = useState<(typeof SEMANAS)[number]>(8);
  const [filtroFunc, setFiltroFunc] = useState("todas");
  // Admin IAplicada: escolher empresa ("ativa" = empresa ativa, "todas" = consolidado).
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("ativa");
  const [semanaSel, setSemanaSel] = useState<string | null>(null);

  const hoje = new Date();
  const inicioSemanaAtual = startOfWeek(hoje, { weekStartsOn: 1 });
  const since = format(subWeeks(inicioSemanaAtual, semanas - 1), "yyyy-MM-dd");
  const until = format(hoje, "yyyy-MM-dd");
  const semanaAtualIso = format(inicioSemanaAtual, "yyyy-MM-dd");
  const semanaAnteriorIso = format(subWeeks(inicioSemanaAtual, 1), "yyyy-MM-dd");

  const consolidado = perm.isAdmin; // admin busca tudo e filtra aqui
  const q = useQuery({
    queryKey: ["mads", "gastos_api", since, until, consolidado, perm.empresa?.id],
    enabled: !!perm.empresa,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mads_f_gastos_api", {
        p_since: since,
        p_until: until,
        p_empresa: null,
        p_todas: consolidado,
      });
      if (error) throw new Error(error.message?.includes("Sem acesso") ? "Você não tem acesso ao gasto de API desta empresa." : error.message);
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        chamadas: Number(r.chamadas),
        input_tokens: Number(r.input_tokens),
        output_tokens: Number(r.output_tokens),
        custo_usd: Number(r.custo_usd),
      })) as Linha[];
    },
  });

  const empresaAlvo = filtroEmpresa === "ativa" ? perm.empresa?.id : filtroEmpresa;
  const linhas = useMemo(() => {
    let l = q.data ?? [];
    if (!consolidado || filtroEmpresa !== "todas") l = l.filter((r) => r.empresa_id === empresaAlvo);
    if (filtroFunc !== "todas") l = l.filter((r) => funcionalidade(r.origem) === filtroFunc);
    return l;
  }, [q.data, consolidado, filtroEmpresa, empresaAlvo, filtroFunc]);

  const empresasNosDados = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of q.data ?? []) m.set(r.empresa_id, r.empresa_nome);
    for (const e of perm.empresas) m.set(e.id, e.nome);
    return [...m.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [q.data, perm.empresas]);

  const funcionalidades = useMemo(
    () => [...new Set((q.data ?? []).map((r) => funcionalidade(r.origem)))].sort(),
    [q.data],
  );

  // Fechamento por semana (todas as semanas do período, mesmo sem uso).
  const porSemana = useMemo(() => {
    const m = new Map<string, { semana: string; chamadas: number; input: number; output: number; custo: number }>();
    for (let i = semanas - 1; i >= 0; i--) {
      const iso = format(subWeeks(inicioSemanaAtual, i), "yyyy-MM-dd");
      m.set(iso, { semana: iso, chamadas: 0, input: 0, output: 0, custo: 0 });
    }
    for (const r of linhas) {
      const cur = m.get(r.semana) ?? { semana: r.semana, chamadas: 0, input: 0, output: 0, custo: 0 };
      cur.chamadas += r.chamadas;
      cur.input += r.input_tokens;
      cur.output += r.output_tokens;
      cur.custo += r.custo_usd;
      m.set(r.semana, cur);
    }
    return [...m.values()].sort((a, b) => a.semana.localeCompare(b.semana));
  }, [linhas, semanas, semanaAtualIso]);

  const atual = porSemana.find((s) => s.semana === semanaAtualIso);
  const anterior = porSemana.find((s) => s.semana === semanaAnteriorIso);
  const total = porSemana.reduce((a, s) => a + s.custo, 0);
  const chamadas = porSemana.reduce((a, s) => a + s.chamadas, 0);
  const sel = semanaSel ?? semanaAtualIso;

  // Detalhe da semana selecionada: por funcionalidade (e empresa, no consolidado).
  const detalhe = useMemo(() => {
    const m = new Map<string, { chave: string; empresa: string; func: string; modelos: Set<string>; chamadas: number; tokens: number; custo: number }>();
    for (const r of linhas.filter((x) => x.semana === sel)) {
      const func = funcionalidade(r.origem);
      const chave = `${r.empresa_id}|${func}`;
      const cur = m.get(chave) ?? { chave, empresa: r.empresa_nome, func, modelos: new Set<string>(), chamadas: 0, tokens: 0, custo: 0 };
      if (r.model) cur.modelos.add(r.model);
      cur.chamadas += r.chamadas;
      cur.tokens += r.input_tokens + r.output_tokens;
      cur.custo += r.custo_usd;
      m.set(chave, cur);
    }
    return [...m.values()].sort((a, b) => b.custo - a.custo);
  }, [linhas, sel]);
  const totalSel = detalhe.reduce((a, d) => a + d.custo, 0);
  const mostrarEmpresa = consolidado && filtroEmpresa === "todas";

  const nomeEscopo = mostrarEmpresa
    ? "Todas as empresas"
    : (empresasNosDados.find((e) => e.id === empresaAlvo)?.nome ?? perm.empresa?.nome ?? "");

  const exportarCsv = () => {
    const cab = ["semana_inicio", "empresa", "funcionalidade", "origem", "modelo", "chamadas", "tokens_entrada", "tokens_saida", "custo_usd"];
    const rows = linhas.map((r) => [r.semana, r.empresa_nome, funcionalidade(r.origem), r.origem, r.model ?? "", r.chamadas, r.input_tokens, r.output_tokens, r.custo_usd.toFixed(4)]);
    const csv = [cab, ...rows].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `gasto-api-${since}-a-${until}.csv`;
    a.click();
  };

  const carregando = q.isLoading || perm.carregando;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Gasto de API"
        subtitle={<>{nomeEscopo} · fechamento por semana (segunda a domingo), em dólar, como cobrado pelos provedores de IA</>}
        actions={
          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={!linhas.length}>
            <Download className="h-4 w-4" />CSV
          </Button>
        }
      />

      {/* FilterBar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(semanas)} onValueChange={(v) => { setSemanas(Number(v) as any); setSemanaSel(null); }}>
          <SelectTrigger className="w-[190px] h-9 bg-card/60"><span className="text-muted-foreground mr-1 text-xs">Período</span><SelectValue /></SelectTrigger>
          <SelectContent>{SEMANAS.map((n) => <SelectItem key={n} value={String(n)}>Últimas {n} semanas</SelectItem>)}</SelectContent>
        </Select>
        {consolidado && (
          <Select value={filtroEmpresa} onValueChange={(v) => { setFiltroEmpresa(v); setSemanaSel(null); }}>
            <SelectTrigger className="w-[220px] h-9 bg-card/60"><span className="text-muted-foreground mr-1 text-xs">Empresa</span><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">{perm.empresa?.nome ?? "Empresa ativa"}</SelectItem>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresasNosDados.filter((e) => e.id !== perm.empresa?.id).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filtroFunc} onValueChange={setFiltroFunc}>
          <SelectTrigger className="w-[230px] h-9 bg-card/60"><span className="text-muted-foreground mr-1 text-xs">Funcionalidade</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {funcionalidades.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filtroFunc !== "todas" || filtroEmpresa !== "ativa") && (
          <Button variant="ghost" size="sm" onClick={() => { setFiltroFunc("todas"); setFiltroEmpresa("ativa"); }}>Limpar</Button>
        )}
      </div>

      {q.isError ? (
        <EmptyState icon={Wallet} title="Não foi possível carregar o gasto de API" description={(q.error as Error).message}
          action={<Button variant="outline" size="sm" onClick={() => q.refetch()}>Tentar de novo</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 stagger">
            <Kpi icon={Wallet} tone="primary" label="Semana atual" value={usd(atual?.custo ?? 0)}
              delta={deltaPct(atual?.custo ?? 0, anterior?.custo ?? 0)} deltaInvert hint="vs. semana anterior" loading={carregando}
              spark={porSemana.map((s) => s.custo)} />
            <Kpi icon={CalendarRange} tone="info" label="Semana anterior (fechada)" value={usd(anterior?.custo ?? 0)} loading={carregando} />
            <Kpi icon={Sigma} tone="brand" label={`Total · ${semanas} semanas`} value={usd(total)}
              hint={`média ${usd(total / Math.max(semanas, 1))}/semana`} loading={carregando} />
            <Kpi icon={Activity} tone="neutral" label="Chamadas de IA" value={chamadas.toLocaleString("pt-BR")} loading={carregando} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <Section className="xl:col-span-2" title="Gasto por semana" description="Clique numa semana para ver o detalhe">
              <div className="h-[280px] lg:h-[320px]">
                {carregando ? <Skeleton className="h-full w-full rounded-xl" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porSemana} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}
                      onClick={(e: any) => { const s = e?.activePayload?.[0]?.payload?.semana; if (s) setSemanaSel(s); }}>
                      <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" vertical={false} opacity={0.6} />
                      <XAxis dataKey="semana" tick={ct.tick} axisLine={false} tickLine={false} tickFormatter={(d) => format(new Date(d + "T00:00:00"), "dd/MM")} />
                      <YAxis tick={ct.tick} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `$${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
                      <Tooltip {...ct.tooltip} cursor={{ fill: ct.grid, opacity: 0.35 }}
                        labelFormatter={(d: any) => `Semana ${rotuloSemana(String(d))}`}
                        formatter={(v: any) => [usd(Number(v)), "Gasto"]} />
                      <Bar dataKey="custo" name="Gasto" fill={ct.primary} radius={[6, 6, 0, 0]} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Section>

            <Section title={`Semana ${rotuloSemana(sel)}`} description={`${usd(totalSel)} por funcionalidade`} bodyClassName="px-0 pb-2">
              {carregando ? <div className="px-5"><Skeleton className="h-40 w-full" /></div>
                : detalhe.length === 0 ? <EmptyState icon={Wallet} title="Sem uso de IA nesta semana" />
                : (
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                    {detalhe.map((d) => (
                      <div key={d.chave} className="px-5 sm:px-6 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium truncate">{d.func}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {mostrarEmpresa && <>{d.empresa} · </>}{d.chamadas.toLocaleString("pt-BR")} chamadas · {compacto(d.tokens)} tokens
                            </div>
                          </div>
                          <div className="text-[13px] font-semibold tabular-nums shrink-0">{usd(d.custo)}</div>
                        </div>
                        <MiniBar value={d.custo} max={totalSel || 1} className="mt-1.5" />
                      </div>
                    ))}
                  </div>
                )}
            </Section>
          </div>

          <Section title="Fechamento semanal" bodyClassName="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens de entrada</TableHead>
                  <TableHead className="text-right">Tokens de saída</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">vs. semana anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando && [0, 1, 2].map((i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                {!carregando && [...porSemana].reverse().map((s, i, arr) => {
                  const prev = arr[i + 1];
                  const d = prev ? deltaPct(s.custo, prev.custo) : null;
                  const emAberto = s.semana === semanaAtualIso;
                  return (
                    <TableRow key={s.semana} onClick={() => setSemanaSel(s.semana)}
                      className={cn("cursor-pointer", s.semana === sel && "bg-primary/8")}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {rotuloSemana(s.semana)}
                        {emAberto && <span className="ml-2 text-[10px] font-semibold text-primary">em aberto</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.chamadas.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{compacto(s.input)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{compacto(s.output)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{usd(s.custo)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums text-xs", d == null ? "text-muted-foreground" : d > 0.05 ? "text-danger" : d < -0.05 ? "text-success" : "text-muted-foreground")}>
                        {d == null ? "—" : `${d > 0 ? "+" : ""}${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Section>
        </>
      )}
    </div>
  );
}
