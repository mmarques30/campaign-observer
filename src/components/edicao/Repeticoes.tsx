// Falas repetidas detectadas na transcrição (tomadas). Mostra o que sai e o que fica.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Repeat, Scissors } from "lucide-react";
import type { Timeline } from "@/video/schema";
import type { Repeticao } from "@/video/repeticoes";

/** Já está fora da edição? (nenhum corte cobre o início da tomada descartada) */
function foraDaEdicao(r: Repeticao, cortes: Timeline["cortes"]) {
  if (!cortes.length) return false;
  const meio = (r.descartada.de + r.descartada.ate) / 2;
  return !cortes.some((c) => meio >= c.de && meio <= c.ate);
}

export function Repeticoes({
  repeticoes,
  cortes,
  onIr,
  onCortar,
}: {
  repeticoes: Repeticao[];
  cortes: Timeline["cortes"];
  onIr: (s: number) => void;
  onCortar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const pendentes = repeticoes.filter((r) => !foraDaEdicao(r, cortes));
  const resolvido = pendentes.length === 0;
  return (
    <div className="border-b bg-amber-500/5 text-sm">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setAberto((a) => !a)}
      >
        <Repeat className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="flex-1">
          {resolvido ? (
            <>
              <b>{repeticoes.length}</b> fala(s) repetida(s) já removida(s) — ficou a última tomada.
            </>
          ) : (
            <>
              <b>{pendentes.length}</b> fala(s) repetida(s) no bruto. Fica a última tomada de cada.
            </>
          )}
        </span>
        {!resolvido && (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={(e) => {
              e.stopPropagation();
              onCortar();
            }}
          >
            <Scissors className="h-3.5 w-3.5 mr-1" /> Remover
          </Button>
        )}
        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {aberto && (
        <ul className="px-3 pb-3 space-y-2">
          {repeticoes.map((r, i) => {
            const fora = foraDaEdicao(r, cortes);
            return (
              <li key={i} className="rounded-md border bg-background p-2 space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="h-5">
                    {r.motivo === "abortada"
                      ? "tomada abortada"
                      : r.motivo === "igual"
                        ? "fala igual"
                        : "fala parecida"}
                  </Badge>
                  <span>{Math.round(r.similaridade * 100)}%</span>
                  {fora && <span className="text-emerald-600 font-medium">· já fora</span>}
                </div>
                <button
                  type="button"
                  className="block text-left line-through text-muted-foreground hover:text-foreground"
                  onClick={() => onIr(r.descartada.de)}
                  title="Ir para esta tomada"
                >
                  {r.descartada.de.toFixed(1)}s · {r.descartada.texto}
                </button>
                <button
                  type="button"
                  className="block text-left hover:underline"
                  onClick={() => onIr(r.mantida.de)}
                  title="Ir para a tomada que fica"
                >
                  <span className="text-emerald-600 font-medium">fica</span> {r.mantida.de.toFixed(1)}s
                  · {r.mantida.texto}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
