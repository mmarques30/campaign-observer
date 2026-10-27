// Legenda do post: texto livre + emojis + opções novas geradas pelo Claude (com um pedido opcional).
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Smile, Sparkles } from "lucide-react";
import { chamarAgente } from "@/lib/criativos";

const EMOJIS =
  "😀 😂 🤣 😊 😍 🤩 😎 🤓 🤔 🫣 😮 😱 🥹 🙏 👏 🙌 💪 👇 👉 ☝️ ✅ ❌ ⚠️ 🚨 💡 🔥 ✨ ⭐ 🎯 🚀 📈 📉 📊 💰 💸 🧠 🤖 💻 📱 📩 📅 ⏰ ⏳ 🔑 🔒 🧩 🛠️ ⚙️ 📌 📍 🗂️ 📝 💬 🗣️ ❤️ 🤝 🏆 🎁 ➡️ ⬇️ ✱".split(
    " ",
  );

type Opcao = { titulo: string; texto: string };

export function EditorLegenda({
  projetoId,
  valor,
  onChange,
}: {
  projetoId: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [pedido, setPedido] = useState("");
  const [gerando, setGerando] = useState(false);

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

  async function gerar() {
    setGerando(true);
    try {
      const r = (await chamarAgente({ acao: "legendas", projeto_id: projetoId, pedido })) as {
        opcoes?: Opcao[];
      };
      setOpcoes(r.opcoes ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

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
                  className="h-8 w-8 rounded hover:bg-muted text-lg leading-none"
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
            onClick={gerar}
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
          <p className="text-xs text-muted-foreground">O Claude está escrevendo 3 versões…</p>
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
