// Desenha um slide em tamanho real (1080px de largura). Quem mostra em tela menor usa <SlideEscalado>.
// Os layouts seguem as referências salvas: capa com foto e título forte, post estilo tweet,
// "/comando" com antes e depois, tópico com imagem, frase de impacto, lista e chamada final.
import { forwardRef, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bookmark, Send, UserPlus } from "lucide-react";
import { FORMATOS, type Design, type Formato, type Slide } from "@/criativos/design";
import type { FotoComUrl } from "@/lib/criativos";
import { BotaoSlide, VisualSlide } from "./Visuais";

type Props = {
  slide: Slide;
  design: Design;
  formato: Formato;
  fotos: Map<string, FotoComUrl>;
  indice: number;
  total: number;
};

const f = (nome: string, fb = "sans-serif") => `"${nome}", ${fb}`;

/** **palavra** vira destaque; linha em branco separa parágrafos. */
function Rico({ t, cor, peso }: { t: string; cor: string; peso?: number }) {
  return (
    <>
      {t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <span key={i} style={{ color: cor, fontWeight: peso }}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Paragrafos({ t, cor, style }: { t: string; cor: string; style: CSSProperties }) {
  return (
    <>
      {t
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} style={{ margin: 0, whiteSpace: "pre-line", ...style }}>
            <Rico t={p.trim()} cor={cor} peso={700} />
          </p>
        ))}
    </>
  );
}

/** Tamanho de fonte que encolhe com o texto. */
const ajusta = (t: string | null | undefined, base: number, min: number, ref: number) => {
  const n = (t ?? "").replace(/\*\*/g, "").length || 1;
  return Math.round(Math.max(min, Math.min(base, base * Math.sqrt(ref / n))));
};

function Verificado({ s = 34 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#1D9BF0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path fill="#fff" d="M9.99 16.6l-3.6-3.6 1.4-1.4 2.2 2.2 5.4-5.4 1.4 1.4z" />
    </svg>
  );
}

function Avatar({ url, s, borda }: { url?: string; s: number; borda?: string }) {
  return url ? (
    <img
      src={url}
      crossOrigin="anonymous"
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        border: borda ? `3px solid ${borda}` : undefined,
      }}
    />
  ) : (
    <div style={{ width: s, height: s, borderRadius: "50%", background: "#8884", flexShrink: 0 }} />
  );
}

function Foto({ url, foco, style }: { url?: string; foco?: string | null; style?: CSSProperties }) {
  if (!url)
    return (
      <div
        style={{
          background: "repeating-linear-gradient(45deg,#ffffff10 0 18px,#ffffff06 18px 36px)",
          border: "3px dashed #ffffff30",
          ...style,
        }}
      />
    );
  return (
    <img
      src={url}
      crossOrigin="anonymous"
      style={{ objectFit: "cover", objectPosition: foco ?? "50% 30%", display: "block", ...style }}
    />
  );
}

export const SlideView = forwardRef<HTMLDivElement, Props>(function SlideView(
  { slide: s, design, formato, fotos, indice, total },
  ref,
) {
  const [W, H] = FORMATOS[formato];
  const t = design.tema;
  const autor = design.autor;
  const avatar = autor.foto ? fotos.get(autor.foto)?.url : undefined;
  const comMarca = design.assinatura === "marca";
  const marcaImg = (largura: number, claro = false) => (
    <img
      src={claro ? "/brand/iaplicada-logo-light.png" : "/brand/iaplicada-logo-dark.png"}
      alt="IAplicada"
      style={{ width: largura, height: "auto", display: "block" }}
    />
  );
  const foto = (i: number) => (s.fotos?.[i] ? fotos.get(s.fotos[i])?.url : undefined);
  const ultimo = indice === total - 1;
  // Ajustes finos do slide (capa e foto): escala do texto e altura do bloco de texto.
  const esc = s.escalaTexto ?? 1;
  const subir = s.alturaTexto === "alto" ? 0.2 : s.alturaTexto === "meio" ? 0.08 : 0;
  const fundo = s.fundo ?? (s.layout === "tweet" ? "claro" : "escuro");
  const cores =
    fundo === "claro"
      ? { bg: t.claro, tx: t.textoClaro, sub: `${t.textoClaro}99`, hi: t.marca }
      : fundo === "marca"
        ? { bg: t.marca, tx: "#FFFFFF", sub: "#FFFFFFB3", hi: t.destaque }
        : fundo === "destaque"
          ? { bg: t.destaque, tx: t.fundo, sub: `${t.fundo}AA`, hi: t.marca }
          : { bg: t.fundo, tx: t.texto, sub: `${t.texto}A6`, hi: t.destaque };
  const fundoEscuroGrad =
    fundo === "escuro"
      ? `radial-gradient(120% 80% at 80% 0%, ${t.marca}40 0%, transparent 55%), linear-gradient(180deg, ${t.fundo} 0%, #000 100%)`
      : cores.bg;

  const raiz: CSSProperties = {
    width: W,
    height: H,
    position: "relative",
    overflow: "hidden",
    background: fundoEscuroGrad,
    color: cores.tx,
    fontFamily: f(t.fonteTexto),
    boxSizing: "border-box",
  };

  const rodape =
    design.mostrarNumeracao && total > 1 && indice > 0 ? (
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 52,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 28,
          fontWeight: 600,
          color: cores.sub,
          letterSpacing: 0.5,
        }}
      >
        <span>{s.botao || comMarca ? "" : `@${autor.arroba}`}</span>
        <span>
          {indice + 1}/{total}
          {!ultimo ? "  →" : ""}
        </span>
      </div>
    ) : null;

  const pilulaAutor = (claro = true) =>
    comMarca ? (
      marcaImg(240)
    ) : (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 22px 10px 10px",
          borderRadius: 999,
          background: claro ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.08)",
          border: "1px solid rgba(255,255,255,.18)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Avatar url={avatar} s={56} />
        <span style={{ fontSize: 28, fontWeight: 600, color: "#fff" }}>{autor.nome}</span>
        {autor.verificado && <Verificado s={28} />}
      </div>
    );

  let corpo: ReactNode = null;

  if (s.layout === "capa") {
    const elegante = s.variante === "elegante";
    const tam = esc * (elegante ? ajusta(s.titulo, 132, 76, 26) : ajusta(s.titulo, 150, 84, 30));
    corpo = (
      <>
        <Foto
          url={foto(0)}
          foco={s.foco}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(0deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.7) ${30 + subir * 100}%, rgba(0,0,0,.15) ${60 + subir * 60}%, rgba(0,0,0,0) ${Math.min(95, 75 + subir * 50)}%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: (total > 1 ? 120 : 80) + subir * H,
            display: "flex",
            flexDirection: "column",
            alignItems: elegante ? "center" : "flex-start",
            textAlign: elegante ? "center" : "left",
            gap: 28,
          }}
        >
          {!elegante && !s.semAutor && pilulaAutor()}
          {s.rotulo && (
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: t.destaque,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {s.rotulo}
            </div>
          )}
          <div
            style={{
              fontFamily: elegante ? f(t.fonteTexto) : f(t.fonteTitulo, "Impact, sans-serif"),
              fontWeight: elegante ? 800 : 400,
              fontSize: tam,
              lineHeight: elegante ? 1.02 : 0.98,
              letterSpacing: elegante ? -3 : 0,
              textTransform: elegante ? "none" : "uppercase",
              color: "#fff",
              textShadow: "0 6px 40px rgba(0,0,0,.5)",
            }}
          >
            <Rico t={s.titulo ?? ""} cor={t.destaque} />
          </div>
          {s.subtitulo && (
            <div style={{ fontSize: 38 * esc, lineHeight: 1.3, color: "#FFFFFFD9", maxWidth: 900 }}>
              <Rico t={s.subtitulo} cor={t.destaque} peso={700} />
            </div>
          )}
        </div>
        {total > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 52,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#FFFFFFCC",
            }}
          >
            DESLIZE PARA VER MAIS →
          </div>
        )}
      </>
    );
  } else if (s.layout === "tweet") {
    const img = foto(0);
    const tam = ajusta(s.texto, img ? 44 : 54, 34, img ? 220 : 300);
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 84px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {comMarca ? (
          marcaImg(300, fundo === "claro")
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Avatar url={avatar} s={104} />
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 40,
                  fontWeight: 800,
                }}
              >
                {autor.nome} {autor.verificado && <Verificado s={36} />}
              </div>
              <div style={{ fontSize: 34, color: cores.sub }}>@{autor.arroba}</div>
            </div>
          </div>
        )}
        {s.titulo && (
          <div style={{ fontSize: tam + 6, fontWeight: 800, lineHeight: 1.25 }}>
            <Rico t={s.titulo} cor={cores.hi} />
          </div>
        )}
        {s.texto && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Paragrafos t={s.texto} cor={cores.hi} style={{ fontSize: tam, lineHeight: 1.38 }} />
          </div>
        )}
        {img && (
          <Foto
            url={img}
            foco={s.foco}
            style={{
              width: "100%",
              height: Math.round(H * 0.38),
              borderRadius: 32,
              border: `1px solid ${cores.sub}40`,
            }}
          />
        )}
      </div>
    );
  } else if (s.layout === "comando") {
    const duas = (s.fotos?.length ?? 0) >= 2;
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "96px 72px 130px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 48,
            transform: "scale(.8)",
            transformOrigin: "top right",
          }}
        >
          {pilulaAutor(false)}
        </div>
        <div
          style={{
            fontFamily: f(t.fonteTexto),
            fontWeight: 900,
            fontSize: ajusta(s.titulo ?? s.rotulo, 128, 72, 12),
            letterSpacing: -3,
            lineHeight: 1,
            marginTop: 40,
          }}
        >
          <Rico t={s.titulo ?? s.rotulo ?? ""} cor={cores.hi} />
        </div>
        {s.texto && (
          <div style={{ fontSize: 40, lineHeight: 1.32, color: cores.sub, maxWidth: 920 }}>
            <Rico t={s.texto} cor={cores.tx} peso={700} />
          </div>
        )}
        <div style={{ flex: 1, display: "flex", gap: 20, marginTop: 14, minHeight: 0 }}>
          {(duas ? [0, 1] : [0]).map((i) => (
            <div key={i} style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Foto
                url={foto(i)}
                foco={s.foco}
                style={{ width: "100%", height: "100%", borderRadius: 28 }}
              />
              {duas && (
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    left: 18,
                    padding: "8px 18px",
                    borderRadius: 999,
                    background: i ? t.destaque : "rgba(0,0,0,.6)",
                    color: i ? t.fundo : "#fff",
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: 2,
                  }}
                >
                  {i ? "DEPOIS" : "ANTES"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (s.layout === "topico") {
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "88px 72px 130px",
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        {s.rotulo && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "10px 22px",
              borderRadius: 12,
              background: cores.hi,
              color: fundo === "escuro" ? t.fundo : "#fff",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            {s.rotulo}
          </div>
        )}
        <div
          style={{
            fontFamily: f(t.fonteTitulo, "Impact, sans-serif"),
            fontSize: ajusta(s.titulo, 112, 64, 18),
            lineHeight: 0.98,
            textTransform: "uppercase",
          }}
        >
          <Rico t={s.titulo ?? ""} cor={cores.hi} />
        </div>
        {(s.fotos?.length ?? 0) > 0 && (
          <Foto
            url={foto(0)}
            foco={s.foco}
            style={{ width: "100%", flex: 1, minHeight: 0, borderRadius: 28 }}
          />
        )}
        {s.texto && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Paragrafos
              t={s.texto}
              cor={cores.hi}
              style={{ fontSize: ajusta(s.texto, 42, 32, 180), lineHeight: 1.35 }}
            />
          </div>
        )}
        {s.botao && (
          <BotaoSlide texto={s.botao} c={cores} tamanho={s.botaoTamanho} estilo={s.botaoEstilo} />
        )}
      </div>
    );
  } else if (s.layout === "lista") {
    const itens = s.itens ?? [];
    const tam = itens.length > 5 ? 36 : 42;
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "100px 76px 130px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 44,
        }}
      >
        {s.rotulo && (
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: cores.hi,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {s.rotulo}
          </div>
        )}
        <div
          style={{
            fontSize: ajusta(s.titulo, s.visual ? 72 : 84, 50, 30),
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          <Rico t={s.titulo ?? ""} cor={cores.hi} />
        </div>
        {s.visual && s.texto && (
          <div
            style={{ fontSize: ajusta(s.texto, 38, 30, 120), lineHeight: 1.35, color: cores.sub }}
          >
            <Rico t={s.texto} cor={cores.hi} peso={800} />
          </div>
        )}
        {s.visual && <VisualSlide v={s.visual} c={cores} />}
        {s.botao && (
          <BotaoSlide texto={s.botao} c={cores} tamanho={s.botaoTamanho} estilo={s.botaoEstilo} />
        )}
        <div style={{ display: s.visual ? "none" : "flex", flexDirection: "column", gap: 26 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
              <div
                style={{
                  fontFamily: f(t.fonteTitulo, "Impact, sans-serif"),
                  fontSize: tam * 1.5,
                  lineHeight: 1,
                  color: cores.hi,
                  minWidth: tam * 1.6,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: tam, lineHeight: 1.32, paddingTop: 4 }}>
                <Rico t={it} cor={cores.hi} peso={800} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (s.layout === "foto") {
    // Foto inteira com o texto apoiado numa sombra que cresce conforme a quantidade de texto:
    // a foto nunca disputa com a leitura. Rótulo em pílula, título grande, texto curto e botão.
    const palavras = `${s.titulo ?? ""} ${s.texto ?? ""}`.trim().split(/\s+/).length;
    const sombra = Math.min(92, (palavras > 28 ? 62 : palavras > 16 ? 55 : 48) + subir * 100);
    corpo = (
      <>
        <Foto
          url={foto(0)}
          foco={s.foco}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(0deg, rgba(0,0,0,.94) 0%, rgba(0,0,0,.86) ${sombra - 18}%, rgba(0,0,0,.45) ${sombra}%, rgba(0,0,0,0) ${sombra + 14}%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: (s.botao ? 110 : 130) + subir * H,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {s.rotulo && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "12px 26px",
                borderRadius: 999,
                background: t.destaque,
                color: "#0B0B0F",
                // Etiquetas longas ("PRA QUEM ...") diminuem para caber numa linha.
                fontSize: ajusta(s.rotulo, 30, 22, 30),
                fontWeight: 900,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                boxShadow: `0 8px 28px ${t.destaque}55`,
              }}
            >
              {s.rotulo}
            </div>
          )}
          {s.titulo && (
            <div
              style={{
                fontFamily: f(t.fonteTitulo, "Inter, sans-serif"),
                fontSize: esc * ajusta(s.titulo, 96, 64, 30),
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: -2,
                color: "#fff",
              }}
            >
              <Rico t={s.titulo} cor={t.destaque} />
            </div>
          )}
          {s.texto && (
            <div
              style={{
                fontSize: esc * ajusta(s.texto, 44, 36, 120),
                lineHeight: 1.3,
                color: "#FFFFFFE6",
              }}
            >
              <Rico t={s.texto} cor={t.destaque} peso={700} />
            </div>
          )}
          {s.botao && (
            <div style={{ marginTop: 10, display: "flex" }}>
              <BotaoSlide
                tamanho={s.botaoTamanho}
                estilo={s.botaoEstilo}
                texto={s.botao}
                c={{ bg: "#0B0B0F", tx: "#fff", sub: "#FFFFFFB3", hi: t.destaque }}
              />
            </div>
          )}
        </div>
      </>
    );
  } else if (s.layout === "cta") {
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 90px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 40,
        }}
      >
        {comMarca ? (
          marcaImg(380, fundo === "claro")
        ) : (
          <>
            <Avatar url={avatar} s={s.botao ? 180 : 220} borda={cores.hi} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 40,
                fontWeight: 800,
              }}
            >
              {autor.nome} {autor.verificado && <Verificado s={38} />}
            </div>
          </>
        )}
        {s.rotulo && (
          // Etiqueta de qualificação ("PRA QUEM ..."): pílula na cor de destaque, acima do título.
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 999,
              background: t.destaque,
              color: "#0B0B0F",
              fontSize: ajusta(s.rotulo, 28, 22, 34),
              fontWeight: 900,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: -8,
            }}
          >
            {s.rotulo}
          </div>
        )}
        <div
          style={{
            fontSize: ajusta(s.titulo, 88, 56, 30),
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          <Rico t={s.titulo ?? "Gostou? Me segue para mais."} cor={cores.hi} />
        </div>
        {s.texto && (
          <div style={{ fontSize: 40, lineHeight: 1.35, color: cores.sub, maxWidth: 860 }}>
            <Rico t={s.texto} cor={cores.tx} peso={800} />
          </div>
        )}
        {s.botao ? (
          // Com botão, ele entra no fluxo do slide (nunca por cima do texto) e substitui
          // as pílulas Salve/Envie/Siga.
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <BotaoSlide texto={s.botao} c={cores} tamanho={s.botaoTamanho} estilo={s.botaoEstilo} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 22, marginTop: 10 }}>
            {(
              [
                [Bookmark, "Salve"],
                [Send, "Envie"],
                [UserPlus, "Siga"],
              ] as const
            ).map(([I, l]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 28px",
                  borderRadius: 999,
                  border: `2px solid ${cores.tx}33`,
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                <I size={30} strokeWidth={2.4} color={cores.hi} /> {l}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // texto: frase de impacto
    corpo = (
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: s.visual ? "70px 80px 110px" : "0 84px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: s.visual ? 34 : 36,
        }}
      >
        {s.rotulo && (
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: cores.hi,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {s.rotulo}
          </div>
        )}
        {s.titulo && (
          <div
            style={{
              fontSize: ajusta(s.titulo, s.visual ? 76 : 104, s.visual ? 52 : 60, 40),
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: -3,
            }}
          >
            <Rico t={s.titulo} cor={cores.hi} />
          </div>
        )}
        {s.visual && (
          <div style={{ marginTop: 34, marginBottom: 10 }}>
            <VisualSlide v={s.visual} c={cores} />
          </div>
        )}
        {s.texto && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Paragrafos
              t={s.texto}
              cor={cores.hi}
              style={{
                fontSize: s.visual ? ajusta(s.texto, 36, 28, 160) : ajusta(s.texto, 46, 34, 200),
                lineHeight: 1.38,
                color: s.titulo ? cores.sub : cores.tx,
              }}
            />
          </div>
        )}
        {s.botao && (
          <BotaoSlide texto={s.botao} c={cores} tamanho={s.botaoTamanho} estilo={s.botaoEstilo} />
        )}
      </div>
    );
  }

  // Logo da IAplicada no canto de cima (versão de texto branco em fundo escuro/foto).
  const lg = design.logo;
  // Com assinatura "marca", cta/tweet/comando (e capa impacto com pílula) já mostram a logo no corpo.
  const marcaNoCorpo =
    comMarca &&
    (["cta", "tweet", "comando"].includes(s.layout) ||
      (s.layout === "capa" && s.variante !== "elegante" && !s.semAutor));
  const comLogo =
    !marcaNoCorpo &&
    !!lg &&
    (lg.onde === "todos" ||
      (indice === 0 && (lg.onde === "primeiro" || lg.onde === "primeiro-e-ultimo")) ||
      (ultimo && (lg.onde === "ultimo" || lg.onde === "primeiro-e-ultimo")));
  const logoClaro = fundo === "claro" && !["foto", "capa"].includes(s.layout);
  const logo = comLogo ? (
    <img
      src={logoClaro ? "/brand/iaplicada-logo-light.png" : "/brand/iaplicada-logo-dark.png"}
      alt="IAplicada"
      style={{
        position: "absolute",
        top: 64,
        [lg!.lado === "direita" ? "right" : "left"]: 72,
        width: 260,
        height: "auto",
        zIndex: 5,
        filter: logoClaro ? undefined : "drop-shadow(0 2px 10px rgba(0,0,0,.45))",
      }}
    />
  ) : null;

  // Layouts que não posicionam o botão no próprio corpo: ele entra embaixo, acima do rodapé.
  const botaoSolto =
    s.botao && ["capa", "tweet", "comando"].includes(s.layout) ? (
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 120, display: "flex" }}>
        <BotaoSlide texto={s.botao} c={cores} tamanho={s.botaoTamanho} estilo={s.botaoEstilo} />
      </div>
    ) : null;

  return (
    <div ref={ref} style={raiz}>
      {corpo}
      {botaoSolto}
      {logo}
      {s.layout !== "capa" && rodape}
    </div>
  );
});

/** Slide reduzido para caber numa largura (fixa ou a do contêiner). */
export function SlideEscalado({ largura, ...p }: Props & { largura?: number }) {
  const [W, H] = FORMATOS[p.formato];
  const caixa = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState(largura ?? 0);
  useEffect(() => {
    if (largura || !caixa.current) return;
    const ro = new ResizeObserver(([e]) => setMedida(e.contentRect.width));
    ro.observe(caixa.current);
    return () => ro.disconnect();
  }, [largura]);
  const lw = largura ?? medida;
  const k = lw / W;
  return (
    <div
      ref={caixa}
      style={{
        width: largura ?? "100%",
        aspectRatio: `${W} / ${H}`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {lw > 0 && (
        <div style={{ transform: `scale(${k})`, transformOrigin: "top left", width: W, height: H }}>
          <SlideView {...p} />
        </div>
      )}
    </div>
  );
}
