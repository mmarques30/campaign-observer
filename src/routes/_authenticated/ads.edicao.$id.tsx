import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { ConfirmarExclusao } from "@/components/edicao/ConfirmarExclusao";
import { Preview } from "@/components/edicao/Preview";
import { Chat } from "@/components/edicao/Chat";
import { SugestaoCard } from "@/components/edicao/SugestaoCard";
import { Trilhas } from "@/components/edicao/Trilhas";
import { Painel } from "@/components/edicao/Painel";
import { Publicar } from "@/components/edicao/Publicar";
import { callEdgeFunction } from "@/lib/ads-mutations";
import {
  assinar,
  assinarEnvios,
  atualizarProjeto,
  lerEnvio,
  db,
  desfazer,
  enviarAoClaude,
  enviarMidia,
  excluirProjeto,
  fmtTempo,
  pedirRender,
  retomarEnvio,
  salvarManual,
  STATUS_LABEL,
  type Mensagem,
  type Midia,
  type Projeto,
} from "@/lib/vedit";
import { normalizarTimeline, type ReelProps, type Timeline } from "@/video/schema";
import { duracaoSaida, paraSaida, trechosMantidos } from "@/video/tempo";
import { cortarSilencios } from "@/video/automatico";
import { detectarRepeticoes } from "@/video/repeticoes";
import { Repeticoes } from "@/components/edicao/Repeticoes";

export const Route = createFileRoute("/_authenticated/ads/edicao/$id")({
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const player = useRef<PlayerRef>(null);
  // O Player monta depois (o Preview espera o cliente): avisa quando a ref existe para ligar a agulha.
  const [playerPronto, setPlayerPronto] = useState(false);
  const refPlayer = (p: PlayerRef | null) => {
    (player as React.MutableRefObject<PlayerRef | null>).current = p;
    setPlayerPronto(!!p);
  };
  const [frame, setFrame] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [zonas, setZonas] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const navigate = useNavigate();
  const [excluir, setExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  async function confirmarExclusao() {
    setExcluindo(true);
    try {
      await excluirProjeto(id);
      qc.removeQueries({ queryKey: ["vedit", "projeto", id] });
      qc.invalidateQueries({ queryKey: ["vedit", "projetos"] });
      toast.success("Vídeo excluído.");
      navigate({ to: "/ads/edicao" });
    } catch (e) {
      toast.error((e as Error).message);
      setExcluindo(false);
    }
  }
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const envio = useSyncExternalStore(
    assinarEnvios,
    () => lerEnvio(id),
    () => null,
  );
  const projQ = useQuery({
    queryKey: ["vedit", "projeto", id],
    queryFn: async () => {
      const { data, error } = await db().from("vedit_projetos").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Projeto;
    },
    refetchInterval: (q) => {
      const p = q.state.data as Projeto | undefined;
      return ["enviando", "transcrevendo", "renderizando"].includes(p?.status ?? "") ||
        (p?.fonte_path &&
          !p.fonte_proxy_path &&
          Math.min(p.fonte_largura ?? 0, p.fonte_altura ?? 0) > 1080)
        ? 3000
        : false;
    },
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
      proj?.fonte_proxy_path,
      proj?.audio_path,
      (midiasQ.data ?? []).map((m) => m.id).join(","),
    ],
    enabled: !!proj?.fonte_path,
    staleTime: 5 * 3600 * 1000,
    queryFn: async () => {
      // Preview usa a versão leve quando existe; o render usa sempre o arquivo enviado.
      const fonte = await assinar(proj!.fonte_proxy_path ?? proj!.fonte_path!);
      const audio = proj!.audio_path ? await assinar(proj!.audio_path) : undefined;
      const midias: Record<string, string> = {};
      for (const m of midiasQ.data ?? []) midias[m.id] = await assinar(m.path);
      return { fonte, audio, midias };
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
  // Só recarrega do servidor quando chega uma versão MAIS NOVA (Claude, desfazer, outra aba).
  // Uma resposta atrasada com versão antiga não pode desfazer o que a pessoa acabou de mudar aqui.
  useEffect(() => {
    if (proj && proj.versao > versaoCarregada.current) {
      versaoCarregada.current = proj.versao;
      setTlLocal(normalizarTimeline(proj.timeline ?? {}).timeline);
    }
  }, [proj]);
  const salvando = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<{ novo: Timeline; resumo: string } | null>(null);
  async function gravarPendente() {
    const item = pendente.current;
    if (!item) return;
    pendente.current = null;
    try {
      const p = qc.getQueryData<Projeto>(["vedit", "projeto", id]);
      if (!p) return;
      const v = await salvarManual({ ...p, versao: Math.max(p.versao, versaoCarregada.current) }, item.novo, item.resumo);
      versaoCarregada.current = v;
      qc.setQueryData(["vedit", "projeto", id], { ...p, timeline: item.novo, versao: v });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function setTl(novo: Timeline, resumo: string) {
    setTlLocal(novo);
    pendente.current = { novo, resumo };
    if (salvando.current) clearTimeout(salvando.current);
    salvando.current = setTimeout(gravarPendente, 500);
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
  }, [urlsQ.data, proj?.status, playerPronto]);

  const palavras = useMemo(() => proj?.palavras ?? [], [proj?.palavras]);
  const repeticoes = useMemo(() => detectarRepeticoes(palavras), [palavras]);
  const duracaoFonte = Number(proj?.fonte_duracao ?? 0);
  const trechos = useMemo(() => (tl ? trechosMantidos(tl, duracaoFonte) : []), [tl, duracaoFonte]);
  const props: ReelProps | null = useMemo(
    () =>
      tl && urlsQ.data
        ? {
            timeline: tl,
            palavras,
            fonteUrl: urlsQ.data.fonte,
            audioUrl: urlsQ.data.audio,
            duracaoFonte,
            midias: urlsQ.data.midias,
          }
        : null,
    [tl, palavras, urlsQ.data, duracaoFonte],
  );

  async function mandar(texto: string) {
    if (!proj) return;
    if (salvando.current) {
      clearTimeout(salvando.current);
      salvando.current = null;
    }
    await gravarPendente();
    if (/^\/desfazer\b/.test(texto)) {
      try {
        await desfazer(qc.getQueryData<Projeto>(["vedit", "projeto", id]) ?? proj);
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-red-600"
                  onClick={() => setExcluir(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir este vídeo</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {proj.fonte_path &&
          !proj.fonte_proxy_path &&
          Math.min(proj.fonte_largura ?? 0, proj.fonte_altura ?? 0) > 1080 && (
            <div className="px-4 py-1 border-b bg-muted/40 text-xs text-muted-foreground">
              Vídeo em {proj.fonte_largura}x{proj.fonte_altura}: o worker está gerando uma versão
              leve para o preview (1–3 min). Enquanto isso o preview pode engasgar.
            </div>
          )}
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
              projeto={proj}
              onAtualizar={async (patch) => {
                await atualizarProjeto(proj, patch);
                versaoCarregada.current = -1;
                await projQ.refetch();
              }}
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
                const cortes = cortarSilencios(palavras, duracaoFonte, {
                  tirarMuletas: true,
                  tirarRepeticoes: true,
                  repeticoes,
                });
                setTl({ ...tl, cortes }, `Corte rápido: ${cortes.length} trechos`);
                toast.success(
                  `Silêncios${repeticoes.length ? ` e ${repeticoes.length} fala(s) repetida(s)` : ""} cortados: ${fmtTempo(duracaoFonte)} → ${fmtTempo(cortes.reduce((s, c) => s + c.ate - c.de, 0))}`,
                );
              }}
            />
          </aside>

          <main className="flex flex-col min-h-0 min-w-0">
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-muted/40">
              {!proj.fonte_path ? (
                <div className="text-center space-y-3 text-muted-foreground max-w-sm">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  {envio?.etapa === "Reduzindo para 1080p" ? (
                    <>
                      <div className="text-sm font-medium text-foreground">
                        Reduzindo para 1080p no seu computador… {envio.reducao ?? 0}%
                      </div>
                      <Progress value={envio.reducao ?? 0} className="h-2" />
                      <div className="text-xs">
                        Vídeo em {proj.fonte_largura}×{proj.fonte_altura}: fica ~6× menor antes de
                        subir. O resultado final é 1080p de qualquer forma.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-foreground">
                        Enviando o vídeo… {envio?.video ?? proj.upload_progresso ?? 0}%
                      </div>
                      <Progress value={envio?.video ?? proj.upload_progresso ?? 0} className="h-2" />
                    </>
                  )}
                  <div className="text-xs">
                    {envio?.audio === "ok" || palavras.length
                      ? "Áudio já transcrito: a sugestão aparece ao lado enquanto o vídeo termina."
                      : "Separando o áudio e transcrevendo…"}
                    {envio == null && (proj.upload_progresso ?? 0) < 100 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-amber-700">
                          O envio parou (a aba foi fechada ou recarregada). Escolha o mesmo arquivo
                          e ele continua de onde parou — sem transcrever de novo.
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <label className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" /> Continuar envio
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try {
                                  await retomarEnvio(proj, f);
                                  toast.success("Retomando o envio de onde parou.");
                                } catch (err) {
                                  toast.error((err as Error).message);
                                }
                              }}
                            />
                          </label>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : props ? (
                <Preview
                  ref={refPlayer}
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
            {repeticoes.length > 0 && (
              <Repeticoes
                repeticoes={repeticoes}
                cortes={tl.cortes}
                onIr={irPara}
                onCortar={() => {
                  const cortes = cortarSilencios(palavras, duracaoFonte, {
                    tirarMuletas: true,
                    tirarRepeticoes: true,
                    repeticoes,
                  });
                  setTl({ ...tl, cortes }, `Repetições removidas: ${repeticoes.length}`);
                  toast.success(`${repeticoes.length} fala(s) repetida(s) fora. Ficou a última tomada de cada.`);
                }}
              />
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
      <ConfirmarExclusao
        projeto={excluir ? proj : null}
        ocupado={excluindo}
        onCancelar={() => setExcluir(false)}
        onConfirmar={confirmarExclusao}
      />
    </TooltipProvider>
  );
}
