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
      <div className="space-y-4">
        {(refs.data ?? []).map((r) => {
          const a = r.analise;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {r.urls.map((u, i) => (
                    <img
                      key={i}
                      src={u}
                      className="h-44 aspect-[4/5] object-cover rounded-md border shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">
                    {a?.estilo ?? (r.autor ? `@${r.autor}` : "Referência")}
                  </div>
                  {r.autor && <Badge variant="outline">@{r.autor}</Badge>}
                  <Badge variant="secondary">{r.urls.length} slides</Badge>
                  {r.status === "baixando" && (
                    <Badge
                      className="bg-sky-500/15 text-sky-700 border-sky-500/30"
                      variant="outline"
                    >
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Baixando slides
                    </Badge>
                  )}
                  {r.status === "analisando" && (
                    <Badge
                      className="bg-amber-500/15 text-amber-700 border-amber-500/30"
                      variant="outline"
                    >
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analisando
                    </Badge>
                  )}
                  {r.status === "erro" && (
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-500/40"
                      title={r.erro ?? ""}
                    >
                      {r.urls.length ? "Erro na análise" : "Não consegui baixar"}
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    {r.url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        asChild
                        title="Abrir no Instagram"
                      >
                        <a href={r.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Analisar de novo"
                      onClick={async () => {
                        try {
                          // Sem imagens (o download falhou): baixa de novo pelo link.
                          if (!r.imagens?.length && r.url) {
                            await db().from("cria_referencias").delete().eq("id", r.id);
                            await chamarAgente({ acao: "referencia", url: r.url });
                          } else await chamarAgente({ acao: "analisar_referencia", id: r.id });
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                        recarregar();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-red-600"
                      title="Excluir"
                      onClick={() => excluir(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={r.status !== "pronta"}
                      onClick={() => navigate({ to: "/ads/criar", search: { ref: r.id } })}
                    >
                      <Wand2 className="h-4 w-4 mr-1.5" /> Criar com esta referência
                    </Button>
                  </div>
                </div>
                {r.status === "erro" && r.erro && <p className="text-xs text-red-600">{r.erro}</p>}
                {a && (
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
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
                    </div>
                    <div className="space-y-2">
                      {!!a.estrutura?.length && (
                        <ol className="list-decimal pl-4 text-muted-foreground space-y-0.5">
                          {a.estrutura.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ol>
                      )}
                      {!!a.dicas?.length && (
                        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                          {a.dicas.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
