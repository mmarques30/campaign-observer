// Pesquisa → Analisar por link: cola um Reel do Instagram ou um anúncio da Biblioteca de Anúncios
// da Meta. O servidor baixa, transcreve e analisa; daqui dá para criar o roteiro na estrutura dele.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Megaphone,
  Instagram,
  RefreshCw,
} from "lucide-react";
import { db } from "@/lib/vedit";
import { analiseOk, criarReferenciaPorLink, STATUS_REF, type Referencia } from "@/lib/referencias";
import { NovoRoteiro } from "@/components/edicao/RoteiroReferencia";

const fmtN = (n?: number | null) =>
  n == null ? "" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export function PesquisaPorLink({ onCriarRoteiro }: { onCriarRoteiro: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [novoPara, setNovoPara] = useState<Referencia | null>(null);
  const q = useQuery({
    queryKey: ["vedit", "referencias-por-link"],
    refetchInterval: (qq) =>
      (qq.state.data as Referencia[] | undefined)?.some(
        (r) => !["pronta", "erro"].includes(r.status),
      )
        ? 5000
        : false,
    queryFn: async () =>
      ((
        await db()
          .from("vedit_referencias")
          .select("*")
          .not("url", "is", null)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? []) as Referencia[],
  });

  const ehAd = /facebook\.com\/ads\/library/i.test(url);
  const ehIg = /instagram\.com\/(p|reel|reels|tv)\//i.test(url);

  async function enviar() {
    if (!/^https?:\/\/\S+/.test(url.trim()))
      return toast.error("Cole o link do Reel ou do anúncio na Biblioteca de Anúncios.");
    setEnviando(true);
    try {
      const id = await criarReferenciaPorLink({ url: url.trim() });
      toast.success(
        ehAd
          ? "Baixando o anúncio da Biblioteca da Meta e analisando (2 a 3 minutos)."
          : "Baixando o vídeo e analisando (1 a 2 minutos).",
      );
      setUrl("");
      await q.refetch();
      void id;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Analisar por link
          </div>
          <p className="text-xs text-muted-foreground">
            Reel do Instagram ou anúncio da Biblioteca de Anúncios da Meta
            (facebook.com/ads/library/?id=…). O sistema baixa o vídeo, lê desempenho e texto,
            transcreve com os tempos e analisa a edição. Depois você cria o roteiro na estrutura
            dele.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="https://www.instagram.com/reel/… ou https://www.facebook.com/ads/library/?id=…"
          />
          <Button onClick={enviar} disabled={enviando || !url.trim()}>
            {enviando ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-1.5" />
            )}
            Analisar
          </Button>
        </div>
        {url.trim() && !ehAd && !ehIg && /^https?:\/\//.test(url.trim()) && (
          <p className="text-xs text-amber-700">
            Esse link não parece ser de um Reel nem da Biblioteca de Anúncios. TikTok e YouTube
            também funcionam.
          </p>
        )}
        {q.data && q.data.length > 0 && (
          <div className="divide-y rounded-md border">
            {q.data.map((r) => {
              const m = (r.metricas ?? {}) as Record<string, any>;
              const ad = r.plataforma === "ads_library";
              const pronta = r.status === "pronta";
              return (
                <div key={r.id} className="p-2.5 text-sm flex gap-3 items-start">
                  <div className="shrink-0 mt-0.5 text-muted-foreground">
                    {ad ? <Megaphone className="h-4 w-4" /> : <Instagram className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">
                        {ad
                          ? m.anunciante || "Anúncio"
                          : r.autor
                            ? `@${r.autor}`
                            : (r.titulo ?? "Referência")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {ad ? "anúncio Meta" : r.plataforma}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "erro"
                            ? "text-red-600 text-xs"
                            : pronta
                              ? "text-emerald-600 text-xs"
                              : "text-xs"
                        }
                      >
                        {!pronta && r.status !== "erro" && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        {STATUS_REF[r.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ad
                        ? [
                            m.inicio
                              ? `no ar desde ${new Date(m.inicio).toLocaleDateString("pt-BR")}`
                              : "",
                            m.plataformas ? String(m.plataformas).replace(",", " e ") : "",
                            m.cta ? `botão "${m.cta}"` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : [
                            m.curtidas != null ? `${fmtN(m.curtidas)} curtidas` : "",
                            m.comentarios != null ? `${fmtN(m.comentarios)} comentários` : "",
                            m.visualizacoes != null ? `${fmtN(m.visualizacoes)} visualizações` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                      {r.duracao ? ` · ${Number(r.duracao).toFixed(0)}s` : ""}
                    </div>
                    {r.legenda && <p className="text-xs line-clamp-2">{r.legenda}</p>}
                    {r.status === "erro" && <p className="text-xs text-red-600">{r.erro}</p>}
                    {pronta && analiseOk(r.analise) && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {analiseOk(r.analise)!.resumo}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {pronta && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => setNovoPara(r)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> Criar roteiro com esta
                          estrutura
                        </Button>
                      )}
                      {pronta && (
                        <Button size="sm" variant="ghost" className="h-7" asChild>
                          <Link to="/ads/edicao/referencias">Ver análise da edição</Link>
                        </Button>
                      )}
                      {r.status === "erro" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={async () => {
                            try {
                              // Volta para a fila do servidor (baixa e analisa de novo).
                              await db()
                                .from("vedit_referencias")
                                .update({ status: "enviando", erro: null })
                                .eq("id", r.id);
                              const { error } = await db()
                                .from("vedit_jobs")
                                .insert({
                                  tipo: "referencia",
                                  params: { referencia_id: r.id, url: r.url },
                                });
                              if (error) throw new Error(error.message);
                              q.refetch();
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar de novo
                        </Button>
                      )}
                      {r.url && (
                        <Button size="sm" variant="ghost" className="h-7" asChild>
                          <a href={r.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <NovoRoteiro
        aberto={!!novoPara}
        onFechar={() => setNovoPara(null)}
        referenciaId={novoPara?.id}
        origem={
          novoPara?.plataforma === "ads_library"
            ? `o anúncio de ${(novoPara.metricas as any)?.anunciante ?? "?"}`
            : novoPara?.autor
              ? `@${novoPara.autor}`
              : "esta referência"
        }
        comTempos={!!novoPara?.palavras}
        onCriado={onCriarRoteiro}
      />
    </Card>
  );
}
