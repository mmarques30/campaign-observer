// Botões de formatação para textos de efeitos e legenda: envolvem o trecho selecionado
// com as marcas que o vídeo entende (ver src/video/marcacao.tsx).
import type { RefObject } from "react";
import { Bold, Highlighter, Italic, Strikethrough, Underline } from "lucide-react";
import { CORES_NOMEADAS } from "@/video/marcacao";
import { cn } from "@/lib/utils";

type Campo = HTMLInputElement | HTMLTextAreaElement;

const MARCAS = [
  { a: "*", b: "*", icon: Highlighter, t: "Destaque do estilo (*texto*)" },
  { a: "**", b: "**", icon: Bold, t: "Negrito (**texto**)" },
  { a: "_", b: "_", icon: Italic, t: "Itálico (_texto_)" },
  { a: "__", b: "__", icon: Underline, t: "Sublinhado (__texto__)" },
  { a: "~~", b: "~~", icon: Strikethrough, t: "Riscado (~~texto~~)" },
];
const CORES = ["amarelo", "verde", "vermelho", "azul", "roxo", "rosa", "laranja"];

export function BarraFormato({
  campo,
  valor,
  onChange,
  className,
}: {
  campo: RefObject<Campo | null>;
  valor: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  function envolver(a: string, b: string) {
    const el = campo.current;
    let ini = el?.selectionStart ?? valor.length;
    let fim = el?.selectionEnd ?? valor.length;
    if (ini === fim) {
      // Sem seleção: pega a palavra onde está o cursor.
      while (ini > 0 && !/\s/.test(valor[ini - 1])) ini--;
      while (fim < valor.length && !/\s/.test(valor[fim])) fim++;
    }
    const sel = valor.slice(ini, fim);
    // Clicar de novo tira a marca.
    const novo =
      sel.startsWith(a) && sel.endsWith(b) && sel.length >= a.length + b.length
        ? valor.slice(0, ini) + sel.slice(a.length, sel.length - b.length) + valor.slice(fim)
        : valor.slice(0, ini) + a + sel + b + valor.slice(fim);
    onChange(novo);
    requestAnimationFrame(() => el?.focus());
  }
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {MARCAS.map((m) => (
        <button
          key={m.t}
          type="button"
          title={m.t}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => envolver(m.a, m.b)}
          className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"
        >
          <m.icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-border" />
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          title={`Cor ${c} ([${c}]texto[/])`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => envolver(`[${c}]`, "[/]")}
          className="h-5 w-5 rounded-full border m-0.5"
          style={{ background: CORES_NOMEADAS[c] }}
        />
      ))}
    </div>
  );
}
