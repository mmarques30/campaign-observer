// Cortes pelo roteiro: o texto falado inteiro, palavra por palavra.
// Riscado = fora do vídeo. Marque um trecho (clique + Shift+clique, ou arraste) e corte ou restaure.
// Pausas longas que ficaram no vídeo aparecem como ⏸ e encurtam com um clique.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play, RotateCcw, Scissors, X } from "lucide-react";
import { fmtTempo } from "@/lib/vedit";
import type { Palavra, Timeline } from "@/video/schema";
import { duracaoSaida, type Trecho } from "@/video/tempo";
import { frasear } from "@/video/repeticoes";
import {
  encurtarPausa,
  intervaloParaCortar,
  intervaloParaRestaurar,
  palavraMantida,
  pausasLongas,
  removerIntervalo,
  restaurarIntervalo,
  type Pausa,
} from "@/video/cortes";
import { cn } from "@/lib/utils";

export function Roteiro({
  palavras,
  tl,
  setTl,
  trechos,
  duracaoFonte,
  agora,
  onIr,
}: {
  palavras: Palavra[];
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  trechos: Trecho[];
  duracaoFonte: number;
  agora: number; // segundo do original onde está a agulha
  onIr: (segundosOriginal: number) => void;
}) {
  const [ancora, setAncora] = useState<number | null>(null);
  const [fim, setFim] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [minimo, setMinimo] = useState(0.7);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const solta = () => setArrastando(false);
    window.addEventListener("mouseup", solta);
    return () => window.removeEventListener("mouseup", solta);
  }, []);

  const mantida = useMemo(
    () => palavras.map((w) => palavraMantida(trechos, w)),
    [palavras, trechos],
  );
  const frases = useMemo(() => frasear(palavras, 0.6), [palavras]);
  const pausas = useMemo(
    () => pausasLongas(palavras, trechos, minimo),
    [palavras, trechos, minimo],
  );
  // Pausa → índice da palavra que vem logo depois dela (onde o ⏸ aparece).
  const pausaAntesDe = useMemo(() => {
    const m = new Map<number, Pausa>();
    for (const p of pausas) {
      let k = palavras.findIndex((w) => w.i >= p.ate - 0.001);
      if (k < 0) k = palavras.length;
      m.set(k, p);
    }
    return m;
  }, [pausas, palavras]);

  const sel =
    ancora == null
      ? null
      : ([Math.min(ancora, fim ?? ancora), Math.max(ancora, fim ?? ancora)] as const);
  const naSel = (k: number) => !!sel && k >= sel[0] && k <= sel[1];
  const selTemMantida = sel ? mantida.slice(sel[0], sel[1] + 1).some(Boolean) : false;
  const selTemCortada = sel ? mantida.slice(sel[0], sel[1] + 1).some((v) => !v) : false;
  const textoSel = sel
    ? palavras
        .slice(sel[0], sel[1] + 1)
        .map((w) => w.p)
        .join(" ")
    : "";
  const legendaOculta = sel ? tl.legenda.correcoes[String(sel[0])] === "" : false;
  const falandoAgora = palavras.findIndex((w) => agora >= w.i && agora < w.f + 0.05);

  const limpar = () => {
    setAncora(null);
    setFim(null);
  };

  function cortar() {
    if (!sel) return;
    const { de, ate } = intervaloParaCortar(palavras, sel[0], sel[1], duracaoFonte);
    setTl(
      { ...tl, cortes: removerIntervalo(tl.cortes, de, ate, duracaoFonte) },
      `Cortou "${resumir(textoSel)}"`,
    );
    limpar();
  }
  function restaurar() {
    if (!sel) return;
    const { de, ate } = intervaloParaRestaurar(palavras, sel[0], sel[1]);
    setTl(
      { ...tl, cortes: restaurarIntervalo(tl.cortes, de, ate, duracaoFonte) },
      `Voltou "${resumir(textoSel)}"`,
    );
    limpar();
  }
  function encurtar(p: Pausa) {
    setTl(
      { ...tl, cortes: encurtarPausa(tl.cortes, p, duracaoFonte) },
      `Pausa de ${p.duracao.toFixed(1)}s encurtada`,
    );
  }
  function encurtarTodas() {
    let c = tl.cortes;
    // Do fim para o começo: cada corte não mexe nos tempos das pausas anteriores (tempo é do original).
    for (const p of [...pausas].reverse()) c = encurtarPausa(c, p, duracaoFonte);
    setTl({ ...tl, cortes: c }, `${pausas.length} pausas longas encurtadas`);
  }

  function clique(k: number, e: React.MouseEvent) {
    if (e.shiftKey && ancora != null) setFim(k);
    else {
      setAncora(k);
      setFim(k);
    }
  }

  if (!palavras.length)
    return <p className="text-xs text-muted-foreground py-4">A transcrição ainda não terminou.</p>;

  const final = duracaoSaida(trechos);

  return (
    <div className="space-y-3 pt-1">
      <div className="text-[11px] text-muted-foreground leading-snug">
        Riscado = fora do vídeo. Clique numa palavra e <b>Shift+clique</b> em outra (ou arraste)
        para marcar um trecho, depois corte ou traga de volta. Duração final{" "}
        <b>{fmtTempo(final)}</b> de {fmtTempo(duracaoFonte)} · {trechos.length} trecho(s).
      </div>

      <div className="rounded-lg border p-2 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Pause className="h-3.5 w-3.5 text-amber-600" />
          <span className="flex-1">
            <b>{pausas.length}</b> pausa(s) acima de {minimo.toFixed(1)}s no vídeo
          </span>
          {pausas.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={encurtarTodas}>
              Encurtar todas
            </Button>
          )}
        </div>
        <Slider
          min={0.4}
          max={2}
          step={0.1}
          value={[minimo]}
          onValueChange={([v]) => setMinimo(v)}
        />
        {pausas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pausas.map((p, i) => (
              <button
                key={i}
                className="text-[11px] rounded border px-1.5 py-0.5 hover:bg-muted font-mono"
                onClick={() => onIr(Math.max(0, p.de - 1))}
                title="Ir para a pausa"
              >
                {fmtTempo(p.de)} · {p.duracao.toFixed(1)}s
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && (
        <div className="sticky top-0 z-10 rounded-lg border bg-background shadow-sm p-2 space-y-1.5">
          <div className="text-[11px] text-muted-foreground line-clamp-2">
            {fmtTempo(palavras[sel[0]].i)}–{fmtTempo(palavras[sel[1]].f)} · "{textoSel}"
          </div>
          <div className="flex gap-1.5">
            {selTemMantida && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs flex-1"
                onClick={cortar}
              >
                <Scissors className="h-3.5 w-3.5 mr-1" /> Cortar
              </Button>
            )}
            {selTemCortada && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs flex-1"
                onClick={restaurar}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Trazer de volta
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              title={
                legendaOculta
                  ? "Volta a mostrar a legenda destas palavras"
                  : "Tira a legenda destas palavras (a fala continua)"
              }
              onClick={() => {
                if (!sel) return;
                const corr = { ...tl.legenda.correcoes };
                for (let k = sel[0]; k <= sel[1]; k++) {
                  if (legendaOculta) delete corr[String(k)];
                  else corr[String(k)] = "";
                }
                setTl(
                  { ...tl, legenda: { ...tl.legenda, correcoes: corr } },
                  legendaOculta ? "Legenda de volta" : "Legenda apagada no trecho",
                );
                limpar();
              }}
            >
              {legendaOculta ? "Mostrar legenda" : "Sem legenda"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              title="Ouvir a partir daqui"
              onClick={() => onIr(Math.max(0, palavras[sel[0]].i - 0.8))}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Desmarcar"
              onClick={limpar}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div ref={caixa} className="space-y-2 text-[13px] leading-6 select-none">
        {frases.map((fr) => (
          <p key={fr.idx} className="group">
            <button
              className="mr-1 text-[10px] font-mono text-muted-foreground hover:text-foreground align-middle"
              onClick={() => onIr(fr.de)}
              title="Ir para esta frase"
            >
              {fmtTempo(fr.de)}
            </button>
            {Array.from({ length: fr.ultima - fr.primeira + 1 }, (_, j) => fr.primeira + j).map(
              (k) => {
                const w = palavras[k];
                const p = pausaAntesDe.get(k);
                return (
                  <span key={k}>
                    {p && (
                      <button
                        className="mx-0.5 inline-flex items-center rounded bg-amber-500/15 text-amber-700 px-1 text-[10px] font-mono align-middle hover:bg-amber-500/30"
                        onClick={() => encurtar(p)}
                        title="Pausa longa no vídeo: clique para encurtar"
                      >
                        ⏸ {p.duracao.toFixed(1)}s
                      </button>
                    )}
                    <span
                      onMouseDown={(e) => {
                        if (e.shiftKey && ancora != null) setFim(k);
                        else {
                          setAncora(k);
                          setFim(k);
                          setArrastando(true);
                        }
                      }}
                      onMouseEnter={() => arrastando && setFim(k)}
                      onClick={(e) => e.shiftKey && clique(k, e)}
                      onDoubleClick={() => onIr(Math.max(0, w.i - 0.5))}
                      className={cn(
                        "cursor-pointer rounded px-[1px]",
                        !mantida[k] &&
                          "line-through text-muted-foreground/60 decoration-red-500/70",
                        mantida[k] &&
                          tl.legenda.correcoes[String(k)] === "" &&
                          "underline decoration-dotted decoration-amber-500",
                        naSel(k) && "bg-primary/20",
                        k === falandoAgora && "ring-1 ring-primary",
                      )}
                      title={`${w.i.toFixed(2)}s · duplo clique para ouvir`}
                    >
                      {w.p}
                    </span>{" "}
                  </span>
                );
              },
            )}
          </p>
        ))}
        {pausaAntesDe.get(palavras.length) && (
          <button
            className="inline-flex items-center rounded bg-amber-500/15 text-amber-700 px-1 text-[10px] font-mono hover:bg-amber-500/30"
            onClick={() => encurtar(pausaAntesDe.get(palavras.length)!)}
          >
            ⏸ {pausaAntesDe.get(palavras.length)!.duracao.toFixed(1)}s no fim
          </button>
        )}
      </div>
    </div>
  );
}

const resumir = (t: string) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);
