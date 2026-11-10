// Legenda do post: texto livre + emojis + opções novas geradas pelo Claude (com um pedido opcional).
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Smile, Sparkles } from "lucide-react";
import { chamarAgente } from "@/lib/criativos";
import { callEdgeFunction } from "@/lib/ads-mutations";

const EMOJIS =
  "😀 😂 🤣 😊 😍 🤩 😎 🤓 🤔 🫣 😮 😱 🥹 🙏 👏 🙌 💪 👇 👉 ☝️ ✅ ❌ ⚠️ 🚨 💡 🔥 ✨ ⭐ 🎯 🚀 📈 📉 📊 💰 💸 🧠 🤖 💻 📱 📩 📅 ⏰ ⏳ 🔑 🔒 🧩 🛠️ ⚙️ 📌 📍 🗂️ 📝 💬 🗣️ ❤️ 🤝 🏆 🎁 ➡️ ⬇️ ✱".split(
    " ",
  );

type Opcao = { titulo: string; texto: string };

export function EditorLegenda({
  projetoId,
  valor,
  onChange,
  video = false,
}: {
  projetoId: string;
  valor: string;
  onChange: (v: string) => void;
  /** Vídeo editado: gera pela fala e pela legenda da referência usada na edição, já ao abrir. */
  video?: boolean;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [pedido, setPedido] = useState("");
  const [gerando, setGerando] = useState(false);
  const [base, setBase] = useState<string | null>(null);

  function inserir(e: string) {
    const el = campo.current;
    const ini = el?.selectionStart ?? valor.length;
    const fim = el?.selectionEnd ?? valor.length;
    const novo = valor.slice(0, ini) + e + valor.slice(fim);
    onChange(novo);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + e.length, ini + e.length);
    });
  }

  async function gerar(preencher = false) {
    setGerando(true);
    try {
      const r = (
        video
          ? await callEdgeFunction("vedit-legenda", { projeto_id: projetoId, pedido })
          : await chamarAgente({ acao: "legendas", projeto_id: projetoId, pedido })
      ) as { opcoes?: Opcao[]; referencia?: string | null; error?: string };
      if (r.error) throw new Error(r.error);
      setOpcoes(r.opcoes ?? []);
      setBase(r.referencia ?? null);
      if (preencher && r.opcoes?.[0]) onChange(r.opcoes[0].texto);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  // Vídeo: abre já com a legenda escrita (a 1ª opção no campo, as outras logo abaixo).
  useEffect(() => {
    if (video && !valor.trim()) void gerar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, projetoId]);

  const hashtags = (valor.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Legenda</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 ml-auto">
              <Smile className="h-4 w-4 mr-1" /> Emoji
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="h-8 w-8 rounded-lg hover:bg-muted text-lg leading-none"
                  onClick={() => inserir(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Textarea ref={campo} rows={8} value={valor} onChange={(e) => onChange(e.target.value)} />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span className={hashtags > 5 ? "text-amber-600" : ""}>
          {hashtags} hashtag{hashtags === 1 ? "" : "s"}
          {hashtags > 5 ? " (muitas: 1 a 3 rendem melhor)" : ""}
        </span>
        <span>{valor.length}/2200</span>
      </div>

      <div className="rounded-lg border p-2 space-y-2">
        <div className="flex gap-2">
          <Input
            className="h-8 text-sm"
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Opcional: mais curta, com emojis, puxando para o diagnóstico…"
            onKeyDown={(e) => e.key === "Enter" && !gerando && gerar()}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => gerar()}
            disabled={gerando}
          >
            {gerando ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {opcoes.length ? "Gerar outras" : "Gerar opções"}
          </Button>
        </div>
        {gerando && (
          <p className="text-xs text-muted-foreground">
            O Claude está escrevendo 3 versões
            {video ? " a partir da sua fala e da referência da edição" : ""}…
          </p>
        )}
        {!gerando && video && opcoes.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {base
              ? `Seguindo a legenda do post da referência ${base}, com o conteúdo da sua fala.`
              : "Esta edição não usou referência: escrita a partir da sua fala."}
          </p>
        )}
        {opcoes.map((o, i) => (
          <div key={i} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
            <div className="flex items-center">
              <span className="text-xs font-semibold">{o.titulo}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 ml-auto text-xs"
                onClick={() => onChange(o.texto)}
              >
                Usar esta
              </Button>
            </div>
            <p className="text-xs whitespace-pre-line text-muted-foreground max-h-40 overflow-y-auto">
              {o.texto}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
