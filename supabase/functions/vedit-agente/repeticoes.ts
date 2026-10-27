// Detecção de tomadas repetidas (retakes) na transcrição.
// Quem grava sozinho repete a mesma fala até sair boa; a regra é ficar com a ÚLTIMA.
// Uma tomada costuma ser um BLOCO de várias frases ("Ei, vem cá. 1, 2, 3. Isso é o número…"),
// então a detecção é por alinhamento de blocos, não frase a frase: quando a mesma abertura
// (3 palavras) reaparece mais à frente e o bloco entre as duas é parecido com o que vem depois,
// o bloco anterior é descartado.
// Sem IA: roda no navegador e na função edge (cópia em supabase/functions/vedit-agente/repeticoes.ts).

export type PalavraT = { p: string; i: number; f: number };

export type Frase = {
  idx: number;
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

export function normalizar(p: string) {
  return p
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Quebra as palavras em frases: pausa ≥ `pausa` s ou pontuação final. (Para exibir.) */
export function frasear(palavras: PalavraT[], pausa = 0.5): Frase[] {
  const out: Frase[] = [];
  let atual: PalavraT[] = [];
  let primeira = 0;
  const fechar = (ultima: number) => {
    if (!atual.length) return;
    out.push({
      idx: out.length,
      de: atual[0].i,
      ate: atual[atual.length - 1].f,
      texto: atual.map((w) => w.p).join(" "),
      tokens: atual.map((w) => normalizar(w.p)).filter(Boolean),
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
    if (gap >= pausa || (pontua && gap >= 0.2) || !prox) fechar(k);
  });
  return out;
}

/** Razão de similaridade por subsequência comum (2·LCS / (|a|+|b|)), como o difflib. */
function razao(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const m = a.length,
    n = b.length;
  let prev = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1).fill(0);
    for (let j = 1; j <= n; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return (2 * prev[n]) / (m + n);
}

function bloco(palavras: PalavraT[], de: number, ate: number): Frase {
  const fatia = palavras.slice(de, ate);
  return {
    idx: de,
    de: fatia[0].i,
    ate: fatia[fatia.length - 1].f,
    texto: fatia.map((w) => w.p).join(" "),
    tokens: fatia.map((w) => normalizar(w.p)).filter(Boolean),
    primeira: de,
    ultima: ate - 1,
  };
}

/**
 * Encontra tomadas repetidas por alinhamento de blocos.
 * - `abertura`: quantas palavras formam a "assinatura" do começo de uma tomada (3).
 * - `janela`: máximo de segundos entre o começo de uma tomada e o começo da repetição (45).
 * - `limiar`: similaridade mínima entre o bloco anterior e o que vem depois (0.55).
 * Varre da esquerda para a direita: ao achar A→B, descarta A e continua a partir de B
 * (assim 3 tomadas seguidas viram "fica a terceira").
 */
export function detectarRepeticoes(
  palavras: PalavraT[],
  opts?: { abertura?: number; janela?: number; limiar?: number },
): Repeticao[] {
  const abertura = opts?.abertura ?? 3;
  const janela = opts?.janela ?? 45;
  const limiar = opts?.limiar ?? 0.55;
  const tok = palavras.map((w) => normalizar(w.p));
  const n = palavras.length;
  const reps: Repeticao[] = [];
  const chave = (k: number) => {
    const t: string[] = [];
    for (let q = k; q < n && t.length < abertura; q++) if (tok[q]) t.push(tok[q]);
    return t.length === abertura ? t.join(" ") : null;
  };
  let i = 0;
  while (i < n) {
    const ch = chave(i);
    if (!ch || palavras[i].f - palavras[i].i > 3) {
      i++;
      continue;
    }
    // Candidatos: a mesma abertura mais à frente, dentro da janela.
    let melhor: { j: number; s: number; fimB: number } | null = null;
    for (let j = i + abertura; j < n; j++) {
      if (palavras[j].i - palavras[i].i > janela) break;
      if (chave(j) !== ch) continue;
      const a = tok.slice(i, j).filter(Boolean);
      if (a.length < abertura) continue;
      // A tomada seguinte pode ser mais longa (a pessoa acrescenta uma frase): testa 1×, 1,3× e 1,6×.
      let sc = 0,
        fimB = j;
      for (const fator of [1, 1.3, 1.6]) {
        const fim = Math.min(n, j + Math.round((j - i) * fator));
        const b = tok.slice(j, fim).filter(Boolean);
        const s = Math.max(razao(a, b), a.length <= 10 ? razao(a, b.slice(0, a.length)) : 0);
        if (s > sc) {
          sc = s;
          fimB = fim;
        }
      }
      if (sc >= limiar) {
        melhor = { j, s: sc, fimB };
        break; // a repetição mais próxima é a tomada seguinte
      }
    }
    if (melhor) {
      const A = bloco(palavras, i, melhor.j);
      const B = bloco(palavras, melhor.j, melhor.fimB);
      reps.push({
        descartada: A,
        mantida: B,
        similaridade: +melhor.s.toFixed(2),
        motivo: melhor.s >= 0.85 ? "igual" : A.tokens.length <= 10 ? "abortada" : "parecida",
      });
      i = melhor.j;
      continue;
    }
    i++;
  }
  return reps;
}

/** Índices (na lista de palavras) que caem fora por serem tomada repetida — inclui o "lixo" entre as tomadas. */
export function palavrasRepetidas(palavras: PalavraT[], reps: Repeticao[]): Set<number> {
  const fora = new Set<number>();
  for (const r of reps) for (let k = r.descartada.primeira; k < r.mantida.primeira; k++) fora.add(k);
  return fora;
}

/** Resumo em texto, para o chat e para o agente. */
export function descreverRepeticoes(reps: Repeticao[]) {
  return reps
    .map(
      (r) =>
        `- ${r.descartada.de.toFixed(1)}–${r.mantida.de.toFixed(1)}s sai (${r.motivo}, ${Math.round(r.similaridade * 100)}%): "${r.descartada.texto.slice(0, 80)}${r.descartada.texto.length > 80 ? "…" : ""}" → fica a tomada que começa em ${r.mantida.de.toFixed(1)}s: "${r.mantida.texto.slice(0, 80)}${r.mantida.texto.length > 80 ? "…" : ""}"`,
    )
    .join("\n");
}
