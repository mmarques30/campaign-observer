// Trilha sonora no painel "Na edição": escolher, ouvir, volume equilibrado e quanto baixa na voz.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Music, Pause, Play, Wand2 } from "lucide-react";
import type { Timeline } from "@/video/schema";
import { VOLUME_MUSICA } from "@/video/trilhas";
import { chaveTrilha, listarTrilhas, sugerirTrilha, urlTrilha, type Trilha } from "@/lib/trilhas";

export function TrilhaSonora({
  tl,
  setTl,
  objetivo,
  estilo,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  objetivo: string;
  estilo: string;
}) {
  const q = useQuery({ queryKey: ["vedit", "trilhas"], queryFn: listarTrilhas, staleTime: 60_000 });
  const lista = q.data ?? [];
  const atual = lista.find((t) => chaveTrilha(t) === tl.musica.midia);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);

  const escolher = (t: Trilha | null, resumo?: string) =>
    setTl(
      {
        ...tl,
        musica: t
          ? {
              ...tl.musica,
              midia: chaveTrilha(t),
              ganho: t.ganho,
              volume: VOLUME_MUSICA[objetivo === "anuncio" ? "anuncio" : "organico"],
              abaixarNaVoz: true,
            }
          : { ...tl.musica, midia: null },
      },
      resumo ?? (t ? `Trilha: ${t.nome}` : "Sem música"),
    );
  async function ouvir() {
    if (tocando) {
      audio.current?.pause();
      setTocando(false);
      return;
    }
    if (!atual) return;
    const u = await urlTrilha(atual);
    if (!u) return;
    audio.current?.pause();
    audio.current = new Audio(u);
    audio.current.volume = Math.min(1, 0.6 * atual.ganho);
    audio.current.onended = () => setTocando(false);
    await audio.current.play();
    setTocando(true);
  }
  const usandoMidiaDoProjeto = !!tl.musica.midia && !atual;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Music className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Trilha sonora
        </span>
        <Link
          to="/ads/edicao/trilhas"
          className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
        >
          buscar mais músicas
        </Link>
      </div>
      <div className="flex gap-2">
        <Select
          value={atual ? atual.id : usandoMidiaDoProjeto ? "__midia" : "__sem"}
          onValueChange={(v) => {
            if (v === "__sem") escolher(null);
            else {
              const t = lista.find((x) => x.id === v);
              if (t) escolher(t);
            }
          }}
        >
          <SelectTrigger className="h-8 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__sem">Sem música</SelectItem>
            {usandoMidiaDoProjeto && (
              <SelectItem value="__midia">Áudio enviado no projeto</SelectItem>
            )}
            {lista.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome} ·{" "}
                {t.energia === "alta" ? "energia alta" : t.energia === "media" ? "média" : "calma"}
                {t.base ? "" : " · marca"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={ouvir}
          disabled={!atual}
          title="Ouvir a faixa"
        >
          {tocando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={!lista.length}
        onClick={() => {
          const t = sugerirTrilha(lista, objetivo, estilo);
          if (t)
            escolher(
              t,
              `Trilha escolhida para ${objetivo === "anuncio" ? "anúncio" : "orgânico"} ${estilo}: ${t.nome}`,
            );
        }}
      >
        <Wand2 className="h-4 w-4 mr-2" /> Escolher pela edição (
        {objetivo === "anuncio" ? "anúncio" : "orgânico"}, {estilo})
      </Button>
      {tl.musica.midia && (
        <>
          {atual && <p className="text-[11px] text-muted-foreground">{atual.uso}</p>}
          <div className="space-y-1">
            <Label className="text-xs flex justify-between">
              <span>Volume da música</span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round(tl.musica.volume * 100)}
              </span>
            </Label>
            <Slider
              min={0}
              max={0.5}
              step={0.01}
              value={[tl.musica.volume]}
              onValueChange={([v]) =>
                setTl({ ...tl, musica: { ...tl.musica, volume: v } }, "Volume da música")
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex justify-between">
              <span>Quanto baixa quando você fala</span>
              <span className="text-muted-foreground tabular-nums">
                {tl.musica.abaixarNaVoz
                  ? `${Math.round(20 * Math.log10(tl.musica.abaixarPara))} dB`
                  : "não baixa"}
              </span>
            </Label>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={[tl.musica.abaixarNaVoz ? tl.musica.abaixarPara : 1]}
              onValueChange={([v]) =>
                setTl(
                  { ...tl, musica: { ...tl.musica, abaixarPara: v, abaixarNaVoz: v < 1 } },
                  "Ducking da música",
                )
              }
            />
          </div>
        </>
      )}
    </section>
  );
}
