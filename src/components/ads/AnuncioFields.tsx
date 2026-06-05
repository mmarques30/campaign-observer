import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { callEdgeFunction, slugify } from "@/lib/ads-mutations";

export const CTAS = ["LEARN_MORE", "SIGN_UP", "DOWNLOAD", "SUBSCRIBE", "GET_OFFER", "CONTACT_US", "BOOK_TRAVEL", "APPLY_NOW"];
export const FORMATOS = [
  { v: "carrossel", l: "Carrossel" },
  { v: "video", l: "Vídeo" },
  { v: "imagem", l: "Imagem única" },
];

export type Anuncio = {
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

export function novoAnuncio(): Anuncio {
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

/** Monta o objeto de anúncio para os payloads das edge functions. */
export function adPayload(ad: Anuncio) {
  return {
    nome: ad.nome,
    formato: ad.formato,
    midias_urls: ad.midiasBucketUrls,
    texto_principal: ad.texto,
    titulo: ad.titulo,
    descricao: ad.descricao,
    cta: ad.cta,
    utm_content: ad.utmContent || `ad_${slugify(ad.nome)}`,
    thumbnail_url: ad.formato === "video" ? ad.thumbnailUrl || null : null,
  };
}

export function anuncioValido(ad: Anuncio) {
  return !!(ad.nome.trim() && ad.titulo.trim() && ad.texto.trim());
}

/** Campos de um único anúncio (formato, mídias do Drive, copy, CTA, UTM). */
export function AnuncioFields({ ad, onPatch }: { ad: Anuncio; onPatch: (patch: Partial<Anuncio>) => void }) {
  const [validating, setValidating] = useState(false);

  async function validarDrive() {
    const urls = ad.midiasText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast.error("Cole ao menos uma URL do Drive.");
      return;
    }
    setValidating(true);
    onPatch({ validationErrors: [] });
    try {
      const r = await callEdgeFunction("mads-upload-creative-from-drive", { urls });
      const bucketUrls: string[] = r.bucket_urls ?? r.urls ?? r.midias ?? r.midias_urls ?? r.uploaded ?? [];
      const errors: string[] = r.errors ?? r.erros ?? [];
      if (r.ok === false || (bucketUrls.length === 0 && errors.length === 0)) {
        onPatch({ validationErrors: errors.length ? errors : [r.error ?? "Falha ao processar URLs."] });
        toast.error("Algumas URLs falharam. Veja os detalhes.");
        return;
      }
      onPatch({ midiasBucketUrls: bucketUrls, validationErrors: errors });
      toast.success(`${bucketUrls.length} mídia(s) processada(s).`);
    } catch (e) {
      onPatch({ validationErrors: [(e as Error).message] });
      toast.error((e as Error).message);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Wrap label="Nome do anúncio">
          <Input value={ad.nome} onChange={(e) => onPatch({ nome: e.target.value })} />
        </Wrap>
        <Wrap label="Formato">
          <RadioGroup value={ad.formato} onValueChange={(v) => onPatch({ formato: v })} className="flex gap-4 pt-2">
            {FORMATOS.map((f) => (
              <label key={f.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <RadioGroupItem value={f.v} /> {f.l}
              </label>
            ))}
          </RadioGroup>
        </Wrap>
      </div>

      <Wrap label="Mídias — URLs do Drive (1 por linha)" hint="⚠️ Pastas/arquivos precisam estar com 'qualquer pessoa com link' no Drive.">
        <Textarea rows={3} value={ad.midiasText} onChange={(e) => onPatch({ midiasText: e.target.value })} placeholder="https://drive.google.com/..." />
        <div className="flex items-center gap-3 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={validarDrive} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Validar URLs Drive
          </Button>
          {ad.midiasBucketUrls.length > 0 && <span className="text-xs text-emerald-600">{ad.midiasBucketUrls.length} ok</span>}
        </div>
        {ad.midiasBucketUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {ad.midiasBucketUrls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
                <img src={u} alt="" className="h-16 w-16 object-cover rounded border border-border" onError={(e) => { e.currentTarget.style.display = "none"; }} />
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
      </Wrap>

      <Wrap label="Texto principal" hint="Máx 2200; recomendado < 125">
        <Textarea rows={3} maxLength={2200} value={ad.texto} onChange={(e) => onPatch({ texto: e.target.value })} />
      </Wrap>
      <div className="grid sm:grid-cols-2 gap-4">
        <Wrap label="Título" hint="Máx 40"><Input maxLength={40} value={ad.titulo} onChange={(e) => onPatch({ titulo: e.target.value })} /></Wrap>
        <Wrap label="Descrição" hint="Máx 30"><Input maxLength={30} value={ad.descricao} onChange={(e) => onPatch({ descricao: e.target.value })} /></Wrap>
        <Wrap label="CTA">
          <Select value={ad.cta} onValueChange={(v) => onPatch({ cta: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Wrap>
        <Wrap label="UTM Content" hint="default ad_{nome}"><Input value={ad.utmContent} onChange={(e) => onPatch({ utmContent: e.target.value })} placeholder={`ad_${slugify(ad.nome) || "nome"}`} /></Wrap>
      </div>
      {ad.formato === "video" && (
        <Wrap label="Thumbnail URL (opcional)"><Input value={ad.thumbnailUrl} onChange={(e) => onPatch({ thumbnailUrl: e.target.value })} /></Wrap>
      )}
    </div>
  );
}

function Wrap({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
