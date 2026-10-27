// Música do Instagram (as em alta ou buscadas) para o post. A API só aceita música em Reels:
// quem usa decide o que fazer com isso (carrossel vira Reel com os slides em vídeo).
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Music2, Play, Search, Square, X } from "lucide-react";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { cn } from "@/lib/utils";

export type MusicaIg = {
  audio_id: string;
  titulo: string;
  artista: string;
  duracao: number | null;
  capa: string | null;
  previa?: string | null;
};

export function MusicaInstagram({
  valor,
  onChange,
}: {
  valor: MusicaIg | null;
  onChange: (m: MusicaIg | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [tocando, setTocando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  const lista = useQuery({
    queryKey: ["ig-musicas", termo],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const r = await callEdgeFunction("publicar-agendados", { acao: "musicas", busca: termo });
      if (r.error) throw new Error(r.error);
      return (r.musicas ?? []) as MusicaIg[];
    },
  });

  async function ouvir(m: MusicaIg) {
    if (tocando === m.audio_id) {
      audio.current?.pause();
      setTocando(null);
      return;
    }
    audio.current?.pause();
    try {
      const r = await callEdgeFunction("publicar-agendados", {
        acao: "previa",
        audio_id: m.audio_id,
      });
      if (r.previa) {
        audio.current = new Audio(r.previa);
        audio.current.onended = () => setTocando(null);
        await audio.current.play();
        setTocando(m.audio_id);
      } else if (r.link) window.open(r.link, "_blank", "noopener");
      else toast.info("O Instagram não liberou a prévia desta música.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const mmss = (s: number | null) =>
    s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";

  return (
    <div className="rounded-lg border p-2 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Music2 className="h-4 w-4" /> Música do Instagram
        {valor && (
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-700">
            <Check className="h-3.5 w-3.5" /> {valor.titulo} · {valor.artista}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-red-600"
              onClick={() => onChange(null)}
              title="Tirar a música"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-8 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setTermo(busca.trim())}
          placeholder="Buscar música ou artista (vazio = em alta)"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setTermo(busca.trim())}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {termo ? `Resultados para "${termo}"` : "Em alta agora no Instagram"} · só aparecem as
        liberadas para publicar por sistema
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {lista.isLoading && (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {lista.error && <p className="text-xs text-red-600">{(lista.error as Error).message}</p>}
        {(lista.data ?? []).map((m) => {
          const on = valor?.audio_id === m.audio_id;
          return (
            <div
              key={m.audio_id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                on ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              <button
                type="button"
                onClick={() => ouvir(m)}
                className="h-7 w-7 shrink-0 rounded-full border flex items-center justify-center"
                title="Ouvir"
              >
                {tocando === m.audio_id ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </button>
              {m.capa && <img src={m.capa} className="h-8 w-8 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.artista} {m.duracao ? `· ${mmss(m.duracao)}` : ""}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                className="h-7"
                onClick={() => onChange(on ? null : m)}
              >
                {on ? "Escolhida" : "Usar"}
              </Button>
            </div>
          );
        })}
        {lista.data && !lista.data.length && (
          <p className="text-xs text-muted-foreground py-2">Nada encontrado.</p>
        )}
      </div>
    </div>
  );
}
