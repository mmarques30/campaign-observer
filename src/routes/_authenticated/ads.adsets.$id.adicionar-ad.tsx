import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { AnuncioFields, novoAnuncio, adPayload, anuncioValido } from "@/components/ads/AnuncioFields";
import { callEdgeFunction } from "@/lib/ads-mutations";

export const Route = createFileRoute("/_authenticated/ads/adsets/$id/adicionar-ad")({
  component: AdicionarAd,
});

function AdicionarAd() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ad, setAd] = useState(() => novoAnuncio());
  const [submitting, setSubmitting] = useState(false);

  const adset = useQuery({
    queryKey: ["mads", "adset", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_ad_sets").select("id, nome, campanha_id, status").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function criar() {
    if (!anuncioValido(ad)) {
      toast.error("Preencha nome, título e texto do anúncio.");
      return;
    }
    setSubmitting(true);
    toast.info("Adicionando anúncio (PAUSED)...");
    try {
      const r = await callEdgeFunction("meta-add-entity", {
        tipo: "ad",
        adset_local_id: id,
        ad: adPayload(ad),
      });
      if (r.ok) {
        toast.success(`Anúncio adicionado: ${r.novo_ad?.nome ?? ad.nome} ✅`);
        qc.invalidateQueries();
        const campId = adset.data?.campanha_id;
        if (campId) navigate({ to: "/ads/campanhas/$id", params: { id: campId } });
        else navigate({ to: "/ads/anuncios" });
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
    <div className="space-y-6">
      <div>
        {adset.data?.campanha_id ? (
          <Link to="/ads/campanhas/$id" params={{ id: adset.data.campanha_id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para a campanha
          </Link>
        ) : (
          <Link to="/ads/anuncios" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Plus className="h-6 w-6 text-primary" /> Adicionar anúncio
        </h1>
        <p className="text-sm text-muted-foreground">
          No ad set <strong>{adset.data?.nome ?? id}</strong>. Será criado PAUSED. Page ID é detectado dos outros anúncios do mesmo ad set.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anúncio</CardTitle>
          <CardDescription>Formato, mídias do Drive e copy</CardDescription>
        </CardHeader>
        <CardContent>
          <AnuncioFields ad={ad} onPatch={(patch) => setAd((prev) => ({ ...prev, ...patch }))} />
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={criar} disabled={submitting}>
        {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Plus className="h-5 w-5 mr-2" />}
        Adicionar anúncio (PAUSED)
      </Button>
    </div>
  );
}
