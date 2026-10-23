// Edição à mão dos textos de um efeito (gancho, título, frase…), com negrito, itálico, cor etc.
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BarraFormato } from "./BarraFormato";

const CAMPOS: [string, string][] = [
  ["texto", "Texto"],
  ["titulo", "Título"],
  ["subtitulo", "Subtítulo"],
  ["palavra", "Palavra"],
];

export const temTexto = (props: Record<string, unknown> | undefined) =>
  CAMPOS.some(([k]) => typeof props?.[k] === "string");

function Campo({
  rotulo,
  inicial,
  onSalvar,
}: {
  rotulo: string;
  inicial: string;
  onSalvar: (v: string) => void;
}) {
  const [v, setV] = useState(inicial);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{rotulo}</span>
        <BarraFormato campo={ref} valor={v} onChange={setV} />
      </div>
      <Textarea
        ref={ref}
        rows={2}
        className="min-h-0 text-sm"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      {v !== inicial && (
        <Button size="sm" className="h-7" onClick={() => onSalvar(v)}>
          Aplicar
        </Button>
      )}
    </div>
  );
}

export function TextoEfeito({
  props,
  onMudar,
}: {
  props: Record<string, unknown>;
  onMudar: (campo: string, valor: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2">
      {CAMPOS.filter(([k]) => typeof props[k] === "string").map(([k, r]) => (
        <Campo key={k} rotulo={r} inicial={String(props[k])} onSalvar={(v) => onMudar(k, v)} />
      ))}
      <p className="text-[10px] text-muted-foreground">
        Selecione o trecho e use os botões: destaque do estilo, negrito, itálico, sublinhado,
        riscado e cores.
      </p>
    </div>
  );
}
