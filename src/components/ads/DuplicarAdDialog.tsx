import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Info, Loader2 } from "lucide-react";
import { CTAS } from "@/components/ads/AnuncioFields";
import { callEdgeFunction } from "@/lib/ads-mutations";

export type DupTarget = { id: string; nome: string };

export function DuplicarAdDialog({ ad, onClose }: { ad: DupTarget | null; onClose: () => void }) {
  const open = !!ad;
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [novoNome, setNovoNome] = useState("");
  const [adsetId, setAdsetId] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [utmContent, setUtmContent] = useState("");

  // Carrega o ad + criativo atual quando o modal abre.
  const detalhe = useQuery({
    enabled: open,
    queryKey: ["mads", "ad-detalhe", ad?.id],
    queryFn: async () => {
      const { data: adRow, error: e1 } = await supabase.from("mads_ads").select("id, nome, ad_set_id, creative_id").eq("id", ad!.id).maybeSingle();
      if (e1) throw e1;
      let creative: any = null;
      if (adRow?.creative_id) {
        const { data: cr } = await supabase.from("mads_creatives").select("texto_principal, titulo, descricao, cta, utm_content").eq("id", adRow.creative_id).maybeSingle();
        creative = cr;
      }
      return { adRow, creative };
    },
  });

  // Lista de adsets para escolher o destino.
  const adsets = useQuery({
    enabled: open,
    queryKey: ["mads", "adsets-todos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ad_sets").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pré-preenche os campos quando os dados chegam.
  useEffect(() => {
    if (!open) return;
    setNovoNome(`${ad?.nome ?? ""} (var)`);
  }, [open, ad?.nome]);

  useEffect(() => {
    const cr = detalhe.data?.creative;
    if (detalhe.data?.adRow?.ad_set_id) setAdsetId(detalhe.data.adRow.ad_set_id);
    if (cr) {
      setTexto(cr.texto_principal ?? "");
      setTitulo(cr.titulo ?? "");
      setDescricao(cr.descricao ?? "");
      setCta(cr.cta ?? "LEARN_MORE");
      setUtmContent(cr.utm_content ? `${cr.utm_content}_v2` : "");
    }
  }, [detalhe.data]);

  async function duplicar() {
    if (!ad) return;
    setSubmitting(true);
    toast.info("Duplicando anúncio (PAUSED)...");
    try {
      const r = await callEdgeFunction("meta-duplicate-ad", {
        ad_local_id: ad.id,
        target_adset_local_id: adsetId || undefined,
        novo_nome: novoNome,
        override: useOverride
          ? { texto_principal: texto, titulo, descricao, cta, utm_content: utmContent }
          : undefined,
      });
      if (r.ok) {
        toast.success(`Ad duplicado: ${r.novo_ad?.nome ?? novoNome} ✅`);
        qc.invalidateQueries();
        onClose();
      } else {
        toast.error(`Erro: ${r.error ?? "falha desconhecida"}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicar ad: {ad?.nome}</DialogTitle>
          <DialogDescription>Cria um ad novo (PAUSED) baseado neste. Pode mudar copy/CTA/UTM mantendo as mídias.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do novo ad</Label>
            <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Adset destino</Label>
            <Select value={adsetId} onValueChange={setAdsetId}>
              <SelectTrigger><SelectValue placeholder={detalhe.isLoading ? "Carregando..." : "Selecione o ad set"} /></SelectTrigger>
              <SelectContent>
                {(adsets.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Padrão: mesmo ad set. Pode mover para outro.</p>
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild><Info className="h-3.5 w-3.5" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">Sem overrides = reusa o mesmo criativo no Meta (rápido). Com overrides = cria novo criativo mantendo as mídias.</TooltipContent>
              </Tooltip>
              Overrides são opcionais.
            </div>
          </TooltipProvider>

          <Accordion type="single" collapsible value={useOverride ? "ov" : ""} onValueChange={(v) => setUseOverride(v === "ov")}>
            <AccordionItem value="ov" className="border rounded-md px-3">
              <AccordionTrigger className="text-sm">Overrides (opcional — deixe fechado para cópia idêntica)</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Novo texto principal</Label>
                  <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Novo título</Label>
                  <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nova descrição</Label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={30} />
                </div>
                <div className="space-y-1.5">
                  <Label>Novo CTA</Label>
                  <Select value={cta} onValueChange={setCta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Novo utm_content</Label>
                  <Input value={utmContent} onChange={(e) => setUtmContent(e.target.value)} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={duplicar} disabled={submitting || !novoNome.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />} Duplicar (PAUSED)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
