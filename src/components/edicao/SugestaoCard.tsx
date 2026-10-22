import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { aplicarSugestao, pedirSugestao, type Projeto, type Sugestao } from "@/lib/vedit";
import { ESTILOS } from "@/video/catalogo";
import type { Formato } from "@/video/schema";

/**
 * Aparece logo depois da transcrição: o editor leu o vídeo, cruzou com os roteiros do
 * Marketing e os anúncios do Meta, e propõe nome, objetivo, formato, estilo e duração.
 */
export function SugestaoCard({
  projeto,
  onAplicado,
}: {
  projeto: Projeto;
  onAplicado: () => void;
}) {
  const [s, setS] = useState<Sugestao | null>(projeto.sugestao ?? null);
  const [carregando, setCarregando] = useState(!projeto.sugestao);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    if (s) return;
    let vivo = true;
    (async () => {
      try {
        const r = await pedirSugestao(projeto.id);
        if (vivo) setS(r);
      } catch (e) {
        if (vivo) toast.error(`Não consegui sugerir: ${(e as Error).message}`);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [projeto.id, s]);

  async function aplicar() {
    if (!s) return;
    setAplicando(true);
    try {
      await aplicarSugestao(projeto, s);
      onAplicado();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAplicando(false);
    }
  }

  if (carregando) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Lendo a transcrição e cruzando com os roteiros do Marketing e os anúncios do Meta…
      </div>
    );
  }
  if (!s) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3 text-sm">
        <span>Sem sugestão. Você pode editar assim mesmo.</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCarregando(true);
            setS(null);
          }}
        >
          <Wand2 className="h-4 w-4 mr-1" /> Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> Como eu trataria este vídeo
      </div>
      <p className="text-sm">{s.resumo}</p>
      <p className="text-xs text-muted-foreground">{s.motivo}</p>
      {s.gancho_atual && (
        <p className="text-xs">
          <span className="text-muted-foreground">Gancho:</span> “{s.gancho_atual}”
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={s.nome}
            onChange={(e) => setS({ ...s, nome: e.target.value })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Objetivo</Label>
          <Select value={s.objetivo} onValueChange={(v) => setS({ ...s, objetivo: v as any })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anuncio">Anúncio Meta</SelectItem>
              <SelectItem value="organico">Reel orgânico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Formato</Label>
          <Select value={s.formato} onValueChange={(v) => setS({ ...s, formato: v as Formato })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["9:16", "4:5", "1:1"] as Formato[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estilo</Label>
          <Select value={s.estilo} onValueChange={(v) => setS({ ...s, estilo: v as any })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ESTILOS).map(([id, e]) => (
                <SelectItem key={id} value={id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duração alvo (s)</Label>
          <Input
            type="number"
            min={5}
            max={180}
            value={s.duracao_alvo}
            onChange={(e) => setS({ ...s, duracao_alvo: Number(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        {s.objetivo === "organico" && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Palavra do CTA (Comenta …)</Label>
            <Input
              value={s.palavra_cta ?? ""}
              onChange={(e) => setS({ ...s, palavra_cta: e.target.value || null })}
              className="h-8"
              placeholder="Ex.: QUERO"
            />
          </div>
        )}
      </div>
      {s.content_item_id && (
        <p className="text-[11px] text-muted-foreground">
          Ligado ao roteiro da página de Marketing.
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={aplicar} disabled={aplicando}>
          {aplicando ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}{" "}
          Usar isso e editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setS(null);
            setCarregando(true);
          }}
          disabled={aplicando}
        >
          Sugerir de novo
        </Button>
      </div>
    </div>
  );
}
