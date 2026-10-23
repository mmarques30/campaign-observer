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
import { Check, Link2, Loader2, Wand2 } from "lucide-react";
import { db } from "@/lib/vedit";
import { aguardarReferencia, criarReferenciaPorLink, type Referencia } from "@/lib/referencias";
import { aplicarReferencia } from "@/lib/aplicarReferencia";
import { cn } from "@/lib/utils";

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
          .limit(40)
      ).data ?? []) as Referencia[],
  });

  async function aplicar(r: Referencia) {
    if (!r.analise) return toast.error("Esta referência ainda não foi analisada.");
    setPasso("aplicando");
    const { nome, pedido } = await aplicarReferencia(projetoId, r, r.analise);
    void pedido.catch((e) => toast.error(`Editor: ${(e as Error).message}`));
    toast.success(`Estilo de ${nome} aplicado. O editor está montando os efeitos (veja o chat).`);
    onAplicado();
    setPasso(null);
    setUrl("");
    setNotas("");
    onFechar();
  }

  async function porLink() {
    if (!/^https?:\/\/\S+/.test(url.trim()))
      return toast.error("Cole o link do vídeo (Instagram, TikTok ou YouTube).");
    setPasso("enviando");
    try {
      const id = await criarReferenciaPorLink({ url, notas });
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
      <DialogContent className="sm:max-w-lg">
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
          <Tabs defaultValue="link">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="link">Link novo</TabsTrigger>
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
              <Button className="w-full" onClick={porLink}>
                <Link2 className="h-4 w-4 mr-2" /> Analisar e aplicar
              </Button>
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
                <div className="max-h-80 overflow-y-auto divide-y rounded-md border">
                  {salvas.data.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                      onClick={() =>
                        aplicar(r).catch((e) => {
                          toast.error((e as Error).message);
                          setPasso(null);
                        })
                      }
                    >
                      <Wand2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.analise?.estilo.nome ?? r.titulo ?? "Referência"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.autor ? `@${r.autor} · ` : ""}
                          {r.analise?.resumo}
                        </div>
                      </div>
                    </button>
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
