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
import { ESTILOS_LEGENDA, LOOKS, POSICOES_LEGENDA, type Timeline } from "@/video/schema";
import { fmtTempo, type Midia } from "@/lib/vedit";
import { cn } from "@/lib/utils";

export function Painel({
  tl,
  setTl,
  midias,
  onEnviarMidia,
  onIr,
  onComando,
  onCorteRapido,
  selecionado,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  midias: Midia[];
  onEnviarMidia: (f: File) => Promise<void>;
  onIr: (segundosOriginal: number) => void;
  onComando: (texto: string) => void;
  onCorteRapido: () => void;
  selecionado?: string | null;
}) {
  const [subindo, setSubindo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const efeitos = [...tl.efeitos].sort((a, b) => a.de - b.de);
  const set = <K extends keyof Timeline>(k: K, v: Partial<Timeline[K]>, resumo: string) =>
    setTl({ ...tl, [k]: { ...(tl[k] as object), ...v } } as Timeline, resumo);

  return (
    <Tabs defaultValue="edicao" className="flex flex-col h-full min-h-0">
      <TabsList className="grid grid-cols-3 m-2">
        <TabsTrigger value="edicao">Na edição</TabsTrigger>
        <TabsTrigger value="biblioteca">Efeitos</TabsTrigger>
        <TabsTrigger value="midias">Mídias</TabsTrigger>
      </TabsList>

      <TabsContent value="edicao" className="flex-1 overflow-y-auto px-3 pb-3 space-y-5 mt-0">
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
                    v === "off" ? { ativa: false } : { ativa: true, estilo: v as any },
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
                  set("legenda", { posicao: v as any }, `Legenda na posição ${v}`)
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
                  {["nenhuma", "flash", "chicote", "glitch", "zoom"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Palavras por bloco de legenda: {tl.legenda.palavrasPorBloco}
            </Label>
            <Slider
              min={1}
              max={5}
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
          {tl.musica.midia && (
            <div className="space-y-1">
              <Label className="text-xs">Volume da música</Label>
              <Slider
                min={0}
                max={0.5}
                step={0.01}
                value={[tl.musica.volume]}
                onValueChange={([v]) => set("musica", { volume: v }, "Volume da música")}
              />
            </div>
          )}
        </section>
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
