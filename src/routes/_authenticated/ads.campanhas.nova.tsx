import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2, Megaphone } from "lucide-react";
import { brl } from "@/lib/ads-utils";
import { callEdgeFunction, slugify } from "@/lib/ads-mutations";

export const Route = createFileRoute("/_authenticated/ads/campanhas/nova")({
  component: NovaCampanha,
});

const TIPO_LEAD = ["business", "contabil", "advocacia", "academy", "skills", "outro"];
const OBJETIVOS = [
  { v: "OUTCOME_TRAFFIC", l: "Tráfego" },
  { v: "OUTCOME_LEADS", l: "Leads / Conversão (recomendado)" },
  { v: "OUTCOME_ENGAGEMENT", l: "Engajamento" },
];
const OPT_GOALS = ["LANDING_PAGE_VIEWS", "LEAD_GENERATION", "LINK_CLICKS", "CONVERSIONS"];
const MANUAL_PLACEMENTS = ["facebook_feed", "instagram_feed", "instagram_stories", "facebook_reels", "instagram_reels"];
const CTAS = ["LEARN_MORE", "SIGN_UP", "DOWNLOAD", "SUBSCRIBE", "GET_OFFER", "CONTACT_US", "BOOK_TRAVEL", "APPLY_NOW"];
const FORMATOS = [
  { v: "carrossel", l: "Carrossel" },
  { v: "video", l: "Vídeo" },
  { v: "imagem", l: "Imagem única" },
];

type Anuncio = {
  id: string;
  nome: string;
  formato: string;
  midiasText: string;
  midiasBucketUrls: string[];
  validating: boolean;
  validationErrors: string[];
  texto: string;
  titulo: string;
  descricao: string;
  cta: string;
  utmContent: string;
  thumbnailUrl: string;
};

function novoAnuncio(): Anuncio {
  return {
    id: crypto.randomUUID(),
    nome: "",
    formato: "imagem",
    midiasText: "",
    midiasBucketUrls: [],
    validating: false,
    validationErrors: [],
    texto: "",
    titulo: "",
    descricao: "",
    cta: "LEARN_MORE",
    utmContent: "",
    thumbnailUrl: "",
  };
}

function NovaCampanha() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [nome, setNome] = useState("");
  const [tipoLead, setTipoLead] = useState("business");
  const [objetivo, setObjetivo] = useState("OUTCOME_LEADS");
  const [orcamentoBrl, setOrcamentoBrl] = useState(70);
  const [lpDestino, setLpDestino] = useState("https://iaplicada.com");
  const [utmEdited, setUtmEdited] = useState(false);
  const [utmCampaign, setUtmCampaign] = useState("");

  const utmAuto = useMemo(() => `${tipoLead}_${slugify(nome)}_mai26`, [tipoLead, nome]);
  const utmFinal = utmEdited ? utmCampaign : utmAuto;

  // Step 2
  const [adsetNome, setAdsetNome] = useState("Conj Único - Aberto");
  const [optimizationGoal, setOptimizationGoal] = useState("LANDING_PAGE_VIEWS");
  const [geoCountry, setGeoCountry] = useState("BR");
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(55);
  const [interesses, setInteresses] = useState<string[]>([]);
  const [interesseInput, setInteresseInput] = useState("");
  const [posicionamento, setPosicionamento] = useState<"advantage" | "manual">("advantage");
  const [manualPlacements, setManualPlacements] = useState<string[]>(["facebook_feed", "instagram_feed"]);
  const [pageId, setPageId] = useState("");
  const [instagramActorId, setInstagramActorId] = useState("");

  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);

  // Step 3
  const [anuncios, setAnuncios] = useState<Anuncio[]>([novoAnuncio()]);

  const audiencias = useQuery({
    queryKey: ["mads", "audiences-pronta"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mads_audiences")
        .select("meta_audience_id, nome, tipo, ratio, status")
        .eq("status", "pronta");
      if (error) throw error;
      return (data ?? []) as { meta_audience_id: string; nome: string; tipo: string | null; ratio: number | null; status: string | null }[];
    },
  });

  function addInteresse() {
    const v = interesseInput.trim();
    if (v && !interesses.includes(v)) setInteresses((p) => [...p, v]);
    setInteresseInput("");
  }
  function patchAnuncio(id: string, patch: Partial<Anuncio>) {
    setAnuncios((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function validarDrive(ad: Anuncio) {
    const urls = ad.midiasText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast.error("Cole ao menos uma URL do Drive.");
      return;
    }
    patchAnuncio(ad.id, { validating: true, validationErrors: [] });
    try {
      const r = await callEdgeFunction("mads-upload-creative-from-drive", { urls });
      // Resposta tolerante a diferentes formatos do backend.
      const bucketUrls: string[] =
        r.bucket_urls ?? r.urls ?? r.midias ?? r.midias_urls ?? r.uploaded ?? [];
      const errors: string[] = r.errors ?? r.erros ?? [];
      if (r.ok === false || (bucketUrls.length === 0 && errors.length === 0)) {
        patchAnuncio(ad.id, { validating: false, validationErrors: errors.length ? errors : [r.error ?? "Falha ao processar URLs."] });
        toast.error("Algumas URLs falharam. Veja os detalhes.");
        return;
      }
      patchAnuncio(ad.id, { validating: false, midiasBucketUrls: bucketUrls, validationErrors: errors });
      toast.success(`${bucketUrls.length} mídia(s) processada(s).`);
    } catch (e) {
      patchAnuncio(ad.id, { validating: false, validationErrors: [(e as Error).message] });
      toast.error((e as Error).message);
    }
  }

  const payload = useMemo(() => ({
    nome_campanha: nome,
    tipo_lead: tipoLead,
    objetivo,
    orcamento_diario_centavos: Math.round(orcamentoBrl * 100),
    lp_destino: lpDestino,
    utm_campaign: utmFinal,
    page_id: pageId,
    instagram_actor_id: instagramActorId || null,
    adset: {
      nome: adsetNome,
      optimization_goal: optimizationGoal,
      targeting: {
        geo_locations: { countries: [geoCountry] },
        age_min: ageMin,
        age_max: ageMax,
        interests: interesses,
        custom_audiences: selectedAudiences.length > 0 ? selectedAudiences.map((id) => ({ id })) : undefined,
      },
      posicionamentos: posicionamento === "manual" ? manualPlacements : null,
    },
    anuncios: anuncios.map((ad) => ({
      nome: ad.nome,
      formato: ad.formato,
      midias_urls: ad.midiasBucketUrls,
      texto_principal: ad.texto,
      titulo: ad.titulo,
      descricao: ad.descricao,
      cta: ad.cta,
      utm_content: ad.utmContent || `ad_${slugify(ad.nome)}`,
      thumbnail_url: ad.formato === "video" ? ad.thumbnailUrl || null : null,
    })),
  }), [nome, tipoLead, objetivo, orcamentoBrl, lpDestino, utmFinal, pageId, instagramActorId, adsetNome, optimizationGoal, geoCountry, ageMin, ageMax, interesses, posicionamento, manualPlacements, anuncios, selectedAudiences]);

  const step1Valid = nome.trim() && orcamentoBrl >= 1 && lpDestino.trim();
  const step2Valid = adsetNome.trim() && pageId.trim();
  const step3Valid = anuncios.length > 0 && anuncios.every((a) => a.nome.trim() && a.titulo.trim() && a.texto.trim());

  async function criar() {
    setSubmitting(true);
    toast.info("Criando campanha no Meta (PAUSED)...");
    try {
      const result = await callEdgeFunction("meta-create-campaign", payload);
      if (result.ok) {
        toast.success(`Campanha criada! Meta ID: ${result.campanha?.meta_id ?? "—"}`);
        const localId = result.campanha?.local_id;
        if (localId) navigate({ to: "/ads/campanhas/$id", params: { id: localId } });
        else navigate({ to: "/ads/campanhas" });
        qc.invalidateQueries();
      } else {
        toast.error(`Erro: ${result.error ?? "falha desconhecida"}`);
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
        <Link to="/ads/campanhas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para campanhas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Nova campanha
        </h1>
        <p className="text-sm text-muted-foreground">Será criada PAUSED no Meta. Você revisa e ativa depois.</p>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1 · Configuração básica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome da campanha">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Captação contábil maio" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tipo de lead">
                <Select value={tipoLead} onValueChange={setTipoLead}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPO_LEAD.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Objetivo">
                <Select value={objetivo} onValueChange={setObjetivo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OBJETIVOS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Orçamento diário (R$)">
                <Input type="number" min={1} value={orcamentoBrl} onChange={(e) => setOrcamentoBrl(Number(e.target.value))} />
              </Field>
              <Field label="LP destino (URL completa)">
                <Input value={lpDestino} onChange={(e) => setLpDestino(e.target.value)} placeholder="https://iaplicada.com" />
              </Field>
            </div>
            <Field label="UTM Campaign" hint="Auto-gerado a partir do tipo + nome. Edite se precisar.">
              <Input value={utmFinal} onChange={(e) => { setUtmEdited(true); setUtmCampaign(e.target.value); }} />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>2 · Público & posicionamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome do ad set">
                <Input value={adsetNome} onChange={(e) => setAdsetNome(e.target.value)} />
              </Field>
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
                    <Badge key={i} variant="outline" className="gap-1">
                      {i}
                      <button type="button" onClick={() => setInteresses((p) => p.filter((x) => x !== i))} className="hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </Field>
            <Separator />
            <Field label="Audiência adicional (opcional)" hint="Soma com o targeting de interesses (intersect). Só lista audiências prontas.">
              {(audiencias.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma audiência pronta. Crie em Audiências.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(audiencias.data ?? []).map((a) => (
                    <label key={a.meta_audience_id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedAudiences.includes(a.meta_audience_id)}
                        onCheckedChange={(c) => setSelectedAudiences((prev) => c ? [...prev, a.meta_audience_id] : prev.filter((x) => x !== a.meta_audience_id))}
                      />
                      {a.tipo === "lookalike" ? "🎯" : "📋"} {a.nome}{a.tipo === "lookalike" && a.ratio != null ? ` (LAL ${(a.ratio * 100).toFixed(0)}%)` : ""}
                    </label>
                  ))}
                </div>
              )}
            </Field>
            <Separator />
            <Field label="Posicionamento">
              <RadioGroup value={posicionamento} onValueChange={(v) => setPosicionamento(v as "advantage" | "manual")} className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="advantage" /> Advantage+ (recomendado)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="manual" /> Manual
                </label>
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
            <Separator />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Page ID Facebook"><Input value={pageId} onChange={(e) => setPageId(e.target.value)} /></Field>
              <Field label="Instagram Actor ID (opcional)"><Input value={instagramActorId} onChange={(e) => setInstagramActorId(e.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {anuncios.map((ad, idx) => (
            <Card key={ad.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Anúncio {idx + 1}</CardTitle>
                {anuncios.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setAnuncios((p) => p.filter((a) => a.id !== ad.id))} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nome do anúncio"><Input value={ad.nome} onChange={(e) => patchAnuncio(ad.id, { nome: e.target.value })} /></Field>
                  <Field label="Formato">
                    <RadioGroup value={ad.formato} onValueChange={(v) => patchAnuncio(ad.id, { formato: v })} className="flex gap-4 pt-2">
                      {FORMATOS.map((f) => (
                        <label key={f.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <RadioGroupItem value={f.v} /> {f.l}
                        </label>
                      ))}
                    </RadioGroup>
                  </Field>
                </div>
                <Field label="Mídias — URLs do Drive (1 por linha)" hint="⚠️ Pastas/arquivos precisam estar com 'qualquer pessoa com link' no Drive.">
                  <Textarea rows={3} value={ad.midiasText} onChange={(e) => patchAnuncio(ad.id, { midiasText: e.target.value })} placeholder="https://drive.google.com/..." />
                  <div className="flex items-center gap-3 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => validarDrive(ad)} disabled={ad.validating}>
                      {ad.validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Validar URLs Drive
                    </Button>
                    {ad.midiasBucketUrls.length > 0 && <span className="text-xs text-emerald-600">{ad.midiasBucketUrls.length} ok</span>}
                  </div>
                  {ad.midiasBucketUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ad.midiasBucketUrls.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
                          <img src={u} alt="" className="h-16 w-16 object-cover rounded border border-border" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {ad.validationErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {ad.validationErrors.map((er, i) => (
                        <div key={i} className="text-xs text-destructive flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{er}</div>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Texto principal" hint="Máx 2200; recomendado < 125">
                  <Textarea rows={3} maxLength={2200} value={ad.texto} onChange={(e) => patchAnuncio(ad.id, { texto: e.target.value })} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Título" hint="Máx 40"><Input maxLength={40} value={ad.titulo} onChange={(e) => patchAnuncio(ad.id, { titulo: e.target.value })} /></Field>
                  <Field label="Descrição" hint="Máx 30"><Input maxLength={30} value={ad.descricao} onChange={(e) => patchAnuncio(ad.id, { descricao: e.target.value })} /></Field>
                  <Field label="CTA">
                    <Select value={ad.cta} onValueChange={(v) => patchAnuncio(ad.id, { cta: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="UTM Content" hint="default ad_{nome}"><Input value={ad.utmContent} onChange={(e) => patchAnuncio(ad.id, { utmContent: e.target.value })} placeholder={`ad_${slugify(ad.nome) || "nome"}`} /></Field>
                </div>
                {ad.formato === "video" && (
                  <Field label="Thumbnail URL (opcional)"><Input value={ad.thumbnailUrl} onChange={(e) => patchAnuncio(ad.id, { thumbnailUrl: e.target.value })} /></Field>
                )}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => setAnuncios((p) => [...p, novoAnuncio()])}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar anúncio
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-4 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            Será criada <strong>PAUSED</strong> no Meta. Você revisa e ativa depois no detalhe da campanha.
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Mock do anúncio</CardTitle>
              <CardDescription>{anuncios.length} anúncio(s) · {brl(orcamentoBrl)}/dia · {objetivo}</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {anuncios.map((ad, i) => (
                <div key={ad.id} className="rounded-md border border-border overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {ad.midiasBucketUrls[0]
                      ? <img src={ad.midiasBucketUrls[0]} alt="" className="h-full w-full object-cover" />
                      : <span className="text-xs text-muted-foreground">sem mídia validada</span>}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Anúncio {i + 1} · {ad.formato}</div>
                    <div className="font-semibold text-sm">{ad.titulo || "—"}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{ad.texto || "—"}</div>
                    <Badge variant="outline" className="mt-1">{ad.cta}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payload (preview)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-80">{JSON.stringify(payload, null, 2)}</pre>
            </CardContent>
          </Card>
          <Button size="lg" className="w-full" onClick={criar} disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Megaphone className="h-5 w-5 mr-2" />}
            Criar campanha (PAUSED)
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
        </Button>
        {step < 4 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
          >
            Próximo <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Básico", "Público", "Anúncios", "Revisão"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={l} className="flex items-center gap-2 flex-1">
            <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            <span className={`text-xs hidden sm:inline ${active ? "font-semibold" : "text-muted-foreground"}`}>{l}</span>
            {i < labels.length - 1 && <div className={`h-px flex-1 ${done ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        );
      })}
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
