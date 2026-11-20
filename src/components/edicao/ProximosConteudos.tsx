// Próximos conteúdos: pautas sugeridas a partir do que já performou, separadas em anúncio
// (julgado por MQL, vendas e custo por MQL no CRM) e orgânico (alcance, salvamentos, envios,
// seguidores). Aparece em Edição de vídeos (foco em Reels) e em Edição criativos (foco em
// carrossel/post). A geração roda na função vedit-proximos e fica salva por empresa.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, Lightbulb, Loader2, Megaphone, RefreshCw, Sparkles, TrendingDown, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Section } from "@/components/ads/kit";
import { FilterChips } from "@/components/ads/viz";
import { NovoRoteiro } from "@/components/edicao/RoteiroReferencia";
import { brl, num } from "@/lib/ads-utils";

const db = () => supabase as any;
type Lado = "anuncio" | "organico";
type Formato = "todos" | "reel" | "carrossel" | "post";
type Sugestao = {
  titulo: string; formato: "reel" | "carrossel" | "post"; gancho: string; estrutura: string;
  por_que: string; baseado_em: string[]; referencia_id?: string | null; meta: string;
};

export function ProximosConteudos({ foco }: { foco: "video" | "criativo" }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [lado, setLado] = useState<Lado>("anuncio");
  const [formato, setFormato] = useState<Formato>("todos");
  const [roteiro, setRoteiro] = useState<Sugestao | null>(null);
  const [pedindo, setPedindo] = useState(false);

  const ultima = useQuery({
    queryKey: ["vedit", "proximos"],
    queryFn: async () =>
      (await db().from("vedit_proximos").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
    refetchInterval: (q) => (q.state.data?.status === "gerando" ? 4000 : false),
  });
  const linha = ultima.data as any;
  const gerando = pedindo || linha?.status === "gerando";

  useEffect(() => {
    if (linha?.status === "erro") toast.error(`Não consegui gerar: ${linha.erro ?? "erro"}`);
  }, [linha?.id, linha?.status]);

  async function gerar() {
    setPedindo(true);
    try {
      const r: any = await callEdgeFunction("vedit-proximos", { acao: "gerar" });
      if (r?.error) throw new Error(r.error);
      await qc.invalidateQueries({ queryKey: ["vedit", "proximos"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPedindo(false);
    }
  }

  const dados = linha?.dados?.[lado];
  const bloco = linha?.sugestoes?.[lado];
  const sugestoes: Sugestao[] = (bloco?.sugestoes ?? []).filter(
    (s: Sugestao) => formato === "todos" || s.formato === formato,
  );
  const porId = new Map<string, any>([...(dados?.melhores ?? []), ...(dados?.piores ?? [])].map((p: any) => [String(p.id), p]));

  function usar(s: Sugestao) {
    if (s.formato === "reel") {
      if (!s.referencia_id) {
        toast.message("Esta pauta não tem referência de vídeo. Escolha uma em Roteiros e cole o assunto.");
        void navigator.clipboard?.writeText(s.titulo).catch(() => {});
        void navigate({ to: "/ads/edicao/roteiros" });
        return;
      }
      setRoteiro(s);
      return;
    }
    void navigate({
      to: "/ads/criar",
      search: {
        ...(s.referencia_id ? { ref: s.referencia_id } : {}),
        briefing: `${s.titulo}\n\nGancho: ${s.gancho}\n\n${s.estrutura}`,
        tipo: s.formato === "post" ? "unico" : "carrossel",
        objetivo: lado === "anuncio" ? "anuncio" : "organico",
      } as any,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1">
            <Lightbulb className="h-3.5 w-3.5" /> Baseado no que já performou
          </div>
          <h1>Próximos conteúdos</h1>
          {linha?.created_at && linha.status !== "gerando" && (
            <p className="text-xs text-muted-foreground mt-1">
              Gerado em {new Date(linha.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
        <Button onClick={gerar} disabled={gerando}>
          {gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : linha ? <RefreshCw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {gerando ? "Lendo os posts e anúncios…" : linha ? "Gerar de novo" : "Gerar sugestões"}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <FilterChips
          options={[
            { v: "anuncio", l: <span className="inline-flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Anúncios</span> },
            { v: "organico", l: <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Orgânico</span> },
          ] as { v: Lado; l: any }[]}
          value={lado}
          onChange={setLado}
        />
        <FilterChips
          options={[
            { v: "todos", l: "Todos os formatos" },
            { v: "reel", l: "Reels" },
            { v: "carrossel", l: "Carrossel" },
            { v: "post", l: "Post único" },
          ] as { v: Formato; l: string }[]}
          value={formato}
          onChange={setFormato}
        />
      </div>

      {ultima.isLoading ? (
        <Skeleton className="h-64" />
      ) : !linha ? (
        <EmptyState
          className="py-20"
          icon={Lightbulb}
          title="Nenhuma sugestão ainda"
          description="Clique em Gerar sugestões: o sistema lê seus posts orgânicos e os anúncios com o resultado no CRM e propõe as próximas pautas."
        />
      ) : linha.status === "gerando" ? (
        <EmptyState className="py-20" icon={Loader2} title="Lendo os posts e anúncios" description="Leva cerca de um minuto. Pode sair da tela; o resultado fica salvo aqui." />
      ) : linha.status === "sem_dados" ? (
        <EmptyState className="py-20" icon={Lightbulb} title="Ainda sem desempenho para analisar" description={linha.erro ?? "Publique e rode anúncios para o sistema aprender o que funciona."} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 sm:gap-6 items-start">
          <div className="space-y-4">
            {!!bloco?.padroes?.length && (
              <Section title={lado === "anuncio" ? "O que dá resultado nos anúncios" : "O que dá resultado no orgânico"}>
                <ul className="space-y-2 text-sm">
                  {bloco.padroes.map((p: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-primary font-semibold">{i + 1}.</span><span>{p}</span></li>
                  ))}
                </ul>
              </Section>
            )}
            {!sugestoes.length ? (
              <EmptyState title="Nenhuma pauta neste formato" description="Troque o filtro de formato ou gere de novo." />
            ) : (
              sugestoes.map((s, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="secondary">{s.formato === "reel" ? "Reel" : s.formato === "carrossel" ? "Carrossel" : "Post único"}</Badge>
                        <span className="text-[11px] text-muted-foreground">Medir: {s.meta}</span>
                      </div>
                      <div className="font-display text-base sm:text-lg font-semibold leading-snug">{s.titulo}</div>
                    </div>
                    <Button size="sm" onClick={() => usar(s)} className="shrink-0">
                      {s.formato === "reel" ? "Fazer roteiro" : "Criar criativo"}
                    </Button>
                  </div>
                  <div className="text-sm"><span className="text-muted-foreground">Gancho: </span>{s.gancho}</div>
                  <div className="text-sm text-muted-foreground">{s.estrutura}</div>
                  <div className="rounded-xl bg-primary/5 px-3 py-2 text-sm"><span className="font-medium">Por quê: </span>{s.por_que}</div>
                  {!!s.baseado_em?.length && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.baseado_em.map((id) => {
                        const p = porId.get(String(id));
                        if (!p) return null;
                        const rot = lado === "anuncio" ? p.nome : p.texto?.slice(0, 40) || p.tipo;
                        return p.link ? (
                          <a key={id} href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary">
                            {rot} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span key={id} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{rot}</span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <Ranking titulo="Os que mais performaram" icone={TrendingUp} itens={dados?.melhores ?? []} lado={lado} />
            <Ranking titulo="Os que menos performaram" icone={TrendingDown} itens={dados?.piores ?? []} lado={lado} />
            {lado === "organico" && dados?.erro && <p className="text-xs text-muted-foreground">{dados.erro}</p>}
          </aside>
        </div>
      )}

      <NovoRoteiro
        aberto={!!roteiro}
        onFechar={() => setRoteiro(null)}
        referenciaId={roteiro?.referencia_id ?? null}
        origem="a referência sugerida"
        comTempos
        temaInicial={roteiro ? `${roteiro.titulo}\n\nGancho: ${roteiro.gancho}` : undefined}
        finalidadeInicial={lado === "anuncio" ? "anuncio" : "organico"}
        notasInicial={roteiro ? `${roteiro.estrutura}\nPor que esta pauta: ${roteiro.por_que}` : undefined}
        onCriado={(id) => void navigate({ to: "/ads/edicao/roteiros", search: { id } })}
      />
    </div>
  );
}

function Ranking({ titulo, icone: Icone, itens, lado }: { titulo: string; icone: any; itens: any[]; lado: Lado }) {
  if (!itens.length) return null;
  return (
    <Section title={<span className="inline-flex items-center gap-2"><Icone className="h-4 w-4 text-primary" />{titulo}</span>}>
      <ul className="space-y-3">
        {itens.slice(0, 6).map((p) => (
          <li key={p.id} className="text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
            {lado === "anuncio" ? (
              <>
                <div className="font-medium truncate" title={p.nome}>{p.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {brl(p.gasto)} · {num(p.leads)} leads · {num(p.mql)} MQL{p.cpmql ? ` (${brl(p.cpmql)}/MQL)` : ""}{p.vendas ? ` · ${num(p.vendas)} venda(s)` : ""}
                </div>
              </>
            ) : (
              <>
                <a href={p.link} target="_blank" rel="noreferrer" className="font-medium line-clamp-2 hover:text-primary">{p.texto || p.tipo}</a>
                <div className="text-xs text-muted-foreground">
                  {p.tipo} · {num(p.alcance)} alcance · {num(p.metricas?.saved ?? 0)} salv · {num(p.metricas?.shares ?? 0)} envios{p.metricas?.follows != null ? ` · ${num(p.metricas.follows)} seguidores` : ""}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
