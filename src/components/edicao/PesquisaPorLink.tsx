// Pesquisa → modo "Por link": cola um Reel do Instagram ou um anúncio da Biblioteca de Anúncios
// da Meta. O servidor baixa, transcreve e analisa; o resultado entra na mesma lista dos reels do
// nicho e dali dá para criar o roteiro na estrutura dele.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";
import { NovoRoteiro } from "@/components/edicao/RoteiroReferencia";

const fmtN = (n?: number | null) =>
  n == null ? "" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export const EH_AD_LIBRARY = /facebook\.com\/ads\/library/i;
export const EH_POST_IG = /instagram\.com\/(p|reel|reels|tv)\//i;

/** Referências criadas por link (as mais novas primeiro), com atualização enquanto processam. */
export function useReferenciasPorLink() {
  return useQuery({
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
}

/** Campo de link + botão Analisar. */
export function CampoLink({ onEnviado }: { onEnviado?: () => void }) {
  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ehAd = EH_AD_LIBRARY.test(url);
  const ehIg = EH_POST_IG.test(url);

  async function enviar() {
    if (!/^https?:\/\/\S+/.test(url.trim()))
      return toast.error("Cole o link do Reel ou do anúncio na Biblioteca de Anúncios.");
    setEnviando(true);
    try {
      await criarReferenciaPorLink({ url: url.trim() });
      toast.success(
        ehAd
          ? "Baixando o anúncio da Biblioteca da Meta e analisando (2 a 3 minutos)."
          : "Baixando o vídeo e analisando (1 a 2 minutos).",
      );
      setUrl("");
      onEnviado?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
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
      <p className="text-xs text-muted-foreground">
        Reel do Instagram ou anúncio da Biblioteca de Anúncios da Meta. O sistema baixa o vídeo, lê
        desempenho e texto, transcreve com os tempos e analisa a edição.
        {url.trim() && !ehAd && !ehIg && /^https?:\/\//.test(url.trim())
          ? " Esse link não parece ser de um Reel nem da Biblioteca; TikTok e YouTube também funcionam."
          : ""}
      </p>
    </div>
  );
}

/** Cartão de uma referência analisada por link, no mesmo formato dos reels do nicho. */
export function CartaoLink({
  r,
  onCriarRoteiro,
  onMudou,
  onAbrir,
}: {
  r: Referencia;
  onCriarRoteiro: (id: string) => void;
  onMudou?: () => void;
  onAbrir?: () => void;
}) {
  const [novo, setNovo] = useState(false);
  const m = (r.metricas ?? {}) as Record<string, any>;
  const ad = r.plataforma === "ads_library";
  const pronta = r.status === "pronta";
  const an = pronta ? analiseOk(r.analise) : null;
  return (
    <Card
      className={cn(
        "relative",
        onAbrir && "hover:border-primary/50 hover:shadow-md transition cursor-pointer",
      )}
      onClick={onAbrir}
    >
      <CardContent className="p-3 flex gap-3">
        <div className="shrink-0 w-20 h-32 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
          {m.imagem ? (
            <img
              src={m.imagem}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : ad ? (
            <Megaphone className="h-6 w-6" />
          ) : (
            <Instagram className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">
              {ad
                ? m.anunciante || "Anúncio"
                : r.autor
                  ? `@${r.autor}`
                  : (r.titulo ?? "Referência")}
            </span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {ad ? "anúncio Meta" : "por link"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {ad
              ? [
                  m.inicio ? `no ar desde ${new Date(m.inicio).toLocaleDateString("pt-BR")}` : "",
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
            {" · "}
            {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
          </div>
          <p className="text-xs line-clamp-2">{an?.resumo || r.legenda || "(sem legenda)"}</p>
          {r.status === "erro" && <p className="text-xs text-red-600 line-clamp-2">{r.erro}</p>}
          <div className="flex gap-1.5 flex-wrap items-center" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant="outline"
              className={
                r.status === "erro"
                  ? "text-red-600 text-[10px]"
                  : pronta
                    ? "text-emerald-600 text-[10px]"
                    : "text-[10px]"
              }
            >
              {!pronta && r.status !== "erro" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {STATUS_REF[r.status]}
            </Badge>
            {pronta && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => setNovo(true)}
              >
                <FileText className="h-3 w-3 mr-1" /> Roteiro nesta estrutura
              </Button>
            )}
            {pronta && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" asChild>
                <Link to="/ads/edicao/referencias">Análise da edição</Link>
              </Button>
            )}
            {r.status === "erro" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={async () => {
                  try {
                    await db()
                      .from("vedit_referencias")
                      .update({ status: "enviando", erro: null })
                      .eq("id", r.id);
                    const { error } = await db()
                      .from("vedit_jobs")
                      .insert({ tipo: "referencia", params: { referencia_id: r.id, url: r.url } });
                    if (error) throw new Error(error.message);
                    onMudou?.();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Tentar de novo
              </Button>
            )}
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> abrir
              </a>
            )}
          </div>
        </div>
      </CardContent>
      <NovoRoteiro
        aberto={novo}
        onFechar={() => setNovo(false)}
        referenciaId={r.id}
        origem={
          ad ? `o anúncio de ${m.anunciante ?? "?"}` : r.autor ? `@${r.autor}` : "esta referência"
        }
        comTempos={!!r.palavras}
        onCriado={onCriarRoteiro}
      />
    </Card>
  );
}

/** Painel lateral de uma referência por link: desempenho, análise e criação de roteiro. */
export function DetalheReferencia({
  r,
  onFechar,
  onCriarRoteiro,
}: {
  r: Referencia | null;
  onFechar: () => void;
  onCriarRoteiro: (id: string) => void;
}) {
  const [novo, setNovo] = useState(false);
  const [verFala, setVerFala] = useState(false);
  const m = (r?.metricas ?? {}) as Record<string, any>;
  const ad = r?.plataforma === "ads_library";
  const an = r && r.status === "pronta" ? analiseOk(r.analise) : null;
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {r && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {ad
                  ? m.anunciante || "Anúncio"
                  : r.autor
                    ? `@${r.autor}`
                    : (r.titulo ?? "Referência")}
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
                <Badge variant="outline" className="ml-auto">
                  {ad ? "anúncio Meta" : r.plataforma}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {ad
                  ? [
                      m.inicio
                        ? `no ar desde ${new Date(m.inicio).toLocaleDateString("pt-BR")}`
                        : "",
                      m.plataformas ? String(m.plataformas).replace(",", " e ") : "",
                      m.cta ? `botão "${m.cta}"` : "",
                      m.link
                        ? `leva para ${String(m.link)
                            .replace(/^https?:\/\//, "")
                            .slice(0, 40)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : [
                      m.curtidas != null ? `${fmtN(m.curtidas)} curtidas` : "",
                      m.comentarios != null ? `${fmtN(m.comentarios)} comentários` : "",
                      m.visualizacoes != null ? `${fmtN(m.visualizacoes)} visualizações` : "",
                      m.publicado_em ? new Date(m.publicado_em).toLocaleDateString("pt-BR") : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                {r.duracao ? ` · ${Number(r.duracao).toFixed(0)}s` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex gap-3">
              {m.imagem && (
                <img
                  src={m.imagem}
                  alt=""
                  className="w-28 h-48 object-cover rounded-lg border"
                  referrerPolicy="no-referrer"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              )}
              <p className="text-xs whitespace-pre-wrap text-muted-foreground flex-1 max-h-48 overflow-y-auto">
                {r.legenda || "(sem texto)"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setNovo(true)} disabled={r.status !== "pronta"}>
                <FileText className="h-4 w-4 mr-2" /> Criar roteiro com esta estrutura
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/ads/edicao/referencias">Análise da edição</Link>
              </Button>
              {r.status !== "pronta" && r.status !== "erro" && (
                <Badge variant="outline">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> {STATUS_REF[r.status]}
                </Badge>
              )}
              {r.status === "erro" && <span className="text-xs text-red-600">{r.erro}</span>}
            </div>
            <NovoRoteiro
              aberto={novo}
              onFechar={() => setNovo(false)}
              referenciaId={r.id}
              origem={
                ad
                  ? `o anúncio de ${m.anunciante ?? "?"}`
                  : r.autor
                    ? `@${r.autor}`
                    : "esta referência"
              }
              comTempos={!!r.palavras?.length}
              onCriado={onCriarRoteiro}
            />
            {an && (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="font-semibold">Por que funciona</div>
                  <p>{an.resumo}</p>
                  <p>
                    <b>Gancho:</b> {an.gancho?.texto}
                    {an.gancho?.tecnica ? ` (${an.gancho.tecnica})` : ""}
                  </p>
                  <p>
                    <b>Estilo:</b> {an.estilo?.nome}
                    {an.estilo?.descricao ? ` — ${an.estilo.descricao}` : ""}
                  </p>
                  {an.cta?.texto && (
                    <p>
                      <b>CTA:</b> {an.cta.texto}
                    </p>
                  )}
                </div>
                {an.aprendizados?.length ? (
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <div className="font-semibold">O que copiar</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {an.aprendizados.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {an.tecnicas?.length ? (
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <div className="font-semibold">Técnicas, em ordem</div>
                    <div className="space-y-1">
                      {an.tecnicas.slice(0, 12).map((t, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-mono text-muted-foreground">
                            {t.de.toFixed(0)}–{t.ate.toFixed(0)}s
                          </span>{" "}
                          <b>{t.nome}</b>: {t.descricao}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {r.transcricao_texto && (
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <button
                      type="button"
                      className="font-semibold hover:underline"
                      onClick={() => setVerFala((v) => !v)}
                    >
                      Fala transcrita {verFala ? "(esconder)" : "(mostrar)"}
                    </button>
                    {verFala && (
                      <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                        {r.transcricao_texto}
                      </p>
                    )}
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
