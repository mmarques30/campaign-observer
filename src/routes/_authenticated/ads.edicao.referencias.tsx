// Edição → Referências: biblioteca de Reels de referência analisados pelo Claude.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmarExclusao } from "@/components/edicao/ConfirmarExclusao";
import { UsarReferencia } from "@/components/edicao/UsarReferencia";
import {
  BookOpen,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EFEITOS } from "@/video/catalogo";
import {
  assinarEtapas,
  criarReferencia,
  excluirReferencia,
  lerEtapa,
  reanalisar,
  STATUS_REF,
  urlAssinada,
  criarReferenciaPorLink,
  type Referencia,
  type Tecnica,
} from "@/lib/referencias";
import { BUCKET, db, fmtTempo } from "@/lib/vedit";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";

export const Route = createFileRoute("/_authenticated/ads/edicao/referencias")({
  component: ReferenciasPage,
});

const COR_STATUS: Record<Tecnica["status"], string> = {
  temos: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  adaptar: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  criar: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};
const ROTULO: Record<Tecnica["status"], string> = {
  temos: "já temos",
  adaptar: "adaptar",
  criar: "criar",
};

function ReferenciasPage() {
  const qc = useQueryClient();
  const refs = useQuery({
    queryKey: ["vedit", "referencias"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("vedit_referencias")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Referencia[];
    },
    refetchInterval: 8_000,
  });
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<Referencia | null>(null);
  const [excluindo, setExcluindo] = useState<Referencia | null>(null);
  const excluir = useMutation({
    mutationFn: (r: Referencia) => excluirReferencia(r.id),
    onSuccess: () => {
      toast.success("Referência excluída.");
      setExcluindo(null);
      setSel(null);
      qc.invalidateQueries({ queryKey: ["vedit", "referencias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  // Mantém o painel aberto sincronizado com a lista (status muda em segundo plano).
  useEffect(() => {
    if (sel) {
      const novo = refs.data?.find((r) => r.id === sel.id);
      if (novo && novo !== sel) setSel(novo);
    }
  }, [refs.data, sel]);

  const lista = refs.data ?? [];
  const backlog = useMemo(() => {
    const m = new Map<
      string,
      { nome: string; vezes: number; status: Tecnica["status"]; refs: string[] }
    >();
    for (const r of lista)
      for (const t of r.analise?.tecnicas ?? [])
        if (t.status !== "temos") {
          const k = t.nome.toLowerCase();
          const cur = m.get(k) ?? { nome: t.nome, vezes: 0, status: t.status, refs: [] };
          cur.vezes++;
          if (!cur.refs.includes(r.autor ?? r.id)) cur.refs.push(r.autor ?? r.id);
          m.set(k, cur);
        }
    return [...m.values()].sort((a, b) => b.vezes - a.vezes);
  }, [lista]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referências</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Cole o link do vídeo (Instagram, TikTok, YouTube). O servidor baixa, extrai os quadros e
            a fala; o Claude lê tudo com o nosso catálogo e devolve as técnicas, o estilo, o ritmo e
            o que já temos, adaptar ou criar.
          </p>
        </div>
        <Button onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova referência
        </Button>
      </div>

      {refs.isError && (
        <Card className="border-amber-500/40">
          <CardContent className="p-4 text-sm">
            A tabela <code>vedit_referencias</code> ainda não existe. Rode{" "}
            <code>supabase/migrations/20261023000000_vedit_referencias.sql</code> e publique a
            função <code>vedit-referencia</code>.
          </CardContent>
        </Card>
      )}

      {backlog.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Wand2 className="h-4 w-4 text-primary" /> Para criar ou adaptar no catálogo
              <span className="text-xs font-normal text-muted-foreground">
                técnicas que apareceram nas referências e ainda não temos
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {backlog.slice(0, 30).map((b) => (
                <Badge
                  key={b.nome}
                  variant="outline"
                  className={cn("font-normal", COR_STATUS[b.status])}
                  title={`Visto em: ${b.refs.join(", ")}`}
                >
                  {b.nome}
                  {b.vezes > 1 && <span className="ml-1 opacity-70">×{b.vezes}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lista.length === 0 && !refs.isLoading && !refs.isError ? (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Nenhuma referência ainda</div>
              <p className="text-sm text-muted-foreground max-w-md">
                Viu um Reel com uma edição que você quer reproduzir? Salve aqui. Em 1–2 minutos você
                tem a ficha técnica e um pedido pronto para colar no editor.
              </p>
            </div>
            <Button onClick={() => setAberto(true)}>
              <Upload className="h-4 w-4 mr-2" /> Salvar a primeira
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((r) => (
            <CartaoRef
              key={r.id}
              r={r}
              onAbrir={() => setSel(r)}
              onExcluir={() => setExcluindo(r)}
            />
          ))}
        </div>
      )}

      <NovaReferencia
        aberto={aberto}
        onFechar={() => setAberto(false)}
        onCriada={() => qc.invalidateQueries({ queryKey: ["vedit", "referencias"] })}
      />
      <Detalhe r={sel} onFechar={() => setSel(null)} onExcluir={() => sel && setExcluindo(sel)} />
      <ConfirmarExclusao
        projeto={
          excluindo
            ? { id: excluindo.id, nome: excluindo.autor ?? excluindo.titulo ?? "referência" }
            : null
        }
        ocupado={excluir.isPending}
        onCancelar={() => setExcluindo(null)}
        onConfirmar={() => excluindo && excluir.mutate(excluindo)}
      />
    </div>
  );
}

function usarEtapa(id: string) {
  return useSyncExternalStore(
    assinarEtapas,
    () => lerEtapa(id),
    () => null,
  );
}

function CartaoRef({
  r,
  onAbrir,
  onExcluir,
}: {
  r: Referencia;
  onAbrir: () => void;
  onExcluir: () => void;
}) {
  const etapa = usarEtapa(r.id);
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (r.folhas?.[0]) void urlAssinada(r.folhas[0]).then(setThumb);
  }, [r.folhas]);
  const a = r.analise;
  const contagem = { temos: 0, adaptar: 0, criar: 0 };
  for (const t of a?.tecnicas ?? []) contagem[t.status]++;
  const ocupado = r.status !== "pronta" && r.status !== "erro";
  return (
    <Card
      className="group relative hover:border-primary/50 hover:shadow-md transition cursor-pointer"
      onClick={onAbrir}
    >
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onExcluir();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <CardContent className="p-4 flex gap-4">
        <div className="shrink-0 w-20 h-32 rounded-lg bg-foreground/90 overflow-hidden flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover object-top" />
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="font-semibold truncate">
            {r.autor ? `@${r.autor.replace(/^@/, "")}` : (r.titulo ?? "Referência")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{STATUS_REF[r.status]}</Badge>
            <Badge variant="outline">{r.plataforma}</Badge>
            {r.duracao ? <Badge variant="outline">{fmtTempo(Number(r.duracao))}</Badge> : null}
          </div>
          {a ? (
            <>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {a.estilo.nome} · {a.resumo}
              </div>
              <div className="flex gap-1.5 text-[11px]">
                <span className={cn("px-1.5 rounded border", COR_STATUS.temos)}>
                  {contagem.temos} temos
                </span>
                <span className={cn("px-1.5 rounded border", COR_STATUS.adaptar)}>
                  {contagem.adaptar} adaptar
                </span>
                <span className={cn("px-1.5 rounded border", COR_STATUS.criar)}>
                  {contagem.criar} criar
                </span>
              </div>
            </>
          ) : ocupado ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> {etapa?.etapa ?? STATUS_REF[r.status]}
              </div>
              <Progress value={etapa?.pct ?? 10} className="h-1.5" />
            </div>
          ) : r.status === "erro" ? (
            <div className="text-xs text-red-600 line-clamp-2">{r.erro}</div>
          ) : null}
          <div className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NovaReferencia({
  aberto,
  onFechar,
  onCriada,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriada: () => void;
}) {
  const [url, setUrl] = useState("");
  const [etapa, setEtapa] = useState("");
  const [notas, setNotas] = useState("");
  const [legenda, setLegenda] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ehInstagram = /instagram\.com\/(p|reel|reels|tv)\//i.test(url);
  const ehLink = /^https?:\/\/\S+/i.test(url.trim());
  async function criar() {
    if (!arquivo && !ehLink)
      return toast.error("Cole o link do vídeo (Instagram, TikTok, YouTube) ou solte o arquivo.");
    setOcupado(true);
    try {
      let video = arquivo;
      let leg = legenda;
      if (!video) {
        // Tudo no servidor (baixa, quadros, áudio, transcrição e análise): pode fechar a aba.
        await criarReferenciaPorLink({ url, notas, legenda });
        toast.success("Baixando e analisando no servidor (1 a 2 min). Pode sair desta tela.");
        onCriada();
        onFechar();
        setUrl("");
        setNotas("");
        setLegenda("");
        return;
      }
      await criarReferencia({ url, arquivo: video, notas, legenda: leg });
      toast.success("Referência salva. Analisando em segundo plano — deixe esta aba aberta.");
      onCriada();
      onFechar();
      setUrl("");
      setNotas("");
      setLegenda("");
      setArquivo(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
      setEtapa("");
    }
  }
  return (
    <Dialog open={aberto} onOpenChange={(o) => !ocupado && !o && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova referência</DialogTitle>
          <DialogDescription>
            Cole o link do vídeo (Reel do Instagram, TikTok ou YouTube Shorts): o sistema baixa,
            analisa a edição e você aplica num vídeo seu, mesmo já editado. Se o post for privado,
            solte o arquivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Link do post</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/… ou link do TikTok"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arquivo do vídeo {ehLink ? "(opcional)" : ""}</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>O que chamou sua atenção (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ex.: as palavras em vermelho flutuando com o objeto 3D; o ritmo do começo"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Legenda do post (opcional)</Label>
            <Textarea value={legenda} onChange={(e) => setLegenda(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          {etapa && (
            <span className="text-xs text-muted-foreground mr-auto self-center">{etapa}</span>
          )}
          <Button onClick={criar} disabled={ocupado}>
            {ocupado ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detalhe({
  r,
  onFechar,
  onExcluir,
}: {
  r: Referencia | null;
  onFechar: () => void;
  onExcluir: () => void;
}) {
  const [folhas, setFolhas] = useState<string[]>([]);
  const [reanalisando, setReanalisando] = useState(false);
  useEffect(() => {
    if (!r?.folhas?.length) return setFolhas([]);
    void Promise.all(r.folhas.map((p) => urlAssinada(p))).then((u) =>
      setFolhas(u.filter(Boolean) as string[]),
    );
  }, [r?.folhas]);
  const a = r?.analise;
  const copiar = async (t: string) => {
    await navigator.clipboard.writeText(t);
    toast.success("Copiado.");
  };
  const efeitoTitulo = (tipo?: string | null) =>
    EFEITOS.find((e) => e.tipo === tipo)?.comando ?? tipo ?? "";
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {r && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {r.autor ? `@${r.autor.replace(/^@/, "")}` : (r.titulo ?? "Referência")}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </SheetTitle>
              <SheetDescription>
                {STATUS_REF[r.status]} · {r.plataforma}
                {r.duracao ? ` · ${fmtTempo(Number(r.duracao))}` : ""}
                {r.metricas && Object.keys(r.metricas).length
                  ? " · " +
                    Object.entries(r.metricas)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")
                  : ""}
              </SheetDescription>
            </SheetHeader>

            {r.status === "erro" && <div className="mt-3 text-sm text-red-600">{r.erro}</div>}

            {a ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="font-semibold">{a.estilo.nome}</div>
                  <p className="text-muted-foreground">{a.resumo}</p>
                  <p>
                    <b>Gancho</b> ({a.gancho.segundos ?? "?"}s): "{a.gancho.texto}" —{" "}
                    {a.gancho.tecnica}
                  </p>
                  {a.ritmo && (
                    <p>
                      <b>Ritmo</b>: estímulo a cada {a.ritmo.estimulo_medio_s ?? "?"}s · legenda{" "}
                      {a.ritmo.legenda_estilo ?? "?"}, {a.ritmo.legenda_palavras_por_bloco ?? "?"}{" "}
                      palavra(s)/bloco, {a.ritmo.legenda_posicao ?? "?"}
                    </p>
                  )}
                  {a.estilo.paleta?.length ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Paleta</span>
                      {a.estilo.paleta.map((c) => (
                        <span
                          key={c}
                          title={c}
                          className="h-5 w-5 rounded border"
                          style={{ background: c }}
                        />
                      ))}
                      {a.estilo.tipografia && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {a.estilo.tipografia}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                <UsarReferencia r={r} a={a} />

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copiar(a.prompt_para_editor)}>
                    <Copy className="h-4 w-4 mr-2" /> Copiar pedido para o editor
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/ads/edicao">
                      <Wand2 className="h-4 w-4 mr-2" /> Abrir Estúdio
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reanalisando}
                    onClick={async () => {
                      setReanalisando(true);
                      try {
                        await reanalisar(r.id);
                        toast.success("Reanalisada com o catálogo atual.");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setReanalisando(false);
                      }
                    }}
                  >
                    {reanalisando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reanalisar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={onExcluir}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                  {a.prompt_para_editor}
                </div>

                <Tabs defaultValue="tecnicas">
                  <TabsList>
                    <TabsTrigger value="tecnicas">Técnicas ({a.tecnicas.length})</TabsTrigger>
                    <TabsTrigger value="aprender">O que copiar</TabsTrigger>
                    <TabsTrigger value="quadros">Quadros</TabsTrigger>
                    <TabsTrigger value="fala">Fala</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tecnicas" className="space-y-2">
                    {a.tecnicas.map((t, i) => (
                      <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {t.de.toFixed(1)}–{t.ate.toFixed(1)}s
                          </span>
                          <span className="font-semibold">{t.nome}</span>
                          <Badge variant="outline" className={cn("ml-auto", COR_STATUS[t.status])}>
                            {ROTULO[t.status]}
                            {t.efeito_nosso ? ` · ${efeitoTitulo(t.efeito_nosso)}` : ""}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{t.descricao}</p>
                        <p>
                          <b>Como reproduzir:</b> {t.como_reproduzir}
                        </p>
                        {t.props_sugeridos && (
                          <p className="text-xs text-muted-foreground">
                            <b>Props:</b> {t.props_sugeridos}
                          </p>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="aprender">
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {a.aprendizados.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                    {a.cta?.texto && (
                      <p className="text-sm mt-3">
                        <b>CTA:</b> "{a.cta.texto}" — {a.cta.tecnica}
                      </p>
                    )}
                    {a.preset_estilo && (
                      <div className="mt-3 rounded-lg border p-3 text-sm">
                        <div className="font-semibold mb-1">Preset para o editor</div>
                        <div className="text-muted-foreground">
                          base {a.preset_estilo.estilo_base ?? "viral"} · legenda{" "}
                          {a.preset_estilo.legenda ?? "?"} · look {a.preset_estilo.look ?? "?"} ·
                          transição {a.preset_estilo.transicao ?? "?"}
                        </div>
                        {a.preset_estilo.efeitos_preferidos?.length ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {a.preset_estilo.efeitos_preferidos.map((e) => (
                              <Badge key={e} variant="outline" className="font-mono text-[11px]">
                                {efeitoTitulo(e)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="quadros" className="space-y-3">
                    {folhas.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt={`folha ${i + 1}`}
                        className="w-full rounded-lg border"
                      />
                    ))}
                  </TabsContent>
                  <TabsContent value="fala">
                    <p className="text-sm whitespace-pre-wrap">
                      {r.transcricao_texto || "(sem transcrição)"}
                    </p>
                    {r.legenda && (
                      <p className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap">
                        <b>Legenda do post:</b> {r.legenda}
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
                {r.status !== "erro" && <Loader2 className="h-4 w-4 animate-spin" />}
                {r.status === "erro"
                  ? "A análise falhou. Exclua e tente de novo."
                  : "Analisando… a ficha aparece aqui quando terminar."}
                {r.status === "erro" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() =>
                      reanalisar(r.id)
                        .then(() => toast.success("Reanalisando."))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <Eye className="h-4 w-4 mr-2" /> Tentar analisar de novo
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
