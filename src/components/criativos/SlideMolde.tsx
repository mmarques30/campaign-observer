// Layout "molde": desenha o slide exatamente na estrutura da referência. Cada elemento tem
// posição e tamanho em % do slide; as cores vêm do tema (marca) quando o molde usa o nome da
// cor ("destaque", "texto"…) em vez de hex.
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import {
  FORMATOS,
  type Design,
  type ElementoMolde,
  type Formato,
  type Slide,
} from "@/criativos/design";
import type { FotoComUrl } from "@/lib/criativos";

type Props = {
  slide: Slide;
  design: Design;
  formato: Formato;
  fotos: Map<string, FotoComUrl>;
};

const CAIXA = { alta: "uppercase", baixa: "lowercase", normal: "none" } as const;
const ALINHA = { esquerda: "left", centro: "center", direita: "right" } as const;

export const SlideMolde = forwardRef<HTMLDivElement, Props>(function SlideMolde(
  { slide, design, formato, fotos },
  ref,
) {
  const [W, H] = FORMATOS[formato];
  const t = design.tema;
  const m = slide.molde ?? { elementos: [] as ElementoMolde[] };
  const c = (v: string | null | undefined, padrao: string) => {
    if (!v) return padrao;
    return (t as Record<string, string>)[v] ?? v;
  };
  const px = (pct: number | null | undefined, base: number = W) => ((pct ?? 0) * base) / 100;
  const url = (id?: string | null) => (id ? fotos.get(id)?.url : undefined);

  const img = (id: string | null | undefined, foco?: string | null, zoom?: number | null) => {
    const u = url(id);
    if (!u)
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(45deg,#ffffff10 0 18px,#ffffff06 18px 36px)",
          }}
        />
      );
    return (
      <img
        src={u}
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: foco ?? "50% 30%",
          transform: zoom && zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: foco ?? "50% 30%",
          display: "block",
        }}
      />
    );
  };

  const rico = (txt: string, e: Extract<ElementoMolde, { tipo: "texto" }>): ReactNode =>
    txt.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <span
          key={i}
          style={{
            color: c(e.corDestaque, t.destaque),
            background: e.fundoDestaque ? c(e.fundoDestaque, t.destaque) : undefined,
            padding: e.fundoDestaque ? "0 0.12em" : undefined,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {p.slice(2, -2)}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    );

  const elemento = (e: ElementoMolde, i: number) => {
    switch (e.tipo) {
      case "gradiente": {
        const cor = c(e.cor, "#000000");
        const forca = Math.max(0, Math.min(1, e.forca ?? 0.6));
        const alcance = e.alcance ?? 45;
        const alfa = Math.round(forca * 255)
          .toString(16)
          .padStart(2, "0");
        const solido = /^#[0-9a-f]{6}$/i.test(cor) ? `${cor}${alfa}` : cor;
        const transp = /^#[0-9a-f]{6}$/i.test(cor) ? `${cor}00` : "transparent";
        if (e.lado === "tudo")
          return <div key={i} style={{ position: "absolute", inset: 0, background: solido }} />;
        const dir = { topo: "to bottom", base: "to top", esquerda: "to right", direita: "to left" }[
          e.lado
        ];
        const lado: CSSProperties =
          e.lado === "topo"
            ? { top: 0, left: 0, right: 0, height: `${alcance}%` }
            : e.lado === "base"
              ? { bottom: 0, left: 0, right: 0, height: `${alcance}%` }
              : e.lado === "esquerda"
                ? { left: 0, top: 0, bottom: 0, width: `${alcance}%` }
                : { right: 0, top: 0, bottom: 0, width: `${alcance}%` };
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              ...lado,
              background: `linear-gradient(${dir}, ${solido}, ${transp})`,
            }}
          />
        );
      }
      case "forma":
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: `${e.w}%`,
              height: `${e.h}%`,
              background: e.cor ? c(e.cor, t.destaque) : undefined,
              borderRadius: px(e.raio),
              opacity: e.opacidade ?? 1,
              border: e.borda ? `${e.borda.esp}px solid ${c(e.borda.cor, t.texto)}` : undefined,
              transform: e.rot ? `rotate(${e.rot}deg)` : undefined,
            }}
          />
        );
      case "linha": {
        const x1 = px(e.x1),
          y1 = px(e.y1, H),
          x2 = px(e.x2),
          y2 = px(e.y2, H);
        return (
          <svg
            key={i}
            width={W}
            height={H}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={c(e.cor, t.texto)}
              strokeWidth={e.esp ?? 4}
              strokeDasharray={e.tracejada ? "14 10" : undefined}
              strokeLinecap="round"
            />
          </svg>
        );
      }
      case "foto":
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: `${e.w}%`,
              height: `${e.h}%`,
              overflow: "hidden",
              borderRadius: px(e.raio),
              border: e.borda ? `${e.borda.esp}px solid ${c(e.borda.cor, t.texto)}` : undefined,
              boxShadow: e.sombra ? "0 24px 60px rgba(0,0,0,0.45)" : undefined,
              transform: e.rot ? `rotate(${e.rot}deg)` : undefined,
            }}
          >
            {img(e.foto, e.foco, e.zoom)}
          </div>
        );
      case "texto": {
        const ancora = e.ancora ?? "topo";
        const caixaFundo = e.fundo ? c(e.fundo, t.destaque) : undefined;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: `${e.w}%`,
              transform:
                [
                  ancora === "centro"
                    ? "translateY(-50%)"
                    : ancora === "base"
                      ? "translateY(-100%)"
                      : "",
                  e.rot ? `rotate(${e.rot}deg)` : "",
                ]
                  .join(" ")
                  .trim() || undefined,
              display: "flex",
              justifyContent:
                e.alinhar === "centro"
                  ? "center"
                  : e.alinhar === "direita"
                    ? "flex-end"
                    : "flex-start",
              opacity: e.opacidade ?? 1,
            }}
          >
            <div
              style={{
                fontFamily: `"${e.fonte ?? t.fonteTitulo}", sans-serif`,
                fontWeight: e.peso ?? 700,
                fontStyle: e.italico ? "italic" : "normal",
                fontSize: px(e.tamanho),
                lineHeight: e.entrelinha ?? 1.1,
                letterSpacing: e.espacamento != null ? `${e.espacamento}em` : undefined,
                textTransform: CAIXA[e.caixa ?? "normal"],
                textAlign: ALINHA[e.alinhar ?? "esquerda"],
                color: c(e.cor, t.texto),
                whiteSpace: "pre-line",
                background: caixaFundo,
                borderRadius: px(e.raio),
                padding: caixaFundo ? px(e.pad ?? 1.6) : undefined,
                textShadow: e.sombra ? "0 2px 18px rgba(0,0,0,0.45)" : undefined,
                width: caixaFundo ? "auto" : "100%",
              }}
            >
              {rico(e.texto, e)}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: c(m.fundo, t.fundo),
      }}
    >
      {m.foto && img(m.foto, m.foco ?? slide.foco, m.zoom)}
      {m.elementos.map(elemento)}
    </div>
  );
});
