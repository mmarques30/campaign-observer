/**
 * Conexões — mapa neural que correlaciona a produção de conteúdo com o resultado:
 * Referência de nicho → Roteiro → Produção (vídeo editado / criativo) → Publicado
 * (Instagram ou anúncio) → Objetivo (alcance, engajamento, leads, receita).
 *
 * As ligações vêm de chaves reais do banco (roteiro.referencia_id,
 * criativo.referencia_id, video.roteiro_id/referencia_id, publicacao.ref_id,
 * publicacao.meta_ad_id → métricas do anúncio e do CRM). Vídeo sem vínculo
 * recebe uma sugestão por semelhança de texto (fala × roteiro), que a pessoa
 * confirma no painel.
 *
 * Probabilidade de atingir o objetivo: um publicado "acerta" quando fica acima
 * da mediana do objetivo dentro do mesmo destino (anúncio ou orgânico). A chance
 * de cada referência/estilo é (acertos + 1) / (publicados + 2) — suavização de
 * Laplace, para amostras pequenas não virarem 0% ou 100% — comparada à taxa base.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  BookOpen, Clapperboard, FileText, Image as ImageIcon, Link2, Megaphone, Network, Send, Sparkles, Target, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Kpi, Section, EmptyState } from "@/components/ads/kit";
import { FilterChips, InsightCallout, RankBars, Gauge } from "@/components/ads/viz";
import { brl, num } from "@/lib/ads-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/conexoes")({ component: Conexoes });

const db = () => supabase as any;

type Objetivo = "alcance" | "engajamento" | "leads" | "receita";
type Tipo = "todos" | "anuncio" | "instagram";
type Origem = "todas" | "video" | "criativo";
type Col = 0 | 1 | 2 | 3;
type No = {
  id: string; col: Col; tipo: "ref" | "refc" | "roteiro" | "video" | "criativo" | "pub";
  label: string; sub?: string; estilo?: string; pais: string[]; sugerido?: string[];
  raw?: any; score?: number | null; acerto?: boolean | null;
};

const OBJ: { v: Objetivo; l: string }[] = [
  { v: "alcance", l: "Alcance e seguidores" },
  { v: "engajamento", l: "Engajamento da base" },
  { v: "leads", l: "Leads e MQL" },
  { v: "receita", l: "Receita" },
];
const COLS = ["Referências do nicho", "Roteiros", "Produção", "Publicados"];
const ICON: Record<No["tipo"], any> = { ref: BookOpen, refc: ImageIcon, roteiro: FileText, video: Clapperboard, criativo: ImageIcon, pub: Send };

/** Valor bruto do objetivo para um publicado (null = não se aplica). */
function valorObjetivo(p: any, m: any, obj: Objetivo): number | null {
  const ig = p.metricas ?? null;
  if (obj === "alcance") return m ? Number(m.alcance ?? m.impressoes ?? 0) : ig ? Number(ig.reach ?? ig.views ?? 0) : null;
  if (obj === "engajamento") {
    if (m) return m.hook_rate_pct != null ? Number(m.hook_rate_pct) : Number(m.ctr_real_pct ?? 0);
    if (!ig) return null;
    const alc = Number(ig.reach ?? 0);
    return alc > 0 ? (Number(ig.total_interactions ?? 0) / alc) * 100 : null;
  }
  if (obj === "leads") return m ? Number(m.mql_no_crm ?? 0) * 3 + Number(m.leads ?? 0) : ig ? Number(ig.comments ?? 0) : null;
  return m ? Number(m.valor_ganho_brl ?? 0) + Number(m.ganhos_no_crm ?? 0) : null;
}

const mediana = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const palavras = (t: string) =>
  new Set(String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 3));
function semelhanca(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let i = 0;
  for (const w of a) if (b.has(w)) i++;
  return i / Math.min(a.size, b.size);
}
const textoRoteiro = (r: any) =>
  [r.tema, ...((r.roteiro?.blocos ?? []) as any[]).map((b) => b.fala)].filter(Boolean).join(" ");

function Conexoes() {
  const qc = useQueryClient();
  const [obj, setObj] = useState<Objetivo>("alcance");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [origem, setOrigem] = useState<Origem>("todas");
  const [foco, setFoco] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  const dados = useQuery({
    queryKey: ["conexoes"],
    queryFn: async () => {
      const q = async (t: string, cols: string) => {
        const { data, error } = await db().from(t).select(cols).limit(2000);
        if (error) throw error;
        return (data ?? []) as any[];
      };
      const [refs, refsC, roteiros, videos, criativos, pubs, ads] = await Promise.all([
        q("vedit_referencias", "id, autor, titulo, plataforma, metricas, analise, created_at"),
        q("cria_referencias", "id, autor, analise, created_at"),
        q("vedit_roteiros", "id, tema, referencia_id, finalidade, status, roteiro, created_at"),
        q("vedit_projetos", "id, nome, objetivo, status, estilo, roteiro_id, referencia_id, transcricao_texto, created_at"),
        q("cria_projetos", "id, nome, tipo, objetivo, referencia_id, created_at"),
        q("publicacoes", "id, origem, ref_id, destino, nome, status, metricas, meta_ad_id, permalink, publicado_em, thumb"),
        q("mads_v_criativos_metricas", "meta_ad_id, ad_nome, gasto, impressoes, alcance, cliques_link, leads, mql_no_crm, sal_no_crm, ganhos_no_crm, valor_ganho_brl, hook_rate_pct, ctr_real_pct, cpl_brl, cpmql_brl"),
      ]);
      return { refs, refsC, roteiros, videos, criativos, pubs, ads };
    },
  });

  /* ── Grafo ─────────────────────────────────────────────────────────────── */
  const grafo = useMemo(() => {
    const d = dados.data;
    if (!d) return null;
    const adPorMeta = new Map(d.ads.map((a: any) => [String(a.meta_ad_id), a]));
    const nos = new Map<string, No>();
    const add = (n: No) => nos.set(n.id, n);

    for (const r of d.refs)
      add({ id: `ref:${r.id}`, col: 0, tipo: "ref", label: r.titulo || (r.autor ? `@${r.autor}` : "Referência"), sub: r.autor ? `@${r.autor} · vídeo` : "vídeo", estilo: r.analise?.estilo?.nome, pais: [], raw: r });
    for (const r of d.refsC)
      add({ id: `refc:${r.id}`, col: 0, tipo: "refc", label: r.analise?.estilo || (r.autor ? `@${r.autor}` : "Referência"), sub: r.autor ? `@${r.autor} · carrossel` : "carrossel", estilo: typeof r.analise?.estilo === "string" ? r.analise.estilo : undefined, pais: [], raw: r });
    for (const r of d.roteiros)
      add({ id: `rot:${r.id}`, col: 1, tipo: "roteiro", label: r.tema || "Roteiro", sub: r.finalidade === "anuncio" ? "anúncio" : "orgânico", pais: r.referencia_id ? [`ref:${r.referencia_id}`] : [], raw: r });

    // Vídeo sem vínculo: sugestão pela semelhança entre a fala e o texto do roteiro.
    const vocRot = d.roteiros.map((r: any) => ({ id: r.id, ref: r.referencia_id, v: palavras(textoRoteiro(r)) }));
    for (const v of d.videos) {
      const pais: string[] = [];
      const sugerido: string[] = [];
      if (v.roteiro_id) pais.push(`rot:${v.roteiro_id}`);
      if (v.referencia_id && !v.roteiro_id) pais.push(`ref:${v.referencia_id}`);
      if (!pais.length && v.transcricao_texto) {
        const pv = palavras(v.transcricao_texto);
        let melhor: { id: string; s: number } | null = null;
        for (const r of vocRot) {
          const s = semelhanca(pv, r.v);
          if (s > 0.35 && (!melhor || s > melhor.s)) melhor = { id: r.id, s };
        }
        if (melhor) sugerido.push(`rot:${melhor.id}`);
      }
      add({ id: `vid:${v.id}`, col: 2, tipo: "video", label: v.nome || "Vídeo", sub: `vídeo · ${v.objetivo === "anuncio" ? "anúncio" : "orgânico"}`, pais, sugerido, raw: v });
    }
    for (const c of d.criativos)
      add({ id: `cri:${c.id}`, col: 2, tipo: "criativo", label: c.nome || "Criativo", sub: `${c.tipo === "unico" ? "post" : "carrossel"} · ${c.objetivo === "anuncio" ? "anúncio" : "orgânico"}`, pais: c.referencia_id ? [`refc:${c.referencia_id}`] : [], raw: c });

    // Publicados + valor do objetivo.
    const pubs: No[] = [];
    for (const p of d.pubs) {
      const pai = p.origem === "video" ? `vid:${p.ref_id}` : `cri:${p.ref_id}`;
      const m = p.meta_ad_id ? adPorMeta.get(String(p.meta_ad_id)) : null;
      const n: No = {
        id: `pub:${p.id}`, col: 3, tipo: "pub", label: p.nome || (m?.ad_nome ?? "Publicado"),
        sub: p.destino === "anuncio" ? "anúncio" : "Instagram", pais: nos.has(pai) ? [pai] : [],
        raw: { ...p, ad: m }, score: valorObjetivo(p, m, obj),
      };
      pubs.push(n);
      add(n);
    }
    // Acerto: acima da mediana do objetivo dentro do mesmo destino.
    for (const destino of ["anuncio", "instagram"]) {
      const grupo = pubs.filter((p) => p.raw.destino === destino && p.score != null);
      const med = mediana(grupo.map((p) => p.score!));
      for (const p of grupo) p.acerto = p.score! > med || (grupo.length === 1 && p.score! > 0);
    }
    // Normaliza o score (0–1) por destino, para a espessura das linhas.
    for (const destino of ["anuncio", "instagram"]) {
      const grupo = pubs.filter((p) => p.raw.destino === destino && p.score != null);
      const max = Math.max(1e-9, ...grupo.map((p) => p.score!));
      for (const p of grupo) p.raw._norm = p.score! / max;
    }
    return { nos, pubs };
  }, [dados.data, obj]);

  /* Descendentes publicados de cada nó (para probabilidade e destaque). */
  const filhos = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!grafo) return m;
    for (const n of grafo.nos.values()) for (const p of [...n.pais, ...(n.sugerido ?? [])]) m.set(p, [...(m.get(p) ?? []), n.id]);
    return m;
  }, [grafo]);
  const descendentes = (id: string, acc = new Set<string>()) => {
    for (const f of filhos.get(id) ?? []) if (!acc.has(f)) { acc.add(f); descendentes(f, acc); }
    return acc;
  };
  const ancestrais = (id: string, acc = new Set<string>()) => {
    const n = grafo?.nos.get(id);
    for (const p of [...(n?.pais ?? []), ...(n?.sugerido ?? [])]) if (!acc.has(p)) { acc.add(p); ancestrais(p, acc); }
    return acc;
  };

  /* Filtros: publicados visíveis e a cadeia acima deles. */
  const visiveis = useMemo(() => {
    if (!grafo) return [] as No[];
    const pubOk = (n: No) =>
      (tipo === "todos" || n.raw.destino === tipo) &&
      (origem === "todas" || n.raw.origem === origem);
    const ok = new Set<string>();
    for (const p of grafo.pubs) if (pubOk(p)) { ok.add(p.id); ancestrais(p.id).forEach((a) => ok.add(a)); }
    // Sem filtro de tipo, mostra também o que ainda não foi publicado (roteiros e referências em uso).
    if (tipo === "todos")
      for (const n of grafo.nos.values()) {
        if (n.col === 3) continue;
        if (origem === "video" && (n.tipo === "criativo" || n.tipo === "refc")) continue;
        if (origem === "criativo" && (n.tipo === "video" || n.tipo === "roteiro" || n.tipo === "ref")) continue;
        // Referência sem nenhum desdobramento fica de fora; roteiro ligado a uma referência
        // aparece mesmo sem vídeo ainda (está em produção).
        if (n.col === 0 && !(filhos.get(n.id)?.length)) continue;
        if (n.col === 1 && !n.pais.length && !(filhos.get(n.id)?.length)) continue;
        ok.add(n.id);
      }
    return [...grafo.nos.values()].filter((n) => ok.has(n.id));
  }, [grafo, tipo, origem, filhos]);

  /* Probabilidade por nó (sobre os publicados descendentes). */
  const prob = (id: string) => {
    const pubs = [...descendentes(id)].map((x) => grafo!.nos.get(x)!).filter((n) => n?.col === 3 && n.acerto != null);
    const s = pubs.filter((p) => p.acerto).length;
    return { n: pubs.length, s, p: (s + 1) / (pubs.length + 2) };
  };
  const base = useMemo(() => {
    const ps = (grafo?.pubs ?? []).filter((p) => p.acerto != null && (tipo === "todos" || p.raw.destino === tipo));
    return ps.length ? ps.filter((p) => p.acerto).length / ps.length : 0;
  }, [grafo, tipo]);

  /* KPIs. */
  const kpis = useMemo(() => {
    const ps = visiveis.filter((n) => n.col === 3);
    let alcance = 0, leads = 0, mql = 0, receita = 0, interacoes = 0;
    for (const p of ps) {
      const m = p.raw.ad, ig = p.raw.metricas;
      if (m) { alcance += Number(m.alcance ?? 0); leads += Number(m.leads ?? 0); mql += Number(m.mql_no_crm ?? 0); receita += Number(m.valor_ganho_brl ?? 0); }
      else if (ig) { alcance += Number(ig.reach ?? 0); interacoes += Number(ig.total_interactions ?? 0); }
    }
    const comOrigem = ps.filter((p) => [...ancestrais(p.id)].some((a) => a.startsWith("ref"))).length;
    return { publicados: ps.length, alcance, leads, mql, receita, interacoes, cadeia: ps.length ? (comOrigem / ps.length) * 100 : 0 };
  }, [visiveis]);

  /* Ranking por referência e por estilo. */
  const rankRefs = useMemo(() => {
    if (!grafo) return [];
    return visiveis.filter((n) => n.col === 0).map((n) => ({ no: n, ...prob(n.id) })).filter((x) => x.n > 0).sort((a, b) => b.p - a.p).slice(0, 6);
  }, [visiveis, grafo]);
  const rankEstilos = useMemo(() => {
    if (!grafo) return [];
    const m = new Map<string, { n: number; s: number }>();
    for (const r of visiveis.filter((n) => n.col === 0 && n.estilo)) {
      const x = prob(r.id); const cur = m.get(r.estilo!) ?? { n: 0, s: 0 };
      m.set(r.estilo!, { n: cur.n + x.n, s: cur.s + x.s });
    }
    return [...m.entries()].filter(([, v]) => v.n > 0).map(([estilo, v]) => ({ estilo, ...v, p: (v.s + 1) / (v.n + 2) })).sort((a, b) => b.p - a.p).slice(0, 6);
  }, [visiveis, grafo]);

  const ativo = foco ?? sel;
  const realce = useMemo(() => {
    if (!ativo) return null;
    const s = new Set<string>([ativo]);
    ancestrais(ativo).forEach((x) => s.add(x));
    descendentes(ativo).forEach((x) => s.add(x));
    return s;
  }, [ativo, grafo, filhos]);

  const noSel = sel ? grafo?.nos.get(sel) ?? null : null;

  async function vincular(videoId: string, campo: "roteiro_id" | "referencia_id", valor: string | null) {
    const { error } = await db().from("vedit_projetos").update({ [campo]: valor }).eq("id", videoId);
    if (error) return toast.error(error.message);
    toast.success("Conexão salva");
    qc.invalidateQueries({ queryKey: ["conexoes"] });
  }

  const melhorEstilo = rankEstilos[0];
  const objLabel = OBJ.find((o) => o.v === obj)!.l;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1"><Network className="h-3.5 w-3.5" /> Mapa neural</div>
          <h1>Conexões</h1>
          <p className="text-sm text-muted-foreground mt-1">Da referência do nicho ao resultado no funil: o que gerou o que, e o que tende a funcionar.</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:justify-between">
        <FilterChips options={OBJ} value={obj} onChange={setObj} />
        <div className="flex flex-wrap gap-3">
          <FilterChips options={[{ v: "todos", l: "Tudo" }, { v: "anuncio", l: "Anúncios" }, { v: "instagram", l: "Orgânicos" }] as { v: Tipo; l: string }[]} value={tipo} onChange={setTipo} />
          <FilterChips options={[{ v: "todas", l: "Vídeos e criativos" }, { v: "video", l: "Vídeos" }, { v: "criativo", l: "Criativos" }] as { v: Origem; l: string }[]} value={origem} onChange={setOrigem} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 stagger">
        <Kpi icon={Send} tone="primary" label="Publicados no mapa" value={num(kpis.publicados)} hint={`${kpis.cadeia.toFixed(0)}% com a referência de origem`} loading={dados.isLoading} />
        <Kpi icon={Target} label="Taxa base de acerto" value={`${(base * 100).toFixed(0)}%`} hint={`acima da mediana em ${objLabel.toLowerCase()}`} loading={dados.isLoading} />
        <Kpi icon={Sparkles} label="Alcance somado" value={num(kpis.alcance)} hint={kpis.interacoes ? `${num(kpis.interacoes)} interações no orgânico` : undefined} loading={dados.isLoading} />
        <Kpi icon={Megaphone} label="Leads · MQL" value={`${num(kpis.leads)} · ${num(kpis.mql)}`} hint="dos anúncios conectados" loading={dados.isLoading} />
        <Kpi icon={Target} label="Receita ganha" value={brl(kpis.receita)} hint="CRM, via anúncio" loading={dados.isLoading} />
      </div>

      {melhorEstilo && (
        <InsightCallout>
          O estilo <b>{melhorEstilo.estilo}</b> tem {(melhorEstilo.p * 100).toFixed(0)}% de chance estimada de ficar acima da mediana em {objLabel.toLowerCase()} ({melhorEstilo.s} de {melhorEstilo.n} publicados), contra {(base * 100).toFixed(0)}% da média.
        </InsightCallout>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_380px] gap-4 sm:gap-6 items-start">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-[radial-gradient(ellipse_at_85%_50%,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_55%)] bg-card shadow-card">
          <div aria-hidden className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
          {dados.isLoading ? <Skeleton className="m-6 h-[520px]" /> : !grafo || !visiveis.length ? (
            <EmptyState className="py-24" icon={Network} title="Nada conectado ainda" description="Publique um vídeo ou criativo para ver a cadeia até o resultado." />
          ) : (
            <MapaNeural
              nos={visiveis}
              realce={realce}
              onFoco={setFoco}
              onSel={(id) => setSel((s) => (s === id ? null : id))}
              sel={sel}
              objLabel={objLabel}
              base={base}
            />
          )}
        </section>

        <aside className="2xl:sticky 2xl:top-24 space-y-4">
          {noSel ? (
            <Detalhe
              no={noSel}
              prob={prob(noSel.id)}
              base={base}
              objLabel={objLabel}
              roteiros={dados.data?.roteiros ?? []}
              refs={dados.data?.refs ?? []}
              onFechar={() => setSel(null)}
              onVincular={vincular}
            />
          ) : (
            <Section title="Como ler o mapa">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Cada linha é uma ligação real: a referência que inspirou o roteiro, o vídeo ou criativo que nasceu dele e onde foi publicado.</li>
                <li>Linhas mais grossas e claras levam aos publicados com melhor resultado no objetivo escolhido.</li>
                <li>Passe o mouse para acender a cadeia inteira; clique para ver a chance de acerto e conectar vídeos ao roteiro.</li>
                <li>Linha tracejada é uma conexão sugerida pela semelhança entre a fala do vídeo e o roteiro.</li>
              </ul>
            </Section>
          )}
        </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Chance de acerto por referência" description={`${objLabel} · (acertos + 1) / (publicados + 2)`}>
          {rankRefs.length ? (
            <RankBars
              format={(v) => `${(v * 100).toFixed(0)}%`}
              items={rankRefs.map((r) => ({
                label: r.no.label, value: r.p, onClick: () => setSel(r.no.id),
                detail: <>{r.s} de {r.n} publicados acima da mediana · {r.p > base ? `+${((r.p - base) * 100).toFixed(0)} pts sobre a média` : "abaixo da média"} · {confianca(r.n)}</>,
              }))}
            />
          ) : <EmptyState title="Sem publicados ligados a referências" description="Conecte vídeos ao roteiro de origem no painel do mapa." />}
        </Section>
        <Section title="Chance de acerto por estilo" description="Estilos das referências analisadas">
          {rankEstilos.length ? (
            <RankBars
              format={(v) => `${(v * 100).toFixed(0)}%`}
              items={rankEstilos.map((e) => ({ label: e.estilo, value: e.p, detail: <>{e.s} de {e.n} publicados · {confianca(e.n)}</> }))}
            />
          ) : <EmptyState title="Sem estilos com resultado ainda" />}
        </Section>
      </div>
    </div>
  );
}

const confianca = (n: number) => (n >= 8 ? "confiança alta" : n >= 3 ? "confiança média" : "amostra pequena");

/* ── Mapa neural (SVG + nós em HTML) ───────────────────────────────────────── */
const LIMITE = 9;
function MapaNeural({ nos, realce, onFoco, onSel, sel, objLabel, base }: {
  nos: No[]; realce: Set<string> | null; onFoco: (id: string | null) => void; onSel: (id: string) => void;
  sel: string | null; objLabel: string; base: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // Colunas: os melhores primeiro (publicados por score; demais por quantos publicados alimentam).
  const colunas = useMemo(() => {
    const porCol: No[][] = [[], [], [], []];
    for (const n of nos) porCol[n.col].push(n);
    const peso = (n: No) => (n.col === 3 ? (n.raw?._norm ?? 0) : nos.filter((x) => x.pais.includes(n.id) || x.sugerido?.includes(n.id)).length);
    return porCol.map((c) => {
      const ord = [...c].sort((a, b) => peso(b) - peso(a));
      return { itens: ord.slice(0, LIMITE), resto: Math.max(0, ord.length - LIMITE) };
    });
  }, [nos]);

  const ROW = 56, TOP = 56, nodeW = Math.min(240, Math.max(140, w * 0.18));
  const altura = TOP + Math.max(...colunas.map((c) => c.itens.length + (c.resto ? 1 : 0)), 4) * ROW + 24;
  const orbX = w - 70, orbY = altura / 2;
  const xCol = (c: number) => 16 + c * ((orbX - 110 - 16 - nodeW) / 3);
  const pos = new Map<string, { x: number; y: number }>();
  colunas.forEach((c, ci) => {
    const off = (altura - TOP - (c.itens.length) * ROW) / 2;
    c.itens.forEach((n, i) => pos.set(n.id, { x: xCol(ci), y: TOP + Math.max(0, off - 12) + i * ROW + ROW / 2 }));
  });

  const linhas: { d: string; forca: number; tracejado: boolean; on: boolean; key: string }[] = [];
  const curva = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) * 0.5;
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  };
  for (const n of nos) {
    const b = pos.get(n.id); if (!b) continue;
    for (const [lista, tracejado] of [[n.pais, false], [n.sugerido ?? [], true]] as const)
      for (const p of lista) {
        const a = pos.get(p); if (!a) continue;
        linhas.push({ key: `${p}>${n.id}`, d: curva(a.x + nodeW, a.y, b.x, b.y), forca: 0.35, tracejado, on: !!realce && realce.has(p) && realce.has(n.id) });
      }
    if (n.col === 3) {
      const f = n.raw?._norm ?? 0;
      linhas.push({ key: `${n.id}>orb`, d: curva(b.x + nodeW, b.y, orbX - 52, orbY), forca: 0.15 + f * 0.85, tracejado: false, on: !!realce && realce.has(n.id) });
    }
  }

  return (
    <div ref={ref} className="relative w-full overflow-x-auto" style={{ height: altura }}>
      <div className="absolute inset-x-0 top-4 flex px-4 pointer-events-none" aria-hidden>
        {COLS.map((c, i) => (
          <div key={c} className="absolute text-[11px] font-medium text-muted-foreground" style={{ left: xCol(i) }}>
            {c} <span className="text-muted-foreground/60">· {nos.filter((n) => n.col === i).length}</span>
          </div>
        ))}
      </div>

      <svg className="absolute inset-0 pointer-events-none" width={w} height={altura} aria-hidden>
        <defs>
          <linearGradient id="fio" x1="0" x2="1">
            <stop offset="0%" stopColor="#738A25" />
            <stop offset="100%" stopColor="#AFC041" />
          </linearGradient>
          <filter id="fioGlow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {linhas.map((l) => {
          const apagado = !!realce && !l.on;
          return (
            <g key={l.key} style={{ transition: "opacity .3s" }} opacity={apagado ? 0.08 : 1}>
              {!l.tracejado && <path d={l.d} fill="none" stroke="url(#fio)" strokeWidth={1 + l.forca * 5} opacity={l.forca * 0.5} filter="url(#fioGlow)" />}
              <path
                d={l.d} fill="none" stroke="url(#fio)" strokeWidth={0.8 + l.forca * 2.2} opacity={0.35 + l.forca * 0.6}
                strokeDasharray={l.tracejado ? "4 5" : l.on ? "6 10" : undefined}
                className={l.on && !l.tracejado ? "fluxo" : undefined}
              />
            </g>
          );
        })}
      </svg>

      {colunas.map((c, ci) => (
        <div key={ci}>
          {c.itens.map((n) => {
            const p = pos.get(n.id)!;
            const Icon = ICON[n.tipo];
            const apagado = !!realce && !realce.has(n.id);
            return (
              <button
                key={n.id}
                type="button"
                onMouseEnter={() => onFoco(n.id)}
                onMouseLeave={() => onFoco(null)}
                onClick={() => onSel(n.id)}
                className={cn(
                  "absolute flex items-center gap-2 rounded-xl border px-2.5 text-left backdrop-blur-md transition-all duration-300",
                  "bg-card/80 hover:-translate-y-0.5",
                  sel === n.id ? "border-primary shadow-[0_0_0_1px_var(--color-primary),0_0_24px_-6px_var(--color-primary)]" : "border-border/70 hover:border-primary/50",
                  apagado && "opacity-25",
                )}
                style={{ left: p.x, top: p.y - 21, width: nodeW, height: 42 }}
              >
                <span className={cn("h-6 w-6 shrink-0 rounded-lg flex items-center justify-center", n.col === 3 && n.acerto ? "bg-primary/20 text-primary shadow-[0_0_12px_-3px_var(--color-primary)]" : "bg-muted text-muted-foreground")}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium leading-tight truncate" title={n.label}>{n.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">{n.sub}</span>
                </span>
                {n.col === 3 && n.raw?._norm != null && (
                  <span className={cn("text-[10px] font-semibold tabular-nums", n.acerto ? "text-primary" : "text-muted-foreground")}>{Math.round(n.raw._norm * 100)}</span>
                )}
              </button>
            );
          })}
          {c.resto > 0 && (
            <div className="absolute text-[11px] text-muted-foreground px-2.5" style={{ left: xCol(ci), top: TOP + (colunas[ci].itens.length) * ROW + 6 + Math.max(0, (altura - TOP - colunas[ci].itens.length * ROW) / 2 - 12) }}>
              +{c.resto} com menos impacto
            </div>
          )}
        </div>
      ))}

      {/* Objetivo: a esfera onde as conexões chegam. */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center" style={{ left: orbX, top: orbY }}>
        <div className="relative h-[104px] w-[104px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#EAECC8,#AFC041_35%,#3d4a14_75%)] shadow-[0_0_60px_-6px_#AFC041,inset_0_-10px_30px_rgba(0,0,0,.45)] animate-[petal-float_9s_ease-in-out_infinite_alternate]">
          <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#10120b]">
            <span className="font-display text-xl font-bold tabular-nums leading-none">{Math.round(base * 100)}%</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">acerto</span>
          </div>
        </div>
        <div className="mt-2 text-[11px] font-medium max-w-[120px] leading-tight">{objLabel}</div>
      </div>
    </div>
  );
}

/* ── Painel de detalhe ─────────────────────────────────────────────────────── */
function Detalhe({ no, prob, base, objLabel, roteiros, refs, onFechar, onVincular }: {
  no: No; prob: { n: number; s: number; p: number }; base: number; objLabel: string;
  roteiros: any[]; refs: any[]; onFechar: () => void;
  onVincular: (videoId: string, campo: "roteiro_id" | "referencia_id", valor: string | null) => void;
}) {
  const m = no.raw?.ad, ig = no.raw?.metricas;
  const linha = (rotulo: ReactNode, valor: ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{rotulo}</span><span className="font-medium tabular-nums">{valor}</span>
    </div>
  );
  return (
    <div className="glass rounded-3xl p-5 space-y-4 animate-scale-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-primary font-medium">{no.sub}</div>
          <div className="font-display text-lg font-semibold leading-snug">{no.label}</div>
          {no.estilo && <div className="text-xs text-muted-foreground mt-0.5">Estilo: {no.estilo}</div>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onFechar} aria-label="Fechar"><X className="h-4 w-4" /></Button>
      </div>

      {no.col < 3 && (
        <div className="rounded-2xl bg-muted/40 p-3">
          <Gauge value={prob.p * 100} label={`chance de acerto · ${objLabel.toLowerCase()}`} sublabel={`${prob.s} de ${prob.n} publicados · média ${(base * 100).toFixed(0)}%`} />
        </div>
      )}

      {no.col === 3 && m && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Funil do anúncio</div>
          {linha("Impressões", num(m.impressoes ?? 0))}
          {linha("Cliques no link", num(m.cliques_link ?? 0))}
          {linha("Leads", `${num(m.leads ?? 0)}${m.cpl_brl ? ` · CPL ${brl(m.cpl_brl)}` : ""}`)}
          {linha("MQL", `${num(m.mql_no_crm ?? 0)}${m.cpmql_brl ? ` · ${brl(m.cpmql_brl)}` : ""}`)}
          {linha("SAL", num(m.sal_no_crm ?? 0))}
          {linha("Ganhos", `${num(m.ganhos_no_crm ?? 0)} · ${brl(m.valor_ganho_brl ?? 0)}`)}
          {linha("Gancho (3s)", m.hook_rate_pct != null ? `${Number(m.hook_rate_pct).toFixed(1)}%` : "—")}
        </div>
      )}
      {no.col === 3 && !m && ig && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Instagram</div>
          {linha("Alcance", num(ig.reach ?? 0))}
          {linha("Visualizações", num(ig.views ?? 0))}
          {linha("Curtidas · comentários", `${num(ig.likes ?? 0)} · ${num(ig.comments ?? 0)}`)}
          {linha("Salvamentos · envios", `${num(ig.saved ?? 0)} · ${num(ig.shares ?? 0)}`)}
          {linha("Engajamento", ig.reach ? `${((Number(ig.total_interactions ?? 0) / Number(ig.reach)) * 100).toFixed(1)}%` : "—")}
        </div>
      )}
      {no.col === 3 && (
        <div className={cn("rounded-xl px-3 py-2 text-sm", no.acerto ? "bg-primary/10 text-foreground" : "bg-muted/50 text-muted-foreground")}>
          {no.acerto == null ? "Sem métrica para este objetivo." : no.acerto ? `Acima da mediana em ${objLabel.toLowerCase()}.` : `Abaixo da mediana em ${objLabel.toLowerCase()}.`}
        </div>
      )}

      {no.tipo === "video" && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Conectar a origem</div>
          {!!no.sugerido?.length && !no.raw.roteiro_id && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onVincular(no.raw.id, "roteiro_id", no.sugerido![0].slice(4))}>
              Confirmar roteiro sugerido: {roteiros.find((r) => `rot:${r.id}` === no.sugerido![0])?.tema ?? "roteiro"}
            </Button>
          )}
          <Select value={no.raw.roteiro_id ?? ""} onValueChange={(v) => onVincular(no.raw.id, "roteiro_id", v === "_" ? null : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Roteiro de origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Sem roteiro</SelectItem>
              {roteiros.map((r) => <SelectItem key={r.id} value={r.id}>{r.tema || "Roteiro"}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={no.raw.referencia_id ?? ""} onValueChange={(v) => onVincular(no.raw.id, "referencia_id", v === "_" ? null : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Referência do nicho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Sem referência</SelectItem>
              {refs.map((r) => <SelectItem key={r.id} value={r.id}>{r.titulo || (r.autor ? `@${r.autor}` : "Referência")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
