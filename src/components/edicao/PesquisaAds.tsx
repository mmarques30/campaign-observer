// Pesquisa → Por tema → Anúncios (Biblioteca de Anúncios da Meta): o worker abre a busca por
// palavra-chave (vídeos ativos no país) e grava os anúncios em vedit_nicho_ads. A prova de
// performance aqui é tempo no ar e quantas variações usam o mesmo criativo. Cada anúncio pode ser
// analisado (vira uma referência por link) e dali sai o roteiro.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Megaphone, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/vedit";
import { criarReferenciaPorLink, STATUS_REF, type Referencia } from "@/lib/referencias";

export type AdNicho = {
  id: string;
  tema: string;
  pais: string;
  anunciante: string | null;
  inicio: string | null;
  variantes: number;
  texto: string | null;
  poster: string | null;
  url: string;
  referencia_id: string | null;
  descartado: boolean;
  buscado_em: string;
};

/** Põe a busca na fila do worker. */
export async function pedirBuscaAds(tema: string, pais = "BR") {
  const { error } = await db()
    .from("vedit_jobs")
    .insert({ tipo: "ads_busca", params: { tema, pais } });
  if (error) throw new Error(error.message);
}

export function useAdsDoTema(tema: string) {
  const ads = useQuery({
    queryKey: ["vedit", "nicho", "ads", tema],
    enabled: !!tema,
    queryFn: async () =>
      ((
        await db()
          .from("vedit_nicho_ads")
          .select("*")
          .eq("tema", tema)
          .eq("descartado", false)
          .order("inicio", { ascending: true, nullsFirst: false })
          .limit(200)
      ).data ?? []) as AdNicho[],
  });
  const job = useQuery({
    queryKey: ["vedit", "nicho", "ads-job", tema],
    enabled: !!tema,
    refetchInterval: (q) => {
      const j = q.state.data as { status: string } | null | undefined;
      return j && !["pronto", "erro"].includes(j.status) ? 4000 : false;
    },
    queryFn: async () =>
      ((
        await db()
          .from("vedit_jobs")
          .select("id, status, erro, resultado, created_at")
          .eq("tipo", "ads_busca")
          .contains("params", { tema })
          .order("created_at", { ascending: false })
          .limit(1)
      ).data?.[0] ?? null) as {
        id: string;
        status: string;
        erro: string | null;
        resultado: { encontrados?: number } | null;
        created_at: string;
      } | null,
  });
  return { ads, job };
}

const dias = (iso: string | null) =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : null;

export function CartaoAd({
  a,
  referencia: ref,
  onAbrirRef,
  onMudou,
}: {
  a: AdNicho;
  referencia?: Referencia;
  onAbrirRef: (r: Referencia) => void;
  onMudou: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const d = dias(a.inicio);
  async function analisar() {
    setOcupado(true);
    try {
      const id = await criarReferenciaPorLink({ url: a.url });
      await db().from("vedit_nicho_ads").update({ referencia_id: id }).eq("id", a.id);
      toast.success("Baixando o anúncio e analisando (2 a 3 minutos).");
      onMudou();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  const pronta = ref?.status === "pronta";
  return (
    <Card
      className={cn(
        "relative",
        ref && "hover:border-primary/50 hover:shadow-md transition cursor-pointer",
      )}
      onClick={() => ref && onAbrirRef(ref)}
    >
      <CardContent className="p-3 flex gap-3">
        <div className="shrink-0 w-20 h-32 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
          {a.poster ? (
            <img
              src={a.poster}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <Megaphone className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{a.anunciante ?? "Anúncio"}</span>
            {d != null && (
              <Badge
                className={cn(
                  "ml-auto",
                  d >= 90 ? "bg-rose-600" : d >= 30 ? "bg-amber-500" : "bg-muted text-foreground",
                )}
              >
                {d} dias no ar
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {a.variantes > 1 ? `${a.variantes} anúncios com este criativo` : "1 anúncio"}
            {a.inicio ? ` · desde ${new Date(a.inicio).toLocaleDateString("pt-BR")}` : ""}
          </div>
          <p className="text-xs line-clamp-3">{a.texto || "(sem texto)"}</p>
          <div className="flex gap-1.5 flex-wrap items-center" onClick={(e) => e.stopPropagation()}>
            {ref ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  ref.status === "erro" ? "text-red-600" : pronta ? "text-emerald-600" : "",
                )}
              >
                {!pronta && ref.status !== "erro" && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                {pronta ? "analisado · clique para ver" : STATUS_REF[ref.status]}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={analisar}
                disabled={ocupado}
              >
                {ocupado ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Analisar e roteirizar
              </Button>
            )}
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> abrir
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Lista dos anúncios do tema, 10 por vez, com o estado da busca no worker. */
export function ListaAds({
  tema,
  refs,
  onAbrirRef,
  pagina,
  onPagina,
}: {
  tema: string;
  refs: Referencia[];
  onAbrirRef: (r: Referencia) => void;
  pagina: number;
  onPagina: (p: number) => void;
}) {
  const qc = useQueryClient();
  const { ads, job } = useAdsDoTema(tema);
  const porRef = useMemo(() => new Map(refs.map((r) => [r.id, r])), [refs]);
  const lista = useMemo(() => {
    const l = [...(ads.data ?? [])];
    // Mais tempo no ar primeiro; empate, mais variações.
    l.sort(
      (a, b) => (a.inicio ?? "9999").localeCompare(b.inicio ?? "9999") || b.variantes - a.variantes,
    );
    return l;
  }, [ads.data]);
  const POR = 10;
  const total = Math.max(1, Math.ceil(lista.length / POR));
  const pag = Math.min(pagina, total - 1);
  const visiveis = lista.slice(pag * POR, pag * POR + POR);
  const buscando = job.data && !["pronto", "erro"].includes(job.data.status);
  const invalidar = () => qc.invalidateQueries({ queryKey: ["vedit"] });

  // Quando a busca termina, recarrega a lista.
  if (job.data?.status === "pronto" && ads.data && !ads.isFetching) {
    const n = job.data.resultado?.encontrados ?? 0;
    if (n > 0 && ads.data.length === 0) void ads.refetch();
  }

  if (!tema)
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Digite o tema e clique em <b>Buscar</b> para procurar anúncios de vídeo ativos na
          Biblioteca de Anúncios da Meta.
        </CardContent>
      </Card>
    );
  return (
    <>
      {buscando && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procurando na Biblioteca de Anúncios (1 a
          2 minutos)…
        </div>
      )}
      {job.data?.status === "erro" && (
        <div className="text-xs text-red-600">Busca falhou: {job.data.erro}</div>
      )}
      {lista.length === 0 && !buscando ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum anúncio encontrado para "{tema}". Tente um tema mais amplo ou em outras palavras.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((a) => (
              <CartaoAd
                key={a.id}
                a={a}
                referencia={a.referencia_id ? porRef.get(a.referencia_id) : undefined}
                onAbrirRef={onAbrirRef}
                onMudou={invalidar}
              />
            ))}
          </div>
          {lista.length > POR && (
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>
                {pag + 1} de {total}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onPagina((pag + 1) % total);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {pag + 1 < total ? "Ver outros 10" : "Voltar aos primeiros"}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
