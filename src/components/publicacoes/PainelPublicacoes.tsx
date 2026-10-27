// Painel "Publicados": tudo que saiu da edição (Instagram e anúncios), com status, link e desempenho,
// e o botão de reaproveitar (nova versão a partir do que performou). Serve criativos e vídeos.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  ExternalLink,
  Instagram,
  Loader2,
  Megaphone,
  RefreshCw,
  Repeat2,
  RotateCcw,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { BUCKET, db, enviarAoClaude } from "@/lib/vedit";
import { chamarAgente } from "@/lib/criativos";
import { cn } from "@/lib/utils";

type Origem = "criativo" | "video";
type Pub = {
  id: string;
  origem: Origem;
  ref_id: string;
  nome: string | null;
  tipo: "imagem" | "carrossel" | "reel";
  destino: "instagram" | "anuncio";
  midias: string[];
  legenda: string;
  agendado_para: string;
  publicado_em: string | null;
  status: "agendado" | "publicando" | "publicado" | "erro" | "cancelado";
  erro: string | null;
  permalink: string | null;
  thumb: string | null;
  meta_ad_id: string | null;
  metricas: Record<string, number> | null;
  metricas_em: string | null;
};
type AdMet = {
  meta_ad_id: string;
  ad_status: string | null;
  gasto: number | null;
  impressoes: number | null;
  ctr_real_pct: number | null;
  hook_rate_pct: number | null;
  leads: number | null;
  cpl_brl: number | null;
  mql_no_crm: number | null;
  cpmql_brl: number | null;
  diagnostico: string | null;
};

const STATUS: Record<Pub["status"], { rotulo: string; cor: string }> = {
  agendado: { rotulo: "Agendado", cor: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  publicando: { rotulo: "Publicando", cor: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  publicado: {
    rotulo: "Publicado",
    cor: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  erro: { rotulo: "Deu erro", cor: "bg-red-500/10 text-red-600 border-red-500/40" },
  cancelado: { rotulo: "Cancelado", cor: "text-muted-foreground" },
};

const num = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : Math.round(v).toLocaleString("pt-BR");
const brl = (v?: number | null) =>
  v === undefined || v === null ? "—" : `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
const pct = (v?: number | null) =>
  v === undefined || v === null ? "—" : `${Number(v).toFixed(1).replace(".", ",")}%`;

/** Engajamento = interações / alcance (o que mais diz se o conteúdo prendeu). */
function engajamento(m: Pub["metricas"]) {
  if (!m?.reach) return null;
  const inter =
    m.total_interactions ?? (m.likes ?? 0) + (m.comments ?? 0) + (m.saved ?? 0) + (m.shares ?? 0);
  return (inter / m.reach) * 100;
}

function resumoPerformance(p: Pub, ad?: AdMet) {
  if (p.destino === "anuncio" && ad)
    return `Anúncio com gasto ${brl(ad.gasto)}, ${num(ad.impressoes)} impressões, CTR ${pct(ad.ctr_real_pct)}, gancho ${pct(ad.hook_rate_pct)}, ${num(ad.leads)} leads (CPL ${brl(ad.cpl_brl)}), ${num(ad.mql_no_crm)} MQL (CPMQL ${brl(ad.cpmql_brl)}).${ad.diagnostico ? ` Diagnóstico: ${ad.diagnostico}.` : ""}`;
  const m = p.metricas ?? {};
  return `Post no Instagram com alcance ${num(m.reach)}, visualizações ${num(m.views)}, ${num(m.likes)} curtidas, ${num(m.comments)} comentários, ${num(m.saved)} salvamentos, ${num(m.shares)} compartilhamentos, engajamento ${pct(engajamento(m))}.`;
}

export function PainelPublicacoes({ origem }: { origem: Origem }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("todos");
  const [ordem, setOrdem] = useState<"data" | "engajamento" | "alcance">("data");
  const [atualizando, setAtualizando] = useState(false);
  const [reaproveitando, setReaproveitando] = useState<string | null>(null);

  const pubs = useQuery({
    queryKey: ["publicacoes", origem],
    refetchInterval: (q) =>
      (q.state.data as Pub[] | undefined)?.some((p) => p.status === "publicando") ? 5000 : 60_000,
    queryFn: async () => {
      const { data, error } = await db()
        .from("publicacoes")
        .select("*")
        .eq("origem", origem)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      const lista = (data ?? []) as Pub[];
      // Miniatura: a do Instagram quando existe; senão a primeira imagem que subimos.
      const semThumb = lista
        .filter((p) => !p.thumb && p.midias?.[0] && /\.(jpe?g|png|webp)$/i.test(p.midias[0]))
        .map((p) => p.midias[0]);
      const { data: urls } = semThumb.length
        ? await supabase.storage.from(BUCKET).createSignedUrls(semThumb, 60 * 60 * 6)
        : { data: [] as { path: string | null; signedUrl: string }[] };
      const porPath = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
      return lista.map((p) => ({
        ...p,
        thumb: p.thumb ?? (p.midias?.[0] ? (porPath.get(p.midias[0]) ?? null) : null),
      }));
    },
  });
  const idsAd = (pubs.data ?? []).map((p) => p.meta_ad_id).filter(Boolean) as string[];
  const ads = useQuery({
    queryKey: ["publicacoes", "ads", idsAd.join(",")],
    enabled: idsAd.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("mads_v_criativos_metricas" as any)
        .select(
          "meta_ad_id, ad_status, gasto, impressoes, ctr_real_pct, hook_rate_pct, leads, cpl_brl, mql_no_crm, cpmql_brl, diagnostico",
        )
        .in("meta_ad_id", idsAd);
      return new Map(((data ?? []) as unknown as AdMet[]).map((a) => [a.meta_ad_id, a]));
    },
  });

  const lista = useMemo(() => {
    let l = pubs.data ?? [];
    if (filtro === "instagram") l = l.filter((p) => p.destino === "instagram");
    if (filtro === "anuncio") l = l.filter((p) => p.destino === "anuncio");
    if (filtro === "agendados") l = l.filter((p) => ["agendado", "publicando"].includes(p.status));
    if (filtro === "erros") l = l.filter((p) => p.status === "erro");
    if (ordem === "engajamento")
      l = [...l].sort((a, b) => (engajamento(b.metricas) ?? -1) - (engajamento(a.metricas) ?? -1));
    if (ordem === "alcance")
      l = [...l].sort((a, b) => (b.metricas?.reach ?? -1) - (a.metricas?.reach ?? -1));
    return l;
  }, [pubs.data, filtro, ordem]);

  const todos = pubs.data ?? [];
  const publicados = todos.filter((p) => p.status === "publicado" && p.destino === "instagram");
  const alcanceTotal = publicados.reduce((s, p) => s + (p.metricas?.reach ?? 0), 0);
  const engs = publicados
    .map((p) => engajamento(p.metricas))
    .filter((x): x is number => x !== null);
  const engMedio = engs.length ? engs.reduce((a, b) => a + b, 0) / engs.length : null;

  async function atualizarMetricas() {
    setAtualizando(true);
    try {
      const r = await callEdgeFunction("publicar-agendados", {
        acao: "metricas",
        ids: publicados.map((p) => p.id),
      });
      if (r.error) throw new Error(r.error);
      await qc.invalidateQueries({ queryKey: ["publicacoes", origem] });
      toast.success("Métricas atualizadas.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAtualizando(false);
    }
  }

  async function cancelar(p: Pub) {
    await db()
      .from("publicacoes")
      .update({ status: "cancelado" })
      .eq("id", p.id)
      .eq("status", "agendado");
    qc.invalidateQueries({ queryKey: ["publicacoes", origem] });
  }
  async function tentarDeNovo(p: Pub) {
    await db()
      .from("publicacoes")
      .update({
        status: "agendado",
        erro: null,
        container_id: null,
        agendado_para: new Date().toISOString(),
      })
      .eq("id", p.id);
    const r = await callEdgeFunction("publicar-agendados", { acao: "agora", id: p.id }).catch(
      (e) => ({ error: (e as Error).message }),
    );
    if (r?.error) toast.error(r.error);
    else toast.success("Enviado de novo.");
    qc.invalidateQueries({ queryKey: ["publicacoes", origem] });
  }

  /** Nova versão a partir do que foi publicado, com a performance como contexto para o Claude. */
  async function reaproveitar(p: Pub) {
    setReaproveitando(p.id);
    const perf = resumoPerformance(p, p.meta_ad_id ? ads.data?.get(p.meta_ad_id) : undefined);
    const pedido = `Reaproveitar este conteúdo, que já foi publicado. ${perf} Legenda usada: "${p.legenda.slice(0, 600)}". Faça uma nova versão melhor com base nesse resultado: mantenha o que funcionou, reforce o gancho dos primeiros segundos/da capa e mude o que provavelmente segurou o desempenho. Explique em 1 frase o que mudou e por quê.`;
    try {
      if (origem === "criativo") {
        const { data: orig, error } = await db()
          .from("cria_projetos")
          .select("*")
          .eq("id", p.ref_id)
          .single();
        if (error || !orig) throw new Error("criativo original não encontrado");
        const { data: novo, error: e2 } = await db()
          .from("cria_projetos")
          .insert({
            nome: `${orig.nome} (nova versão)`,
            tipo: orig.tipo,
            formato: orig.formato,
            objetivo: orig.objetivo,
            briefing: orig.briefing,
            roteiro: orig.roteiro,
            referencia_id: orig.referencia_id,
            design: orig.design,
            versao: 1,
            status: "pronto",
          })
          .select("id")
          .single();
        if (e2 || !novo) throw new Error(e2?.message ?? "não consegui duplicar");
        await chamarAgente({ acao: "mensagem", projeto_id: novo.id, texto: pedido });
        navigate({ to: "/ads/criar/$id", params: { id: novo.id } });
      } else {
        // Vídeo: vira uma variação (projeto irmão) com o mesmo vídeo e a edição nova.
        toast.info("O editor está montando a nova versão (leva cerca de 1 minuto).");
        const r = await enviarAoClaude(p.ref_id, `/variacoes 1 ${pedido}`);
        const v = r.variacoes?.[0];
        if (v) navigate({ to: "/ads/edicao/$id", params: { id: v.id } });
        else navigate({ to: "/ads/edicao/$id", params: { id: p.ref_id } });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReaproveitando(null);
    }
  }

  const linkEditor = (p: Pub) =>
    origem === "criativo"
      ? ({ to: "/ads/criar/$id", params: { id: p.ref_id } } as const)
      : ({ to: "/ads/edicao/$id", params: { id: p.ref_id } } as const);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Publicados no Instagram", num(publicados.length)],
          ["Agendados", num(todos.filter((p) => p.status === "agendado").length)],
          ["Alcance somado", num(alcanceTotal)],
          ["Engajamento médio", pct(engMedio)],
        ].map(([r, v]) => (
          <Card key={r}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{r}</div>
              <div className="text-xl font-semibold tabular-nums">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={filtro} onValueChange={setFiltro}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="anuncio">Anúncios</TabsTrigger>
            <TabsTrigger value="agendados">Agendados</TabsTrigger>
            <TabsTrigger value="erros">Com erro</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="data">Mais recentes</SelectItem>
            <SelectItem value="engajamento">Maior engajamento</SelectItem>
            <SelectItem value="alcance">Maior alcance</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={atualizarMetricas}
          disabled={atualizando || !publicados.length}
        >
          {atualizando ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Atualizar métricas
        </Button>
      </div>

      {pubs.isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !lista.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nada por aqui ainda. Use o botão Publicar dentro de um{" "}
            {origem === "criativo" ? "criativo" : "vídeo"} para postar, agendar ou virar anúncio.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => {
            const st = STATUS[p.status];
            const m = p.metricas ?? {};
            const ad = p.meta_ad_id ? ads.data?.get(p.meta_ad_id) : undefined;
            return (
              <Card key={p.id}>
                <CardContent className="p-3 flex gap-3 items-start">
                  <div className="h-24 w-20 shrink-0 rounded-md overflow-hidden border bg-muted">
                    {p.thumb && (
                      <img src={p.thumb} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link {...linkEditor(p)} className="font-semibold hover:underline truncate">
                        {p.nome || "Sem nome"}
                      </Link>
                      <Badge variant="outline" className="gap-1">
                        {p.destino === "anuncio" ? (
                          <Megaphone className="h-3 w-3" />
                        ) : (
                          <Instagram className="h-3 w-3" />
                        )}
                        {p.destino === "anuncio"
                          ? "Anúncio"
                          : p.tipo === "reel"
                            ? "Reel"
                            : p.tipo === "carrossel"
                              ? "Carrossel"
                              : "Post"}
                      </Badge>
                      <Badge variant="outline" className={cn(st.cor)}>
                        {p.status === "publicando" && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        {p.destino === "anuncio" && p.status === "publicado"
                          ? `Criado${ad?.ad_status ? ` · ${ad.ad_status}` : " · pausado"}`
                          : st.rotulo}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {p.status === "agendado" && <CalendarClock className="h-3 w-3" />}
                        {format(
                          new Date(p.publicado_em ?? p.agendado_para),
                          "dd/MM/yy 'às' HH:mm",
                          { locale: ptBR },
                        )}
                      </span>
                    </div>
                    {p.status === "erro" && p.erro && (
                      <p className="text-xs text-red-600">{p.erro}</p>
                    )}
                    {p.destino === "instagram" && p.status === "publicado" && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {[
                          ["Alcance", num(m.reach)],
                          ["Visualizações", num(m.views)],
                          ["Curtidas", num(m.likes)],
                          ["Comentários", num(m.comments)],
                          ["Salvos", num(m.saved)],
                          ["Compart.", num(m.shares)],
                          ["Engajamento", pct(engajamento(m))],
                          ...(p.tipo === "reel" && m.ig_reels_avg_watch_time
                            ? [["Tempo médio", `${(m.ig_reels_avg_watch_time / 1000).toFixed(1)}s`]]
                            : []),
                        ].map(([r, v]) => (
                          <span key={r}>
                            <span className="text-muted-foreground">{r} </span>
                            <span className="font-medium tabular-nums">{v}</span>
                          </span>
                        ))}
                        {!p.metricas && (
                          <span className="text-muted-foreground">
                            métricas chegam em até 3 h (ou clique em Atualizar métricas)
                          </span>
                        )}
                      </div>
                    )}
                    {p.destino === "anuncio" && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {ad ? (
                          [
                            ["Gasto", brl(ad.gasto)],
                            ["Impressões", num(ad.impressoes)],
                            ["Gancho", pct(ad.hook_rate_pct)],
                            ["CTR", pct(ad.ctr_real_pct)],
                            ["Leads", num(ad.leads)],
                            ["CPL", brl(ad.cpl_brl)],
                            ["MQL", num(ad.mql_no_crm)],
                            ["CPMQL", brl(ad.cpmql_brl)],
                          ].map(([r, v]) => (
                            <span key={r}>
                              <span className="text-muted-foreground">{r} </span>
                              <span className="font-medium tabular-nums">{v}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            sem entrega ainda (o anúncio entra pausado; os números aparecem depois
                            de ativar e sincronizar)
                          </span>
                        )}
                      </div>
                    )}
                    {p.legenda && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.legenda}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {p.permalink && (
                      <Button size="sm" variant="outline" className="h-8" asChild>
                        <a href={p.permalink} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ver post
                        </a>
                      </Button>
                    )}
                    {p.status === "agendado" && (
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => cancelar(p)}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
                      </Button>
                    )}
                    {p.status === "erro" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => tentarDeNovo(p)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar de novo
                      </Button>
                    )}
                    {p.status === "publicado" && (
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => reaproveitar(p)}
                        disabled={!!reaproveitando}
                        title="Cria uma nova versão melhorada a partir do resultado deste conteúdo"
                      >
                        {reaproveitando === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Repeat2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Reaproveitar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
