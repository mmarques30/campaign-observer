// Imagens sugeridas por tema: o editor lê a fala, escolhe os momentos e traz candidatas.
// Você escolhe a imagem e COMO ela entra (janela, tela cheia, dividida, fundo, react, celular).
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ImagePlus, Loader2, Search, Sparkles } from "lucide-react";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { fmtTempo } from "@/lib/vedit";
import type { Timeline } from "@/video/schema";
import { paraSaida, type Trecho } from "@/video/tempo";
import { cn } from "@/lib/utils";

type Candidata = {
  url: string;
  thumb: string;
  credito: string;
  fonte: string;
  tipo: "imagem" | "video";
  duracao?: number;
};
type Momento = {
  de: number;
  ate: number;
  frase: string;
  tema: string;
  consulta: string;
  tipo: "imagem" | "video";
  modo: Modo;
  motivo?: string;
  candidatas: Candidata[];
};
type Modo = "janela" | "tela-cheia" | "dividir" | "fundo" | "reagir" | "celular";

const MODOS: { v: Modo; nome: string }[] = [
  { v: "janela", nome: "Janela sobre você" },
  { v: "tela-cheia", nome: "Tela cheia (corte)" },
  { v: "dividir", nome: "Tela dividida (em cima)" },
  { v: "fundo", nome: "Atrás de você (fundo)" },
  { v: "reagir", nome: "React (você no canto)" },
  { v: "celular", nome: "Dentro de um celular" },
];

function efeitoPara(modo: Modo, midia: string, temRecorte: boolean) {
  switch (modo) {
    case "janela":
      return { tipo: "broll", props: { midia, modo: "janela" } };
    case "tela-cheia":
      return { tipo: "broll", props: { midia, modo: "tela-cheia" } };
    case "dividir":
      return { tipo: "dividir", props: { midia, lado: "cima", proporcao: 0.5 } };
    case "fundo":
      return temRecorte
        ? { tipo: "tela-verde", props: { midia } }
        : { tipo: "fundo-imagem", props: { midia, tamanho: 0.72 } };
    case "reagir":
      return { tipo: "reagir", props: { midia, canto: "inferior-direito" } };
    case "celular":
      return { tipo: "celular", props: { midia, lado: "direita" } };
  }
}

export function ImagensSugeridas({
  projetoId,
  tl,
  setTl,
  trechos,
  temRecorte,
  onMidiaNova,
  onIr,
  agora,
}: {
  projetoId: string;
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  trechos: Trecho[];
  temRecorte: boolean;
  onMidiaNova: () => Promise<unknown>;
  onIr: (segundosOriginal: number) => void;
  agora: number; // segundo do original onde está a agulha
}) {
  const [carregando, setCarregando] = useState(false);
  const [momentos, setMomentos] = useState<Momento[] | null>(null);
  const [semChave, setSemChave] = useState(false);
  const [sel, setSel] = useState<Record<number, { cand?: number; modo: Modo }>>({});
  const [aplicando, setAplicando] = useState<number | null>(null);
  const [aplicados, setAplicados] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState("");
  const [livres, setLivres] = useState<Candidata[] | null>(null);

  async function sugerir() {
    setCarregando(true);
    try {
      const r: any = await callEdgeFunction("vedit-imagens", { acao: "sugerir", projeto_id: projetoId });
      if (r?.error) throw new Error(r.error);
      setMomentos(r.momentos);
      setSemChave(!r.temChave);
      setSel(Object.fromEntries((r.momentos as Momento[]).map((m, i) => [i, { cand: m.candidatas.length ? 0 : undefined, modo: m.modo }])));
      setAplicados(new Set());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  async function usar(i: number, m: Pick<Momento, "de" | "ate" | "consulta" | "tema">, c: Candidata, modo: Modo) {
    setAplicando(i);
    try {
      const r: any = await callEdgeFunction("vedit-imagens", {
        acao: "salvar",
        projeto_id: projetoId,
        url: c.url,
        nome: m.tema.slice(0, 40),
        credito: c.credito,
        consulta: m.consulta,
        tipo: c.tipo,
      });
      if (r?.error) throw new Error(r.error);
      await onMidiaNova();
      const ef = efeitoPara(modo, r.id, temRecorte);
      const id = `img${Date.now().toString(36)}`;
      setTl(
        {
          ...tl,
          efeitos: [...tl.efeitos, { id, tipo: ef.tipo, de: m.de, ate: Math.max(m.ate, m.de + 2), props: ef.props }],
          sfx: [...tl.sfx, { em: m.de, som: "swipe", volume: 0.4 }],
        },
        `Imagem "${m.tema}" (${MODOS.find((x) => x.v === modo)?.nome})`,
      );
      setAplicados((s) => new Set(s).add(i));
      onIr(m.de);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAplicando(null);
    }
  }

  async function buscarLivre() {
    if (!busca.trim()) return;
    setCarregando(true);
    try {
      const r: any = await callEdgeFunction("vedit-imagens", { acao: "buscar", consulta: busca.trim() });
      if (r?.error) throw new Error(r.error);
      setLivres(r.candidatas);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imagens para o vídeo</span>
      </div>
      <Button size="sm" className="w-full" onClick={sugerir} disabled={carregando}>
        {carregando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {momentos ? "Sugerir de novo" : "Sugerir imagens pela fala"}
      </Button>
      {semChave && momentos && (
        <p className="text-[11px] text-amber-700">
          Usando o Openverse (imagens livres para uso comercial). Com a chave do Pexels as opções ficam muito melhores e
          incluem vídeos.
        </p>
      )}

      {momentos?.map((m, i) => {
        const s = sel[i] ?? { modo: m.modo };
        const feito = aplicados.has(i);
        return (
          <div key={i} className={cn("rounded-lg border p-2 space-y-2", feito && "border-emerald-500/50 bg-emerald-500/5")}>
            <button className="text-left w-full" onClick={() => onIr(m.de)}>
              <div className="text-[11px] text-muted-foreground font-mono">
                {fmtTempo(paraSaida(trechos, m.de))} · {m.tema}
              </div>
              <div className="text-xs line-clamp-2">"{m.frase}"</div>
            </button>
            {m.candidatas.length ? (
              <div className="grid grid-cols-3 gap-1">
                {m.candidatas.map((c, k) => (
                  <button
                    key={k}
                    title={c.credito}
                    onClick={() => setSel((x) => ({ ...x, [i]: { ...s, cand: k } }))}
                    className={cn(
                      "relative aspect-[3/4] rounded overflow-hidden border-2",
                      s.cand === k ? "border-primary" : "border-transparent",
                    )}
                  >
                    <img src={c.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {c.tipo === "video" && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/70 text-white px-1 rounded">vídeo</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">Nada encontrado para "{m.consulta}".</div>
            )}
            <div className="flex gap-1.5">
              <Select value={s.modo} onValueChange={(v) => setSel((x) => ({ ...x, [i]: { ...s, modo: v as Modo } }))}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS.map((x) => (
                    <SelectItem key={x.v} value={x.v} className="text-xs">
                      {x.nome}
                      {x.v === "fundo" && !temRecorte ? " (com moldura)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={s.cand === undefined || aplicando === i}
                onClick={() => s.cand !== undefined && usar(i, m, m.candidatas[s.cand], s.modo)}
              >
                {aplicando === i ? <Loader2 className="h-3 w-3 animate-spin" /> : feito ? <Check className="h-3 w-3" /> : "Usar"}
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex gap-1.5">
        <Input
          className="h-8 text-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscarLivre()}
          placeholder="Buscar outra (em inglês: office, whatsapp…)"
        />
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={buscarLivre} disabled={carregando}>
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>
      {livres && (
        <div className="grid grid-cols-3 gap-1">
          {livres.map((c, k) => (
            <button
              key={k}
              title={`${c.credito} — clique para colocar no ponto atual`}
              className="aspect-[3/4] rounded overflow-hidden border hover:border-primary"
              onClick={() => {
                void usar(1000 + k, { de: agora, ate: agora + 3, consulta: busca, tema: busca }, c, "janela");
              }}
            >
              <img src={c.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
