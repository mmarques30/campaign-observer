// Voz limpa: o servidor tira o ruído de fundo, equaliza e nivela o volume (3 intensidades).
// Aqui liga/desliga, escolhe a intensidade, compara com o original e ajusta o volume da voz.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mic, Play, Square } from "lucide-react";
import type { JobVoz } from "@/lib/vedit";
import type { Timeline } from "@/video/schema";
import { cn } from "@/lib/utils";

type Nivel = Timeline["audio"]["intensidade"];
export type VozProps = {
  job: JobVoz | null;
  urls?: Partial<Record<Nivel, string>>;
  original?: string; // áudio da transcrição (sem tratamento)
  pedir: () => Promise<void>;
  // Pausa o preview: a comparação toca a voz sozinha (com o preview tocando junto ficava em eco).
  pausarPreview?: () => void;
};

const NIVEIS: { v: Nivel; nome: string; dica: string }[] = [
  { v: "leve", nome: "Leve", dica: "Ambiente já silencioso: só tira o chiado." },
  { v: "media", nome: "Média", dica: "Ventilador, ar-condicionado, ruído de rua." },
  { v: "forte", nome: "Forte", dica: "Barulho alto. Pode deixar a voz um pouco 'seca'." },
];

export function VozLimpa({
  tl,
  setTl,
  agora,
  job,
  urls,
  original,
  pedir,
  pausarPreview,
}: VozProps & { tl: Timeline; setTl: (t: Timeline, resumo: string) => void; agora: number }) {
  const [pedindo, setPedindo] = useState(false);
  const [tocando, setTocando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const a = tl.audio;
  const set = (patch: Partial<Timeline["audio"]>, resumo: string) =>
    setTl({ ...tl, audio: { ...a, ...patch } }, resumo);

  useEffect(() => {
    // Deu play no preview: para a comparação (senão as duas vozes tocam juntas).
    const parar = () => {
      audio.current?.pause();
      setTocando(null);
    };
    window.addEventListener("vedit-preview-play", parar);
    return () => {
      window.removeEventListener("vedit-preview-play", parar);
      audio.current?.pause();
    };
  }, []);

  function ouvir(qual: string, url?: string) {
    audio.current?.pause();
    if (tocando === qual || !url) {
      setTocando(null);
      return;
    }
    pausarPreview?.();
    const el = new Audio(url);
    audio.current = el;
    // A posição só vale depois de carregar os metadados (antes disso o salto é ignorado).
    el.addEventListener(
      "loadedmetadata",
      () => {
        el.currentTime = Math.max(0, agora);
        void el.play().catch(() => {});
      },
      { once: true },
    );
    setTocando(qual);
    const parar = () => {
      el.pause();
      setTocando((t) => (t === qual ? null : t));
    };
    setTimeout(parar, 6000);
    el.onended = parar;
  }

  async function limpar() {
    setPedindo(true);
    try {
      await pedir();
      toast.success("Limpando a voz. Leva 1 a 2 minutos; pode continuar editando.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPedindo(false);
    }
  }

  const pronto = job?.status === "pronto" && !!urls;
  const rodando = job && (job.status === "fila" || job.status === "rodando");

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
          Voz
        </span>
        {pronto && (
          <Switch
            checked={a.limpar}
            onCheckedChange={(v) => set({ limpar: v }, v ? "Voz limpa ligada" : "Voz original")}
          />
        )}
      </div>

      {!job && (
        <>
          <p className="text-[11px] text-muted-foreground">
            Tira o ruído de fundo (ventilador, rua, ar-condicionado), equaliza a voz e deixa o
            volume constante.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={limpar}
            disabled={pedindo}
          >
            {pedindo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Mic className="h-3.5 w-3.5 mr-1.5" />
            )}
            Limpar a voz
          </Button>
        </>
      )}
      {rodando && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Limpando a voz no servidor (1 a 2 min)…
        </div>
      )}
      {job?.status === "erro" && (
        <div className="space-y-1">
          <p className="text-[11px] text-destructive line-clamp-3">
            Não deu para limpar: {job.erro}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={limpar}
            disabled={pedindo}
          >
            Tentar de novo
          </Button>
        </div>
      )}

      {pronto && (
        <>
          <div
            className={cn("grid grid-cols-3 gap-1", !a.limpar && "opacity-50 pointer-events-none")}
          >
            {NIVEIS.map((n) => (
              <button
                key={n.v}
                title={n.dica}
                onClick={() => set({ intensidade: n.v }, `Limpeza de voz ${n.nome.toLowerCase()}`)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  a.intensidade === n.v
                    ? "border-primary bg-primary/10 font-medium"
                    : "hover:bg-muted",
                )}
              >
                {n.nome}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {NIVEIS.find((n) => n.v === a.intensidade)?.dica}
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => ouvir("original", original)}
              disabled={!original}
            >
              {tocando === "original" ? (
                <Square className="h-3 w-3 mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}{" "}
              Original
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => ouvir("limpa", urls?.[a.intensidade])}
            >
              {tocando === "limpa" ? (
                <Square className="h-3 w-3 mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}{" "}
              Limpa
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Compara 6 s a partir de onde está a agulha.
          </p>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Volume da voz: {Math.round(a.volumeVoz * 100)}%</Label>
        <Slider
          min={0.3}
          max={1}
          step={0.05}
          value={[a.volumeVoz]}
          onValueChange={([v]) => set({ volumeVoz: v }, "Volume da voz")}
        />
      </div>
    </section>
  );
}
