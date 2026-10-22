import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Download, Instagram, Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { adPayload, CTAS, novoAnuncio } from "@/components/ads/AnuncioFields";
import { assinar, db, type Projeto } from "@/lib/vedit";

export function Publicar({
  projeto,
  aberto,
  onFechar,
}: {
  projeto: Projeto;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [adsetId, setAdsetId] = useState("");
  const [ad, setAd] = useState(() => ({ ...novoAnuncio(), nome: projeto.nome, formato: "video" }));
  const [legenda, setLegenda] = useState("");
  const [trial, setTrial] = useState(false);
  const [confirmarIg, setConfirmarIg] = useState(false);

  const adsets = useQuery({
    queryKey: ["mads", "adsets-para-edicao"],
    enabled: aberto,
    queryFn: async () => {
      const { data } = await supabase
        .from("mads_ad_sets")
        .select("id, nome, status")
        .in("status", ["ACTIVE", "PAUSED"])
        .order("nome");
      return (data ?? []) as { id: string; nome: string; status: string }[];
    },
  });

  async function baixar() {
    if (!projeto.render_path) return;
    const url = await assinar(projeto.render_path, 600);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projeto.nome}.mp4`;
    a.click();
  }

  async function virarAnuncio() {
    if (!adsetId) return toast.error("Escolha o conjunto de anúncios.");
    if (!ad.titulo.trim() || !ad.texto.trim()) return toast.error("Preencha título e texto.");
    setOcupado(true);
    try {
      const r = await callEdgeFunction("vedit-publicar", {
        projeto_id: projeto.id,
        acao: "para_criativos",
      });
      if (r.error) throw new Error(r.error);
      const res = await callEdgeFunction("meta-add-entity", {
        tipo: "ad",
        adset_local_id: adsetId,
        ad: adPayload({ ...ad, formato: "video", midiasBucketUrls: [r.url] }),
      });
      if (!res.ok) throw new Error(res.error ?? "falha ao criar o anúncio");
      toast.success("Anúncio criado PAUSADO no Meta. Revise e ative em Anúncios.");
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function publicarIg() {
    setOcupado(true);
    try {
      const r = await callEdgeFunction("vedit-publicar", {
        projeto_id: projeto.id,
        acao: "instagram",
        legenda,
        trial,
      });
      if (r.error) throw new Error(r.error);
      if (r.publicado) toast.success("Publicado no Instagram.");
      else {
        toast.info("O Instagram ainda está processando. Vou conferir de novo em 30s.");
        setTimeout(async () => {
          const s = await callEdgeFunction("vedit-publicar", {
            projeto_id: projeto.id,
            acao: "status_instagram",
            container_id: r.container_id,
            ig_user_id: r.ig_user_id,
          });
          if (s.publicado) toast.success("Publicado no Instagram.");
          else
            toast.warning(`Ainda processando (${s.status ?? "?"}). Confira no app do Instagram.`);
        }, 30_000);
      }
      await db()
        .from("vedit_mensagens")
        .insert({
          projeto_id: projeto.id,
          papel: "sistema",
          conteudo: trial ? "Enviado como Trial Reel." : "Enviado para o Instagram.",
        });
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
      setConfirmarIg(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !ocupado && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar "{projeto.nome}"</DialogTitle>
          <DialogDescription>Versão {projeto.versao} renderizada.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={projeto.objetivo === "anuncio" ? "anuncio" : "instagram"}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="anuncio">
              <Megaphone className="h-4 w-4 mr-1" />
              Anúncio
            </TabsTrigger>
            <TabsTrigger value="instagram">
              <Instagram className="h-4 w-4 mr-1" />
              Reel
            </TabsTrigger>
            <TabsTrigger value="baixar">
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="anuncio" className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Conjunto de anúncios</Label>
              <Select value={adsetId} onValueChange={setAdsetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {(adsets.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} {a.status === "PAUSED" ? "(pausado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nome do anúncio</Label>
              <Input value={ad.nome} onChange={(e) => setAd({ ...ad, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={ad.titulo} onChange={(e) => setAd({ ...ad, titulo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Texto principal</Label>
              <Textarea
                rows={3}
                value={ad.texto}
                onChange={(e) => setAd({ ...ad, texto: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>CTA</Label>
              <Select value={ad.cta} onValueChange={(v) => setAd({ ...ad, cta: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={virarAnuncio} disabled={ocupado}>
              {ocupado ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4 mr-2" />
              )}
              Criar anúncio pausado
            </Button>
            <p className="text-xs text-muted-foreground">
              Usa o mesmo fluxo da tela de anúncios: entra PAUSADO, com UTM do anúncio, para você
              revisar antes de ativar.
            </p>
          </TabsContent>
          <TabsContent value="instagram" className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Legenda do post</Label>
              <Textarea
                rows={5}
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
                placeholder="Texto do post, com a palavra-chave do CTA"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Trial Reel</div>
                <div className="text-xs text-muted-foreground">
                  Mostra só para quem não segue. Se performar, o Instagram libera para todos.
                </div>
              </div>
              <Switch checked={trial} onCheckedChange={setTrial} />
            </div>
            {!confirmarIg ? (
              <Button className="w-full" onClick={() => setConfirmarIg(true)} disabled={ocupado}>
                <Instagram className="h-4 w-4 mr-2" />
                Publicar no Instagram
              </Button>
            ) : (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                <div className="text-sm">
                  Isso publica de verdade no perfil{trial ? " como Trial Reel" : ""}. Confirma?
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={publicarIg} disabled={ocupado}>
                    {ocupado ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Sim,
                    publicar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmarIg(false)}
                    disabled={ocupado}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="baixar" className="pt-2">
            <Button className="w-full" variant="outline" onClick={baixar}>
              <Download className="h-4 w-4 mr-2" />
              Baixar MP4 (1080p)
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
