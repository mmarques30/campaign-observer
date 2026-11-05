// Mede a luz e a cor do vídeo gravado (amostra alguns quadros) para dosar a correção: o tom de
// pele, o brilho do rosto, o contraste e o quanto a imagem já está quente. A referência manda na
// forma da edição; a cor sai da medição do NOSSO vídeo, não da luz com que o outro gravou.
import type { Rosto } from "@/lib/rosto";

export type Luz = {
  pele: { r: number; g: number; b: number }; // média 0–255 dentro da caixa do rosto
  quente: number; // -1 (azulada) … 0 (neutra) … 1 (alaranjada), pelo tom de pele
  lumaRosto: number; // 0–1
  lumaMedia: number; // 0–1 do quadro inteiro
  contraste: number; // desvio padrão da luma, 0–1
  saturacao: number; // média de saturação HSV, 0–1
  quadros: number;
};

/** Diz o que fazer com a correção de imagem a partir da medição (valores sutis, de 1 = original). */
export function dosagemLuz(l: Luz | null | undefined) {
  if (!l) return { visual: {}, resumo: "(luz do vídeo ainda não medida)" };
  const v: Record<string, number> = {};
  const notas: string[] = [];
  // Pele: o compressor da Meta puxa vermelho e satura; quem grava com luz quente de casa fica
  // alaranjado depois de publicado. Alvo: pele neutra, levemente abaixo do que parece "certo".
  if (l.quente > 0.34) {
    v.temperatura = -Math.min(0.35, (l.quente - 0.26) * 1.6);
    v.saturacao = 0.94;
    notas.push("pele alaranjada (luz quente): esfriei um pouco e tirei saturação");
  } else if (l.quente > 0.28) {
    v.temperatura = -0.08;
    notas.push("pele levemente quente: esfriei de leve");
  } else if (l.quente < 0.12) {
    v.temperatura = 0.08;
    notas.push("pele fria/pálida: aqueci de leve");
  }
  if (l.lumaRosto < 0.36) {
    v.sombras = Math.min(0.5, (0.42 - l.lumaRosto) * 2.5);
    v.brilho = 1.04;
    notas.push("rosto escuro: levantei sombras");
  } else if (l.lumaRosto > 0.72) {
    v.brilho = 0.97;
    notas.push("rosto estourado: baixei um pouco o brilho");
  }
  if (l.contraste < 0.14) {
    v.contraste = 1.06;
    notas.push("imagem chapada: um pouco de contraste");
  } else if (l.contraste > 0.3) {
    v.contraste = 0.96;
    notas.push("muito contraste: suavizei");
  }
  if (l.saturacao > 0.5 && v.saturacao === undefined) {
    v.saturacao = 0.95;
    notas.push("cor já saturada: segurei a saturação");
  }
  const resumo = `pele ${l.quente > 0.34 ? "alaranjada" : l.quente > 0.28 ? "levemente quente" : l.quente < 0.12 ? "fria" : "neutra"} (índice ${l.quente.toFixed(2)}), rosto ${l.lumaRosto < 0.36 ? "escuro" : l.lumaRosto > 0.72 ? "muito claro" : "bem exposto"} (${Math.round(l.lumaRosto * 100)}%), quadro ${l.lumaMedia < 0.3 ? "escuro" : l.lumaMedia > 0.65 ? "claro" : "médio"} (${Math.round(l.lumaMedia * 100)}%), contraste ${l.contraste < 0.14 ? "baixo" : l.contraste > 0.3 ? "alto" : "normal"}, saturação ${Math.round(l.saturacao * 100)}%${notas.length ? ` → ${notas.join("; ")}` : " → sem correção necessária"}`;
  return { visual: v, resumo };
}

/** Que look da referência pode ser aplicado neste vídeo sem brigar com a luz dele. */
export function lookCompativel(look: string | undefined, l: Luz | null | undefined) {
  if (!look) return undefined;
  if (look === "quente" && (!l || l.quente > 0.22)) return "natural"; // já quente: não esquenta mais
  if (look === "vivo" && (!l || l.saturacao > 0.42)) return "natural"; // satura demais na Meta
  if (look === "pb") return "natural"; // identidade da marca é colorida
  return look;
}

export async function medirLuz(url: string, duracao: number, rosto: Rosto | null): Promise<Luz> {
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((ok, erro) => {
      v.onloadeddata = () => ok();
      v.onerror = () => erro(new Error("não abriu o vídeo"));
      setTimeout(() => erro(new Error("tempo esgotado")), 20000);
    });
    const k = Math.min(1, 240 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(v.videoWidth * k));
    c.height = Math.max(1, Math.round(v.videoHeight * k));
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const W = c.width,
      H = c.height;
    // Caixa da pele: o miolo do rosto (sem cabelo/fundo). Sem rosto, o centro do quadro.
    const r = rosto ?? { x: 0.3, y: 0.3, w: 0.4, h: 0.3 };
    const px0 = Math.round((r.x + r.w * 0.25) * W),
      px1 = Math.round((r.x + r.w * 0.75) * W),
      py0 = Math.round((r.y + r.h * 0.3) * H),
      py1 = Math.round((r.y + r.h * 0.75) * H);
    let sr = 0,
      sg = 0,
      sb = 0,
      np = 0,
      lr = 0;
    let sl = 0,
      sl2 = 0,
      ss = 0,
      n = 0;
    const N = 6;
    let quadros = 0;
    for (let i = 1; i <= N; i++) {
      const t = (Math.max(1, duracao || v.duration || 10) * i) / (N + 1);
      await new Promise<void>((ok) => {
        const to = setTimeout(ok, 4000);
        v.onseeked = () => {
          clearTimeout(to);
          ok();
        };
        v.currentTime = t;
      });
      ctx.drawImage(v, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      quadros++;
      for (let y = 0; y < H; y += 2)
        for (let x = 0; x < W; x += 2) {
          const o = (y * W + x) * 4;
          const R = d[o],
            G = d[o + 1],
            B = d[o + 2];
          const l = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
          const mx = Math.max(R, G, B),
            mn = Math.min(R, G, B);
          sl += l;
          sl2 += l * l;
          ss += mx ? (mx - mn) / mx : 0;
          n++;
          if (x >= px0 && x < px1 && y >= py0 && y < py1) {
            sr += R;
            sg += G;
            sb += B;
            lr += l;
            np++;
          }
        }
    }
    const pele = np ? { r: sr / np, g: sg / np, b: sb / np } : { r: 0, g: 0, b: 0 };
    const quente = pele.r + pele.b ? (pele.r - pele.b) / (pele.r + pele.b) : 0;
    const media = n ? sl / n : 0;
    const r3 = (x: number) => Math.round(x * 1000) / 1000;
    return {
      pele: { r: Math.round(pele.r), g: Math.round(pele.g), b: Math.round(pele.b) },
      quente: r3(quente),
      lumaRosto: r3(np ? lr / np : media),
      lumaMedia: r3(media),
      contraste: r3(n ? Math.sqrt(Math.max(0, sl2 / n - media * media)) : 0),
      saturacao: r3(n ? ss / n : 0),
      quadros,
    };
  } finally {
    v.removeAttribute("src");
    v.load();
  }
}
