import { useMemo } from "react";
import { EFEITO_POR_TIPO, type Categoria } from "@/video/catalogo";
import { montarBlocos } from "@/video/legenda";
import type { Palavra, Timeline } from "@/video/schema";
import { duracaoSaida, paraSaida, type Trecho } from "@/video/tempo";
import { cn } from "@/lib/utils";

const COR: Record<Categoria, string> = {
  texto: "bg-violet-500/80",
  dados: "bg-sky-500/80",
  interface: "bg-emerald-500/80",
  midia: "bg-amber-500/80",
  transicao: "bg-pink-500/80",
  cta: "bg-lime-500/80 text-black",
};

/** Linha do tempo em trilhas (tempo do vídeo final). Clique para posicionar o preview. */
export function Trilhas({
  tl,
  palavras,
  trechos,
  frame,
  onSeek,
  efeitoSelecionado,
  onSelecionarEfeito,
  trechoSelecionado,
  onSelecionarTrecho,
  pausas = [],
}: {
  tl: Timeline;
  palavras: Palavra[];
  trechos: Trecho[];
  frame: number;
  onSeek: (segundosSaida: number) => void;
  efeitoSelecionado?: string | null;
  onSelecionarEfeito?: (id: string) => void;
  trechoSelecionado?: number | null;
  onSelecionarTrecho?: (i: number | null) => void;
  pausas?: { de: number; ate: number; duracao: number }[];
}) {
  const fps = 30;
  const total = Math.max(1, duracaoSaida(trechos));
  const pxs = Math.max(28, Math.min(80, 1100 / total)); // px por segundo
  const largura = total * pxs;
  const blocos = useMemo(() => montarBlocos(palavras, tl, trechos, fps), [palavras, tl, trechos]);
  const pos = (s: number) => `${(s / total) * 100}%`;

  const clique = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(total, ((e.clientX - r.left) / r.width) * total)));
  };

  const linha = (rotulo: string, filhos: React.ReactNode, alt = "h-7") => (
    <div className="flex items-stretch">
      <div className="w-20 shrink-0 text-[11px] text-muted-foreground flex items-center pr-2 sticky left-0 bg-card z-10">
        {rotulo}
      </div>
      <div className={cn("relative flex-1", alt)}>{filhos}</div>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ width: largura + 80, minWidth: "100%" }} className="space-y-1 py-2 select-none">
        {linha(
          "",
          <div className="absolute inset-0 cursor-pointer" onClick={clique}>
            {Array.from({ length: Math.ceil(total) + 1 }).map((_, s) => (
              <div
                key={s}
                className="absolute top-0 h-full border-l border-border/60 text-[10px] text-muted-foreground pl-0.5"
                style={{ left: pos(s) }}
              >
                {s % 5 === 0 ? `${s}s` : ""}
              </div>
            ))}
          </div>,
          "h-4",
        )}
        <div className="relative">
          {linha(
            "Vídeo",
            trechos
              .map((t, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onSeek(t.saidaDe + 0.01);
                    onSelecionarTrecho?.(trechoSelecionado === i ? null : i);
                  }}
                  className={cn(
                    "absolute top-0.5 bottom-0.5 rounded-sm cursor-pointer",
                    i % 2 ? "bg-zinc-600" : "bg-zinc-500",
                    trechoSelecionado === i && "ring-2 ring-primary bg-primary/60 z-[1]",
                  )}
                  style={{ left: pos(t.saidaDe), width: pos(t.ate - t.de) }}
                  title={`Trecho ${i + 1}: ${t.de.toFixed(1)}–${t.ate.toFixed(1)}s do original · clique para ajustar ou excluir`}
                />
              ))
              .concat(
                pausas.map((p, k) => {
                  const a = paraSaida(trechos, p.de);
                  return (
                    <div
                      key={`p${k}`}
                      className="absolute top-0 bottom-0 bg-amber-400/70 pointer-events-none z-[2]"
                      style={{ left: pos(a), width: pos(Math.max(0.08, p.ate - p.de)) }}
                      title={`Pausa de ${p.duracao.toFixed(1)}s`}
                    />
                  );
                }),
              ),
          )}
          {linha(
            "Legenda",
            tl.legenda.ativa ? (
              blocos.map((b, i) => (
                <div
                  key={i}
                  onClick={() => onSeek(b.ini / fps)}
                  className="absolute top-1 bottom-1 rounded-sm bg-primary/25 border border-primary/40 overflow-hidden text-[9px] px-0.5 leading-5 whitespace-nowrap cursor-pointer"
                  style={{ left: pos(b.ini / fps), width: pos((b.fim - b.ini) / fps) }}
                >
                  {b.palavras.map((w) => w.texto).join(" ")}
                </div>
              ))
            ) : (
              <div className="text-[11px] text-muted-foreground leading-7">desligada</div>
            ),
          )}
          {linha(
            "Efeitos",
            tl.efeitos.map((e) => {
              const def = EFEITO_POR_TIPO[e.tipo];
              const a = paraSaida(trechos, e.de);
              const b = paraSaida(trechos, e.ate > e.de ? e.ate : e.de + (def?.duracaoPadrao ?? 2));
              return (
                <div
                  key={e.id}
                  onClick={() => {
                    onSeek(a + 0.05);
                    onSelecionarEfeito?.(e.id);
                  }}
                  className={cn(
                    "absolute top-0.5 bottom-0.5 rounded-md text-[10px] px-1 leading-6 text-white truncate cursor-pointer",
                    def ? COR[def.categoria] : "bg-red-500/70",
                    efeitoSelecionado === e.id && "ring-2 ring-foreground",
                  )}
                  style={{ left: pos(a), width: pos(Math.max(0.3, b - a)) }}
                  title={def?.nome ?? e.tipo}
                >
                  {def?.nome ?? `${e.tipo} (desconhecido)`}
                </div>
              );
            }),
            "h-7",
          )}
          {linha(
            "Zoom",
            tl.zoom.eventos.map((z, i) => {
              const a = paraSaida(trechos, z.de),
                b = paraSaida(trechos, z.ate);
              return (
                <div
                  key={i}
                  className="absolute top-1.5 bottom-1.5 rounded-sm bg-orange-400/70"
                  style={{ left: pos(a), width: pos(Math.max(0.15, b - a)) }}
                  title={`zoom ${z.escala}x`}
                />
              );
            }),
            "h-5",
          )}
          {linha(
            "Sons",
            tl.sfx.map((s, i) => (
              <div
                key={i}
                className="absolute top-1 h-3 w-3 -ml-1.5 rotate-45 bg-cyan-400"
                style={{ left: pos(paraSaida(trechos, s.em)) }}
                title={s.som}
              />
            )),
            "h-5",
          )}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
            style={{ left: `calc(80px + (100% - 80px) * ${frame / fps / total})` }}
          />
        </div>
      </div>
    </div>
  );
}
