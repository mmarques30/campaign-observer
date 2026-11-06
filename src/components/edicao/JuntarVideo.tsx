// Juntar outro vídeo ao projeto (antes ou depois do atual), com transição na emenda.
// O servidor emenda os dois num arquivo só e encaixa a transcrição nova: a edição continua.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Combine, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtTempo, jobJuntar, juntarVideo, type Projeto } from "@/lib/vedit";
import type { Timeline } from "@/video/schema";

// Transições que fazem sentido numa troca de gravação.
const OPCOES: { v: Timeline["emendas"][number]["transicao"]; nome: string }[] = [
  { v: "suave", nome: "Dissolve suave" },
  { v: "escurecer", nome: "Passa pelo preto" },
  { v: "desfoque", nome: "Desfoca e volta" },
  { v: "zoom-suave", nome: "Zoom suave" },
  { v: "flash", nome: "Flash" },
  { v: "nenhuma", nome: "Corte seco" },
];

export function JuntarVideo({
  projeto,
  tl,
  setTl,
  onIr,
  onJuntado,
}: {
  projeto: Projeto;
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  onIr: (segundosOriginal: number) => void;
  onJuntado: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [posicao, setPosicao] = useState<"antes" | "depois">("depois");
  const [transicao, setTransicao] = useState<string>("suave");
  const [envio, setEnvio] = useState<number | null>(null);

  const jobQ = useQuery({
    queryKey: ["vedit", "juntar", projeto.id],
    queryFn: () => jobJuntar(projeto.id),
    refetchInterval: (q) =>
      q.state.data && ["fila", "rodando"].includes(q.state.data.status) ? 3000 : false,
  });
  const job = jobQ.data;
  const trabalhando = envio !== null || (!!job && ["fila", "rodando"].includes(job.status));

  // Terminou agora (estava na fila ou rodando e mudou): recarrega o projeto uma vez.
  const estavaRodando = useRef(false);
  useEffect(() => {
    if (!job) return;
    const ativo = job.status === "fila" || job.status === "rodando";
    if (ativo) estavaRodando.current = true;
    else if (estavaRodando.current) {
      estavaRodando.current = false;
      if (job.status === "pronto") {
        toast.success(
          "Vídeos juntados. A emenda já tem a transição; a voz limpa é refeita em instantes.",
        );
        onJuntado();
      } else toast.error(`Não consegui juntar: ${job.erro ?? "erro no servidor"}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status]);

  async function escolher(f: File) {
    setEnvio(0);
    try {
      await juntarVideo(projeto, f, { posicao, transicao }, (p) => setEnvio(Math.round(p * 100)));
      await jobQ.refetch();
      toast.info("Vídeo enviado. O servidor está emendando: pode continuar editando.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnvio(null);
    }
  }

  const emendas = tl.emendas ?? [];
  return (
    <div className="mb-3 rounded-lg border p-2.5 space-y-2">
      <div className="text-xs text-muted-foreground">
        Junte outro vídeo a este (uma segunda gravação, um trecho que ficou de fora). Ele entra
        inteiro, com transição na emenda, e a edição que já existe continua igual.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Entra</Label>
          <Select value={posicao} onValueChange={(v) => setPosicao(v as "antes" | "depois")}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="depois">Depois deste vídeo</SelectItem>
              <SelectItem value="antes">Antes deste vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Transição</Label>
          <Select value={transicao} onValueChange={setTransicao}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void escolher(f);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={trabalhando || !projeto.fonte_path}
        onClick={() => input.current?.click()}
      >
        {trabalhando ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Combine className="h-4 w-4 mr-2" />
        )}
        {envio !== null
          ? `Enviando ${envio}%`
          : trabalhando
            ? `${job?.resultado?.etapa ?? "Na fila"}…`
            : "Juntar outro vídeo"}
      </Button>

      {emendas.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Emendas
          </div>
          {emendas.map((e, k) => (
            <div key={`${e.em}-${k}`} className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                title="Ver a emenda"
                onClick={() => onIr(Math.max(0, e.em - 1.5))}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs tabular-nums w-10 shrink-0">{fmtTempo(e.em)}</span>
              <Select
                value={e.transicao}
                onValueChange={(v) =>
                  setTl(
                    {
                      ...tl,
                      emendas: emendas.map((x, j) =>
                        j === k ? { ...x, transicao: v as typeof x.transicao } : x,
                      ),
                    },
                    `Transição da emenda em ${fmtTempo(e.em)}: ${OPCOES.find((o) => o.v === v)?.nome ?? v}`,
                  )
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
