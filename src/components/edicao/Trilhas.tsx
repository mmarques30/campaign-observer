import { useMemo, useRef, useState } from "react";
import { EFEITO_POR_TIPO, type Categoria } from "@/video/catalogo";
import { montarBlocos } from "@/video/legenda";
import type { Palavra, Timeline } from "@/video/schema";
import { duracaoSaida, duracaoTrecho, paraSaida, type Trecho } from "@/video/tempo";
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
  onAjustarBorda,
  blocoSelecionado,
  onSelecionarBloco,
  musica,
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
  // Arrastar a borda de um trecho (delta em segundos; + = mais para a direita).
  onAjustarBorda?: (i: number, borda: "de" | "ate", delta: number) => void;
  blocoSelecionado?: number[] | null; // índices das palavras do bloco de legenda selecionado
  onSelecionarBloco?: (idxs: number[] | null) => void;
  // Música de fundo: nome e duração do arquivo (para marcar onde ela recomeça).
  musica?: { nome: string; duracao: number | null; inicio: number } | null;
}) {
  const fps = 30;
  const total = Math.max(1, duracaoSaida(trechos));
  const pxs = Math.max(28, Math.min(80, 1100 / total)); // px por segundo
  const largura = total * pxs;
  const blocos = useMemo(() => montarBlocos(palavras, tl, trechos, fps), [palavras, tl, trechos]);
  const pos = (s: number) => `${(s / total) * 100}%`;
  const trilha = useRef<HTMLDivElement>(null);
  const [arraste, setArraste] = useState<{
    i: number;
    borda: "de" | "ate";
    x0: number;
    dx: number;
  } | null>(null);

  // Arrasta a borda do trecho selecionado; aplica ao soltar.
  function pegarBorda(e: React.PointerEvent, i: number, borda: "de" | "ate") {
    e.stopPropagation();
    e.preventDefault();
    const x0 = e.clientX;
    const largura = trilha.current?.getBoundingClientRect().width ?? 1;
    setArraste({ i, borda, x0, dx: 0 });
    const mover = (ev: PointerEvent) => setArraste((a) => (a ? { ...a, dx: ev.clientX - x0 } : a));
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      // Arraste em segundos do vídeo final → segundos do original (trecho acelerado anda mais).
      const delta = ((ev.clientX - x0) / largura) * total * (trechos[i]?.vel ?? 1);
      setArraste(null);
      if (Math.abs(delta) >= 0.03) onAjustarBorda?.(i, borda, +delta.toFixed(2));
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

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
        <div className="relative" ref={trilha}>
          {linha(
            "Vídeo",
            trechos
              .map((t, i) => {
                const sel = trechoSelecionado === i;
                const pxPorSeg = (trilha.current?.getBoundingClientRect().width ?? 1) / total;
                const dS = arraste?.i === i ? arraste.dx / pxPorSeg : 0;
                const ini = t.saidaDe + (arraste?.i === i && arraste.borda === "de" ? dS : 0);
                const dur =
                  duracaoTrecho(t) + (arraste?.i === i ? (arraste.borda === "de" ? -dS : dS) : 0);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      onSeek(t.saidaDe + 0.01);
                      onSelecionarTrecho?.(sel ? null : i);
                    }}
                    className={cn(
                      "absolute top-0.5 bottom-0.5 rounded-sm cursor-pointer",
                      i % 2 ? "bg-zinc-600" : "bg-zinc-500",
                      sel && "ring-2 ring-primary bg-primary/60 z-[3]",
                    )}
                    style={{ left: pos(ini), width: pos(Math.max(0.1, dur)) }}
                    title={`Trecho ${i + 1}: ${t.de.toFixed(1)}–${t.ate.toFixed(1)}s do original${t.vel !== 1 ? ` · ${t.vel}x` : ""} · clique e arraste as bordas para encurtar`}
                  >
                    {t.vel !== 1 && (
                      <span className="absolute left-1 top-0 text-[10px] font-semibold text-white/90 leading-[1.6] pointer-events-none">
                        {String(t.vel).replace(".", ",")}x
                      </span>
                    )}
                    {sel && onAjustarBorda && (
                      <>
                        <span
                          onPointerDown={(e) => pegarBorda(e, i, "de")}
                          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize rounded-l bg-primary"
                          title="Arraste para cortar o começo"
                        />
                        <span
                          onPointerDown={(e) => pegarBorda(e, i, "ate")}
                          className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-ew-resize rounded-r bg-primary"
                          title="Arraste para cortar o final"
                        />
                      </>
                    )}
                  </div>
                );
              })
              .concat(
                pausas.map((p, k) => {
                  const a = paraSaida(trechos, p.de);
                  return (
                    <div
                      key={`p${k}`}
                      className="absolute top-0 bottom-0 bg-amber-400/70 pointer-events-none z-[2]"
                      style={{
                        left: pos(a),
                        width: pos(Math.max(0.08, paraSaida(trechos, p.ate) - a)),
                      }}
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
                  onClick={() => {
                    onSeek(b.ini / fps + 0.01);
                    const idxs = b.palavras.map((w) => w.idx);
                    onSelecionarBloco?.(blocoSelecionado?.[0] === idxs[0] ? null : idxs);
                  }}
                  title="Clique para editar ou apagar esta legenda"
                  className={cn(
                    "absolute top-1 bottom-1 rounded-sm bg-primary/25 border border-primary/40 overflow-hidden text-[9px] px-0.5 leading-5 whitespace-nowrap cursor-pointer",
                    blocoSelecionado?.[0] === b.palavras[0]?.idx &&
                      "ring-2 ring-primary bg-primary/50",
                  )}
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
            "Música",
            musica ? (
              <div
                className="absolute top-1 bottom-1 left-0 rounded-sm bg-violet-500/50 overflow-hidden"
                style={{ width: pos(total) }}
                title={`${musica.nome} — toca o vídeo todo${musica.duracao ? `, repetindo a cada ${Math.round(musica.duracao)}s` : ""}`}
              >
                <span className="absolute left-1 top-0 text-[10px] leading-4 text-white/90 truncate max-w-full pointer-events-none">
                  {musica.nome}
                  {musica.duracao ? ` · ${Math.round(musica.duracao)}s, repete` : ""}
                </span>
                {musica.duracao &&
                  (() => {
                    const bloco = Math.max(1, musica.duracao - musica.inicio);
                    const passo = Math.max(1, bloco - Math.min(1.5, bloco / 4));
                    return Array.from({ length: Math.floor(total / passo) }, (_, k) => (
                      <div
                        key={k}
                        className="absolute top-0 bottom-0 w-px bg-white/70"
                        style={{ left: pos((k + 1) * passo) }}
                        title="A música recomeça aqui (com transição suave)"
                      />
                    ));
                  })()}
              </div>
            ) : (
              <span className="absolute left-1 top-0 text-[10px] leading-4 text-muted-foreground">
                sem música
              </span>
            ),
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
