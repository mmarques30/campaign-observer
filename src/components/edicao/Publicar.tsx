import { useState } from "react";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider";
import { MusicaInstagram, type MusicaIg } from "@/components/publicacoes/MusicaInstagram";
import { ptBR } from "date-fns/locale";
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
import { baixarRender, db, renderDesatualizado, versaoDoRender, type Projeto } from "@/lib/vedit";

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
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [musica, setMusica] = useState<MusicaIg | null>(null);
  const [volMusica, setVolMusica] = useState(30);
  const [data, setData] = useState(() =>
    format(new Date(Date.now() + 24 * 3600 * 1000), "yyyy-MM-dd'T'HH:mm"),
  );

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
    try {
      await baixarRender(projeto);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const versaoMp4 = versaoDoRender(projeto.render_path);
  const velho = renderDesatualizado(projeto);

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
      await db()
        .from("publicacoes")
        .insert({
          origem: "video",
          ref_id: projeto.id,
          nome: ad.nome || projeto.nome,
          tipo: "reel",
          destino: "anuncio",
          midias: projeto.render_path ? [projeto.render_path] : [],
          legenda: ad.texto,
          status: "publicado",
          publicado_em: new Date().toISOString(),
          meta_ad_id: res.meta_ad_id ?? null,
        });
      toast.success("Anúncio criado PAUSADO no Meta. Revise e ative em Anúncios.");
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function publicarIg() {
    if (!projeto.render_path) return toast.error("Renderize o vídeo antes de publicar.");
    const quandoData = quando === "agora" || trial ? new Date() : new Date(data);
    if (quando === "agendar" && !trial && !(quandoData.getTime() > Date.now() + 60_000))
      return toast.error("Escolha um horário no futuro.");
    setOcupado(true);
    try {
      if (trial) {
        // Trial Reel sai direto (a fila não tem essa opção); o histórico e o fim do processamento
        // ficam com a fila (status "publicando" + container).
        const r = await callEdgeFunction("vedit-publicar", {
          projeto_id: projeto.id,
          acao: "instagram",
          legenda,
          trial,
        });
        if (r.error) throw new Error(r.error);
        await db()
          .from("publicacoes")
          .insert({
            origem: "video",
            ref_id: projeto.id,
            nome: projeto.nome,
            tipo: "reel",
            midias: [projeto.render_path],
            legenda,
            status: r.publicado ? "publicado" : "publicando",
            publicado_em: r.publicado ? new Date().toISOString() : null,
            ig_media_id: r.ig_media_id ?? null,
            container_id: r.container_id ?? null,
            container_em: r.container_id ? new Date().toISOString() : null,
          });
        toast.success(
          r.publicado
            ? "Publicado como Trial Reel."
            : "Enviado; o Instagram está processando e o sistema conclui sozinho.",
        );
      } else {
        const id = crypto.randomUUID();
        const { error } = await db()
          .from("publicacoes")
          .insert({
            id,
            origem: "video",
            ref_id: projeto.id,
            nome: projeto.nome,
            tipo: "reel",
            midias: [projeto.render_path],
            legenda,
            agendado_para: quandoData.toISOString(),
            // Música do Instagram por baixo da voz (a voz do vídeo fica em 100).
            audio: musica ? { ...musica, audio_volume: volMusica, video_volume: 100 } : null,
          });
        if (error) throw new Error(error.message);
        if (quando === "agora") {
          const r = await callEdgeFunction("publicar-agendados", { acao: "agora", id });
          if (r.error) throw new Error(r.error);
          toast.success(
            r.publicado
              ? "Publicado no Instagram."
              : "Enviado; o Instagram está processando e o sistema conclui sozinho.",
          );
        } else
          toast.success(
            `Agendado para ${format(quandoData, "dd/MM 'às' HH:mm", { locale: ptBR })}. Acompanhe em Publicados.`,
          );
      }
      await db()
        .from("vedit_mensagens")
        .insert({
          projeto_id: projeto.id,
          papel: "sistema",
          conteudo: trial
            ? "Enviado como Trial Reel."
            : quando === "agendar"
              ? `Reel agendado para ${format(quandoData, "dd/MM HH:mm")}.`
              : "Enviado para o Instagram.",
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
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar "{projeto.nome}"</DialogTitle>
          <DialogDescription>
            MP4 da versão {versaoMp4 ?? "?"} da edição
            {velho ? "" : " (a atual)"}.
          </DialogDescription>
        </DialogHeader>
        {velho && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            Este MP4 é de uma versão anterior: os ajustes feitos depois (versão {projeto.versao})
            não estão nele. Feche e clique em Renderizar para publicar o vídeo atualizado.
          </div>
        )}
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
            {!trial && (
              <>
                <MusicaInstagram valor={musica} onChange={setMusica} />
                {musica && (
                  <div className="space-y-1">
                    <Label className="text-xs flex justify-between">
                      <span>Volume da música do Instagram (a voz fica em 100)</span>
                      <span className="tabular-nums text-muted-foreground">{volMusica}</span>
                    </Label>
                    <Slider
                      min={5}
                      max={100}
                      step={5}
                      value={[volMusica]}
                      onValueChange={([v]) => setVolMusica(v)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Se o vídeo já tem a trilha da edição, tire uma das duas para não somar.
                    </p>
                  </div>
                )}
              </>
            )}
            {!trial && (
              <div className="grid grid-cols-2 gap-2">
                {(["agora", "agendar"] as const).map((q) => (
                  <Button
                    key={q}
                    type="button"
                    size="sm"
                    variant={quando === q ? "default" : "outline"}
                    onClick={() => setQuando(q)}
                  >
                    {q === "agora" ? "Publicar agora" : "Agendar"}
                  </Button>
                ))}
              </div>
            )}
            {!trial && quando === "agendar" && (
              <div className="space-y-1">
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Sai no horário marcado (até 5 min de diferença), mesmo com o sistema fechado.
                </p>
              </div>
            )}
            {!confirmarIg ? (
              <Button className="w-full" onClick={() => setConfirmarIg(true)} disabled={ocupado}>
                <Instagram className="h-4 w-4 mr-2" />
                {quando === "agendar" && !trial ? "Agendar no Instagram" : "Publicar no Instagram"}
              </Button>
            ) : (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                <div className="text-sm">
                  {quando === "agendar" && !trial
                    ? `Vai publicar sozinho em ${format(new Date(data), "dd/MM 'às' HH:mm", { locale: ptBR })}. Confirma?`
                    : `Isso publica de verdade no perfil${trial ? " como Trial Reel" : ""}. Confirma?`}
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
