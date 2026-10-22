import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PlayerRef } from "@remotion/player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Clapperboard,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { Preview } from "@/components/edicao/Preview";
import { Chat } from "@/components/edicao/Chat";
import { SugestaoCard } from "@/components/edicao/SugestaoCard";
import { Trilhas } from "@/components/edicao/Trilhas";
import { Painel } from "@/components/edicao/Painel";
import { Publicar } from "@/components/edicao/Publicar";
import { callEdgeFunction } from "@/lib/ads-mutations";
import {
  assinar,
  db,
  desfazer,
  enviarAoClaude,
  enviarMidia,
  fmtTempo,
  pedirRender,
  salvarManual,
  STATUS_LABEL,
  type Mensagem,
  type Midia,
  type Projeto,
} from "@/lib/vedit";
import { normalizarTimeline, type ReelProps, type Timeline } from "@/video/schema";
import { duracaoSaida, paraSaida, trechosMantidos } from "@/video/tempo";
import { cortarSilencios } from "@/video/automatico";

export const Route = createFileRoute("/_authenticated/ads/edicao/$id")({
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const player = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [zonas, setZonas] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const projQ = useQuery({
    queryKey: ["vedit", "projeto", id],
    queryFn: async () => {
      const { data, error } = await db().from("vedit_projetos").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Projeto;
    },
    refetchInterval: (q) =>
      ["enviando", "transcrevendo", "renderizando"].includes(
        (q.state.data as Projeto | undefined)?.status ?? "",
      )
        ? 3000
        : false,
  });
  const proj = projQ.data;

  const msgsQ = useQuery({
    queryKey: ["vedit", "mensagens", id],
    queryFn: async () =>
      ((await db().from("vedit_mensagens").select("*").eq("projeto_id", id).order("created_at"))
        .data ?? []) as Mensagem[],
  });
  const midiasQ = useQuery({
    queryKey: ["vedit", "midias", id],
    queryFn: async () =>
      ((await db().from("vedit_midias").select("*").eq("projeto_id", id).order("created_at"))
        .data ?? []) as Midia[],
  });
  const urlsQ = useQuery({
    queryKey: [
      "vedit",
      "urls",
      id,
      proj?.fonte_path,
      (midiasQ.data ?? []).map((m) => m.id).join(","),
    ],
    enabled: !!proj?.fonte_path,
    staleTime: 5 * 3600 * 1000,
    queryFn: async () => {
      const fonte = await assinar(proj!.fonte_path!);
      const midias: Record<string, string> = {};
      for (const m of midiasQ.data ?? []) midias[m.id] = await assinar(m.path);
      return { fonte, midias };
    },
  });
  const renderQ = useQuery({
    queryKey: ["vedit", "render", id],
    enabled: !!proj,
    queryFn: async () =>
      (
        await db()
          .from("vedit_renders")
          .select("id, status, progresso, erro, versao, created_at")
          .eq("projeto_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data,
    refetchInterval: proj?.status === "renderizando" ? 3000 : false,
  });

  // Edição local (preview instantâneo); salva com atraso quando é ajuste manual.
  const [tl, setTlLocal] = useState<Timeline | null>(null);
  const versaoCarregada = useRef<number>(-1);
  useEffect(() => {
    if (proj && proj.versao !== versaoCarregada.current) {
      versaoCarregada.current = proj.versao;
      setTlLocal(normalizarTimeline(proj.timeline ?? {}).timeline);
    }
  }, [proj]);
  const salvando = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setTl(novo: Timeline, resumo: string) {
    setTlLocal(novo);
    if (salvando.current) clearTimeout(salvando.current);
    salvando.current = setTimeout(async () => {
      try {
        const p = qc.getQueryData<Projeto>(["vedit", "projeto", id]);
        if (!p) return;
        const v = await salvarManual(p, novo, resumo);
        versaoCarregada.current = v;
        qc.setQueryData(["vedit", "projeto", id], { ...p, timeline: novo, versao: v });
      } catch (e) {
        toast.error((e as Error).message);
      }
    }, 700);
  }

  // Posição do preview.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    // Atualiza a agulha da timeline ~10x por segundo (não a cada quadro).
    const h = (e: { detail: { frame: number } }) => {
      if (e.detail.frame % 3 === 0) setFrame(e.detail.frame);
    };
    const s = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    p.addEventListener("frameupdate", h as any);
    p.addEventListener("seeked", s as any);
    return () => {
      p.removeEventListener("frameupdate", h as any);
      p.removeEventListener("seeked", s as any);
    };
  }, [urlsQ.data, proj?.status]);

  const palavras = useMemo(() => proj?.palavras ?? [], [proj?.palavras]);
  const duracaoFonte = Number(proj?.fonte_duracao ?? 0);
  const trechos = useMemo(() => (tl ? trechosMantidos(tl, duracaoFonte) : []), [tl, duracaoFonte]);
  const props: ReelProps | null = useMemo(
    () =>
      tl && urlsQ.data
        ? {
            timeline: tl,
            palavras,
            fonteUrl: urlsQ.data.fonte,
            duracaoFonte,
            midias: urlsQ.data.midias,
          }
        : null,
    [tl, palavras, urlsQ.data, duracaoFonte],
  );

  async function mandar(texto: string) {
    if (!proj) return;
    if (/^\/desfazer\b/.test(texto)) {
      try {
        await desfazer(proj);
        await Promise.all([projQ.refetch(), msgsQ.refetch()]);
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    if (!palavras.length) return toast.error("Espere a transcrição terminar.");
    setEnviando(true);
    qc.setQueryData<Mensagem[]>(["vedit", "mensagens", id], (m) => [
      ...(m ?? []),
      {
        id: `tmp-${Date.now()}`,
        created_at: new Date().toISOString(),
        papel: "usuario",
        conteudo: texto,
        comando: texto.startsWith("/") ? texto.split(/\s+/)[0] : null,
        storyboard: null,
        versao: null,
      },
    ]);
    try {
      const r = await enviarAoClaude(proj.id, texto);
      if (r.variacoes?.length) toast.success(`${r.variacoes.length} variações criadas no Estúdio.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
      await Promise.all([projQ.refetch(), msgsQ.refetch()]);
    }
  }

  function irPara(segOriginal: number) {
    player.current?.seekTo(Math.round(paraSaida(trechos, segOriginal) * 30));
  }

  async function renderizar() {
    if (!proj) return;
    try {
      await pedirRender({ ...proj, timeline: tl }, midiasQ.data ?? []);
      toast.success("Na fila de render. Você pode continuar editando.");
      await Promise.all([projQ.refetch(), renderQ.refetch()]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (projQ.isLoading || !proj || !tl) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Abrindo o projeto…
      </div>
    );
  }

  const ultimoStoryboard = (msgsQ.data ?? [])
    .slice()
    .reverse()
    .find((m) => m.papel === "claude");
  const storyboardPendente =
    proj.storyboard && ultimoStoryboard?.storyboard ? proj.storyboard : null;
  const render = renderQ.data as {
    status: string;
    progresso: number;
    erro: string | null;
    versao: number;
  } | null;
  const durFinal = duracaoSaida(trechos);

  return (
    <TooltipProvider>
      <div className="-m-4 sm:-m-6 flex flex-col h-[calc(100vh-4rem)]">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 bg-card">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/ads/edicao">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="font-semibold truncate max-w-[40vw]">{proj.nome}</div>
            <div className="text-[11px] text-muted-foreground">
              {proj.objetivo === "anuncio" ? "Anúncio" : "Orgânico"} · {tl.formato} · {proj.estilo}
              {proj.duracao_alvo ? ` · alvo ${proj.duracao_alvo}s` : ""} · v{proj.versao} ·{" "}
              {fmtTempo(duracaoFonte)} bruto → {fmtTempo(durFinal)} final
            </div>
          </div>
          <Badge variant="outline" className="ml-1">
            {STATUS_LABEL[proj.status] ?? proj.status}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={zonas ? "default" : "outline"}
                  size="sm"
                  onClick={() => setZonas((z) => !z)}
                >
                  <ShieldAlert className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zonas seguras do Meta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mandar("/desfazer")}
                  disabled={proj.versao < 2}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desfazer (volta uma versão)</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={renderizar}
              disabled={proj.status === "renderizando" || !palavras.length}
            >
              {proj.status === "renderizando" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clapperboard className="h-4 w-4 mr-2" />
              )}
              Renderizar
            </Button>
            <Button size="sm" onClick={() => setPublicar(true)} disabled={!proj.render_path}>
              <Send className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </div>

        {proj.status === "renderizando" && (
          <div className="px-4 py-1.5 border-b bg-amber-500/5 flex items-center gap-3 text-xs">
            <span>
              Renderizando versão {render?.versao ?? proj.versao}
              {render?.status === "fila"
                ? " (na fila: o worker de render precisa estar ligado)"
                : ""}
            </span>
            <Progress value={Number(render?.progresso ?? 0)} className="h-1.5 w-48" />
            <span className="tabular-nums">{Math.round(Number(render?.progresso ?? 0))}%</span>
          </div>
        )}
        {proj.status === "erro" && (
          <div className="px-4 py-1.5 border-b bg-red-500/5 flex items-center gap-3 text-xs text-red-700">
            <span className="truncate">{proj.erro}</span>
            {proj.erro?.startsWith("Transcrição") && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={async () => {
                  await callEdgeFunction("vedit-transcrever", { projeto_id: proj.id });
                  projQ.refetch();
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Transcrever de novo
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr_380px]">
          <aside className="hidden lg:flex flex-col border-r min-h-0 bg-card">
            <Painel
              tl={tl}
              setTl={setTl}
              midias={midiasQ.data ?? []}
              onEnviarMidia={async (f) => {
                await enviarMidia(proj.id, f);
                await midiasQ.refetch();
              }}
              onIr={irPara}
              onComando={(t) => setRascunho(t)}
              selecionado={selecionado}
              onCorteRapido={() => {
                const cortes = cortarSilencios(palavras, duracaoFonte, { tirarMuletas: true });
                setTl({ ...tl, cortes }, `Corte rápido: ${cortes.length} trechos`);
                toast.success(
                  `Silêncios cortados: ${fmtTempo(duracaoFonte)} → ${fmtTempo(cortes.reduce((s, c) => s + c.ate - c.de, 0))}`,
                );
              }}
            />
          </aside>

          <main className="flex flex-col min-h-0 min-w-0">
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-muted/40">
              {["enviando", "transcrevendo"].includes(proj.status) ? (
                <div className="text-center space-y-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div className="text-sm">
                    {proj.status === "enviando"
                      ? "Enviando o vídeo…"
                      : "Transcrevendo palavra por palavra…"}
                  </div>
                </div>
              ) : props ? (
                <Preview
                  ref={player}
                  props={props}
                  zonasSeguras={zonas}
                  className="h-full"
                  maxAltura="100%"
                />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="border-t bg-card px-3">
              <Trilhas
                tl={tl}
                palavras={palavras}
                trechos={trechos}
                frame={frame}
                onSeek={(s) => player.current?.seekTo(Math.round(s * 30))}
                efeitoSelecionado={selecionado}
                onSelecionarEfeito={setSelecionado}
              />
            </div>
          </main>

          <aside className="flex flex-col border-l min-h-0 bg-background">
            <div className="px-3 py-2 border-b text-sm font-semibold flex items-center gap-2">
              Editor IA{" "}
              <span className="text-xs font-normal text-muted-foreground">
                Claude · comandos com /
              </span>
            </div>
            {/* Logo depois da transcrição, antes de qualquer edição: o editor propõe como tratar o vídeo. */}
            {proj.status === "pronto_para_editar" &&
              !(proj.sugestao as any)?.aceita &&
              palavras.length > 0 && (
                <div className="p-3 border-b">
                  <SugestaoCard
                    projeto={proj}
                    onAplicado={async () => {
                      versaoCarregada.current = -1;
                      await Promise.all([projQ.refetch(), msgsQ.refetch()]);
                      toast.success("Pronto. Agora peça a edição: /storyboard ou /editar.");
                    }}
                  />
                </div>
              )}
            <Chat
              mensagens={msgsQ.data ?? []}
              enviando={enviando}
              onEnviar={mandar}
              storyboardPendente={storyboardPendente}
              rascunho={rascunho}
              setRascunho={setRascunho}
            />
          </aside>
        </div>
      </div>
      {publicar && (
        <Publicar projeto={proj} aberto={publicar} onFechar={() => setPublicar(false)} />
      )}
    </TooltipProvider>
  );
}
