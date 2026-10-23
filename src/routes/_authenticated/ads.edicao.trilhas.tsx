// Edição → Trilhas: biblioteca de música de fundo (as de base + as da marca), nivelada no mesmo volume.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Music, Pause, Play, Trash2, Upload } from "lucide-react";
import { enviarTrilha, listarTrilhas, removerTrilha, urlTrilha, type Trilha } from "@/lib/trilhas";
import { fmtTempo } from "@/lib/vedit";

export const Route = createFileRoute("/_authenticated/ads/edicao/trilhas")({
  component: TrilhasPage,
});

const HUMORES = ["energetico", "confiante", "moderno", "inspirador", "corporativo", "positivo", "tenso", "urgente", "calmo", "intimo", "bastidor", "divertido"];

function TrilhasPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vedit", "trilhas"], queryFn: listarTrilhas });
  const [tocando, setTocando] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [humor, setHumor] = useState<string[]>([]);
  const [energia, setEnergia] = useState<Trilha["energia"]>("media");
  const [uso, setUso] = useState("");
  const [licenca, setLicenca] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function ouvir(t: Trilha) {
    if (tocando === t.id) {
      audio.current?.pause();
      setTocando(null);
      return;
    }
    audio.current?.pause();
    const u = await urlTrilha(t);
    if (!u) return;
    audio.current = new Audio(u);
    audio.current.volume = Math.min(1, 0.6 * t.ganho);
    audio.current.onended = () => setTocando(null);
    await audio.current.play();
    setTocando(t.id);
  }
  async function enviar() {
    if (!arquivo) return toast.error("Escolha o arquivo de áudio.");
    if (!humor.length) return toast.error("Marque pelo menos um clima.");
    setEnviando(true);
    try {
      await enviarTrilha(arquivo, {
        nome: nome.trim() || arquivo.name.replace(/\.[^.]+$/, ""),
        humor,
        energia,
        uso: uso.trim() || "Uso geral",
        licenca: licenca.trim() || undefined,
      });
      toast.success("Trilha adicionada e nivelada no volume das outras.");
      setArquivo(null);
      setNome("");
      setHumor([]);
      setUso("");
      setLicenca("");
      qc.invalidateQueries({ queryKey: ["vedit", "trilhas"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trilhas</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Música de fundo para dar ritmo. Toda faixa é nivelada no mesmo volume e baixa sozinha quando você
          fala. O editor escolhe pelo objetivo e estilo do vídeo, ou você pede no chat (/musica). Suba as
          faixas licenciadas da marca (Artlist, Epidemic, YouTube Audio Library) para usar em anúncio.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Arquivo (mp3, wav, m4a)</Label>
            <Input type="file" accept="audio/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Pulso urbano" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Clima</Label>
            <div className="flex flex-wrap gap-1.5">
              {HUMORES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHumor((x) => (x.includes(h) ? x.filter((y) => y !== h) : [...x, h]))}
                  className={`text-xs px-2 py-1 rounded-full border ${humor.includes(h) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Energia</Label>
            <Select value={energia} onValueChange={(v) => setEnergia(v as Trilha["energia"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Calma</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quando usar</Label>
            <Input value={uso} onChange={(e) => setUso(e.target.value)} placeholder="ex.: anúncio de dor + solução" />
          </div>
          <div className="space-y-1.5">
            <Label>Licença / origem (opcional)</Label>
            <Input value={licenca} onChange={(e) => setLicenca(e.target.value)} placeholder="ex.: Artlist, licença da conta IAplicada" />
          </div>
          <div className="flex items-end">
            <Button onClick={enviar} disabled={enviando} className="w-full">
              {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Adicionar trilha
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(q.data ?? []).map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 flex gap-3 items-start">
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => ouvir(t)}>
                {tocando === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Music className="h-3.5 w-3.5 text-primary" /> {t.nome}
                  {t.base ? <Badge variant="outline">vem com o editor</Badge> : <Badge variant="outline">marca</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  energia {t.energia}
                  {t.bpm ? ` · ${t.bpm} bpm` : ""}
                  {t.duracao ? ` · ${fmtTempo(t.duracao)}` : ""}
                  {t.licenca ? ` · ${t.licenca}` : ""}
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.humor.map((h) => (
                    <Badge key={h} variant="secondary" className="text-[10px] font-normal">
                      {h}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs">{t.uso}</p>
              </div>
              {!t.base && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={async () => {
                    await removerTrilha(t.id);
                    qc.invalidateQueries({ queryKey: ["vedit", "trilhas"] });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
