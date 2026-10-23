import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { COMANDOS, GRUPOS, montarPrompt, precisaFoto } from "@/criativos/comandos";
import {
  editarFoto,
  enviarFoto,
  excluirFoto,
  gerarFoto,
  useFotos,
  type FotoComUrl,
} from "@/lib/criativos";
import { db } from "@/lib/vedit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/criar/fotos")({
  component: MinhasFotos,
});

const FILTROS = [
  { v: "todas", l: "Todas" },
  { v: "upload", l: "Minhas fotos" },
  { v: "ia", l: "Criadas com IA" },
  { v: "fav", l: "Favoritas" },
] as const;

function MinhasFotos() {
  const qc = useQueryClient();
  const fotos = useFotos();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["v"]>("todas");
  const [sel, setSel] = useState<string[]>([]);
  const [cmds, setCmds] = useState<string[]>([]);
  const [livre, setLivre] = useState("");
  const [rosto, setRosto] = useState(true);
  const [formato, setFormato] = useState("4:5");
  const [n, setN] = useState("1");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [novas, setNovas] = useState<string[]>([]);
  const [excluir, setExcluir] = useState<FotoComUrl | null>(null);
  const [ampliada, setAmpliada] = useState<FotoComUrl | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // Assim que a foto nova chega na biblioteca, abre em tela cheia para conferir.
  const abrir = useRef<string | null>(null);
  useEffect(() => {
    const f = abrir.current ? fotos.data?.porId.get(abrir.current) : undefined;
    if (f) {
      abrir.current = null;
      setAmpliada(f);
    }
  }, [fotos.data]);

  const lista = useMemo(() => {
    const l = fotos.data?.lista.filter((f) => f.origem !== "referencia") ?? [];
    if (filtro === "fav") return l.filter((f) => f.favorita);
    if (filtro === "todas") return l;
    return l.filter((f) => f.origem === filtro);
  }, [fotos.data, filtro]);
  const selecionadas = sel.map((id) => fotos.data?.porId.get(id)).filter(Boolean) as FotoComUrl[];
  const recarregar = () => qc.invalidateQueries({ queryKey: ["cria", "fotos"] });

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    const arr = [...files];
    try {
      for (let i = 0; i < arr.length; i++) {
        setEnviando(`Enviando ${i + 1} de ${arr.length}`);
        const nova = await enviarFoto(arr[i]);
        // A foto que acabou de subir já fica selecionada para o estúdio.
        if (i < 3) setSel((l) => [...l, nova.id].slice(-3));
      }
      toast.success(arr.length > 1 ? `${arr.length} fotos na biblioteca.` : "Foto na biblioteca.");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(null);
      if (input.current) input.current.value = "";
    }
  }

  function alternar(id: string) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-3)));
  }

  async function criar() {
    if (!cmds.length && !livre.trim())
      return toast.error("Escolha um comando ou descreva o que quer.");
    if (!sel.length && precisaFoto(cmds))
      return toast.error(
        "Esses comandos transformam uma foto sua: clique na foto da biblioteca para selecionar antes.",
      );
    setGerando(true);
    try {
      const prompt = montarPrompt(cmds, livre, rosto && sel.length > 0);
      const nome = [...COMANDOS.filter((c) => cmds.includes(c.id)).map((c) => c.nome), livre.trim()]
        .filter(Boolean)
        .join(" ")
        .slice(0, 80);
      const r = sel.length
        ? await editarFoto({ fotos_ids: sel, prompt, formato, n: Number(n) })
        : await gerarFoto({ prompt, formato, n: Number(n) });
      if (nome)
        await db()
          .from("cria_fotos")
          .update({ nome })
          .in(
            "id",
            r.map((f) => f.id),
          );
      setNovas(r.map((f) => f.id));
      abrir.current = r[0]?.id ?? null;
      toast.success(r.length > 1 ? `${r.length} fotos novas.` : "Foto nova pronta.");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  async function favoritar(f: FotoComUrl) {
    await db().from("cria_fotos").update({ favorita: !f.favorita }).eq("id", f.id);
    recarregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas fotos</h1>
          <p className="text-sm text-muted-foreground">
            Suba suas fotos e transforme com comandos (/studioquality, /bokeh, /palco…) mantendo o
            seu rosto. Tudo aqui fica disponível para os carrosséis.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => subir(e.target.files)}
          />
          <Button onClick={() => input.current?.click()} disabled={!!enviando}>
            {enviando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {enviando ?? "Subir fotos"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setFiltro(f.v)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border",
                  filtro === f.v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted",
                )}
              >
                {f.l}
              </button>
            ))}
            {sel.length > 0 && (
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted ml-auto"
                onClick={() => setSel([])}
              >
                Limpar seleção ({sel.length})
              </button>
            )}
          </div>

          {fotos.isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lista.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 flex flex-col items-center text-center gap-3">
                <ImagePlus className="h-8 w-8 text-primary" />
                <div className="font-semibold">Nenhuma foto aqui ainda</div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Suba fotos suas com o rosto bem visível (retrato, meio corpo, corpo inteiro).
                  Quanto mais variadas, melhores ficam as versões criadas pela IA.
                </p>
                <Button onClick={() => input.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Subir fotos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
              {lista.map((f) => {
                const i = sel.indexOf(f.id);
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "group relative aspect-[4/5] rounded-lg overflow-hidden border bg-muted cursor-pointer",
                      i >= 0 && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      novas.includes(f.id) && "border-primary",
                    )}
                    onClick={() => setAmpliada(f)}
                    title={f.descricao ?? f.nome ?? ""}
                  >
                    <img src={f.url} className="h-full w-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      title={i >= 0 ? "Tirar da seleção" : "Selecionar para o estúdio"}
                      onClick={(e) => {
                        e.stopPropagation();
                        alternar(f.id);
                      }}
                      className={cn(
                        "absolute top-2 left-2 h-7 w-7 rounded-full border-2 text-xs font-bold flex items-center justify-center transition",
                        i >= 0
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-black/30 border-white/90 text-white opacity-70 group-hover:opacity-100",
                      )}
                    >
                      {i >= 0 ? (
                        i + 1
                      ) : (
                        <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60" />
                      )}
                    </button>
                    {f.origem === "ia" && (
                      <Badge
                        className="absolute bottom-2 left-2 h-5 px-1.5 text-[10px]"
                        variant="secondary"
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> IA
                      </Badge>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      {[
                        {
                          t: "Favoritar",
                          icon: (
                            <Star
                              className={cn(
                                "h-3.5 w-3.5",
                                f.favorita && "fill-current text-amber-400",
                              )}
                            />
                          ),
                          fn: () => favoritar(f),
                        },
                        {
                          t: "Ver grande",
                          icon: <ImagePlus className="h-3.5 w-3.5" />,
                          fn: () => setAmpliada(f),
                        },
                        {
                          t: "Excluir",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          fn: () => setExcluir(f),
                        },
                      ].map((b) => (
                        <button
                          key={b.t}
                          type="button"
                          title={b.t}
                          className="h-7 w-7 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            b.fn();
                          }}
                        >
                          {b.icon}
                        </button>
                      ))}
                    </div>
                    {f.favorita && (
                      <Star className="absolute bottom-2 right-2 h-4 w-4 fill-amber-400 text-amber-400 group-hover:opacity-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Card className="lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estúdio com IA</CardTitle>
            <CardDescription>
              {sel.length
                ? "Edita a partir das fotos selecionadas."
                : "Clique numa foto sua para transformá-la. Sem foto selecionada, só dá para criar do zero (fundos, objetos, cenas sem você)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selecionadas.length > 0 && (
              <div className="flex gap-2">
                {selecionadas.map((f) => (
                  <div key={f.id} className="relative h-20 w-16 rounded-md overflow-hidden border">
                    <img src={f.url} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded bg-black/60 text-white flex items-center justify-center"
                      onClick={() => alternar(f.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sel.length > 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label className="text-sm">/identitylock</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Mantém seu rosto e traços idênticos
                  </p>
                </div>
                <Switch checked={rosto} onCheckedChange={setRosto} />
              </div>
            )}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {GRUPOS.map((g) => (
                <div key={g.id} className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">{g.nome}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMANDOS.filter((c) => c.grupo === g.id).map((c) => {
                      const on = cmds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.dica}
                          onClick={() =>
                            setCmds((l) => (on ? l.filter((x) => x !== c.id) : [...l, c.id]))
                          }
                          className={cn(
                            "text-xs font-mono px-2 py-1 rounded-md border",
                            on
                              ? "bg-primary text-primary-foreground border-primary"
                              : "hover:bg-muted",
                          )}
                        >
                          {on && <Check className="inline h-3 w-3 mr-0.5" />}
                          {c.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">O que você quer (pode ser em português)</Label>
              <Textarea
                rows={3}
                value={livre}
                onChange={(e) => setLivre(e.target.value)}
                placeholder="Ex.: eu de blazer preto, sorrindo, num palco com telão roxo escrito IA"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Formato</Label>
                <Select value={formato} onValueChange={setFormato}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4:5">4:5 (feed/carrossel)</SelectItem>
                    <SelectItem value="1:1">1:1 (quadrado)</SelectItem>
                    <SelectItem value="9:16">9:16 (stories)</SelectItem>
                    <SelectItem value="16:9">16:9 (horizontal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Variações</Label>
                <Select value={n} onValueChange={setN}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={criar} disabled={gerando}>
              {gerando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando (até 1 min)…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />{" "}
                  {sel.length ? "Transformar foto" : "Criar do zero"}
                </>
              )}
            </Button>
            {novas.length > 0 && !gerando && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium">Resultado</div>
                <div className="flex gap-2">
                  {novas.map((id) => {
                    const f = fotos.data?.porId.get(id);
                    return f ? (
                      <button
                        key={id}
                        type="button"
                        className="h-28 w-[90px] rounded-md overflow-hidden border"
                        onClick={() => setAmpliada(f)}
                      >
                        <img src={f.url} className="h-full w-full object-cover" />
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {ampliada &&
        createPortal(
          <Previa
            foto={ampliada}
            original={ampliada.base_id ? fotos.data?.porId.get(ampliada.base_id) : undefined}
            onFechar={() => setAmpliada(null)}
            onUsar={() => {
              setSel([ampliada.id]);
              setAmpliada(null);
            }}
          />,
          document.body,
        )}

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Some da biblioteca. Criativos que já usam esta foto ficam com o espaço vazio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!excluir) return;
                try {
                  await excluirFoto(excluir);
                  setSel((s) => s.filter((x) => x !== excluir.id));
                  recarregar();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Foto em tela cheia; nas criadas por IA, alterna com a original para comparar. */
function Previa({
  foto,
  original,
  onFechar,
  onUsar,
}: {
  foto: FotoComUrl;
  original?: FotoComUrl;
  onFechar: () => void;
  onUsar: () => void;
}) {
  const [verOriginal, setVerOriginal] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);
  const atual = verOriginal && original ? original : foto;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 sm:p-8"
      onClick={onFechar}
    >
      <div
        className="relative flex flex-col items-center max-h-full max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={atual.url}
          className="max-h-[calc(100vh-9rem)] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-white text-sm">
          <span className="max-w-md truncate opacity-80">
            {verOriginal ? "Foto original" : (foto.nome ?? "")}
          </span>
          {original && (
            <Button size="sm" variant="secondary" onClick={() => setVerOriginal((v) => !v)}>
              {verOriginal ? "Ver resultado" : "Comparar com a original"}
            </Button>
          )}
          <Button size="sm" variant="secondary" asChild>
            <a href={atual.url} download target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-1" /> Baixar
            </a>
          </Button>
          <Button size="sm" variant="secondary" onClick={onUsar}>
            Usar no estúdio
          </Button>
          <Button size="sm" variant="secondary" onClick={onFechar} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
