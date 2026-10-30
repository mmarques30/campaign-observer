import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  GalleryHorizontalEnd,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { SlideEscalado } from "@/components/criativos/SlideView";
import { EscolherModelo, type CriaModelo } from "@/components/criativos/Modelos";
import { chamarAgente, carregarFontes, useFotos } from "@/lib/criativos";
import { db } from "@/lib/vedit";
import {
  normalizarDesign,
  type CriaProjeto,
  type CriaReferencia,
  type Formato,
} from "@/criativos/design";
import { cn } from "@/lib/utils";

const LINK_POST = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i;

export const Route = createFileRoute("/_authenticated/ads/criar/")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s.ref === "string" ? { ref: s.ref } : {},
  component: Criativos,
});

const STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando: "Lendo referência",
  gerando: "Criando",
  pronto: "Pronto",
  erro: "Erro",
};

function Criativos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ref } = Route.useSearch();
  const fotos = useFotos();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"carrossel" | "unico">("carrossel");
  const [formato, setFormato] = useState<Formato>("4:5");
  const [objetivo, setObjetivo] = useState<"organico" | "anuncio">("organico");
  const [briefing, setBriefing] = useState("");
  const [roteiro, setRoteiro] = useState("");
  const [referencia, setReferencia] = useState<string>("nenhuma");
  const [modelo, setModelo] = useState<CriaModelo | null>(null);
  const [linkRef, setLinkRef] = useState("");
  const [buscandoRef, setBuscandoRef] = useState(false);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);
  const [excluir, setExcluir] = useState<CriaProjeto | null>(null);

  useEffect(() => {
    void carregarFontes();
  }, []);
  useEffect(() => {
    if (ref) {
      setReferencia(ref);
      setAberto(true);
    }
  }, [ref]);

  const projetos = useQuery({
    queryKey: ["cria", "projetos"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("cria_projetos")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as CriaProjeto[];
    },
    refetchInterval: (q) =>
      (q.state.data as CriaProjeto[] | undefined)?.some((p) =>
        ["gerando", "aguardando"].includes(p.status),
      )
        ? 5000
        : false,
  });
  const refs = useQuery({
    queryKey: ["cria", "referencias-curto"],
    queryFn: async () =>
      ((
        await db()
          .from("cria_referencias")
          .select("id, autor, analise, status, imagens")
          .neq("status", "erro")
          .order("created_at", { ascending: false })
          .limit(40)
      ).data ?? []) as Pick<CriaReferencia, "id" | "autor" | "analise" | "status" | "imagens">[],
    refetchInterval: (q) =>
      (q.state.data as Pick<CriaReferencia, "status">[] | undefined)?.some(
        (r) => r.status !== "pronta",
      )
        ? 4000
        : false,
  });
  const refEscolhida = (refs.data ?? []).find((r) => r.id === referencia);

  /** Link colado aqui mesmo: vira referência (o servidor baixa os slides e o Claude analisa). */
  async function usarLink(): Promise<string | null> {
    const url = linkRef.trim();
    if (!url) return null;
    if (!LINK_POST.test(url)) {
      toast.error("Cole o link de um post ou carrossel do Instagram.");
      return null;
    }
    setBuscandoRef(true);
    try {
      const r = (await chamarAgente({ acao: "referencia", url })) as {
        referencia?: { id: string };
      };
      const id = r.referencia?.id ?? null;
      if (id) {
        setReferencia(id);
        setLinkRef("");
        await qc.invalidateQueries({ queryKey: ["cria", "referencias-curto"] });
      }
      return id;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBuscandoRef(false);
    }
  }

  async function criar() {
    if (!briefing.trim() && !roteiro.trim())
      return toast.error("Escreva o briefing ou cole o roteiro.");
    setCriando(true);
    try {
      let refId = referencia !== "nenhuma" ? referencia : null;
      if (linkRef.trim() && !modelo) {
        const novo = await usarLink();
        if (!novo) return;
        refId = novo;
      }
      const fotosTxt = escolhidas.length
        ? `\nUse prioritariamente estas fotos: ${escolhidas.join(", ")}.`
        : "";
      const { data, error } = await db()
        .from("cria_projetos")
        .insert({
          nome:
            nome.trim() ||
            (briefing.trim() || roteiro.trim()).split("\n")[0].replace(/\*/g, "").slice(0, 60),
          tipo,
          formato,
          objetivo,
          briefing: briefing.trim() + fotosTxt,
          roteiro: roteiro.trim() || null,
          referencia_id: modelo ? null : refId,
          // Com modelo: o criativo já nasce com a estrutura dele; o Claude troca o conteúdo.
          modelo_id: modelo?.id ?? null,
          ...(modelo ? { design: modelo.design } : {}),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await chamarAgente({ acao: "criar", projeto_id: data.id });
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["cria", "projetos"] });
      navigate({ to: "/ads/criar/$id", params: { id: data.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCriando(false);
    }
  }

  const lista = projetos.data ?? [];
  const minhas = (fotos.data?.lista ?? []).filter((f) => f.origem !== "referencia").slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criativos</h1>
          <p className="text-sm text-muted-foreground">
            Carrosséis e posts únicos com as suas fotos. Escreva o briefing, escolha uma referência
            e ajuste pelo chat ou à mão. Exporta em PNG pronto para postar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/ads/criar/fotos">
              <ImagePlus className="h-4 w-4 mr-2" /> Minhas fotos
            </Link>
          </Button>
          <Button onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo criativo
          </Button>
        </div>
      </div>

      {projetos.isError && (
        <Card className="border-amber-500/40">
          <CardContent className="p-4 text-sm">
            As tabelas de criativos ainda não existem. Rode{" "}
            <code>supabase/migrations/20261023040000_cria_criativos.sql</code>.
          </CardContent>
        </Card>
      )}

      {lista.length === 0 && !projetos.isLoading && !projetos.isError ? (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <GalleryHorizontalEnd className="h-8 w-8 text-primary" />
            <div>
              <div className="font-semibold">Nenhum criativo ainda</div>
              <p className="text-sm text-muted-foreground max-w-md">
                Comece subindo algumas fotos suas em Minhas fotos. Depois é só escrever o tema do
                carrossel.
              </p>
            </div>
            <Button onClick={() => setAberto(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo criativo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {lista.map((p) => {
            const d = normalizarDesign(p.design);
            const s = d.slides[0];
            return (
              <Link key={p.id} to="/ads/criar/$id" params={{ id: p.id }} className="group">
                <Card className="overflow-hidden hover:border-primary/50 hover:shadow-md transition relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 opacity-0 group-hover:opacity-100 hover:text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExcluir(p);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="bg-muted flex items-center justify-center aspect-[4/5] overflow-hidden">
                    {s && fotos.data ? (
                      <SlideEscalado
                        slide={s}
                        design={d}
                        formato={p.formato}
                        fotos={fotos.data.porId}
                        indice={0}
                        total={d.slides.length}
                      />
                    ) : p.status === "gerando" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <GalleryHorizontalEnd className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="font-medium text-sm truncate">{p.nome}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        {p.tipo === "unico" ? "Post único" : `${d.slides.length} slides`}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          p.status === "gerando" &&
                            "bg-amber-500/15 text-amber-700 border-amber-500/30",
                          p.status === "erro" && "text-red-600 border-red-500/40",
                        )}
                      >
                        {STATUS[p.status]}
                      </Badge>
                      {formatDistanceToNow(new Date(p.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={(o) => !criando && setAberto(o)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo criativo</DialogTitle>
            <DialogDescription>
              O Claude escreve os textos, escolhe as fotos e monta os slides. Leva cerca de 1 minuto
              (mais se precisar criar fotos novas).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["carrossel", "Carrossel", GalleryHorizontalEnd, "5 a 9 slides"],
                    ["unico", "Post único", Square, "1 imagem"],
                  ] as const
                ).map(([v, l, I, d]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTipo(v)}
                    className={cn(
                      "rounded-lg border p-3 text-left flex items-center gap-3",
                      tipo === v ? "border-primary bg-primary/5" : "hover:bg-muted",
                    )}
                  >
                    <I className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium">{l}</div>
                      <div className="text-xs text-muted-foreground">{d}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Briefing {roteiro.trim() ? "(opcional com roteiro)" : ""}</Label>
                <Textarea
                  rows={roteiro.trim() ? 4 : 7}
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder={
                    "Tema, mensagem principal, para quem e o que a pessoa deve fazer no fim.\nEx.: 5 automações com IA que todo dono de clínica deveria ter. Público: donos de clínicas. CTA: comentar AUTOMAÇÃO para receber o guia."
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Roteiro (opcional)</Label>
                <Textarea
                  rows={roteiro.trim() ? 12 : 6}
                  value={roteiro}
                  onChange={(e) => setRoteiro(e.target.value)}
                  placeholder={
                    'Cole o texto pronto. Cada bloco vira um slide, na ordem (separe com linha em branco ou "Slide 1:", "Slide 2:"…).\nO Claude mantém as suas palavras e encaixa cada parte no slide equivalente da referência.'
                  }
                />
                {roteiro.trim() && tipo === "carrossel" && (
                  <p className="text-xs text-muted-foreground">
                    {
                      roteiro
                        .trim()
                        .split(/\n\s*\n|\n(?=\s*(?:slide\s*\d+|\d+[.)-])\s)/i)
                        .filter((b) => b.trim()).length
                    }{" "}
                    blocos no roteiro
                    {refEscolhida?.analise?.estrutura?.length
                      ? ` · a referência tem ${refEscolhida.analise.estrutura.length} slides`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Formato</Label>
                  <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4:5">4:5 (feed)</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="9:16">9:16 (stories)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Objetivo</Label>
                  <Select
                    value={objetivo}
                    onValueChange={(v) => setObjetivo(v as "organico" | "anuncio")}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organico">Orgânico</SelectItem>
                      <SelectItem value="anuncio">Anúncio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome (opcional)</Label>
                  <Input className="h-9" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              </div>
              <EscolherModelo
                valor={modelo?.id ?? null}
                onChange={(m) => {
                  setModelo(m);
                  if (m) {
                    setTipo(m.tipo);
                    setFormato(m.formato);
                  }
                }}
              />
              {modelo ? (
                <p className="text-xs text-muted-foreground">
                  Baseado no modelo <strong>{modelo.nome}</strong>: mesma estrutura, layouts,
                  visuais e cores; o Claude troca o conteúdo pelo do briefing ou roteiro.
                </p>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Referência (o modelo a seguir, slide a slide)</Label>
                  <Select value={referencia} onValueChange={setReferencia}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem referência (o Claude escolhe)</SelectItem>
                      {(refs.data ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.status === "pronta"
                            ? (r.analise?.estilo ?? "Referência")
                            : r.status === "baixando"
                              ? "Nova referência · baixando slides…"
                              : "Nova referência · analisando…"}
                          {r.autor ? ` · @${r.autor}` : ""}
                          {r.imagens?.length ? ` · ${r.imagens.length} slides` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      className="h-9"
                      value={linkRef}
                      onChange={(e) => setLinkRef(e.target.value)}
                      placeholder="ou cole o link de um post do Instagram como referência"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 shrink-0"
                      onClick={() => void usarLink()}
                      disabled={buscandoRef || !linkRef.trim()}
                    >
                      {buscandoRef ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-1.5" />
                      )}
                      Usar link
                    </Button>
                  </div>
                  {refEscolhida && refEscolhida.status !== "pronta" && (
                    <p className="text-xs text-muted-foreground">
                      A referência ainda está sendo lida. Pode clicar em Criar: o Claude espera ela
                      ficar pronta e então monta o criativo.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Fotos que quer usar (opcional
                  {escolhidas.length ? ` · ${escolhidas.length} escolhidas` : ""})
                </Label>
                {minhas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sem fotos na biblioteca.{" "}
                    <Link to="/ads/criar/fotos" className="underline">
                      Suba algumas em Minhas fotos
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {minhas.map((f) => {
                      const on = escolhidas.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setEscolhidas((l) => (on ? l.filter((x) => x !== f.id) : [...l, f.id]))
                          }
                          className={cn(
                            "relative h-20 w-16 rounded-md overflow-hidden border shrink-0",
                            on && "ring-2 ring-primary",
                          )}
                        >
                          <img src={f.url} className="h-full w-full object-cover" loading="lazy" />
                          {on && (
                            <Check className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground p-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={criar} disabled={criando}>
              {criando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{excluir?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Apaga o criativo, as versões e a conversa. As fotos continuam na biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!excluir) return;
                await db().from("cria_projetos").delete().eq("id", excluir.id);
                qc.invalidateQueries({ queryKey: ["cria", "projetos"] });
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
