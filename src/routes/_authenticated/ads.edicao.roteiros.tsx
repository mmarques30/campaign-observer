// Edição → Roteiros: roteiros escritos no esqueleto de vídeos de alta performance (Pesquisa ou
// Referências), com assunto e idioma escolhidos e conversa de ajustes.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type MouseEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Plus, Search } from "lucide-react";
import { db } from "@/lib/vedit";
import {
  IDIOMAS_ROTEIRO,
  NovoRoteiro,
  PainelRoteiro,
  STATUS_ROTEIRO,
  excluirRoteiro,
  type RoteiroLinha,
} from "@/components/edicao/RoteiroReferencia";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads/edicao/roteiros")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s.id === "string" ? { id: s.id } : {},
  component: RoteirosPage,
});

type RefPronta = {
  id: string;
  autor: string | null;
  titulo: string | null;
  metricas: any;
  created_at: string;
};

function RoteirosPage() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const [aberto, setAberto] = useState<string | null>(busca.id ?? null);
  const [filtro, setFiltro] = useState<"todos" | "rascunho" | "aprovado" | "reprovado">("todos");
  const qc = useQueryClient();
  async function excluirDaLista(e: MouseEvent, r: RoteiroLinha) {
    e.stopPropagation();
    if (!confirm(`Excluir "${r.roteiro?.titulo ?? r.tema}"?`)) return;
    try {
      await excluirRoteiro(r.id);
      qc.invalidateQueries({ queryKey: ["vedit", "roteiros"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  const [nova, setNova] = useState<RefPronta | null>(null);
  const lista = useQuery({
    queryKey: ["vedit", "roteiros"],
    queryFn: async () =>
      ((
        await db()
          .from("vedit_roteiros")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(100)
      ).data ?? []) as RoteiroLinha[],
  });
  const refs = useQuery({
    queryKey: ["vedit", "referencias-prontas-roteiro"],
    queryFn: async () =>
      ((
        await db()
          .from("vedit_referencias")
          .select("id, autor, titulo, metricas, created_at")
          .eq("status", "pronta")
          .not("palavras", "is", null)
          .order("created_at", { ascending: false })
          .limit(200)
      ).data ?? []) as RefPronta[],
  });
  const [escolher, setEscolher] = useState(false);
  const [termo, setTermo] = useState("");
  const [ordemRef, setOrdemRef] = useState<"engajamento" | "recentes">("engajamento");
  const refsVisiveis = (refs.data ?? [])
    .filter((r) => {
      const t = termo.trim().toLowerCase();
      return !t || `${r.autor ?? ""} ${r.titulo ?? ""}`.toLowerCase().includes(t);
    })
    .sort((a, b) =>
      ordemRef === "recentes"
        ? b.created_at.localeCompare(a.created_at)
        : Number(b.metricas?.indice ?? 0) - Number(a.metricas?.indice ?? 0) ||
          b.created_at.localeCompare(a.created_at),
    );
  const abrir = (id: string | null) => {
    setAberto(id);
    void navigate({ search: id ? { id } : {}, replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roteiros</h1>
        <p className="text-sm text-muted-foreground">
          Roteiros no formato de vídeos que performaram bem, com o seu assunto.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEscolher(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo roteiro a partir de uma referência
        </Button>
        <Link
          to="/ads/edicao/pesquisa"
          className="text-xs text-muted-foreground underline inline-flex items-center gap-1"
        >
          <Search className="h-3 w-3" /> ou comece por um reel da Pesquisa
        </Link>
      </div>

      <Dialog open={escolher} onOpenChange={setEscolher}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escolha a referência</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por perfil ou título"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className="flex-1 min-w-[180px]"
            />
            <Select value={ordemRef} onValueChange={(v) => setOrdemRef(v as typeof ordemRef)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engajamento">Mais engajamento</SelectItem>
                <SelectItem value="recentes">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y rounded-md border">
            {refs.isLoading ? (
              <div className="p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !refsVisiveis.length ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhuma referência com fala transcrita. Na{" "}
                <Link to="/ads/edicao/pesquisa" className="underline">
                  Pesquisa
                </Link>
                , abra um reel e clique em "Salvar como referência".
              </p>
            ) : (
              refsVisiveis.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2 hover:bg-muted">
                  <button
                    type="button"
                    className="flex-1 text-left text-sm min-w-0"
                    onClick={() => {
                      setEscolher(false);
                      setNova(r);
                    }}
                  >
                    <div className="font-medium truncate">
                      {r.autor ? `@${r.autor}` : (r.titulo ?? "Referência")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[
                        r.metricas?.indice
                          ? `${Number(r.metricas.indice).toFixed(1)}× o engajamento do perfil`
                          : null,
                        r.autor && r.titulo ? r.titulo : null,
                        formatDistanceToNow(new Date(r.created_at), {
                          locale: ptBR,
                          addSuffix: true,
                        }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </button>
                  <Link
                    to="/ads/edicao/referencias"
                    search={{ id: r.id }}
                    title="Ver o vídeo e a análise"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {(lista.data?.length ?? 0) > 0 && (
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <TabsList>
            <TabsTrigger value="todos">Todos ({lista.data!.length})</TabsTrigger>
            <TabsTrigger value="rascunho">
              Em revisão (
              {lista.data!.filter((r) => (r.aprovacao ?? "rascunho") === "rascunho").length})
            </TabsTrigger>
            <TabsTrigger value="aprovado">
              Aprovados ({lista.data!.filter((r) => r.aprovacao === "aprovado").length})
            </TabsTrigger>
            <TabsTrigger value="reprovado">
              Reprovados ({lista.data!.filter((r) => r.aprovacao === "reprovado").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {lista.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !lista.data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum roteiro ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.data
            .filter((r) => filtro === "todos" || (r.aprovacao ?? "rascunho") === filtro)
            .map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => abrir(r.id)}
                className="group relative text-left rounded-lg border p-3 hover:bg-muted space-y-1.5"
              >
                <span
                  role="button"
                  title="Excluir"
                  className="absolute top-2 right-2 hidden group-hover:inline-flex h-6 w-6 items-center justify-center rounded-lg hover:text-red-600"
                  onClick={(e) => excluirDaLista(e, r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-sm line-clamp-2 flex-1">
                    {r.roteiro?.titulo ?? r.tema}
                  </span>
                  {r.status === "gerando" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : r.status === "erro" && !r.roteiro ? (
                    <Badge variant="destructive">erro</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.tema}</p>
                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {r.aprovacao && r.aprovacao !== "rascunho" && (
                    <Badge variant="outline" className={STATUS_ROTEIRO[r.aprovacao].cor}>
                      {STATUS_ROTEIRO[r.aprovacao].nome}
                    </Badge>
                  )}
                  <Badge variant="outline">{IDIOMAS_ROTEIRO[r.idioma] ?? r.idioma}</Badge>
                  {r.estrutura?.fonte?.autor && (
                    <Badge variant="outline">@{r.estrutura.fonte.autor}</Badge>
                  )}
                  {r.versao > 1 && <Badge variant="outline">v{r.versao}</Badge>}
                  {r.content_item_id && <Badge variant="outline">no Marketing</Badge>}
                  <span className="ml-auto">
                    {formatDistanceToNow(new Date(r.updated_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}

      <NovoRoteiro
        aberto={!!nova}
        onFechar={() => setNova(null)}
        referenciaId={nova?.id}
        origem={nova?.autor ? `@${nova.autor}` : "esta referência"}
        comTempos
        onCriado={(id) => {
          void lista.refetch();
          abrir(id);
        }}
      />
      <PainelRoteiro id={aberto} onFechar={() => abrir(null)} onAbrir={abrir} />
    </div>
  );
}
