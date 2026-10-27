import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, ImagePlus, Link2, Loader2, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, db } from "@/lib/vedit";
import { chamarAgente } from "@/lib/criativos";
import type { CriaReferencia } from "@/criativos/design";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/ads/criar/referencias")({
  component: ReferenciasCriativos,
});

type RefComUrls = CriaReferencia & { urls: string[] };
const LINK_POST = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i;

function ReferenciasCriativos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [conta, setConta] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const refs = useQuery({
    queryKey: ["cria", "referencias"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("cria_referencias")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw new Error(error.message);
      const lista = (data ?? []) as CriaReferencia[];
      const paths = lista.flatMap((r) => r.imagens ?? []);
      const { data: urls } = paths.length
        ? await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 12)
        : { data: [] as { path: string | null; signedUrl: string }[] };
      const m = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
      return lista.map((r) => ({
        ...r,
        urls: (r.imagens ?? []).map((p) => m.get(p) ?? "").filter(Boolean),
      }));
    },
    refetchInterval: (q) =>
      (q.state.data as RefComUrls[] | undefined)?.some((r) =>
        ["baixando", "analisando"].includes(r.status),
      )
        ? 4000
        : false,
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["cria", "referencias"] });
  const sel = (refs.data ?? []).find((r) => r.id === aberta) ?? null;

  async function porLink() {
    if (!LINK_POST.test(link)) return toast.error("Cole o link de um post do Instagram.");
    setOcupado("link");
    try {
      await chamarAgente({ acao: "referencia", url: link.trim(), username: conta.trim() });
      toast.success("Buscando os slides. Em cerca de 1 minuto a análise aparece aqui.");
      setLink("");
      setConta("");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function porPrints(files: FileList | null) {
    if (!files?.length) return;
    setOcupado("prints");
    try {
      const id = `p${Date.now().toString(36)}`;
      const paths: string[] = [];
      const arr = [...files].slice(0, 12).sort((a, b) => a.name.localeCompare(b.name));
      for (let i = 0; i < arr.length; i++) {
        const ext = arr[i].type === "image/png" ? "png" : "jpg";
        const path = `criativos/referencias/${id}-${String(i + 1).padStart(2, "0")}.${ext}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, arr[i], { contentType: arr[i].type });
        if (up.error) throw new Error(up.error.message);
        paths.push(path);
      }
      const { data, error } = await db()
        .from("cria_referencias")
        .insert({ imagens: paths, status: "analisando" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await chamarAgente({ acao: "analisar_referencia", id: data.id });
      toast.success("Prints enviados. A análise leva uns 30 segundos.");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
      if (input.current) input.current.value = "";
    }
  }

  async function excluir(r: RefComUrls) {
    if (r.imagens?.length) await supabase.storage.from(BUCKET).remove(r.imagens);
    await db().from("cria_referencias").delete().eq("id", r.id);
    recarregar();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referências de criativos</h1>
        <p className="text-sm text-muted-foreground">
          Carrosséis e posts que você admira. O Claude lê slide por slide (estrutura, tipografia,
          cores, gancho) e usa como padrão de qualidade nos seus criativos.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar referência</CardTitle>
          <CardDescription>
            Cole o link do post ou carrossel (o sistema baixa todos os slides) ou suba os prints em
            ordem.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.instagram.com/p/…"
            className="md:flex-1"
          />
          <Input
            value={conta}
            onChange={(e) => setConta(e.target.value)}
            placeholder="@conta (opcional)"
            className="md:w-44"
          />
          <Button onClick={porLink} disabled={!!ocupado}>
            {ocupado === "link" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Analisar link
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => porPrints(e.target.files)}
          />
          <Button variant="outline" onClick={() => input.current?.click()} disabled={!!ocupado}>
            {ocupado === "prints" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 mr-2" />
            )}
            Subir prints
          </Button>
        </CardContent>
      </Card>

      {refs.isLoading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(refs.data ?? []).map((r) => (
          <Card
            key={r.id}
            className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setAberta(r.id)}
          >
            <div className="relative aspect-[4/5] max-h-64 w-full bg-muted overflow-hidden">
              {r.urls[0] && (
                <img src={r.urls[0]} className="h-full w-full object-cover" loading="lazy" />
              )}
              {r.urls.length > 1 && (
                <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5">
                  {r.urls.length} slides
                </span>
              )}
              <div className="absolute top-2 left-2">
                <StatusRef r={r} />
              </div>
            </div>
            <CardContent className="p-3 space-y-1">
              <div className="font-semibold text-sm line-clamp-1">
                {r.analise?.estilo ?? (r.autor ? `@${r.autor}` : "Referência")}
              </div>
              {r.autor && <div className="text-xs text-muted-foreground">@{r.autor}</div>}
              {r.analise?.resumo && (
                <p className="text-xs text-muted-foreground line-clamp-2">{r.analise.resumo}</p>
              )}
              {r.status === "erro" && r.erro && (
                <p className="text-xs text-red-600 line-clamp-2">{r.erro}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {sel.analise?.estilo ?? (sel.autor ? `@${sel.autor}` : "Referência")}
                  {sel.autor && <Badge variant="outline">@{sel.autor}</Badge>}
                  <StatusRef r={sel} />
                </DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sel.urls.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    className="h-56 aspect-[4/5] object-cover rounded-md border shrink-0"
                    loading="lazy"
                  />
                ))}
              </div>
              {sel.status === "erro" && sel.erro && (
                <p className="text-xs text-red-600">{sel.erro}</p>
              )}
              {sel.analise && <DetalheAnalise a={sel.analise} />}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {sel.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={sel.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir no Instagram
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Sem imagens (o download falhou): baixa de novo pelo link.
                      if (!sel.imagens?.length && sel.url) {
                        await db().from("cria_referencias").delete().eq("id", sel.id);
                        await chamarAgente({ acao: "referencia", url: sel.url });
                        setAberta(null);
                      } else await chamarAgente({ acao: "analisar_referencia", id: sel.id });
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                    recarregar();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Analisar de novo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:text-red-600"
                  onClick={async () => {
                    await excluir(sel);
                    setAberta(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
                </Button>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={sel.status !== "pronta"}
                  onClick={() => navigate({ to: "/ads/criar", search: { ref: sel.id } })}
                >
                  <Wand2 className="h-4 w-4 mr-1.5" /> Criar com esta referência
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusRef({ r }: { r: RefComUrls }) {
  if (r.status === "baixando")
    return (
      <Badge className="bg-sky-500/90 text-white border-transparent">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Baixando
      </Badge>
    );
  if (r.status === "analisando")
    return (
      <Badge className="bg-amber-500/90 text-white border-transparent">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analisando
      </Badge>
    );
  if (r.status === "erro")
    return (
      <Badge className="bg-red-600/90 text-white border-transparent">
        {r.urls.length ? "Erro na análise" : "Não baixou"}
      </Badge>
    );
  return null;
}

function DetalheAnalise({ a }: { a: NonNullable<CriaReferencia["analise"]> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 text-sm">
      <div className="space-y-2">
        {a.resumo && <p>{a.resumo}</p>}
        {a.gancho && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Gancho: </span>
            {a.gancho}
          </p>
        )}
        {a.tipografia && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Tipografia: </span>
            {a.tipografia}
          </p>
        )}
        {!!a.cores?.length && (
          <div className="flex gap-1.5 items-center">
            {a.cores.slice(0, 8).map((c) => (
              <span
                key={c}
                title={c}
                className="h-5 w-5 rounded border"
                style={{ background: c }}
              />
            ))}
          </div>
        )}
        {!!a.dicas?.length && (
          <>
            <div className="font-medium pt-1">Acabamento</div>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              {a.dicas.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      {!!a.estrutura?.length && (
        <div className="space-y-1">
          <div className="font-medium">Estrutura slide a slide</div>
          <ol className="list-decimal pl-4 text-muted-foreground space-y-0.5">
            {a.estrutura.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
