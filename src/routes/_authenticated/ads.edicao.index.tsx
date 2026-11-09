import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CenterStage, GlassStat } from "@/components/ads/viz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clapperboard, Loader2, Megaphone, Plus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { ConfirmarExclusao } from "@/components/edicao/ConfirmarExclusao";
import {
  criarProjeto,
  criarProjetoPorLink,
  db,
  excluirProjeto,
  fmtTempo,
  STATUS_LABEL,
  type Marca,
  type Projeto,
} from "@/lib/vedit";
import type { Formato } from "@/video/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/edicao/")({
  component: Estudio,
});

function corStatus(s: string) {
  if (s === "erro") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (s === "publicado") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (s === "renderizado") return "bg-primary/15 text-primary border-primary/30";
  if (s === "renderizando" || s === "transcrevendo" || s === "enviando")
    return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function Estudio() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<Projeto | null>(null);
  const excluir = useMutation({
    mutationFn: (p: Projeto) => excluirProjeto(p.id),
    onSuccess: () => {
      toast.success("Vídeo excluído.");
      setExcluindo(null);
      qc.invalidateQueries({ queryKey: ["vedit", "projetos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState<"anuncio" | "organico">("organico");
  const [formato, setFormato] = useState<Formato>("9:16");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [etapa, setEtapa] = useState<string | null>(null);
  const [decidir, setDecidir] = useState(true);

  const projetos = useQuery({
    queryKey: ["vedit", "projetos"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("vedit_projetos")
        .select("id, nome, objetivo, formato, status, fonte_duracao, versao, updated_at, erro")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Projeto[];
    },
    refetchInterval: 10_000,
  });
  const marcas = useQuery({
    queryKey: ["vedit", "marcas"],
    queryFn: async () =>
      ((await db().from("vedit_marcas").select("*").order("padrao", { ascending: false })).data ??
        []) as Marca[],
  });

  async function criar() {
    if (!arquivo && !link.trim()) return toast.error("Escolha o vídeo cru ou cole o link do Drive.");
    try {
      setEtapa(arquivo ? "Lendo o vídeo" : "Criando");
      const comuns = {
        nome: nome.trim() || undefined,
        objetivo: decidir ? undefined : objetivo,
        formato: decidir ? undefined : formato,
        marcaId: marcas.data?.find((m) => m.padrao)?.id,
      };
      const id = arquivo
        ? await criarProjeto({ ...comuns, arquivo })
        : await criarProjetoPorLink({ ...comuns, url: link });
      toast.success(
        arquivo
          ? "Enviando em segundo plano. Você já pode acompanhar no editor."
          : "Buscando o vídeo no Drive. Pode fechar a aba: o servidor faz tudo sozinho.",
      );
      setLink("");
      setAberto(false);
      navigate({ to: "/ads/edicao/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEtapa(null);
    }
  }

  const lista = projetos.data ?? [];

  return (
    <div className="space-y-6">
      {/* Imagem no centro, indicadores dos lados (estrutura do anexo 2). */}
      <CenterStage
        title="Estúdio de edição"
        subtitle="Suba o vídeo cru, peça a edição em português ou por comando e publique."
        actions={
          <Button onClick={() => setAberto(true)} className="shadow-[0_8px_24px_-8px_var(--color-primary)]">
            <Plus className="h-4 w-4 mr-2" /> Novo vídeo
          </Button>
        }
        left={
          <>
            <GlassStat icon={Clapperboard} label="Vídeos no estúdio" value={lista.length} detail={lista[0] ? `último: ${new Date(lista[0].updated_at).toLocaleDateString("pt-BR")}` : undefined} />
            <GlassStat icon={Megaphone} label="Anúncios" value={lista.filter((p) => p.objetivo === "anuncio").length} detail="para Meta Ads" />
          </>
        }
        right={
          <>
            <GlassStat icon={Sparkles} label="Orgânicos" value={lista.filter((p) => p.objetivo !== "anuncio").length} detail="Reels" />
            <GlassStat icon={Wand2} label="Versões editadas" value={lista.reduce((a, p) => a + Number((p as any).versao ?? 0), 0)} detail="somando todos os vídeos" />
          </>
        }
        media={
          <Link
            to={lista[0] ? "/ads/edicao/$id" : "/ads/edicao"}
            params={lista[0] ? { id: lista[0].id } : undefined as any}
            className="group relative block w-[168px] sm:w-[190px] aspect-[9/16] rounded-[28px] p-1.5 bg-white/10 ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(175,192,65,0.55)] lift"
          >
            <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_30%,#2a3112,#0d0f08_70%)]">
              <img src="/brand/iaplicada-mark.png" alt="" className="absolute left-1/2 top-[38%] w-[70%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgba(175,192,65,0.7)] transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-[10px] uppercase tracking-wider text-[#AFC041]">{lista[0] ? "Último vídeo" : "Comece aqui"}</div>
                <div className="text-xs font-semibold text-white truncate">{lista[0]?.nome ?? "Seu primeiro Reel"}</div>
                <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden"><div className="h-full w-2/3 rounded-full bg-[#AFC041] shadow-[0_0_10px_#AFC041]" /></div>
              </div>
            </div>
          </Link>
        }
      />

      {projetos.isError && (
        <Card className="border-amber-500/40">
          <CardContent className="p-4 text-sm">
            As tabelas do editor ainda não existem neste banco. Rode a migração{" "}
            <code>supabase/migrations/20261022210000_vedit_editor_video.sql</code> e publique as
            funções <code>vedit-transcrever</code>, <code>vedit-agente</code> e{" "}
            <code>vedit-publicar</code>.
          </CardContent>
        </Card>
      )}

      {lista.length === 0 && !projetos.isLoading && !projetos.isError ? (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Clapperboard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Nenhum vídeo ainda</div>
              <p className="text-sm text-muted-foreground max-w-md">
                Grave na parede, com o microfone que tiver. O editor corta os silêncios, legenda
                palavra por palavra e aplica os efeitos que você pedir.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAberto(true)}>
                <Upload className="h-4 w-4 mr-2" /> Subir vídeo cru
              </Button>
              <Button variant="outline" asChild>
                <Link to="/ads/edicao/efeitos">
                  <Wand2 className="h-4 w-4 mr-2" /> Ver efeitos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <Link key={p.id} to="/ads/edicao/$id" params={{ id: p.id }}>
              <Card interactive className="group relative overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir vídeo"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExcluindo(p);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className={cn(
                      "shrink-0 rounded-lg bg-foreground/90 flex items-center justify-center",
                      p.formato === "9:16"
                        ? "w-14 h-24"
                        : p.formato === "4:5"
                          ? "w-16 h-20"
                          : "w-18 h-18",
                    )}
                  >
                    {p.objetivo === "anuncio" ? (
                      <Megaphone className="h-5 w-5 text-primary" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="font-semibold truncate">{p.nome}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={corStatus(p.status)}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                      <Badge variant="outline">
                        {p.objetivo === "anuncio" ? "Anúncio" : "Orgânico"}
                      </Badge>
                      <Badge variant="outline">{p.formato}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.fonte_duracao ? `Bruto ${fmtTempo(Number(p.fonte_duracao))} · ` : ""}v
                      {p.versao} ·{" "}
                      {formatDistanceToNow(new Date(p.updated_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </div>
                    {p.status === "erro" && p.erro && (
                      <div className="text-xs text-red-600 line-clamp-2">{p.erro}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ConfirmarExclusao
        projeto={excluindo}
        ocupado={excluir.isPending}
        onCancelar={() => setExcluindo(null)}
        onConfirmar={() => excluindo && excluir.mutate(excluindo)}
      />

      <Dialog open={aberto} onOpenChange={(o) => !etapa && setAberto(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo vídeo</DialogTitle>
            <DialogDescription>
              Você vai direto para o editor; o vídeo sobe em segundo plano com barra de progresso e
              a transcrição começa antes de ele terminar. Dica: exportar em 1080p deixa tudo mais
              rápido que em 4K.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vídeo cru</Label>
              <Input
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
              {arquivo && (
                <div className="text-xs text-muted-foreground">
                  {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Ou cole o link do Google Drive{" "}
                <span className="text-muted-foreground font-normal">(sem baixar)</span>
              </Label>
              <Input
                value={link}
                disabled={!!arquivo}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/…"
              />
              <div className="text-xs text-muted-foreground">
                O arquivo precisa estar com acesso "Qualquer pessoa com o link". O servidor baixa,
                deixa em 1080p e transcreve; você pode fechar a aba.
              </div>
            </div>
            <Label
              className={cn(
                "border rounded-lg p-3 cursor-pointer flex items-start gap-3",
                decidir && "border-primary bg-primary/5",
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={decidir}
                onChange={(e) => setDecidir(e.target.checked)}
              />
              <div className="space-y-0.5">
                <div>Deixar o editor decidir</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Depois da transcrição ele cruza com os roteiros do Marketing e com os anúncios no
                  Meta, e sugere nome, objetivo, formato, estilo e duração. Você só aprova.
                </div>
              </div>
            </Label>
            <div className="space-y-1.5">
              <Label>
                Nome{" "}
                {decidir && <span className="text-muted-foreground font-normal">(opcional)</span>}
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={
                  decidir
                    ? "Deixe em branco para ele sugerir"
                    : "Ex.: R5 - Tres meses pra alguem produzir"
                }
              />
            </div>
            {!decidir && (
              <>
                <div className="space-y-1.5">
                  <Label>Para quê</Label>
                  <RadioGroup
                    value={objetivo}
                    onValueChange={(v) => setObjetivo(v as any)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      [
                        "organico",
                        "Reel orgânico",
                        "Ritmo de Reels, efeitos ousados, CTA para comentar",
                      ],
                      [
                        "anuncio",
                        "Anúncio Meta",
                        "Gancho em 3s, zonas seguras, duração pelo conteúdo",
                      ],
                    ].map(([v, t, d]) => (
                      <Label
                        key={v}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer space-y-1",
                          objetivo === v && "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={v} />
                          {t}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">{d}</div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label>Formato</Label>
                  <div className="flex gap-2">
                    {(["9:16", "4:5", "1:1"] as Formato[]).map((f) => (
                      <Button
                        key={f}
                        type="button"
                        size="sm"
                        variant={formato === f ? "default" : "outline"}
                        onClick={() => setFormato(f)}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={criar} disabled={!!etapa} className="w-full sm:w-auto">
              {etapa ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {etapa}…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Enviar e abrir o editor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
