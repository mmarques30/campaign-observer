import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  Download,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { SlideEscalado, SlideView } from "@/components/criativos/SlideView";
import { EscolherFoto } from "@/components/criativos/EscolherFoto";
import { BotaoVoz } from "@/components/BotaoVoz";
import {
  baixarPngs,
  carregarFontes,
  chamarAgente,
  desfazerDesign,
  exportarPngs,
  FONTES_CRIATIVO,
  salvarDesign,
  useFotos,
} from "@/lib/criativos";
import { db } from "@/lib/vedit";
import {
  FUNDOS,
  LAYOUTS,
  NOME_LAYOUT,
  normalizarDesign,
  slideSchema,
  type CriaMensagem,
  type CriaProjeto,
  type Design,
  type Slide,
} from "@/criativos/design";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/criar/$id")({
  component: EditorCriativo,
});

const SUGESTOES = [
  "Deixe a capa mais forte e específica",
  "Encurte os textos",
  "Troque a foto da capa por uma melhor",
  "Crie uma foto minha num palco para a capa",
  "Adicione um slide com um exemplo prático",
  "Use um visual mais claro e limpo",
];

const NOME_FUNDO: Record<string, string> = {
  escuro: "Escuro",
  claro: "Claro",
  marca: "Cor da marca",
  destaque: "Cor de destaque",
};

function EditorCriativo() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fotos = useFotos();
  const [design, setDesign] = useState<Design | null>(null);
  const [sujo, setSujo] = useState(false);
  const [atual, setAtual] = useState(0);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const versaoVista = useRef(-1);
  const nos = useRef<(HTMLDivElement | null)[]>([]);
  const fimChat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void carregarFontes();
  }, []);

  const proj = useQuery({
    queryKey: ["cria", "projeto", id],
    queryFn: async () => {
      const { data, error } = await db().from("cria_projetos").select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return data as CriaProjeto;
    },
    refetchInterval: (q) =>
      ["gerando", "aguardando"].includes((q.state.data as CriaProjeto | undefined)?.status ?? "")
        ? 3000
        : false,
  });
  const p = proj.data;
  const gerando = p?.status === "gerando" || p?.status === "aguardando";

  const msgs = useQuery({
    queryKey: ["cria", "mensagens", id],
    queryFn: async () =>
      ((
        await db()
          .from("cria_mensagens")
          .select("*")
          .eq("projeto_id", id)
          .order("created_at", { ascending: true })
          .limit(200)
      ).data ?? []) as CriaMensagem[],
    refetchInterval: gerando ? 3000 : false,
  });

  // Nova versão no banco (Claude, desfazer) substitui o rascunho local se não houver edição pendente.
  useEffect(() => {
    if (!p || p.versao === versaoVista.current) return;
    if (sujo && versaoVista.current >= 0) {
      toast.info("O Claude salvou uma versão nova; suas edições à mão foram substituídas.");
    }
    versaoVista.current = p.versao;
    setDesign(normalizarDesign(p.design));
    setSujo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.versao, p?.design]);

  useEffect(() => {
    fimChat.current?.scrollIntoView({ block: "end" });
  }, [msgs.data?.length]);

  const slides = design?.slides ?? [];
  const idx = Math.min(atual, Math.max(0, slides.length - 1));
  const slide = slides[idx];
  const porId = fotos.data?.porId ?? new Map();

  function mudar(fn: (d: Design) => Design) {
    setDesign((d) => (d ? fn(structuredClone(d)) : d));
    setSujo(true);
  }
  function mudarSlide(campo: Partial<Slide>) {
    mudar((d) => {
      d.slides[idx] = { ...d.slides[idx], ...campo };
      return d;
    });
  }

  async function salvar() {
    if (!design) return;
    setSalvando(true);
    try {
      await salvarDesign(id, design, "Edição à mão");
      setSujo(false);
      await qc.invalidateQueries({ queryKey: ["cria", "projeto", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function enviar(texto = msg) {
    if (!texto.trim()) return;
    try {
      if (sujo && design) {
        await salvarDesign(id, design, "Edição à mão");
        setSujo(false);
      }
      await chamarAgente({ acao: "mensagem", projeto_id: id, texto, slide_id: slide?.id });
      setMsg("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cria", "projeto", id] }),
        qc.invalidateQueries({ queryKey: ["cria", "mensagens", id] }),
      ]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function exportar() {
    if (!design || !p) return;
    nos.current = [];
    setExportando(true);
    try {
      await new Promise((ok) => setTimeout(ok, 80));
      const pngs = await exportarPngs(
        nos.current.slice(0, slides.length).filter(Boolean) as HTMLElement[],
        p.formato,
      );
      await baixarPngs(pngs, p.nome);
    } catch (e) {
      toast.error(`Exportar: ${(e as Error).message}`);
    } finally {
      setExportando(false);
    }
  }

  if (proj.isLoading || !p)
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const props = (s: Slide, i: number) => ({
    slide: s,
    design: design!,
    formato: p.formato,
    fotos: porId,
    indice: i,
    total: slides.length,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/ads/criar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Input
          defaultValue={p.nome}
          key={p.nome}
          className="h-9 max-w-xs font-semibold"
          onBlur={async (e) => {
            const nome = e.target.value.trim();
            if (nome && nome !== p.nome) {
              await db().from("cria_projetos").update({ nome }).eq("id", id);
              qc.invalidateQueries({ queryKey: ["cria", "projeto", id] });
            }
          }}
        />
        <Badge variant="outline">
          {p.tipo === "unico" ? "Post único" : `Carrossel · ${slides.length} slides`}
        </Badge>
        <Badge variant="outline">{p.formato}</Badge>
        {gerando && (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
            {p.status === "aguardando" ? "Lendo a referência" : "O Claude está criando"}
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          {sujo && (
            <Button size="sm" onClick={salvar} disabled={salvando || gerando}>
              {salvando ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Salvar edição
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={gerando || p.versao <= 1}
            onClick={async () => {
              try {
                await desfazerDesign(id, p.versao);
                qc.invalidateQueries({ queryKey: ["cria", "projeto", id] });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Undo2 className="h-4 w-4 mr-1.5" /> Desfazer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportar}
            disabled={!slides.length || exportando}
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {slides.length > 1 ? "Baixar PNGs (.zip)" : "Baixar PNG"}
          </Button>
        </div>
      </div>

      {p.status === "erro" && p.erro && (
        <Card className="border-red-500/40">
          <CardContent className="p-3 text-sm text-red-600">{p.erro}</CardContent>
        </Card>
      )}

      {/* Ocupa a altura da tela: prévia e painel lado a lado, do mesmo tamanho. */}
      <div className="grid gap-4 xl:grid-cols-[1fr_420px] xl:h-[calc(100dvh-10.5rem)] xl:min-h-[560px]">
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[420px] xl:min-h-0 flex items-center justify-center gap-3 rounded-xl border bg-muted/40 p-4 overflow-hidden">
            {slide && design ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => setAtual(idx - 1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div
                  className="rounded-lg overflow-hidden shadow-xl max-w-full max-h-full"
                  style={{
                    height: "100%",
                    aspectRatio:
                      p.formato === "1:1" ? "1 / 1" : p.formato === "9:16" ? "9 / 16" : "4 / 5",
                  }}
                >
                  <SlideEscalado {...props(slide, idx)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={idx >= slides.length - 1}
                  onClick={() => setAtual(idx + 1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {gerando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Escrevendo os textos e montando os
                    slides…
                  </>
                ) : (
                  "Sem slides ainda. Peça no chat ao lado."
                )}
              </div>
            )}
          </div>

          {design && slides.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAtual(i)}
                  className={cn(
                    "rounded-md overflow-hidden border-2 shrink-0 relative",
                    i === idx
                      ? "border-primary"
                      : "border-transparent opacity-80 hover:opacity-100",
                  )}
                >
                  <SlideEscalado largura={104} {...props(s, i)} />
                  <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white rounded px-1">
                    {i + 1}
                  </span>
                </button>
              ))}
              {p.tipo === "carrossel" && (
                <button
                  type="button"
                  title="Novo slide"
                  disabled={gerando}
                  onClick={() => {
                    mudar((d) => {
                      d.slides.splice(
                        idx + 1,
                        0,
                        slideSchema.parse({ layout: "texto", titulo: "Novo slide" }),
                      );
                      return d;
                    });
                    setAtual(idx + 1);
                  }}
                  className="w-[104px] shrink-0 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        <Card className="flex flex-col min-h-[520px] xl:min-h-0 overflow-hidden">
          <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full grid grid-cols-3 rounded-b-none">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="slide" disabled={!slide}>
                Slide {slide ? idx + 1 : ""}
              </TabsTrigger>
              <TabsTrigger value="tema" disabled={!design}>
                Tema e legenda
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="chat"
              className="m-0 p-3 gap-3 flex-1 min-h-0 flex-col data-[state=active]:flex"
            >
              <div className="flex-1 min-h-[200px] overflow-y-auto space-y-2 pr-1">
                {(msgs.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "text-sm rounded-lg px-3 py-2 whitespace-pre-wrap",
                      m.papel === "usuario" && "bg-primary text-primary-foreground ml-8",
                      m.papel === "claude" && "bg-muted mr-8",
                      m.papel === "sistema" && "text-xs text-muted-foreground px-1 py-0.5",
                    )}
                  >
                    {m.conteudo}
                  </div>
                ))}
                {gerando && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> trabalhando…
                  </div>
                )}
                <div ref={fimChat} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={gerando}
                    onClick={() => enviar(s)}
                    className="text-[11px] px-2 py-1 rounded-full border hover:bg-muted disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void enviar();
                    }
                  }}
                  placeholder={
                    slide
                      ? `Peça um ajuste (o Claude sabe que você está no slide ${idx + 1})`
                      : "Peça o criativo"
                  }
                  disabled={gerando}
                />
                <div className="flex flex-col gap-1.5">
                  <BotaoVoz
                    disabled={gerando}
                    onTexto={(t) => setMsg((m) => (m.trim() ? `${m.trim()} ${t}` : t))}
                  />
                  <Button size="icon" onClick={() => enviar()} disabled={gerando || !msg.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="slide" className="m-0 p-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
              {slide && (
                <>
                  <div className="flex gap-1.5">
                    <Select
                      value={slide.layout}
                      onValueChange={(v) => mudarSlide({ layout: v as Slide["layout"] })}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAYOUTS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {NOME_LAYOUT[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {p.tipo === "carrossel" && (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Mover para a esquerda"
                          disabled={idx === 0}
                          onClick={() => {
                            mudar((d) => {
                              [d.slides[idx - 1], d.slides[idx]] = [
                                d.slides[idx],
                                d.slides[idx - 1],
                              ];
                              return d;
                            });
                            setAtual(idx - 1);
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Mover para a direita"
                          disabled={idx >= slides.length - 1}
                          onClick={() => {
                            mudar((d) => {
                              [d.slides[idx + 1], d.slides[idx]] = [
                                d.slides[idx],
                                d.slides[idx + 1],
                              ];
                              return d;
                            });
                            setAtual(idx + 1);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          title="Duplicar"
                          onClick={() => {
                            mudar((d) => {
                              d.slides.splice(idx + 1, 0, {
                                ...structuredClone(d.slides[idx]),
                                id: Math.random().toString(36).slice(2, 9),
                              });
                              return d;
                            });
                            setAtual(idx + 1);
                          }}
                        >
                          <CopyPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 hover:text-red-600"
                          title="Excluir slide"
                          disabled={slides.length <= 1}
                          onClick={() => {
                            mudar((d) => {
                              d.slides.splice(idx, 1);
                              return d;
                            });
                            setAtual(Math.max(0, idx - 1));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Fundo</Label>
                      <Select
                        value={slide.fundo ?? (slide.layout === "tweet" ? "claro" : "escuro")}
                        onValueChange={(v) => mudarSlide({ fundo: v as Slide["fundo"] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNDOS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {NOME_FUNDO[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {slide.layout === "capa" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Estilo do título</Label>
                        <Select
                          value={slide.variante ?? "impacto"}
                          onValueChange={(v) => mudarSlide({ variante: v as Slide["variante"] })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="impacto">Impacto (caixa alta)</SelectItem>
                            <SelectItem value="elegante">Elegante (centralizado)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {(
                    [
                      ["rotulo", "Rótulo (ex.: /upscale, Ferramenta #1)", 1],
                      ["titulo", "Título", 2],
                      ["subtitulo", "Subtítulo", 2],
                      ["texto", "Texto (**palavra** destaca)", 5],
                    ] as const
                  ).map(([campo, rot, linhas]) => (
                    <div key={campo} className="space-y-1">
                      <Label className="text-xs">{rot}</Label>
                      <Textarea
                        rows={linhas}
                        className="min-h-0 text-sm"
                        value={(slide[campo] as string | null | undefined) ?? ""}
                        onChange={(e) => mudarSlide({ [campo]: e.target.value || null })}
                      />
                    </div>
                  ))}
                  {slide.layout === "lista" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Itens (um por linha)</Label>
                      <Textarea
                        rows={5}
                        className="text-sm"
                        value={(slide.itens ?? []).join("\n")}
                        onChange={(e) => mudarSlide({ itens: e.target.value.split("\n") })}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {slide.layout === "comando" ? "Fotos (2 = antes e depois)" : "Foto"}
                    </Label>
                    <div className="flex gap-3">
                      {(slide.layout === "comando" ? [0, 1] : [0]).map((i) => (
                        <EscolherFoto
                          key={i}
                          rotulo={
                            slide.layout === "comando" ? (i ? "Depois" : "Antes") : "Foto do slide"
                          }
                          valor={slide.fotos?.[i]}
                          onEscolher={(fid) => {
                            const l = [...(slide.fotos ?? [])];
                            if (fid) l[i] = fid;
                            else l.splice(i, 1);
                            mudarSlide({ fotos: l.filter(Boolean) });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {!!slide.fotos?.length && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Enquadramento vertical da foto</Label>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[Number(/\s(\d+)%/.exec(slide.foco ?? "")?.[1] ?? 30)]}
                        onValueChange={([v]) => mudarSlide({ foco: `50% ${v}%` })}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="tema" className="m-0 p-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
              {design && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["fundo", "Fundo escuro"],
                        ["texto", "Texto"],
                        ["destaque", "Destaque"],
                        ["marca", "Marca"],
                        ["claro", "Fundo claro"],
                        ["textoClaro", "Texto no claro"],
                      ] as const
                    ).map(([k, l]) => (
                      <label key={k} className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">{l}</span>
                        <div className="flex items-center gap-1.5 rounded-md border px-1.5 h-8">
                          <input
                            type="color"
                            value={design.tema[k]}
                            onChange={(e) =>
                              mudar((d) => {
                                d.tema[k] = e.target.value;
                                return d;
                              })
                            }
                            className="h-5 w-6 bg-transparent cursor-pointer"
                          />
                          <span className="text-[11px] font-mono">{design.tema[k]}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["fonteTitulo", "Fonte dos títulos"],
                        ["fonteTexto", "Fonte do texto"],
                      ] as const
                    ).map(([k, l]) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-[11px]">{l}</Label>
                        <Select
                          value={design.tema[k]}
                          onValueChange={(v) =>
                            mudar((d) => {
                              d.tema[k] = v;
                              return d;
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONTES_CRIATIVO.map((f) => (
                              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <EscolherFoto
                      rotulo="Foto do avatar"
                      valor={design.autor.foto}
                      onEscolher={(fid) =>
                        mudar((d) => {
                          d.autor.foto = fid;
                          return d;
                        })
                      }
                    />
                    <div className="flex-1 space-y-1">
                      <Label className="text-[11px]">Nome</Label>
                      <Input
                        className="h-8"
                        value={design.autor.nome}
                        onChange={(e) =>
                          mudar((d) => {
                            d.autor.nome = e.target.value;
                            return d;
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[11px]">@</Label>
                      <Input
                        className="h-8"
                        value={design.autor.arroba}
                        onChange={(e) =>
                          mudar((d) => {
                            d.autor.arroba = e.target.value.replace(/^@/, "");
                            return d;
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={design.autor.verificado}
                        onCheckedChange={(v) =>
                          mudar((d) => {
                            d.autor.verificado = v;
                            return d;
                          })
                        }
                      />
                      Selo verificado
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={design.mostrarNumeracao}
                        onCheckedChange={(v) =>
                          mudar((d) => {
                            d.mostrarNumeracao = v;
                            return d;
                          })
                        }
                      />
                      Numeração e @ no rodapé
                    </label>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Legenda do post</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => {
                          void navigator.clipboard.writeText(design.legendaPost ?? "");
                          toast.success("Legenda copiada.");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                      </Button>
                    </div>
                    <Textarea
                      rows={6}
                      className="text-sm"
                      value={design.legendaPost ?? ""}
                      onChange={(e) =>
                        mudar((d) => {
                          d.legendaPost = e.target.value;
                          return d;
                        })
                      }
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Slides em tamanho real, fora da tela, só para exportar. */}
      {exportando &&
        design &&
        createPortal(
          <div
            style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}
            aria-hidden
          >
            {slides.map((s, i) => (
              <SlideView
                key={s.id}
                ref={(el) => {
                  nos.current[i] = el;
                }}
                {...props(s, i)}
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
