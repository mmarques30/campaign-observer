// Detecção de tomadas repetidas (retakes) na transcrição.
// Quem grava sozinho repete a mesma frase até sair boa; a regra é ficar com a ÚLTIMA.
// Sem IA: roda no navegador e na função edge (cópia em supabase/functions/vedit-agente/repeticoes.ts).

export type PalavraT = { p: string; i: number; f: number };

export type Frase = {
  idx: number; // índice da frase
  de: number; // início (s, original)
  ate: number; // fim (s, original)
  texto: string;
  tokens: string[];
  primeira: number; // índice da primeira palavra
  ultima: number; // índice da última palavra
};

export type Repeticao = {
  descartada: Frase; // tomada que sai
  mantida: Frase; // tomada que fica (a última)
  similaridade: number; // 0–1
  motivo: "igual" | "abortada" | "parecida";
};

const STOP = new Set(["o", "a", "os", "as", "um", "uma", "de", "do", "da", "e", "que", "é", "em"]);

export function normalizar(p: string) {
  return p
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Quebra as palavras em frases: pausa ≥ `pausa` s ou pontuação final. */
export function frasear(palavras: PalavraT[], pausa = 0.5): Frase[] {
  const out: Frase[] = [];
  let atual: PalavraT[] = [];
  let primeira = 0;
  const fechar = (ultima: number) => {
    if (!atual.length) return;
    const tokens = atual.map((w) => normalizar(w.p)).filter(Boolean);
    out.push({
      idx: out.length,
      de: atual[0].i,
      ate: atual[atual.length - 1].f,
      texto: atual.map((w) => w.p).join(" "),
      tokens,
      primeira,
      ultima,
    });
    atual = [];
  };
  palavras.forEach((w, k) => {
    if (!atual.length) primeira = k;
    atual.push(w);
    const prox = palavras[k + 1];
    const pontua = /[.!?…]$/.test(w.p.trim());
    const gap = prox ? prox.i - w.f : Infinity;
    // Pontuação só fecha se vier com um mínimo de pausa; pausa longa fecha sempre.
    if (gap >= pausa || (pontua && gap >= 0.2) || !prox) fechar(k);
  });
  return out;
}

/** Similaridade entre tomadas: Jaccard em tokens (sem stopwords) + bônus se A é prefixo de B. */
function comparar(a: Frase, b: Frase): { s: number; motivo: Repeticao["motivo"] } {
  const ta = a.tokens.filter((t) => !STOP.has(t));
  const tb = b.tokens.filter((t) => !STOP.has(t));
  if (!ta.length || !tb.length) return { s: 0, motivo: "parecida" };
  const sa = new Set(ta),
    sb = new Set(tb);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const jaccard = inter / (sa.size + sb.size - inter);
  // Tomada abortada: "hoje eu vou te mostrar— hoje eu vou te mostrar como…"
  // A (curta) aparece quase inteira, em ordem, no começo de B.
  let seq = 0;
  for (let k = 0; k < Math.min(a.tokens.length, b.tokens.length); k++) {
    if (a.tokens[k] === b.tokens[k]) seq++;
    else break;
  }
  const prefixo = a.tokens.length >= 3 ? seq / a.tokens.length : 0;
  if (jaccard >= 0.85) return { s: jaccard, motivo: "igual" };
  if (prefixo >= 0.7 && a.tokens.length <= b.tokens.length)
    return { s: Math.max(jaccard, prefixo), motivo: "abortada" };
  return { s: jaccard, motivo: "parecida" };
}

/**
 * Encontra frases repetidas. Compara cada frase com as próximas `janela` frases;
 * quando parecem a mesma fala, a anterior é descartada (fica a última tomada).
 */
export function detectarRepeticoes(
  palavras: PalavraT[],
  opts?: { janela?: number; limiar?: number; pausa?: number },
): Repeticao[] {
  const janela = opts?.janela ?? 3;
  const limiar = opts?.limiar ?? 0.6;
  const frases = frasear(palavras, opts?.pausa);
  const reps: Repeticao[] = [];
  const fora = new Set<number>();
  for (let a = 0; a < frases.length; a++) {
    if (fora.has(a)) continue;
    const fa = frases[a];
    if (fa.tokens.length < 2) continue;
    let melhor: { b: number; s: number; motivo: Repeticao["motivo"] } | null = null;
    for (let b = a + 1; b <= Math.min(frases.length - 1, a + janela); b++) {
      const fb = frases[b];
      // Uma tomada repetida não pode ser muito mais curta que a anterior (seria só uma retomada de 1 palavra).
      if (fb.tokens.length < Math.max(2, fa.tokens.length * 0.4)) continue;
      const { s, motivo } = comparar(fa, fb);
      if (s >= limiar && (!melhor || s > melhor.s)) melhor = { b, s, motivo };
    }
    if (melhor) {
      // Tudo entre A e B (hesitações, "não, pera") sai junto com A.
      for (let k = a; k < melhor.b; k++) fora.add(k);
      reps.push({
        descartada: fa,
        mantida: frases[melhor.b],
        similaridade: +melhor.s.toFixed(2),
        motivo: melhor.motivo,
      });
    }
  }
  return reps;
}

/** Índices (na lista de palavras) que caem fora por serem tomada repetida — inclui o "lixo" entre as tomadas. */
export function palavrasRepetidas(palavras: PalavraT[], reps: Repeticao[]): Set<number> {
  const fora = new Set<number>();
  for (const r of reps) {
    // da primeira palavra da descartada até a palavra anterior ao início da mantida
    for (let k = r.descartada.primeira; k < r.mantida.primeira; k++) fora.add(k);
  }
  return fora;
}

/** Resumo em texto, para o chat e para o agente. */
export function descreverRepeticoes(reps: Repeticao[]) {
  return reps
    .map(
      (r) =>
        `- ${r.descartada.de.toFixed(1)}–${r.mantida.de.toFixed(1)}s sai (${r.motivo}, ${Math.round(r.similaridade * 100)}%): "${r.descartada.texto.slice(0, 70)}" → fica "${r.mantida.texto.slice(0, 70)}" (${r.mantida.de.toFixed(1)}–${r.mantida.ate.toFixed(1)}s)`,
    )
    .join("\n");
}
