import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  onMusica,
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
  musica?: {
    nome: string;
    duracao: number | null;
    inicio: number;
    fim: number | null;
    de: number;
    ate: number | null;
    repetir: boolean;
    url: string | null;
  } | null;
  onMusica?: (patch: Partial<Timeline["musica"]>, resumo: string) => void;
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

  // Música: arrastar as pontas (entra/sai no vídeo) ou o meio (mover); clique abre o painel.
  const linhaMusica = useRef<HTMLDivElement>(null);
  const [arrasteMus, setArrasteMus] = useState<{
    borda: "de" | "ate" | "mover";
    dx: number;
  } | null>(null);
  const [musicaSel, setMusicaSel] = useState(false);
  function pegarMusica(e: React.PointerEvent, borda: "de" | "ate" | "mover") {
    if (!musica) return;
    e.stopPropagation();
    e.preventDefault();
    const x0 = e.clientX;
    const larg = linhaMusica.current?.getBoundingClientRect().width ?? 1;
    const seg = (x: number) => ((x - x0) / larg) * total;
    setArrasteMus({ borda, dx: 0 });
    const mover = (ev: PointerEvent) =>
      setArrasteMus((a) => (a ? { ...a, dx: seg(ev.clientX) } : a));
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      setArrasteMus(null);
      const d = seg(ev.clientX);
      if (Math.abs(d) < 0.05) {
        setMusicaSel((v) => !v); // clique simples: abre/fecha o painel da música
        return;
      }
      const a0 = musica.de;
      const b0 = musica.ate ?? total;
      const fimOuNulo = (x: number) => (x >= total - 0.05 ? null : +x.toFixed(2));
      if (borda === "de")
        onMusica?.({ de: +Math.min(b0 - 1, Math.max(0, a0 + d)).toFixed(2) }, "Música: entrada");
      else if (borda === "ate")
        onMusica?.({ ate: fimOuNulo(Math.max(a0 + 1, Math.min(total, b0 + d))) }, "Música: saída");
      else {
        const m = Math.max(-a0, Math.min(total - b0, d));
        onMusica?.({ de: +(a0 + m).toFixed(2), ate: fimOuNulo(b0 + m) }, "Música: moveu");
      }
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

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
    <div>
      {musica && musicaSel && (
        <PainelMusica
          musica={musica}
          total={total}
          agora={frame / fps}
          onMusica={(p, r) => onMusica?.(p, r)}
          onFechar={() => setMusicaSel(false)}
        />
      )}
      <div className="overflow-x-auto">
        <div
          style={{ width: largura + 80, minWidth: "100%" }}
          className="space-y-1 py-2 select-none"
        >
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
                const b = paraSaida(
                  trechos,
                  e.ate > e.de ? e.ate : e.de + (def?.duracaoPadrao ?? 2),
                );
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
                (() => {
                  const durS = musica.duracao;
                  const ini = musica.inicio;
                  const bloco = durS ? Math.max(1, (musica.fim ?? durS) - ini) : null;
                  const dS = arrasteMus ? arrasteMus.dx : 0;
                  let a = musica.de;
                  let b = musica.ate ?? total;
                  if (arrasteMus?.borda === "de") a = Math.min(b - 1, Math.max(0, a + dS));
                  if (arrasteMus?.borda === "ate") b = Math.max(a + 1, Math.min(total, b + dS));
                  if (arrasteMus?.borda === "mover") {
                    const m = Math.max(-a, Math.min(total - b, dS));
                    a += m;
                    b += m;
                  }
                  const somAte = bloco && !musica.repetir ? Math.min(b, a + bloco) : b;
                  const passo = bloco ? Math.max(1, bloco - Math.min(1.5, bloco / 4)) : null;
                  return (
                    <div ref={linhaMusica} className="absolute inset-0">
                      <div
                        className={cn(
                          "absolute top-0.5 bottom-0.5 rounded-sm bg-violet-500/60 overflow-hidden cursor-grab",
                          musicaSel && "ring-2 ring-primary",
                        )}
                        style={{ left: pos(a), width: pos(Math.max(0.2, b - a)) }}
                        title={`${musica.nome}: arraste as pontas para encurtar, o meio para mover; clique para editar o trecho`}
                        onPointerDown={(e) => pegarMusica(e, "mover")}
                      >
                        {somAte < b && (
                          <div
                            className="absolute top-0 bottom-0 right-0 bg-black/40"
                            style={{ width: `${((b - somAte) / (b - a)) * 100}%` }}
                            title="Sem música aqui (o trecho acabou e não repete)"
                          />
                        )}
                        <span className="absolute left-2 top-0 text-[10px] leading-4 text-white/90 truncate max-w-full pointer-events-none">
                          {musica.nome}
                          {bloco ? ` · trecho de ${Math.round(bloco)}s` : ""}
                          {bloco && musica.repetir && bloco < b - a ? ", repete" : ""}
                        </span>
                        {passo &&
                          musica.repetir &&
                          Array.from(
                            { length: Math.max(0, Math.floor((b - a - 0.5) / passo)) },
                            (_, k) => (
                              <div
                                key={k}
                                className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none"
                                style={{ left: `${(((k + 1) * passo) / (b - a)) * 100}%` }}
                              />
                            ),
                          )}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 hover:bg-white/80"
                          onPointerDown={(e) => pegarMusica(e, "de")}
                          title="Arraste para mudar onde a música entra"
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 hover:bg-white/80"
                          onPointerDown={(e) => pegarMusica(e, "ate")}
                          title="Arraste para mudar onde a música sai"
                        />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <span className="absolute left-1 top-0 text-[10px] leading-4 text-muted-foreground">
                  sem música
                </span>
              ),
              "h-6",
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
    </div>
  );
}

const mmss = (x: number) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;

/** Editar a música: qual trecho da faixa usar, se repete, e onde entra/sai no vídeo. */
function PainelMusica({
  musica,
  total,
  agora,
  onMusica,
  onFechar,
}: {
  musica: NonNullable<Parameters<typeof Trilhas>[0]["musica"]>;
  total: number;
  agora: number;
  onMusica: (patch: Partial<Timeline["musica"]>, resumo: string) => void;
  onFechar: () => void;
}) {
  const dur = musica.duracao ?? 0;
  const [faixa, setFaixa] = useState<[number, number]>([
    musica.inicio,
    Math.min(dur || Infinity, musica.fim ?? dur),
  ]);
  const ouvindo = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  useEffect(() => {
    setFaixa([musica.inicio, Math.min(dur || Infinity, musica.fim ?? dur)]);
  }, [musica.inicio, musica.fim, dur]);
  useEffect(() => () => ouvindo.current?.pause(), []);
  function ouvir() {
    if (tocando || !musica.url) {
      ouvindo.current?.pause();
      setTocando(false);
      return;
    }
    const el = new Audio(musica.url);
    ouvindo.current = el;
    el.currentTime = faixa[0];
    el.ontimeupdate = () => {
      if (el.currentTime >= faixa[1]) {
        el.pause();
        setTocando(false);
      }
    };
    el.onended = () => setTocando(false);
    void el.play().then(() => setTocando(true));
  }
  const b = musica.ate ?? total;
  return (
    <div className="border-b py-2 px-1 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Música: {musica.nome}</span>
        <span className="text-muted-foreground">
          no vídeo de {mmss(musica.de)} a {mmss(b)}
        </span>
        <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={onFechar}>
          fechar
        </button>
      </div>
      {dur > 0 ? (
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-muted-foreground">
            Trecho usado {mmss(faixa[0])}–{mmss(faixa[1])}
          </span>
          <Slider
            min={0}
            max={dur}
            step={0.1}
            minStepsBetweenThumbs={10}
            value={faixa}
            onValueChange={(v) => setFaixa([v[0], v[1]] as [number, number])}
            onValueCommit={(v) =>
              onMusica(
                { inicio: +v[0].toFixed(1), fim: v[1] >= dur - 0.2 ? null : +v[1].toFixed(1) },
                `Música: trecho ${mmss(v[0])}–${mmss(v[1])}`,
              )
            }
            className="flex-1"
          />
          <Button size="sm" variant="outline" className="h-7" onClick={ouvir}>
            {tocando ? "Parar" : "Ouvir trecho"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">Carregando a duração da música…</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={musica.repetir ? "default" : "outline"}
          className="h-7"
          onClick={() =>
            onMusica(
              { repetir: !musica.repetir },
              musica.repetir ? "Música: toca o trecho uma vez" : "Música: repete o trecho",
            )
          }
        >
          {musica.repetir ? "Repetindo o trecho (emenda suave)" : "Toca uma vez só"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          disabled={agora >= b - 1}
          onClick={() => onMusica({ de: +agora.toFixed(2) }, `Música entra em ${mmss(agora)}`)}
        >
          Entrar no ponto atual
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          disabled={agora <= musica.de + 1}
          onClick={() => onMusica({ ate: +agora.toFixed(2) }, `Música sai em ${mmss(agora)}`)}
        >
          Sair no ponto atual
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() =>
            onMusica(
              { de: 0, ate: null, inicio: 0, fim: null, repetir: true },
              "Música: vídeo todo",
            )
          }
        >
          Voltar ao padrão
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Arraste as pontas da barra roxa para encurtar e o meio para mover. O trecho escolhido se
        repete com transição suave (as marcas brancas mostram onde emenda).
      </p>
    </div>
  );
}
