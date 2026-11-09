// Correção de imagem (luz/cor) e lista de sons aplicados, no painel "Na edição".
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, Sun, Trash2, Volume2, Wand2 } from "lucide-react";
import type { Timeline } from "@/video/schema";
import { paraSaida, type Trecho } from "@/video/tempo";
import { fmtTempo } from "@/lib/vedit";
import { sonsAutomaticos } from "@/video/sonsAuto";

type Visual = Timeline["visual"];
const NEUTRO: Pick<
  Visual,
  "brilho" | "contraste" | "saturacao" | "temperatura" | "sombras" | "nitidez"
> = {
  brilho: 1,
  contraste: 1,
  saturacao: 1,
  temperatura: 0,
  sombras: 0,
  nitidez: 0,
};

/** Lê alguns quadros do vídeo e calcula a correção: exposição, contraste, saturação e balanço de branco. */
export async function medirCorrecao(url: string, tempos: number[]) {
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error("não consegui ler o vídeo"));
  });
  const W = 160,
    H = Math.round((160 * v.videoHeight) / Math.max(1, v.videoWidth));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  let somaL = 0,
    somaL2 = 0,
    somaS = 0,
    somaR = 0,
    somaB = 0,
    escuros = 0,
    n = 0;
  for (const t of tempos) {
    await new Promise<void>((res) => {
      const to = setTimeout(res, 3000);
      v.onseeked = () => {
        clearTimeout(to);
        res();
      };
      v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.1));
    });
    ctx.drawImage(v, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255,
        g = d[i + 1] / 255,
        b = d[i + 2] / 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b),
        mn = Math.min(r, g, b);
      somaL += l;
      somaL2 += l * l;
      somaS += mx ? (mx - mn) / mx : 0;
      somaR += r;
      somaB += b;
      if (l < 0.18) escuros++;
      n++;
    }
  }
  v.removeAttribute("src");
  v.load();
  const media = somaL / n;
  const desvio = Math.sqrt(Math.max(0, somaL2 / n - media * media));
  const sat = somaS / n;
  const rb = (somaR - somaB) / n; // >0 amarelado, <0 azulado
  const fracEscura = escuros / n;
  const lim = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
  return {
    brilho: +lim(0.46 / Math.max(0.12, media), 0.85, 1.35).toFixed(2), // alvo de exposição ~46%
    contraste: +lim(0.2 / Math.max(0.06, desvio), 0.9, 1.25).toFixed(2), // alvo de desvio ~0.20
    saturacao: +lim(0.32 / Math.max(0.08, sat), 0.85, 1.3).toFixed(2), // alvo ~32%
    temperatura: +lim(-rb * 4, -0.6, 0.6).toFixed(2), // neutraliza o tom dominante
    sombras: +lim((fracEscura - 0.15) * 2, 0, 0.6).toFixed(2),
    nitidez: 0.25,
  };
}

export function CorrecaoImagem({
  tl,
  setTl,
  amostra,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  amostra?: { url?: string; tempos: number[] };
}) {
  const [medindo, setMedindo] = useState(false);
  const v = tl.visual;
  const set = (patch: Partial<Visual>, resumo: string) =>
    setTl({ ...tl, visual: { ...v, ...patch } }, resumo);
  const linhas: {
    k: keyof typeof NEUTRO;
    nome: string;
    min: number;
    max: number;
    step: number;
    fmt: (x: number) => string;
  }[] = [
    {
      k: "brilho",
      nome: "Brilho",
      min: 0.6,
      max: 1.5,
      step: 0.01,
      fmt: (x) => `${Math.round((x - 1) * 100)}`,
    },
    {
      k: "contraste",
      nome: "Contraste",
      min: 0.6,
      max: 1.5,
      step: 0.01,
      fmt: (x) => `${Math.round((x - 1) * 100)}`,
    },
    {
      k: "saturacao",
      nome: "Saturação",
      min: 0,
      max: 2,
      step: 0.01,
      fmt: (x) => `${Math.round((x - 1) * 100)}`,
    },
    {
      k: "temperatura",
      nome: "Temperatura",
      min: -1,
      max: 1,
      step: 0.01,
      fmt: (x) =>
        x > 0 ? `+${Math.round(x * 100)} quente` : x < 0 ? `${Math.round(x * 100)} frio` : "0",
    },
    {
      k: "sombras",
      nome: "Sombras (clarear rosto)",
      min: 0,
      max: 1,
      step: 0.01,
      fmt: (x) => `${Math.round(x * 100)}`,
    },
    {
      k: "nitidez",
      nome: "Nitidez",
      min: 0,
      max: 1,
      step: 0.01,
      fmt: (x) => `${Math.round(x * 100)}`,
    },
  ];
  async function automatico() {
    if (!amostra?.url) return toast.error("O vídeo ainda não carregou.");
    setMedindo(true);
    try {
      const c = await medirCorrecao(amostra.url, amostra.tempos);
      set(c, "Correção automática de luz e cor");
      toast.success("Luz e cor corrigidas. Ajuste fino nos controles se quiser.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMedindo(false);
    }
  }
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sun className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Imagem e luz
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-xs"
          onClick={() => set(NEUTRO, "Imagem original")}
          title="Voltar ao original"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={automatico}
        disabled={medindo}
      >
        {medindo ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4 mr-2" />
        )}
        Corrigir luz e cor automaticamente
      </Button>
      {linhas.map((l) => (
        <div key={l.k} className="space-y-1">
          <Label className="text-xs flex justify-between">
            <span>{l.nome}</span>
            <span className="text-muted-foreground tabular-nums">{l.fmt(v[l.k])}</span>
          </Label>
          <Slider
            min={l.min}
            max={l.max}
            step={l.step}
            value={[v[l.k]]}
            onValueChange={([x]) => set({ [l.k]: x } as Partial<Visual>, `${l.nome} ajustado`)}
          />
        </div>
      ))}
    </section>
  );
}

export function SonsAplicados({
  tl,
  setTl,
  trechos,
  onIr,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  trechos: Trecho[];
  onIr: (segundosOriginal: number) => void;
}) {
  const sons = tl.sfx.map((s, i) => ({ ...s, i })).sort((a, b) => a.em - b.em);
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sons ({sons.length})
        </span>
        {sons.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setTl({ ...tl, sfx: [] }, "Removeu todos os sons")}
          >
            Tirar todos
          </Button>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={() => {
          const novos = sonsAutomaticos(tl, trechos);
          setTl(
            { ...tl, sfx: novos },
            `Sons automáticos: ${novos.length} sons nas entradas dos grafismos e nos cortes`,
          );
          toast.success(
            `${novos.length} sons colocados: whoosh no movimento, pop no que aparece, clique nos cortes, digitando no texto. Ajuste o volume de cada um abaixo.`,
          );
        }}
      >
        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
        {sons.length
          ? "Refazer sons automaticamente (substitui os atuais)"
          : "Colocar sons automaticamente"}
      </Button>
      {sons.length === 0 && (
        <div className="text-xs text-muted-foreground">Nenhum efeito sonoro.</div>
      )}
      {sons.map((s) => (
        <div key={s.i} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
          <button
            className="text-xs font-mono text-muted-foreground hover:text-foreground"
            onClick={() => onIr(s.em)}
          >
            {fmtTempo(paraSaida(trechos, s.em))}
          </button>
          <span className="text-sm flex-1 truncate">{s.som}</span>
          <Slider
            className="w-20"
            min={0}
            max={1}
            step={0.05}
            value={[s.volume]}
            onValueChange={([x]) =>
              setTl(
                { ...tl, sfx: tl.sfx.map((y, j) => (j === s.i ? { ...y, volume: x } : y)) },
                `Volume do som ${s.som}`,
              )
            }
          />
          <button
            className="h-7 w-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
            title="Remover som"
            onClick={() =>
              setTl({ ...tl, sfx: tl.sfx.filter((_, j) => j !== s.i) }, `Removeu o som ${s.som}`)
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </section>
  );
}

type AjusteCor = Timeline["ajustesCor"][number];
const COR_NEUTRA = { brilho: 1, contraste: 1, saturacao: 1, temperatura: 0 };
const LINHAS_BLOCO: {
  k: keyof typeof COR_NEUTRA;
  nome: string;
  min: number;
  max: number;
  fmt: (x: number) => string;
}[] = [
  { k: "brilho", nome: "Brilho", min: 0.6, max: 1.5, fmt: (x) => `${Math.round((x - 1) * 100)}` },
  {
    k: "contraste",
    nome: "Contraste",
    min: 0.6,
    max: 1.5,
    fmt: (x) => `${Math.round((x - 1) * 100)}`,
  },
  { k: "saturacao", nome: "Saturação", min: 0, max: 2, fmt: (x) => `${Math.round((x - 1) * 100)}` },
  {
    k: "temperatura",
    nome: "Temperatura",
    min: -1,
    max: 1,
    fmt: (x) =>
      x > 0 ? `+${Math.round(x * 100)} quente` : x < 0 ? `${Math.round(x * 100)} frio` : "0",
  },
];

/**
 * Luz e cor por bloco: ajusta só o corte que está no player, ou a gravação inteira (quando o vídeo
 * foi juntado de duas gravações). Fica em segundos do original, então sobrevive a ajustes de corte.
 */
export function CorPorBloco({
  tl,
  setTl,
  trechos,
  agora,
  duracaoFonte,
  onIr,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  trechos: Trecho[];
  agora: number;
  duracaoFonte: number;
  onIr: (segundosOriginal: number) => void;
}) {
  const emendas = [...(tl.emendas ?? [])].map((e) => e.em).sort((a, b) => a - b);
  const temGravacoes = emendas.length > 0;
  const [escopo, setEscopo] = useState<"corte" | "gravacao">("corte");
  const ajustes = tl.ajustesCor ?? [];

  // Bloco do player: o trecho que contém o instante atual (ou o mais perto).
  let idx = trechos.findIndex((t) => agora >= t.de - 0.01 && agora <= t.ate + 0.01);
  if (idx < 0 && trechos.length)
    idx = trechos.reduce(
      (m, t, k) =>
        Math.abs((t.de + t.ate) / 2 - agora) <
        Math.abs((trechos[m].de + trechos[m].ate) / 2 - agora)
          ? k
          : m,
      0,
    );
  const trecho = trechos[idx];
  const limites = [0, ...emendas, duracaoFonte || Infinity];
  const g = Math.max(
    0,
    limites.findIndex((x, k) => k < limites.length - 1 && agora >= x && agora < limites[k + 1]),
  );
  const alvo =
    escopo === "gravacao" && temGravacoes
      ? { de: limites[g], ate: limites[g + 1], nome: `Gravação ${g + 1}` }
      : trecho
        ? { de: trecho.de, ate: trecho.ate, nome: `Corte ${idx + 1}` }
        : null;

  const mesmo = (a: AjusteCor) =>
    alvo && Math.abs(a.de - alvo.de) < 0.05 && Math.abs(a.ate - alvo.ate) < 0.05;
  const atual = ajustes.find(mesmo);
  const val = { ...COR_NEUTRA, ...(atual ?? {}) };

  function set(k: keyof typeof COR_NEUTRA, x: number) {
    if (!alvo) return;
    const novo: AjusteCor = { ...COR_NEUTRA, ...(atual ?? {}), de: alvo.de, ate: alvo.ate, [k]: x };
    const lista = atual ? ajustes.map((a) => (a === atual ? novo : a)) : [...ajustes, novo];
    setTl({ ...tl, ajustesCor: lista }, `${alvo.nome}: luz e cor ajustadas`);
  }
  function tirar(a: AjusteCor) {
    setTl({ ...tl, ajustesCor: ajustes.filter((x) => x !== a) }, "Ajuste de bloco removido");
  }
  const nomeDe = (a: AjusteCor) => {
    const k = limites.findIndex(
      (x, j) =>
        j < limites.length - 1 &&
        Math.abs(x - a.de) < 0.05 &&
        Math.abs(limites[j + 1] - a.ate) < 0.05,
    );
    if (temGravacoes && k >= 0) return `Gravação ${k + 1}`;
    const t = trechos.findIndex((x) => (x.de + x.ate) / 2 >= a.de && (x.de + x.ate) / 2 <= a.ate);
    return t >= 0 ? `Corte ${t + 1}` : "Bloco removido da edição";
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sun className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Luz por bloco
        </span>
        {atual && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs"
            onClick={() => tirar(atual)}
            title="Voltar este bloco ao original"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Ajusta só o bloco que está no player. Mova o player para escolher outro.
      </p>
      {temGravacoes && (
        <div className="grid grid-cols-2 gap-1">
          {(["corte", "gravacao"] as const).map((e) => (
            <Button
              key={e}
              variant={escopo === e ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEscopo(e)}
            >
              {e === "corte" ? "Só este corte" : "Gravação inteira"}
            </Button>
          ))}
        </div>
      )}
      {alvo ? (
        <>
          <div className="text-xs font-medium">
            {alvo.nome}{" "}
            <span className="text-muted-foreground tabular-nums">
              ({fmtTempo(paraSaida(trechos, Math.max(alvo.de, trechos[0]?.de ?? 0)))})
            </span>
          </div>
          {LINHAS_BLOCO.map((l) => (
            <div key={l.k} className="space-y-1">
              <Label className="text-xs flex justify-between">
                <span>{l.nome}</span>
                <span className="text-muted-foreground tabular-nums">{l.fmt(val[l.k])}</span>
              </Label>
              <Slider
                min={l.min}
                max={l.max}
                step={0.01}
                value={[val[l.k]]}
                onValueChange={([x]) => set(l.k, x)}
              />
            </div>
          ))}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum trecho no player.</p>
      )}
      {ajustes.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-xs text-muted-foreground">Blocos ajustados</div>
          {ajustes.map((a, k) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <button
                className="flex-1 text-left hover:underline"
                onClick={() => onIr(a.de + 0.05)}
              >
                {nomeDe(a)}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => tirar(a)}
                title="Tirar ajuste"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
