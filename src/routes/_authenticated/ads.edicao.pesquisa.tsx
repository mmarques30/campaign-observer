// Edição → Pesquisa: os Reels que mais viralizaram no nicho, por que funcionaram e roteiro original.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Check,
  ExternalLink,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  FileText,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { db } from "@/lib/vedit";
import { BotaoSalvarReferencia, NovoRoteiro } from "@/components/edicao/RoteiroReferencia";

export const Route = createFileRoute("/_authenticated/ads/edicao/pesquisa")({
  component: PesquisaPage,
});

type Config = {
  id: number;
  nicho: string | null;
  publico: string | null;
  hashtags: string[];
  dias_janela: number;
  ultima_busca: string | null;
  alcance?: "brasil" | "internacional" | "ambos";
};
type Perfil = {
  id: string;
  username: string;
  nome: string | null;
  followers: number | null;
  ativo: boolean;
  origem: string;
  mediana_engajamento: number | null;
  ultima_coleta: string | null;
  erro: string | null;
  regiao?: "br" | "intl" | null;
};
type Reel = {
  id: string;
  perfil_id: string | null;
  origem: "perfil" | "hashtag";
  hashtag: string | null;
  username: string | null;
  permalink: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  media_url?: string | null;
  like_count: number;
  comments_count: number;
  publicado_em: string | null;
  engajamento: number;
  indice: number | null;
  taxa: number | null;
  analise: {
    resumo: string;
    gancho: string;
    mecanismo: string;
    estrutura: string;
    cta?: string;
    transferivel: string;
  } | null;
  roteiro: {
    titulo: string;
    gancho: string;
    falas: string;
    cta: string;
    palavra_chave?: string | null;
    legenda: string;
    formato: string;
    efeitos_sugeridos?: string[];
    finalidade: "organico" | "anuncio";
  } | null;
  content_item_id: string | null;
  referencia_id?: string | null;
  descartado: boolean;
};

const fmtN = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

function PesquisaPage() {
  const qc = useQueryClient();
  const cfgQ = useQuery({
    queryKey: ["vedit", "nicho", "config"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("vedit_nicho_config")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as Config;
    },
  });
  const perfisQ = useQuery({
    queryKey: ["vedit", "nicho", "perfis"],
    queryFn: async () =>
      ((await db().from("vedit_nicho_perfis").select("*").order("followers", { ascending: false }))
        .data ?? []) as Perfil[],
  });
  const reelsQ = useQuery({
    queryKey: ["vedit", "nicho", "reels"],
    queryFn: async () =>
      ((
        await db()
          .from("vedit_nicho_reels")
          .select("*")
          .eq("descartado", false)
          .order("indice", { ascending: false, nullsFirst: false })
          .limit(400)
      ).data ?? []) as Reel[],
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ["vedit", "nicho"] });

  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [ordem, setOrdem] = useState<"indice" | "engajamento" | "recentes">("indice");
  const [sel, setSel] = useState<Reel | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const coletar = useMutation({
    mutationFn: () => callEdgeFunction("vedit-pesquisa", { acao: "coletar" }),
    onSuccess: (r: any) => {
      if (r?.error) return toast.error(r.error);
      toast.success(
        `${r.coletados} reels atualizados.${r.erros?.length ? ` ${r.erros.length} erro(s).` : ""}`,
      );
      if (r.erros?.length) r.erros.slice(0, 3).forEach((e: string) => toast.warning(e));
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const analisar = useMutation({
    mutationFn: (ids: string[]) => callEdgeFunction("vedit-pesquisa", { acao: "analisar", ids }),
    onSuccess: (r: any) => {
      if (r?.error) return toast.error(r.error);
      toast.success(`${r.analisados} reel(s) analisado(s).`);
      setMarcados(new Set());
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = useMemo(() => {
    let l = reelsQ.data ?? [];
    if (filtroPerfil !== "todos") l = l.filter((r) => r.username === filtroPerfil);
    const ord = [...l];
    if (ordem === "indice")
      ord.sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0) || b.engajamento - a.engajamento);
    if (ordem === "engajamento") ord.sort((a, b) => b.engajamento - a.engajamento);
    if (ordem === "recentes")
      ord.sort((a, b) => (b.publicado_em ?? "").localeCompare(a.publicado_em ?? ""));
    return ord;
  }, [reelsQ.data, filtroPerfil, ordem]);
  const perfisComReels = useMemo(
    () => [...new Set((reelsQ.data ?? []).map((r) => r.username).filter(Boolean))] as string[],
    [reelsQ.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesquisa de nicho</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Monitora perfis e hashtags do seu nicho pela API oficial do Instagram, acha os Reels que
            mais viralizaram (quantas vezes acima do normal de cada perfil), explica por que
            funcionaram e escreve um roteiro original para você gravar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => coletar.mutate()} disabled={coletar.isPending}>
            {coletar.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar agora
          </Button>
        </div>
      </div>

      {(cfgQ.isError || perfisQ.isError) && (
        <Card className="border-amber-500/40">
          <CardContent className="p-4 text-sm">
            As tabelas da pesquisa ainda não existem. Rode{" "}
            <code>supabase/migrations/20261023010000_vedit_pesquisa_nicho.sql</code>.
          </CardContent>
        </Card>
      )}

      <Nicho cfg={cfgQ.data} perfis={perfisQ.data ?? []} onMudou={invalidar} />

      <div className="flex flex-wrap items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <span className="font-semibold">Ranking</span>
        <span className="text-xs text-muted-foreground">
          {lista.length} reels
          {cfgQ.data?.ultima_busca
            ? ` · última busca ${formatDistanceToNow(new Date(cfgQ.data.ultima_busca), { locale: ptBR, addSuffix: true })}`
            : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os perfis</SelectItem>
              {perfisComReels.map((u) => (
                <SelectItem key={u} value={u}>
                  @{u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="indice">Mais viral (× o normal)</SelectItem>
              <SelectItem value="engajamento">Mais engajamento</SelectItem>
              <SelectItem value="recentes">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
          {marcados.size > 0 && (
            <Button
              size="sm"
              onClick={() => analisar.mutate([...marcados])}
              disabled={analisar.isPending}
            >
              {analisar.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analisar {marcados.size}
            </Button>
          )}
          {marcados.size === 0 && lista.some((r) => !r.analise) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                analisar.mutate(
                  lista
                    .filter((r) => !r.analise)
                    .slice(0, 8)
                    .map((r) => r.id),
                )
              }
              disabled={analisar.isPending}
            >
              {analisar.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analisar top 8
            </Button>
          )}
        </div>
      </div>

      {lista.length === 0 && !reelsQ.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Cadastre perfis do nicho (ou peça sugestões) e clique em <b>Buscar agora</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((r) => (
            <CartaoReel
              key={r.id}
              r={r}
              marcado={marcados.has(r.id)}
              onMarcar={() =>
                setMarcados((m) => {
                  const n = new Set(m);
                  n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                  return n;
                })
              }
              onAbrir={() => setSel(r)}
            />
          ))}
        </div>
      )}

      <DetalheReel
        r={sel ? ((reelsQ.data ?? []).find((x) => x.id === sel.id) ?? sel) : null}
        onFechar={() => setSel(null)}
        onAnalisar={(id) => analisar.mutate([id])}
        analisando={analisar.isPending}
        onMudou={invalidar}
      />
    </div>
  );
}

function Nicho({ cfg, perfis, onMudou }: { cfg?: Config; perfis: Perfil[]; onMudou: () => void }) {
  const [nicho, setNicho] = useState<string | null>(null);
  const [publico, setPublico] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const vNicho = nicho ?? cfg?.nicho ?? "";
  const vPublico = publico ?? cfg?.publico ?? "";
  const vTags = hashtags ?? (cfg?.hashtags ?? []).join(", ");
  const sujo = nicho !== null || publico !== null || hashtags !== null;

  async function salvar(silencioso = false) {
    setOcupado("salvar");
    try {
      const { error } = await db()
        .from("vedit_nicho_config")
        .update({
          nicho: vNicho.trim() || null,
          publico: vPublico.trim() || null,
          hashtags: vTags
            .split(/[,\s]+/)
            .map((t) => t.replace(/^#/, "").trim())
            .filter(Boolean),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      setNicho(null);
      setPublico(null);
      setHashtags(null);
      if (!silencioso) toast.success("Nicho salvo.");
      onMudou();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }
  async function addPerfil() {
    if (!novo.trim()) return;
    setOcupado("perfil");
    try {
      const r: any = await callEdgeFunction("vedit-pesquisa", {
        acao: "perfil",
        username: novo.trim(),
      });
      if (r?.error) throw new Error(r.error);
      toast.success(`@${r.username} cadastrado (${fmtN(r.followers ?? 0)} seguidores).`);
      setNovo("");
      onMudou();
    } catch (e) {
      toast.error(`Não achei esse perfil como conta business/creator: ${(e as Error).message}`);
    } finally {
      setOcupado(null);
    }
  }
  async function sugerir() {
    // O que está digitado vale para a sugestão, mesmo sem clicar em salvar.
    if (sujo) await salvar(true);
    setOcupado("sugerir");
    try {
      const r: any = await callEdgeFunction("vedit-pesquisa", { acao: "sugerir_perfis" });
      if (r?.error) throw new Error(r.error);
      toast.success(
        `${r.validos.length} perfil(is) adicionado(s).${r.invalidos.length ? ` ${r.invalidos.length} não eram contas business.` : ""}`,
      );
      onMudou();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }
  async function alternar(p: Perfil) {
    await db().from("vedit_nicho_perfis").update({ ativo: !p.ativo }).eq("id", p.id);
    onMudou();
  }
  async function remover(p: Perfil) {
    await db().from("vedit_nicho_perfis").delete().eq("id", p.id);
    onMudou();
  }

  return (
    <Card>
      <CardContent className="p-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <div className="font-semibold">Seu nicho</div>
          <div className="space-y-1.5">
            <Label>Sobre o que é o conteúdo</Label>
            <Textarea
              rows={2}
              value={vNicho}
              onChange={(e) => setNicho(e.target.value)}
              onBlur={() => sujo && void salvar(true)}
              placeholder="ex.: IA aplicada ao dia a dia de empresas: WhatsApp, CRM, vendas, automação"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quem assiste</Label>
            <Input
              value={vPublico}
              onChange={(e) => setPublico(e.target.value)}
              onBlur={() => sujo && void salvar(true)}
              placeholder="ex.: donos e gestores de empresas que faturam acima de R$ 3 mi"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hashtags (até 10; o Meta limita a 30 diferentes por semana)</Label>
            <p className="text-[11px] text-muted-foreground">
              A busca por hashtag só funciona depois que o Meta aprovar o recurso "Instagram Public
              Content Access" no app (revisão do app no developers.facebook.com). Até lá, a pesquisa
              usa os perfis monitorados.
            </p>
            <Input
              value={vTags}
              onChange={(e) => setHashtags(e.target.value)}
              onBlur={() => sujo && void salvar(true)}
              placeholder="vazio = padrão pelo alcance (ex.: artificialintelligence, aitools, inteligenciaartificial)"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Onde buscar</Label>
            <Select
              value={cfg?.alcance ?? "ambos"}
              onValueChange={async (v) => {
                const { error } = await db()
                  .from("vedit_nicho_config")
                  .update({ alcance: v })
                  .eq("id", 1);
                if (error) return toast.error(error.message);
                toast.success(
                  v === "brasil"
                    ? "Só perfis do Brasil."
                    : v === "internacional"
                      ? "Só perfis de fora."
                      : "Brasil e internacional.",
                );
                onMudou();
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ambos">Brasil e internacional</SelectItem>
                <SelectItem value="internacional">Só internacional</SelectItem>
                <SelectItem value="brasil">Só Brasil</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Vale para "Sugerir perfis" e para as hashtags padrão. Os roteiros saem sempre em
              português, adaptados ao Brasil.
            </p>
          </div>
          {sujo && (
            <Button size="sm" onClick={() => void salvar()} disabled={ocupado === "salvar"}>
              {ocupado === "salvar" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvar nicho
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Perfis monitorados</span>
            <span className="text-xs text-muted-foreground">
              {perfis.filter((p) => p.ativo).length} ativos
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={sugerir}
              disabled={ocupado === "sugerir"}
            >
              {ocupado === "sugerir" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Sugerir perfis
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerfil()}
              placeholder="@username de uma conta business/creator"
            />
            <Button size="sm" onClick={addPerfil} disabled={ocupado === "perfil" || !novo.trim()}>
              {ocupado === "perfil" ? (
                <Loader2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y rounded-md border">
            {perfis.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">
                Nenhum perfil ainda. Adicione ou peça sugestões.
              </div>
            )}
            {perfis.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm",
                  !p.ativo && "opacity-60",
                )}
              >
                <Switch checked={p.ativo} onCheckedChange={() => alternar(p)} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    @{p.username}{" "}
                    <span className="font-normal text-muted-foreground">{p.nome}</span>
                    {p.regiao === "intl" && (
                      <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                        internacional
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.followers ? `${fmtN(p.followers)} seguidores` : ""}
                    {p.mediana_engajamento
                      ? ` · normal ${fmtN(Math.round(Number(p.mediana_engajamento)))} interações/reel`
                      : ""}
                    {p.erro ? ` · ${p.erro}` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                  onClick={() => remover(p)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartaoReel({
  r,
  marcado,
  onMarcar,
  onAbrir,
}: {
  r: Reel;
  marcado: boolean;
  onMarcar: () => void;
  onAbrir: () => void;
}) {
  return (
    <Card
      className={cn(
        "group relative hover:border-primary/50 hover:shadow-md transition cursor-pointer",
        marcado && "border-primary",
      )}
      onClick={onAbrir}
    >
      <button
        type="button"
        className={cn(
          "absolute top-2 left-2 z-10 h-6 w-6 rounded-md border bg-background flex items-center justify-center",
          marcado
            ? "border-primary text-primary"
            : "text-transparent group-hover:text-muted-foreground",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onMarcar();
        }}
        title="Marcar para analisar"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <CardContent className="p-3 flex gap-3">
        <div className="shrink-0 w-20 h-32 rounded-lg bg-muted overflow-hidden">
          {r.thumbnail_url ? (
            <img
              src={r.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : r.media_url ? (
            <video
              src={`${r.media_url}#t=1`}
              muted
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">@{r.username}</span>
            {r.indice != null && (
              <Badge
                className={cn(
                  "ml-auto",
                  r.indice >= 3
                    ? "bg-rose-600"
                    : r.indice >= 1.5
                      ? "bg-amber-500"
                      : "bg-muted text-foreground",
                )}
              >
                {r.indice.toFixed(1)}× o normal
              </Badge>
            )}
            {r.origem === "hashtag" && (
              <Badge variant="outline" className="ml-auto">
                #{r.hashtag}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {fmtN(r.like_count)} curtidas · {fmtN(r.comments_count)} comentários
            {r.publicado_em
              ? ` · ${formatDistanceToNow(new Date(r.publicado_em), { locale: ptBR, addSuffix: true })}`
              : ""}
          </div>
          <p className="text-xs line-clamp-3">{r.caption || "(sem legenda)"}</p>
          <div className="flex gap-1.5 flex-wrap">
            {r.analise && <Badge variant="outline">analisado</Badge>}
            {r.roteiro && <Badge variant="outline">roteiro pronto</Badge>}
            {r.content_item_id && <Badge variant="outline">no Marketing</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetalheReel({
  r,
  onFechar,
  onAnalisar,
  analisando,
  onMudou,
}: {
  r: Reel | null;
  onFechar: () => void;
  onAnalisar: (id: string) => void;
  analisando: boolean;
  onMudou: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [novoRoteiro, setNovoRoteiro] = useState(false);
  const navigate = useNavigate();
  const refPronta = useQuery({
    queryKey: ["vedit", "referencia-status", r?.referencia_id],
    enabled: !!r?.referencia_id,
    queryFn: async () =>
      (
        await db()
          .from("vedit_referencias")
          .select("status")
          .eq("id", r!.referencia_id!)
          .maybeSingle()
      ).data as { status: string } | null,
  });
  async function enviar() {
    if (!r) return;
    setEnviando(true);
    try {
      const x: any = await callEdgeFunction("vedit-pesquisa", {
        acao: "enviar_marketing",
        id: r.id,
      });
      if (x?.error) throw new Error(x.error);
      toast.success("Roteiro criado na página de Marketing (backlog).");
      onMudou();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  async function descartar() {
    if (!r) return;
    await db().from("vedit_nicho_reels").update({ descartado: true }).eq("id", r.id);
    onMudou();
    onFechar();
  }
  const copiar = async (t: string) => {
    await navigator.clipboard.writeText(t);
    toast.success("Copiado.");
  };
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {r && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                @{r.username}
                {r.permalink && (
                  <a
                    href={r.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {r.indice != null && (
                  <Badge className="ml-auto">{r.indice.toFixed(1)}× o normal do perfil</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                {fmtN(r.like_count)} curtidas · {fmtN(r.comments_count)} comentários
                {r.taxa ? ` · ${(r.taxa * 100).toFixed(2)}% dos seguidores` : ""}
                {r.publicado_em ? ` · ${new Date(r.publicado_em).toLocaleDateString("pt-BR")}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex gap-3">
              {r.thumbnail_url && (
                <img
                  src={r.thumbnail_url}
                  alt=""
                  className="w-28 h-48 object-cover rounded-lg border"
                />
              )}
              <p className="text-xs whitespace-pre-wrap text-muted-foreground flex-1 max-h-48 overflow-y-auto">
                {r.caption}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setNovoRoteiro(true)}>
                <FileText className="h-4 w-4 mr-2" /> Criar roteiro com esta estrutura
              </Button>
              <BotaoSalvarReferencia reel={r} onSalvo={onMudou} />
            </div>
            <NovoRoteiro
              aberto={novoRoteiro}
              onFechar={() => setNovoRoteiro(false)}
              reelId={r.id}
              origem={`@${r.username ?? "este reel"}`}
              comTempos={refPronta.data?.status === "pronta"}
              onCriado={(id) => void navigate({ to: "/ads/edicao/roteiros", search: { id } })}
            />

            {!r.analise ? (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => onAnalisar(r.id)} disabled={analisando}>
                  {analisando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Por que funcionou + roteiro original
                </Button>
                <Button variant="ghost" className="text-muted-foreground" onClick={descartar}>
                  Descartar
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="font-semibold">Por que funcionou</div>
                  <p>{r.analise.resumo}</p>
                  <p>
                    <b>Gancho:</b> {r.analise.gancho}
                  </p>
                  <p>
                    <b>Mecanismo:</b> {r.analise.mecanismo}
                  </p>
                  <p>
                    <b>Estrutura:</b> {r.analise.estrutura}
                  </p>
                  {r.analise.cta && (
                    <p>
                      <b>CTA:</b> {r.analise.cta}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <b>Transferível:</b> {r.analise.transferivel}
                  </p>
                </div>
                {r.roteiro && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Roteiro original: {r.roteiro.titulo}</span>
                      <Badge variant="outline" className="ml-auto">
                        {r.roteiro.finalidade}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.roteiro.formato}</p>
                    <p>
                      <b>Gancho:</b> {r.roteiro.gancho}
                    </p>
                    <p className="whitespace-pre-wrap">{r.roteiro.falas}</p>
                    <p>
                      <b>CTA:</b> {r.roteiro.cta}
                      {r.roteiro.palavra_chave ? ` (palavra: ${r.roteiro.palavra_chave})` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      <b>Legenda:</b> {r.roteiro.legenda}
                    </p>
                    {r.roteiro.efeitos_sugeridos?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {r.roteiro.efeitos_sugeridos.map((e, i) => (
                          <Badge key={i} variant="outline" className="font-mono text-[11px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.content_item_id ? (
                        <Badge variant="outline">Já está no Marketing</Badge>
                      ) : (
                        <Button size="sm" onClick={enviar} disabled={enviando}>
                          {enviando ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Enviar para o Marketing
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copiar(`${r.roteiro!.gancho}\n\n${r.roteiro!.falas}\n\n${r.roteiro!.cta}`)
                        }
                      >
                        Copiar roteiro
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/ads/edicao">
                          <Wand2 className="h-4 w-4 mr-2" /> Gravar e editar
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAnalisar(r.id)}
                        disabled={analisando}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Refazer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={descartar}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
