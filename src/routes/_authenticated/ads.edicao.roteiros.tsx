// Edição → Roteiros: roteiros escritos no esqueleto de vídeos de alta performance (Pesquisa ou
// Referências), com assunto e idioma escolhidos e conversa de ajustes.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Loader2, Search } from "lucide-react";
import { db } from "@/lib/vedit";
import {
  IDIOMAS_ROTEIRO,
  NovoRoteiro,
  PainelRoteiro,
  type RoteiroLinha,
} from "@/components/edicao/RoteiroReferencia";

export const Route = createFileRoute("/_authenticated/ads/edicao/roteiros")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s.id === "string" ? { id: s.id } : {},
  component: RoteirosPage,
});

type RefPronta = { id: string; autor: string | null; titulo: string | null; metricas: any };

function RoteirosPage() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const [aberto, setAberto] = useState<string | null>(busca.id ?? null);
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
          .select("id, autor, titulo, metricas")
          .eq("status", "pronta")
          .not("palavras", "is", null)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? []) as RefPronta[],
  });
  const abrir = (id: string | null) => {
    setAberto(id);
    void navigate({ search: id ? { id } : {}, replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roteiros</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Roteiros no esqueleto de um vídeo que performou bem: mesmo gancho, mesmas viradas, mesmo
          tamanho de fala e as mesmas pausas, com o seu assunto e no idioma que você escolher.
          Comece por um reel da Pesquisa ou por uma referência salva, e peça os ajustes na conversa.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4" /> Novo roteiro a partir de uma referência salva
          </div>
          {refs.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : !refs.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma referência com fala transcrita ainda. Na{" "}
              <Link to="/ads/edicao/pesquisa" className="underline">
                Pesquisa
              </Link>
              , abra um reel e clique em "Salvar como referência".
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {refs.data.map((r) => (
                <Button key={r.id} size="sm" variant="outline" onClick={() => setNova(r)}>
                  <FileText className="h-4 w-4 mr-2" />
                  {r.autor ? `@${r.autor}` : (r.titulo ?? "Referência")}
                  {r.metricas?.indice ? ` · ${Number(r.metricas.indice).toFixed(1)}×` : ""}
                </Button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Também dá para criar direto de um reel em{" "}
            <Link to="/ads/edicao/pesquisa" className="underline inline-flex items-center gap-1">
              <Search className="h-3 w-3" /> Pesquisa
            </Link>{" "}
            (botão "Criar roteiro com esta estrutura").
          </p>
        </CardContent>
      </Card>

      {lista.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !lista.data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum roteiro ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.data.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => abrir(r.id)}
              className="text-left rounded-lg border p-3 hover:bg-muted space-y-1.5"
            >
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
      <PainelRoteiro id={aberto} onFechar={() => abrir(null)} />
    </div>
  );
}
