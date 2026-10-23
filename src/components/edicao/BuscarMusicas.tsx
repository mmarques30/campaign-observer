// Busca de músicas liberadas (Openverse: Jamendo, ccMixter, Freesound…): ouvir e trazer para a biblioteca.
// A busca roda no navegador (o Openverse bloqueia servidores de nuvem); o download passa pela função.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ExternalLink, Loader2, Pause, Play, Plus, Search } from "lucide-react";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { registrarTrilha } from "@/lib/trilhas";
import { fmtTempo } from "@/lib/vedit";

type Musica = {
  id: string;
  titulo: string;
  autor: string;
  url: string;
  duracao: number | null;
  licenca: string;
  exigeCredito: boolean;
  fonte: string;
  pagina: string | null;
  tags: string[];
};

const ATALHOS: { nome: string; q: string; humor: string[] }[] = [
  { nome: "Corporativa", q: "corporate", humor: ["corporativo", "inspirador"] },
  { nome: "Animada", q: "upbeat", humor: ["energetico", "positivo"] },
  { nome: "Motivacional", q: "motivational", humor: ["inspirador", "confiante"] },
  { nome: "Eletrônica", q: "electronic", humor: ["moderno", "energetico"] },
  { nome: "Hip hop", q: "hip hop beat", humor: ["confiante", "moderno"] },
  { nome: "Lo-fi", q: "lofi", humor: ["calmo", "bastidor"] },
  { nome: "Piano", q: "piano", humor: ["intimo", "calmo"] },
  { nome: "Cinemática", q: "cinematic", humor: ["tenso", "dramatico"] },
  { nome: "Acústica", q: "acoustic guitar", humor: ["positivo", "intimo"] },
  { nome: "Tensão", q: "suspense", humor: ["tenso", "urgente"] },
];

async function buscarNoAcervo(q: string, licenca: string): Promise<Musica[]> {
  const lic = licenca === "livre" ? "cc0,pdm" : "cc0,pdm,by";
  const r = await fetch(
    `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license=${lic}&category=music&page_size=30&mature=false`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!r.ok) throw new Error(`O acervo respondeu ${r.status}. Tente de novo em instantes.`);
  const j = await r.json();
  return (j.results ?? [])
    .map((a: any) => ({
      id: a.id,
      titulo: a.title ?? "Sem título",
      autor: a.creator ?? "autor",
      url: a.url,
      duracao: a.duration ? Math.round(a.duration / 1000) : null,
      licenca: `${String(a.license ?? "").toUpperCase()} ${a.license_version ?? ""}`.trim(),
      exigeCredito: !["cc0", "pdm"].includes(String(a.license ?? "").toLowerCase()),
      fonte: a.source ?? a.provider,
      pagina: a.foreign_landing_url ?? null,
      tags: (a.tags ?? []).map((t: any) => t.name).slice(0, 6),
    }))
    .filter((a: Musica) => a.url && (!a.duracao || (a.duracao >= 30 && a.duracao <= 420)));
}

export function BuscarMusicas({ onAdicionada }: { onAdicionada: () => void }) {
  const [busca, setBusca] = useState("");
  const [licenca, setLicenca] = useState("credito");
  const [humor, setHumor] = useState<string[]>([]);
  const [lista, setLista] = useState<Musica[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [tocando, setTocando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const audio = useRef<HTMLAudioElement | null>(null);

  async function buscar(q = busca, h: string[] = []) {
    if (!q.trim()) return;
    setCarregando(true);
    setHumor(h);
    try {
      setLista(await buscarNoAcervo(q.trim(), licenca));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }
  function ouvir(m: Musica) {
    audio.current?.pause();
    if (tocando === m.id) return setTocando(null);
    const el = new Audio(m.url);
    el.volume = 0.6;
    el.currentTime = 20; // pula a introdução
    void el.play();
    el.onended = () => setTocando(null);
    audio.current = el;
    setTocando(m.id);
  }
  async function adicionar(m: Musica) {
    setSalvando(m.id);
    try {
      const r: any = await callEdgeFunction("vedit-musicas", { acao: "salvar", url: m.url });
      if (r?.error) throw new Error(r.error);
      await registrarTrilha(r.path, {
        id: r.id,
        nome: m.titulo.slice(0, 60),
        humor,
        uso: "Busca no acervo livre",
        licenca: `${m.licenca} (${m.fonte})`,
        credito: m.exigeCredito ? `Crédito: "${m.titulo}" de ${m.autor}` : undefined,
      });
      setFeitas((s) => new Set(s).add(m.id));
      toast.success(
        m.exigeCredito
          ? `"${m.titulo}" na biblioteca. Licença CC BY: ponha o crédito na legenda do post.`
          : `"${m.titulo}" na biblioteca.`,
      );
      onAdicionada();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ATALHOS.map((a) => (
          <button
            key={a.q}
            type="button"
            className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted"
            onClick={() => {
              setBusca(a.q);
              void buscar(a.q, a.humor);
            }}
          >
            {a.nome}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="Buscar em inglês: corporate, upbeat, piano, cinematic…"
        />
        <Select value={licenca} onValueChange={setLicenca}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credito">Livres + com crédito (CC BY)</SelectItem>
            <SelectItem value="livre">Só sem crédito (CC0)</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => buscar()} disabled={carregando}>
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      {lista && lista.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nada encontrado. Tente outro termo ou "Livres + com crédito".
        </p>
      )}
      {lista && lista.length > 0 && (
        <div className="divide-y rounded-md border max-h-[420px] overflow-y-auto">
          {lista.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => ouvir(m)}
              >
                {tocando === m.id ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {m.titulo} <span className="font-normal text-muted-foreground">· {m.autor}</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                  {m.duracao ? fmtTempo(m.duracao) : ""}
                  <Badge
                    variant={m.exigeCredito ? "outline" : "secondary"}
                    className="h-4 px-1 text-[10px]"
                  >
                    {m.exigeCredito ? `${m.licenca} · crédito` : m.licenca}
                  </Badge>
                  {m.fonte}
                  {m.tags.length ? ` · ${m.tags.join(", ")}` : ""}
                  {m.pagina && (
                    <a
                      href={m.pagina}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={feitas.has(m.id) ? "secondary" : "outline"}
                className="h-8"
                disabled={salvando === m.id || feitas.has(m.id)}
                onClick={() => adicionar(m)}
              >
                {salvando === m.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : feitas.has(m.id) ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
