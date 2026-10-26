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
import { callEdgeFunction, FUNCTIONS_BASE } from "@/lib/ads-mutations";
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

// A busca roda no servidor (vedit-musicas): ccMixter + Openverse. Pelo navegador o Openverse
// não responde a pedidos vindos de outro site, e o ccMixter bloqueia tocar o arquivo direto.
const SISTEMA =
  /^(media|remix|sample|bpm_|trackback|in_|attribution|audio|mp3|44k|48k|stereo|mono|cbr|vbr|ccplus|editorial_pick|featured|acappella|non_commercial|sharealike)/i;
async function buscarNoAcervo(q: string, licenca: string): Promise<Musica[]> {
  const r: any = await callEdgeFunction("vedit-musicas", { acao: "buscar", consulta: q, licenca });
  if (r?.error) throw new Error(r.error);
  return ((r?.musicas ?? []) as Musica[]).map((m) => ({
    ...m,
    tags: (m.tags ?? []).filter((t) => t && !SISTEMA.test(t)).slice(0, 5),
  }));
}
// ccMixter não deixa tocar o arquivo direto de outro site: a prévia passa pelo servidor.
const urlOuvir = (u: string) =>
  /(^|\.)ccmixter\.org$/i.test(new URL(u).hostname)
    ? `${FUNCTIONS_BASE}/vedit-musicas?ouvir=${encodeURIComponent(u)}`
    : u;

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
    const el = new Audio(urlOuvir(m.url));
    el.volume = 0.6;
    // pula a introdução (depois de carregar os metadados, senão o salto é ignorado)
    el.addEventListener(
      "loadedmetadata",
      () => {
        if (el.duration > 40) el.currentTime = 20;
      },
      { once: true },
    );
    el.onerror = () => {
      toast.error("Não consegui tocar essa música. Tente outra.");
      setTocando(null);
    };
    void el.play().catch(() => {});
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
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" /> Salva
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Salvar na biblioteca
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
