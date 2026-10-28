// Música do Instagram para o post: em alta (com a posição no ranking), busca e as salvas.
// A API do Instagram só aceita música em Reels; quem usa decide o que fazer com isso
// (carrossel vira Reel com os slides em vídeo). A API não lista os áudios salvos no perfil:
// "Salvas" é a lista da própria Mari dentro do sistema (estrela em qualquer música).
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Flame, Loader2, Music2, Play, Search, Square, Star, X } from "lucide-react";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type MusicaIg = {
  audio_id: string;
  titulo: string;
  artista: string;
  duracao: number | null;
  capa: string | null;
  previa?: string | null;
  posicao?: number | null;
};

type Aba = "alta" | "salvas";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export function MusicaInstagram({
  valor,
  onChange,
}: {
  valor: MusicaIg | null;
  onChange: (m: MusicaIg | null) => void;
}) {
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>("alta");
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [tocando, setTocando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  const lista = useQuery({
    queryKey: ["ig-musicas", termo],
    enabled: aba === "alta",
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const r = await callEdgeFunction("publicar-agendados", { acao: "musicas", busca: termo });
      if (r.error) throw new Error(r.error);
      return (r.musicas ?? []) as MusicaIg[];
    },
  });
  const salvas = useQuery({
    queryKey: ["ig-musicas-salvas"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("ig_musicas_salvas")
        .select("audio_id, titulo, artista, duracao, capa")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as MusicaIg[];
    },
  });
  const idsSalvos = new Set((salvas.data ?? []).map((m) => m.audio_id));

  async function alternarSalva(m: MusicaIg) {
    const ja = idsSalvos.has(m.audio_id);
    const r = ja
      ? await db().from("ig_musicas_salvas").delete().eq("audio_id", m.audio_id)
      : await db().from("ig_musicas_salvas").upsert({
          audio_id: m.audio_id,
          titulo: m.titulo,
          artista: m.artista,
          duracao: m.duracao,
          capa: m.capa,
        });
    if (r.error) return toast.error(r.error.message);
    qc.invalidateQueries({ queryKey: ["ig-musicas-salvas"] });
  }

  async function ouvir(m: MusicaIg) {
    if (tocando === m.audio_id) {
      audio.current?.pause();
      setTocando(null);
      return;
    }
    audio.current?.pause();
    setCarregando(m.audio_id);
    try {
      const r = await callEdgeFunction("publicar-agendados", {
        acao: "previa",
        audio_id: m.audio_id,
        titulo: m.titulo,
        artista: m.artista,
      });
      if (r.previa) {
        audio.current = new Audio(r.previa);
        audio.current.onended = () => setTocando(null);
        await audio.current.play();
        setTocando(m.audio_id);
      } else toast.info("Não achei uma prévia desta música para tocar aqui.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(null);
    }
  }

  const mmss = (s: number | null) =>
    s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
  const itens = aba === "salvas" ? (salvas.data ?? []) : (lista.data ?? []);
  const carregandoLista = aba === "salvas" ? salvas.isLoading : lista.isLoading;
  const erro = aba === "salvas" ? salvas.error : lista.error;

  return (
    <div className="rounded-lg border p-2 space-y-2 min-w-0">
      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
        <Music2 className="h-4 w-4 shrink-0" /> Música do Instagram
        {valor && (
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-700 min-w-0">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {valor.titulo} · {valor.artista}
            </span>
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
      <div className="flex gap-1">
        {(
          [
            ["alta", "Em alta"],
            ["salvas", `Salvas${salvas.data?.length ? ` (${salvas.data.length})` : ""}`],
          ] as const
        ).map(([v, l]) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={aba === v ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setAba(v)}
          >
            {l}
          </Button>
        ))}
      </div>
      {aba === "alta" && (
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
      )}
      <div className="text-[11px] text-muted-foreground">
        {aba === "salvas"
          ? "Suas músicas salvas aqui no sistema (toque na estrela de qualquer música para salvar)"
          : termo
            ? `Resultados para "${termo}"`
            : "Ranking do que está em alta agora no Instagram · só aparecem as liberadas para publicar por sistema"}
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {carregandoLista && (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {erro && <p className="text-xs text-red-600">{(erro as Error).message}</p>}
        {itens.map((m) => {
          const on = valor?.audio_id === m.audio_id;
          const salva = idsSalvos.has(m.audio_id);
          return (
            <div
              key={m.audio_id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm min-w-0",
                on ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              {m.posicao ? (
                <span
                  className={cn(
                    "w-9 shrink-0 text-[11px] font-semibold tabular-nums flex items-center gap-0.5",
                    m.posicao <= 10 ? "text-orange-600" : "text-muted-foreground",
                  )}
                  title={`Posição ${m.posicao} entre as músicas em alta`}
                >
                  {m.posicao <= 10 && <Flame className="h-3 w-3" />}#{m.posicao}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => ouvir(m)}
                className="h-7 w-7 shrink-0 rounded-full border flex items-center justify-center"
                title="Ouvir aqui"
              >
                {carregando === m.audio_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : tocando === m.audio_id ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </button>
              {m.capa && <img src={m.capa} className="h-8 w-8 rounded object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.artista} {m.duracao ? `· ${mmss(m.duracao)}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => alternarSalva(m)}
                className="shrink-0 p-1"
                title={salva ? "Tirar das salvas" : "Salvar esta música"}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    salva ? "fill-amber-400 text-amber-500" : "text-muted-foreground",
                  )}
                />
              </button>
              <Button
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                className="h-7 shrink-0"
                onClick={() => onChange(on ? null : m)}
              >
                {on ? "Escolhida" : "Usar"}
              </Button>
            </div>
          );
        })}
        {!carregandoLista && !erro && !itens.length && (
          <p className="text-xs text-muted-foreground py-2">
            {aba === "salvas" ? "Nenhuma música salva ainda." : "Nada encontrado."}
          </p>
        )}
      </div>
    </div>
  );
}
