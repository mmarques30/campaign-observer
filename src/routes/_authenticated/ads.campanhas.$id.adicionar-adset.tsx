import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, Layers } from "lucide-react";
import { AnuncioFields, novoAnuncio, adPayload, anuncioValido, type Anuncio } from "@/components/ads/AnuncioFields";
import { callEdgeFunction } from "@/lib/ads-mutations";

export const Route = createFileRoute("/_authenticated/ads/campanhas/$id/adicionar-adset")({
  component: AdicionarAdset,
});

const OPT_GOALS = ["LANDING_PAGE_VIEWS", "LEAD_GENERATION", "LINK_CLICKS", "CONVERSIONS"];
const MANUAL_PLACEMENTS = ["facebook_feed", "instagram_feed", "instagram_stories", "facebook_reels", "instagram_reels"];

function AdicionarAdset() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // adset
  const [nome, setNome] = useState("Conj Único - Aberto");
  const [orcamentoBrl, setOrcamentoBrl] = useState(50);
  const [optimizationGoal, setOptimizationGoal] = useState("LANDING_PAGE_VIEWS");
  const [geoCountry, setGeoCountry] = useState("BR");
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(55);
  const [interesses, setInteresses] = useState<string[]>([]);
  const [interesseInput, setInteresseInput] = useState("");
  const [posicionamento, setPosicionamento] = useState<"advantage" | "manual">("advantage");
  const [manualPlacements, setManualPlacements] = useState<string[]>(["facebook_feed", "instagram_feed"]);

  // ads
  const [anuncios, setAnuncios] = useState<Anuncio[]>([novoAnuncio()]);

  const camp = useQuery({
    queryKey: ["mads", "camp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mads_v_conversao_vs_crm").select("campanha_nome").eq("campanha_uuid", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  function addInteresse() {
    const v = interesseInput.trim();
    if (v && !interesses.includes(v)) setInteresses((p) => [...p, v]);
    setInteresseInput("");
  }
  function patchAnuncio(aid: string, patch: Partial<Anuncio>) {
    setAnuncios((prev) => prev.map((a) => (a.id === aid ? { ...a, ...patch } : a)));
  }

  const step1Valid = nome.trim() && orcamentoBrl >= 1;
  const step2Valid = anuncios.length > 0 && anuncios.every(anuncioValido);

  async function criar() {
    setSubmitting(true);
    toast.info("Adicionando ad set (PAUSED)...");
    try {
      const r = await callEdgeFunction("meta-add-entity", {
        tipo: "adset",
        campanha_local_id: id,
        adset: {
          nome,
          optimization_goal: optimizationGoal,
          orcamento_diario_centavos: Math.round(orcamentoBrl * 100),
          targeting: {
            geo_locations: { countries: [geoCountry] },
            age_min: ageMin,
            age_max: ageMax,
            interests: interesses,
          },
          posicionamentos: posicionamento === "manual" ? manualPlacements : null,
        },
        anuncios: anuncios.map(adPayload),
      });
      if (r.ok) {
        toast.success("Ad set adicionado ✅");
        qc.invalidateQueries();
        navigate({ to: "/ads/campanhas/$id", params: { id } });
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
        <Link to="/ads/campanhas/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para a campanha
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" /> Adicionar ad set
        </h1>
        <p className="text-sm text-muted-foreground">
          Na campanha <strong>{camp.data?.campanha_nome ?? id}</strong>. Será criado PAUSED, com pelo menos 1 anúncio.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>1</span>
        <span className={step === 1 ? "font-semibold" : "text-muted-foreground"}>Público</span>
        <div className="h-px w-8 bg-border" />
        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
        <span className={step === 2 ? "font-semibold" : "text-muted-foreground"}>Anúncios</span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1 · Configuração do ad set</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Nome do ad set"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
              <Field label="Orçamento diário (R$)"><Input type="number" min={1} value={orcamentoBrl} onChange={(e) => setOrcamentoBrl(Number(e.target.value))} /></Field>
              <Field label="Optimization goal">
                <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPT_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Separator />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Localização (país)"><Input value={geoCountry} onChange={(e) => setGeoCountry(e.target.value.toUpperCase())} /></Field>
              <Field label="Idade mín"><Input type="number" min={13} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} /></Field>
              <Field label="Idade máx"><Input type="number" max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} /></Field>
            </div>
            <Field label="Interesses" hint="Enter para adicionar">
              <div className="flex gap-2">
                <Input value={interesseInput} onChange={(e) => setInteresseInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInteresse(); } }} placeholder="Ex: Empreendedorismo" />
                <Button type="button" variant="outline" onClick={addInteresse}>Adicionar</Button>
              </div>
              {interesses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {interesses.map((i) => (
                    <Badge key={i} variant="outline" className="gap-1">{i}<button type="button" onClick={() => setInteresses((p) => p.filter((x) => x !== i))} className="hover:text-destructive">×</button></Badge>
                  ))}
                </div>
              )}
            </Field>
            <Separator />
            <Field label="Posicionamento">
              <RadioGroup value={posicionamento} onValueChange={(v) => setPosicionamento(v as "advantage" | "manual")} className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="advantage" /> Advantage+ (recomendado)</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="manual" /> Manual</label>
              </RadioGroup>
              {posicionamento === "manual" && (
                <div className="grid grid-cols-2 gap-2 mt-3 pl-6">
                  {MANUAL_PLACEMENTS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={manualPlacements.includes(p)} onCheckedChange={(c) => setManualPlacements((prev) => c ? [...prev, p] : prev.filter((x) => x !== p))} />
                      {p}
                    </label>
                  ))}
                </div>
              )}
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {anuncios.map((ad, idx) => (
            <Card key={ad.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Anúncio {idx + 1}</CardTitle>
                {anuncios.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setAnuncios((p) => p.filter((a) => a.id !== ad.id))} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                )}
              </CardHeader>
              <CardContent>
                <AnuncioFields ad={ad} onPatch={(patch) => patchAnuncio(ad.id, patch)} />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => setAnuncios((p) => [...p, novoAnuncio()])}><Plus className="h-4 w-4 mr-2" /> Adicionar anúncio</Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(1)} disabled={step === 1}><ArrowLeft className="h-4 w-4 mr-2" /> Anterior</Button>
        {step === 1 ? (
          <Button onClick={() => setStep(2)} disabled={!step1Valid}>Próximo <ArrowRight className="h-4 w-4 ml-2" /></Button>
        ) : (
          <Button onClick={criar} disabled={submitting || !step2Valid}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />} Adicionar ad set (PAUSED)
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
