// Publicar um criativo: no Instagram (agora ou agendado, com legenda) ou como anúncio pausado no Meta.
// As imagens saem do próprio editor (mesmos PNGs do "Baixar"), viram JPEG (o Instagram só aceita
// JPEG) e ficam no bucket; quem publica é a função publicar-agendados (fila + cron a cada 5 min).
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, ExternalLink, Instagram, Loader2, Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { adPayload, CTAS, novoAnuncio } from "@/components/ads/AnuncioFields";
import { BUCKET, db } from "@/lib/vedit";
import type { CriaProjeto } from "@/criativos/design";
import { EditorLegenda } from "./EditorLegenda";

type Publicacao = {
  id: string;
  status: "agendado" | "publicando" | "publicado" | "erro" | "cancelado";
  agendado_para: string;
  publicado_em: string | null;
  permalink: string | null;
  erro: string | null;
  legenda: string;
};

/** PNG (data URL) → JPEG para o Instagram. */
async function paraJpeg(png: string): Promise<Blob> {
  const img = new Image();
  img.src = png;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return await new Promise((ok, erro) =>
    c.toBlob((b) => (b ? ok(b) : erro(new Error("não consegui gerar o JPEG"))), "image/jpeg", 0.93),
  );
}

/** Sobe os slides como JPEG e devolve os caminhos no bucket. */
async function subirSlides(pngs: string[], prefixo: string) {
  const paths: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    const path = `criativos/publicacoes/${prefixo}-${String(i + 1).padStart(2, "0")}.jpg`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, await paraJpeg(pngs[i]), { contentType: "image/jpeg", upsert: true });
    if (up.error) throw new Error(up.error.message);
    paths.push(path);
  }
  return paths;
}

const paraInputLocal = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function PublicarCriativo({
  projeto,
  legendaInicial,
  totalSlides,
  gerarImagens,
  aberto,
  onFechar,
}: {
  projeto: CriaProjeto;
  legendaInicial: string;
  totalSlides: number;
  gerarImagens: () => Promise<string[]>;
  aberto: boolean;
  onFechar: () => void;
}) {
  const qc = useQueryClient();
  const [legenda, setLegenda] = useState(legendaInicial);
  const [quando, setQuando] = useState<"agora" | "agendar">("agendar");
  const [data, setData] = useState(() => paraInputLocal(new Date(Date.now() + 24 * 3600 * 1000)));
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [adsetId, setAdsetId] = useState("");
  const [ad, setAd] = useState(() => ({ ...novoAnuncio(), nome: projeto.nome }));

  useEffect(() => {
    if (aberto) {
      setLegenda(legendaInicial);
      setConfirmar(false);
      setAd((a) => ({ ...a, texto: a.texto || legendaInicial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const conta = useQuery({
    queryKey: ["publicar", "conta"],
    enabled: aberto,
    staleTime: 60 * 60 * 1000,
    queryFn: () => callEdgeFunction("publicar-agendados", { acao: "conta" }),
  });
  const pubs = useQuery({
    queryKey: ["publicar", "lista", projeto.id],
    enabled: aberto,
    refetchInterval: (q) =>
      (q.state.data as Publicacao[] | undefined)?.some((p) => p.status === "publicando")
        ? 5000
        : false,
    queryFn: async () =>
      ((
        await db()
          .from("publicacoes")
          .select("id, status, agendado_para, publicado_em, permalink, erro, legenda")
          .eq("ref_id", projeto.id)
          .order("created_at", { ascending: false })
          .limit(10)
      ).data ?? []) as Publicacao[],
  });
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

  const tipo = totalSlides > 1 ? "carrossel" : "imagem";
  const vertical = projeto.formato === "9:16";
  const demais = totalSlides > 10;

  async function instagram() {
    const quandoData = quando === "agora" ? new Date() : new Date(data);
    if (quando === "agendar" && !(quandoData.getTime() > Date.now() + 60_000))
      return toast.error("Escolha um horário no futuro.");
    setOcupado("ig");
    try {
      const pngs = await gerarImagens();
      const id = crypto.randomUUID();
      const midias = await subirSlides(pngs, id);
      const { error } = await db().from("publicacoes").insert({
        id,
        origem: "criativo",
        ref_id: projeto.id,
        nome: projeto.nome,
        tipo,
        midias,
        legenda,
        agendado_para: quandoData.toISOString(),
      });
      if (error) throw new Error(error.message);
      if (quando === "agora") {
        const r = await callEdgeFunction("publicar-agendados", { acao: "agora", id });
        if (r.error) throw new Error(r.error);
        toast.success(
          r.publicado ? "Publicado no Instagram." : "Enviado; o Instagram está processando.",
        );
      } else
        toast.success(`Agendado para ${format(quandoData, "dd/MM 'às' HH:mm", { locale: ptBR })}.`);
      setConfirmar(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
      qc.invalidateQueries({ queryKey: ["publicar", "lista", projeto.id] });
    }
  }

  async function anuncio() {
    if (!adsetId) return toast.error("Escolha o conjunto de anúncios.");
    if (!ad.titulo.trim() || !ad.texto.trim()) return toast.error("Preencha título e texto.");
    setOcupado("ad");
    try {
      const pngs = await gerarImagens();
      const paths = await subirSlides(pngs, `ad-${crypto.randomUUID()}`);
      const { data: urls, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60 * 6);
      if (error || !urls) throw new Error(error?.message ?? "falha ao preparar as imagens");
      const res = await callEdgeFunction("meta-add-entity", {
        tipo: "ad",
        adset_local_id: adsetId,
        ad: adPayload({
          ...ad,
          formato: paths.length > 1 ? "carrossel" : "imagem",
          midiasBucketUrls: urls.map((u) => u.signedUrl).filter((u): u is string => !!u),
        }),
      });
      if (!res.ok) throw new Error(res.error ?? "falha ao criar o anúncio");
      // Entra no painel Publicados com o vínculo ao anúncio (métricas vêm da sincronização do Meta).
      await db()
        .from("publicacoes")
        .insert({
          origem: "criativo",
          ref_id: projeto.id,
          nome: ad.nome || projeto.nome,
          tipo: paths.length > 1 ? "carrossel" : "imagem",
          destino: "anuncio",
          midias: paths,
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
      setOcupado(null);
    }
  }

  async function cancelar(id: string) {
    await db()
      .from("publicacoes")
      .update({ status: "cancelado" })
      .eq("id", id)
      .eq("status", "agendado");
    qc.invalidateQueries({ queryKey: ["publicar", "lista", projeto.id] });
  }

  const ROTULO: Record<Publicacao["status"], string> = {
    agendado: "Agendado",
    publicando: "Publicando",
    publicado: "Publicado",
    erro: "Erro",
    cancelado: "Cancelado",
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !ocupado && onFechar()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar "{projeto.nome}"</DialogTitle>
          <DialogDescription>
            {tipo === "carrossel" ? `Carrossel com ${totalSlides} slides` : "Post único"} ·{" "}
            {projeto.formato}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={projeto.objetivo === "anuncio" ? "anuncio" : "instagram"}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="instagram">
              <Instagram className="h-4 w-4 mr-1" /> Instagram
            </TabsTrigger>
            <TabsTrigger value="anuncio">
              <Megaphone className="h-4 w-4 mr-1" /> Anúncio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instagram" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {conta.isLoading
                ? "Conferindo o perfil…"
                : conta.data?.username
                  ? `Sai no perfil @${conta.data.username}.`
                  : `Não achei o perfil do Instagram: ${conta.data?.error ?? ""}`}
            </p>
            {(vertical || demais) && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                {vertical &&
                  "O feed do Instagram não aceita 9:16 em imagem (vai de 4:5 a 1,91:1). Mude o formato para 4:5 antes de publicar. "}
                {demais && "O Instagram aceita no máximo 10 slides por carrossel."}
              </div>
            )}
            <EditorLegenda projetoId={projeto.id} valor={legenda} onChange={setLegenda} />
            <div className="grid grid-cols-2 gap-2">
              {(["agendar", "agora"] as const).map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant={quando === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuando(q)}
                >
                  {q === "agendar" ? "Agendar" : "Publicar agora"}
                </Button>
              ))}
            </div>
            {quando === "agendar" && (
              <div className="space-y-1">
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={data}
                  min={paraInputLocal(new Date())}
                  onChange={(e) => setData(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Sai no horário marcado (com até 5 minutos de diferença), mesmo com o sistema
                  fechado.
                </p>
              </div>
            )}
            {!confirmar ? (
              <Button
                className="w-full"
                disabled={!!ocupado || vertical || demais || legenda.length > 2200}
                onClick={() => setConfirmar(true)}
              >
                {quando === "agendar" ? (
                  <CalendarClock className="h-4 w-4 mr-2" />
                ) : (
                  <Instagram className="h-4 w-4 mr-2" />
                )}
                {quando === "agendar" ? "Agendar publicação" : "Publicar no Instagram"}
              </Button>
            ) : (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                <div className="text-sm">
                  {quando === "agora"
                    ? "Isso publica de verdade no perfil agora. Confirma?"
                    : `Vai publicar sozinho em ${format(new Date(data), "dd/MM 'às' HH:mm", { locale: ptBR })}. Confirma?`}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={instagram} disabled={!!ocupado}>
                    {ocupado === "ig" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sim, {quando === "agora" ? "publicar" : "agendar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmar(false)}
                    disabled={!!ocupado}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {!!pubs.data?.length && (
              <div className="space-y-1.5 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground">Deste criativo</div>
                {pubs.data.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={
                        p.status === "publicado"
                          ? "text-emerald-700 border-emerald-500/40"
                          : p.status === "erro"
                            ? "text-red-600 border-red-500/40"
                            : ""
                      }
                    >
                      {ROTULO[p.status]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(new Date(p.publicado_em ?? p.agendado_para), "dd/MM HH:mm")}
                    </span>
                    {p.erro && (
                      <span className="text-red-600 truncate" title={p.erro}>
                        {p.erro}
                      </span>
                    )}
                    <div className="ml-auto flex gap-1">
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noreferrer" title="Abrir post">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {p.status === "agendado" && (
                        <button title="Cancelar agendamento" onClick={() => cancelar(p.id)}>
                          <X className="h-3.5 w-3.5 hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

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
                rows={4}
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
            <Button className="w-full" onClick={anuncio} disabled={!!ocupado}>
              {ocupado === "ad" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4 mr-2" />
              )}
              Criar anúncio pausado ({tipo === "carrossel" ? "carrossel" : "imagem"})
            </Button>
            <p className="text-xs text-muted-foreground">
              Mesmo fluxo da tela de anúncios: entra PAUSADO, com UTM, para você revisar antes de
              ativar.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
