// Aba "Meus publicados": os vídeos da própria empresa (a ativa, IAplicada ou cliente) que já
// foram publicados no Instagram por aqui viram referência com um clique (o link é o do post).
// Dentro do editor: cola o link de um vídeo de inspiração (ou escolhe uma referência salva)
// e aplica o estilo neste vídeo, mesmo já editado. Baixar e analisar roda no servidor.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Link2, Loader2, Play, Wand2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { db } from "@/lib/vedit";
import { callEdgeFunction } from "@/lib/ads-mutations";
import {
  aguardarReferencia,
  analiseOk,
  criarReferenciaPorLink,
  reanalisar,
  type Referencia,
} from "@/lib/referencias";
import { aplicarReferencia } from "@/lib/aplicarReferencia";
import { cn } from "@/lib/utils";
import { usePermissoes } from "@/lib/permissoes";

const PASSOS: { status: string; nome: string }[] = [
  { status: "enviando", nome: "Baixando o vídeo e separando quadros e áudio" },
  { status: "transcrevendo", nome: "Transcrevendo a fala" },
  { status: "analisando", nome: "Claude analisando a edição" },
  { status: "aplicando", nome: "Aplicando no seu vídeo" },
];

export function ReferenciaRapida({
  projetoId,
  aberto,
  onFechar,
  onAplicado,
}: {
  projetoId: string;
  aberto: boolean;
  onFechar: () => void;
  onAplicado: () => void;
}) {
  const [url, setUrl] = useState("");
  const [notas, setNotas] = useState("");
  const [passo, setPasso] = useState<string | null>(null);
  const empresaId = usePermissoes().empresa?.id;
  const salvas = useQuery({
    queryKey: ["vedit", "referencias-prontas"],
    enabled: aberto,
    queryFn: async () =>
      ((
        await db()
          .from("vedit_referencias")
          .select("*")
          .eq("status", "pronta")
          .order("created_at", { ascending: false })
          .limit(80)
      ).data ?? []) as Referencia[],
  });

  // Vídeos da empresa ativa já publicados no Instagram (a regra de acesso do banco filtra a empresa).
  const meus = useQuery({
    queryKey: ["vedit", "meus-publicados"],
    enabled: aberto,
    queryFn: async () =>
      ((
        await db()
          .from("publicacoes")
          .select("id, nome, permalink, publicado_em, legenda, metricas, ref_id")
          .eq("destino", "instagram")
          .eq("origem", "video")
          .eq("status", "publicado")
          .not("permalink", "is", null)
          .order("publicado_em", { ascending: false })
          .limit(40)
      ).data ?? []) as {
        id: string;
        nome: string | null;
        permalink: string;
        publicado_em: string | null;
        legenda: string | null;
        metricas: any;
        ref_id: string | null;
      }[],
  });

  // Compatibilidade das referências com o negócio cadastrado em Marca (calculada no servidor e
  // guardada): as que mais combinam sobem e mostram o que trazem para a edição.
  const compat = useQuery({
    queryKey: ["vedit", "referencias-compat", empresaId, salvas.data?.length ?? 0],
    enabled: aberto && !!salvas.data?.length,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => {
      const r = (await callEdgeFunction("vedit-referencia", { acao: "compatibilidade" })) as {
        itens?: Record<string, { nota: number; porque: string }>;
      };
      return r?.itens ?? {};
    },
  });
  const notaDe = (id: string) => compat.data?.[id]?.nota ?? -1;

  async function aplicar(r0: Referencia) {
    let r = r0;
    // Referência ainda sem a estrutura medida (análise antiga ou sugestão nunca usada): analisa
    // agora, só esta, antes de aplicar. Assim ninguém gasta análise com o que não vai usar.
    if (analiseOk(r.analise) && !(r.analise as { decupagem?: unknown } | null)?.decupagem) {
      setPasso("analisando");
      try {
        await reanalisar(r.id);
        await new Promise((ok) => setTimeout(ok, 2500));
        r = await aguardarReferencia(r.id);
      } catch {
        r = r0; // sem a análise nova, aplica com a que existe
      }
    }
    const a = analiseOk(r.analise);
    if (!a) {
      setPasso(null);
      return toast.error("A análise desta referência veio incompleta. Reanalise em Referências.");
    }
    setPasso("aplicando");
    const { nome, pedido } = await aplicarReferencia(projetoId, r, a);
    void pedido.catch((e) => toast.error(`Editor: ${(e as Error).message}`));
    toast.success(`Estilo de ${nome} aplicado. O editor está montando os efeitos (veja o chat).`);
    onAplicado();
    setPasso(null);
    setUrl("");
    setNotas("");
    onFechar();
  }

  async function porLink(linkDireto?: string, legenda?: string) {
    const link = (linkDireto ?? url).trim();
    if (!/^https?:\/\/\S+/.test(link))
      return toast.error("Cole o link do vídeo (Instagram, TikTok ou YouTube).");
    setPasso("enviando");
    try {
      const id = await criarReferenciaPorLink({ url: link, notas, legenda });
      const r = await aguardarReferencia(id, (s) => s !== "pronta" && setPasso(s));
      await aplicar(r);
    } catch (e) {
      toast.error((e as Error).message);
      setPasso(null);
    }
  }

  const ocupado = !!passo;
  const idx = PASSOS.findIndex((p) => p.status === passo);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar no estilo de um vídeo</DialogTitle>
          <DialogDescription>
            Cole o link de um vídeo que você admira. O sistema lê a edição (legenda, cortes,
            efeitos, transições, ritmo) e aplica neste vídeo, mesmo que ele já esteja editado.
          </DialogDescription>
        </DialogHeader>
        {ocupado ? (
          <div className="space-y-2 py-2">
            {PASSOS.map((p, i) => (
              <div
                key={p.status}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  i > idx && "text-muted-foreground",
                )}
              >
                {i < idx ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : i === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="h-4 w-4 rounded-full border" />
                )}
                {p.nome}
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Leva cerca de 1 a 2 minutos. Pode fechar esta janela e continuar editando: quando
              terminar, o estilo é aplicado sozinho (não saia deste vídeo).
            </p>
          </div>
        ) : (
          <Tabs defaultValue="link" className="min-w-0">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="link">Link novo</TabsTrigger>
              <TabsTrigger value="meus">
                Meus publicados{meus.data?.length ? ` (${meus.data.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="salvas">
                Já analisadas{salvas.data?.length ? ` (${salvas.data.length})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Link do vídeo</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/… ou TikTok/YouTube"
                />
              </div>
              <div className="space-y-1.5">
                <Label>O que você quer copiar dele (opcional)</Label>
                <Textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="ex.: a legenda amarela palavra por palavra e os zooms rápidos"
                />
              </div>
              <Button className="w-full" onClick={() => porLink()}>
                <Link2 className="h-4 w-4 mr-2" /> Analisar e aplicar
              </Button>
            </TabsContent>
            <TabsContent value="meus" className="pt-2">
              {meus.isLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !meus.data?.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum vídeo desta empresa publicado no Instagram por aqui ainda. Para um vídeo
                  publicado por fora, cole o link dele na aba "Link novo".
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto overflow-x-hidden divide-y rounded-md border min-w-0">
                  {meus.data
                    .filter((m) => m.ref_id !== projetoId)
                    .map((m) => (
                      <div key={m.id} className="flex items-stretch min-w-0">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-muted flex items-start gap-2"
                          onClick={() => porLink(m.permalink, m.legenda ?? undefined)}
                        >
                          <Wand2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{m.nome ?? "Vídeo"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[
                                m.publicado_em
                                  ? new Date(m.publicado_em).toLocaleDateString("pt-BR")
                                  : null,
                                m.metricas?.reach
                                  ? `${Number(m.metricas.reach).toLocaleString("pt-BR")} de alcance`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                        </button>
                        <a
                          href={m.permalink}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir no Instagram"
                          className="px-3 inline-flex items-center border-l text-muted-foreground hover:text-foreground"
                        >
                          <Play className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                Na primeira vez o sistema analisa o vídeo (1 a 2 minutos); depois ele fica em "Já
                analisadas".
              </p>
            </TabsContent>
            <TabsContent value="salvas" className="pt-2">
              {salvas.isLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !salvas.data?.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhuma referência analisada ainda. Use a aba "Link novo".
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto overflow-x-hidden divide-y rounded-md border min-w-0">
                  {[...salvas.data]
                    .sort(
                      (x, y) =>
                        Number(!!empresaId && x.empresa_id !== empresaId) -
                          Number(!!empresaId && y.empresa_id !== empresaId) ||
                        notaDe(y.id) - notaDe(x.id),
                    )
                    .map((r) => (
                      <div key={r.id} className="flex items-stretch min-w-0">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-muted flex items-start gap-2"
                          onClick={() =>
                            aplicar(r).catch((e) => {
                              toast.error((e as Error).message);
                              setPasso(null);
                            })
                          }
                        >
                          <Wand2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {analiseOk(r.analise)?.estilo.nome ?? r.titulo ?? "Referência"}
                              {r.empresa_id && empresaId && r.empresa_id !== empresaId && (
                                <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground align-middle">
                                  Sugestão
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {r.autor ? `@${r.autor} · ` : ""}
                              {analiseOk(r.analise)?.resumo}
                            </div>
                            {compat.data?.[r.id]?.porque && (
                              <div className="text-xs text-primary/90 break-words">
                                {notaDe(r.id) >= 3
                                  ? "Combina muito"
                                  : notaDe(r.id) === 2
                                    ? "Combina"
                                    : notaDe(r.id) === 1
                                      ? "Combina pouco"
                                      : "Não combina"}
                                {" com a sua marca: "}
                                {compat.data[r.id].porque}
                              </div>
                            )}
                          </div>
                        </button>
                        <Link
                          to="/ads/edicao/referencias"
                          search={{ id: r.id }}
                          target="_blank"
                          title="Ver o vídeo da referência"
                          className="px-3 inline-flex items-center border-l text-muted-foreground hover:text-foreground"
                        >
                          <Play className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
