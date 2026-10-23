import { useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Play,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import { EFEITO_POR_TIPO, EFEITOS } from "@/video/catalogo";
import {
  ESTILOS_LEGENDA,
  LOOKS,
  NOME_TRANSICAO,
  POSICOES_LEGENDA,
  TRANSICOES,
  type Palavra,
  type Timeline,
} from "@/video/schema";
import { TOPO } from "@/video/legenda";
import { fmtTempo, type Midia, type Projeto } from "@/lib/vedit";
import { ESTILOS } from "@/video/catalogo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Trecho } from "@/video/tempo";
import { CorrecaoImagem, SonsAplicados } from "./AjustesImagem";
import { TrilhaSonora } from "./TrilhaSonora";
import { ImagensSugeridas } from "./ImagensSugeridas";
import { Roteiro } from "./Roteiro";
import { ModeloEdicao } from "./ModeloEdicao";
import { VozLimpa, type VozProps } from "./VozLimpa";

export function Painel({
  projeto,
  onAtualizar,
  tl,
  setTl,
  midias,
  onEnviarMidia,
  onIr,
  onComando,
  onCorteRapido,
  selecionado,
  trechos,
  amostra,
  temRecorte,
  recarregarMidias,
  agora,
  palavras,
  duracaoFonte,
  voz,
}: {
  projeto: Projeto;
  onAtualizar: (
    patch: Partial<Pick<Projeto, "nome" | "objetivo" | "formato" | "estilo" | "duracao_alvo">>,
  ) => Promise<void>;
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  midias: Midia[];
  onEnviarMidia: (f: File) => Promise<void>;
  onIr: (segundosOriginal: number) => void;
  onComando: (texto: string) => void;
  onCorteRapido: () => void;
  selecionado?: string | null;
  trechos: Trecho[];
  amostra?: { url?: string; tempos: number[] };
  temRecorte: boolean;
  recarregarMidias: () => Promise<unknown>;
  agora: number;
  palavras: Palavra[];
  duracaoFonte: number;
  voz: VozProps;
}) {
  const [subindo, setSubindo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const efeitos = [...tl.efeitos].sort((a, b) => a.de - b.de);
  const set = <K extends keyof Timeline>(k: K, v: Partial<Timeline[K]>, resumo: string) =>
    setTl({ ...tl, [k]: { ...(tl[k] as object), ...v } } as Timeline, resumo);

  return (
    <Tabs defaultValue="edicao" className="flex flex-col h-full min-h-0">
      <TabsList className="grid grid-cols-4 m-2">
        <TabsTrigger value="edicao">Na edição</TabsTrigger>
        <TabsTrigger value="roteiro">Cortes</TabsTrigger>
        <TabsTrigger value="biblioteca">Efeitos</TabsTrigger>
        <TabsTrigger value="midias">Mídias</TabsTrigger>
      </TabsList>

      <TabsContent value="edicao" className="flex-1 overflow-y-auto px-3 pb-3 space-y-5 mt-0">
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Projeto
          </div>
          <Input
            defaultValue={projeto.nome}
            key={projeto.nome}
            className="h-8"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== projeto.nome)
                onAtualizar({ nome: v }).catch((er) => toast.error(er.message));
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Objetivo</Label>
              <Select
                value={projeto.objetivo}
                onValueChange={(v) =>
                  onAtualizar({ objetivo: v as any })
                    .then(() =>
                      toast.success(
                        v === "anuncio"
                          ? "Agora é anúncio. Peça /anuncio para o editor reajustar."
                          : "Agora é orgânico.",
                      ),
                    )
                    .catch((er) => toast.error(er.message))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anuncio">Anúncio Meta</SelectItem>
                  <SelectItem value="organico">Reel orgânico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Formato</Label>
              <Select
                value={projeto.formato}
                onValueChange={(v) =>
                  onAtualizar({ formato: v as any }).catch((er) => toast.error(er.message))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["9:16", "4:5", "1:1"].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estilo</Label>
              <Select
                value={projeto.estilo}
                onValueChange={(v) =>
                  onAtualizar({ estilo: v as any })
                    .then(() =>
                      toast.success(
                        `Estilo ${v}. Peça "/estilo ${v}" para o editor refazer os efeitos.`,
                      ),
                    )
                    .catch((er) => toast.error(er.message))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTILOS).map(([id, e]) => (
                    <SelectItem key={id} value={id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duração alvo (s)</Label>
              <Input
                type="number"
                min={5}
                max={180}
                defaultValue={projeto.duracao_alvo ?? ""}
                key={projeto.duracao_alvo ?? "x"}
                className="h-8"
                placeholder="livre"
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n && n !== projeto.duracao_alvo)
                    onAtualizar({ duracao_alvo: n }).catch((er) => toast.error(er.message));
                }}
              />
            </div>
          </div>
        </section>

        <ModeloEdicao projeto={projeto} tl={tl} setTl={setTl} duracaoFonte={duracaoFonte} />

        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Efeitos aplicados ({efeitos.length})
          </div>
          {efeitos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum ainda. Peça no chat ou escolha na aba Efeitos.
            </p>
          )}
          {efeitos.map((e) => {
            const def = EFEITO_POR_TIPO[e.tipo];
            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2",
                  selecionado === e.id && "border-primary bg-primary/5",
                )}
              >
                <button
                  onClick={() => onIr(e.de)}
                  className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0"
                  title="Ir para o efeito"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{def?.nome ?? e.tipo}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {fmtTempo(e.de)}–{fmtTempo(e.ate)} ·{" "}
                    {String(
                      e.props?.texto ??
                        e.props?.palavra ??
                        e.props?.titulo ??
                        (Array.isArray(e.props?.itens) ? e.props.itens.join(", ") : ""),
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setTl(
                      { ...tl, efeitos: tl.efeitos.filter((x) => x.id !== e.id) },
                      `Removeu ${def?.nome ?? e.tipo}`,
                    )
                  }
                  className="h-7 w-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </section>

        <VozLimpa tl={tl} setTl={setTl} agora={agora} {...voz} />

        <TrilhaSonora
          tl={tl}
          setTl={setTl}
          objetivo={projeto.objetivo}
          estilo={projeto.estilo ?? "viral"}
        />

        <SonsAplicados tl={tl} setTl={setTl} trechos={trechos} onIr={onIr} />

        <CorrecaoImagem tl={tl} setTl={setTl} amostra={amostra} />

        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ajustes rápidos
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={onCorteRapido}>
            <Scissors className="h-4 w-4 mr-2" /> Corte rápido de silêncios
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Legenda</Label>
              <Select
                value={tl.legenda.ativa ? tl.legenda.estilo : "off"}
                onValueChange={(v) =>
                  set(
                    "legenda",
                    v === "off"
                      ? { ativa: false }
                      : v === "simples"
                        ? {
                            ativa: true,
                            estilo: "simples",
                            caixaAlta: false,
                            palavrasPorBloco: Math.max(5, tl.legenda.palavrasPorBloco),
                          }
                        : { ativa: true, estilo: v as any },
                    `Legenda: ${v}`,
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Sem legenda</SelectItem>
                  {ESTILOS_LEGENDA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posição</Label>
              <Select
                value={tl.legenda.posicao}
                onValueChange={(v) =>
                  set("legenda", { posicao: v as any, altura: null }, `Legenda na posição ${v}`)
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSICOES_LEGENDA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Look</Label>
              <Select
                value={tl.visual.look}
                onValueChange={(v) => set("visual", { look: v as any }, `Look ${v}`)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transição nos cortes</Label>
              <Select
                value={tl.visual.transicao}
                onValueChange={(v) => set("visual", { transicao: v as any }, `Transição ${v}`)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSICOES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {NOME_TRANSICAO[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Tamanho da legenda: {Math.round(tl.legenda.tamanho * 100)}%
            </Label>
            <Slider
              min={0.5}
              max={1.8}
              step={0.05}
              value={[tl.legenda.tamanho]}
              onValueChange={([v]) => set("legenda", { tamanho: v }, "Tamanho da legenda")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex justify-between">
              <span>Altura da legenda</span>
              {tl.legenda.altura != null && (
                <button
                  className="text-[11px] text-muted-foreground underline"
                  onClick={() => set("legenda", { altura: null }, "Altura da legenda padrão")}
                >
                  voltar ao padrão
                </button>
              )}
            </Label>
            <Slider
              min={0.12}
              max={0.88}
              step={0.01}
              value={[tl.legenda.altura ?? parseFloat(TOPO[tl.legenda.posicao]) / 100]}
              onValueChange={([v]) => set("legenda", { altura: v }, "Altura da legenda")}
            />
            <p className="text-[11px] text-muted-foreground">
              Arraste para a direita para descer. Ligue a zona segura no preview para ver até onde o
              Instagram cobre.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Palavras por bloco de legenda: {tl.legenda.palavrasPorBloco}
            </Label>
            <Slider
              min={1}
              max={8}
              step={1}
              value={[tl.legenda.palavrasPorBloco]}
              onValueChange={([v]) =>
                set("legenda", { palavrasPorBloco: v }, `Legenda com ${v} palavras`)
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Grão de filme</Label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[tl.visual.grao]}
              onValueChange={([v]) => set("visual", { grao: v }, "Grão")}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Zoom alternado nos cortes</Label>
            <Switch
              checked={tl.zoom.alternar}
              onCheckedChange={(v) => set("zoom", { alternar: v }, "Zoom alternado")}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Barra de progresso</Label>
            <Switch
              checked={tl.visual.barraProgresso}
              onCheckedChange={(v) => set("visual", { barraProgresso: v }, "Barra de progresso")}
            />
          </div>
        </section>
      </TabsContent>

      <TabsContent value="roteiro" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
        <Roteiro
          palavras={palavras}
          tl={tl}
          setTl={setTl}
          trechos={trechos}
          duracaoFonte={duracaoFonte}
          agora={agora}
          onIr={onIr}
        />
      </TabsContent>

      <TabsContent value="biblioteca" className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 mt-0">
        <p className="text-xs text-muted-foreground">
          Clique para mandar o comando ao chat. Complete com o que quer (ex.: "/vidro com os números
          que eu falei").
        </p>
        {EFEITOS.map((e) => (
          <button
            key={e.tipo}
            disabled={!e.disponivel}
            onClick={() => onComando(`${e.comando} `)}
            className={cn(
              "w-full text-left rounded-lg border p-2.5 hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{e.nome}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {e.disponivel ? e.comando : "fase 2"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">{e.descricao}</div>
          </button>
        ))}
      </TabsContent>

      <TabsContent value="midias" className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 mt-0">
        <ImagensSugeridas
          projetoId={projeto.id}
          tl={tl}
          setTl={setTl}
          trechos={trechos}
          temRecorte={temRecorte}
          onMidiaNova={recarregarMidias}
          onIr={onIr}
          agora={agora}
        />

        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={async (ev) => {
            const files = [...(ev.target.files ?? [])];
            if (!files.length) return;
            setSubindo(true);
            try {
              for (const f of files) await onEnviarMidia(f);
              toast.success(`${files.length} mídia(s) enviada(s).`);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setSubindo(false);
              ev.target.value = "";
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => input.current?.click()}
          disabled={subindo}
        >
          {subindo ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}{" "}
          Enviar prints, fotos, b-roll ou música
        </Button>
        <p className="text-xs text-muted-foreground">
          O Claude enxerga o nome de cada mídia. Nomeie bem (ex.: "print-dashboard-resultado.png") e
          peça "coloca o print do dashboard no celular".
        </p>
        {midias.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg border p-2">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              {m.tipo === "imagem" ? (
                <ImageIcon className="h-4 w-4" />
              ) : m.tipo === "audio" ? (
                <Music className="h-4 w-4" />
              ) : (
                <Film className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{m.nome}</div>
              <div className="text-[11px] text-muted-foreground">
                {m.tipo}
                {m.duracao ? ` · ${m.duracao}s` : ""}
              </div>
            </div>
            {m.tipo === "audio" && (
              <Button
                size="sm"
                variant={tl.musica.midia === m.id ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() =>
                  set(
                    "musica",
                    { midia: tl.musica.midia === m.id ? null : m.id },
                    tl.musica.midia === m.id ? "Tirou a música" : `Música: ${m.nome}`,
                  )
                }
              >
                {tl.musica.midia === m.id ? "Na trilha" : "Usar"}
              </Button>
            )}
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
