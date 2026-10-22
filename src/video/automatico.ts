// Operações determinísticas (rodam na hora, sem IA): o Claude pode refinar depois.
import type { Palavra, Timeline } from "./schema";
import { detectarRepeticoes, palavrasRepetidas, type Repeticao } from "./repeticoes";

// Sons de hesitação: saem sempre. Muletas de palavra: só quando soltas (com pausa).
const HESITACOES = new Set([
  "éé",
  "ééé",
  "ãh",
  "ã",
  "ah",
  "ahn",
  "hã",
  "hum",
  "hmm",
  "eh",
  "uh",
  "uhm",
]);
// "é" e "ah" podem ser palavra de verdade ("É muito simples"): só saem quando soltas.
const MULETAS = new Set(["tipo", "né", "assim", "é", "eh", "ah"]);

/** Mantém só a fala: remove pausas acima de `gap`, muletas isoladas e tomadas repetidas. */
export function cortarSilencios(
  palavras: Palavra[],
  duracao: number,
  opts?: {
    gap?: number;
    antes?: number;
    depois?: number;
    tirarMuletas?: boolean;
    tirarRepeticoes?: boolean;
    repeticoes?: Repeticao[]; // já calculadas (evita recalcular)
  },
): Timeline["cortes"] {
  const gap = opts?.gap ?? 0.35,
    antes = opts?.antes ?? 0.06,
    depois = opts?.depois ?? 0.1;
  const reps = opts?.tirarRepeticoes ? (opts.repeticoes ?? detectarRepeticoes(palavras)) : [];
  const repetidas = palavrasRepetidas(palavras, reps);
  const uteis = palavras.filter((w, i) => {
    if (repetidas.has(i)) return false;
    if (!opts?.tirarMuletas) return true;
    const bruto = w.p
      .toLowerCase()
      .replace(/[.,!?…;:]/g, "")
      .trim();
    // muleta só sai se estiver "solta" (pausa antes ou depois)
    const solta =
      (palavras[i - 1] ? w.i - palavras[i - 1].f > 0.25 : true) ||
      (palavras[i + 1] ? palavras[i + 1].i - w.f > 0.25 : true);
    // "é…", "ah…" de hesitação vêm seguidos de pausa; no começo de frase ("É simples") não.
    const pausaDepois = palavras[i + 1] ? palavras[i + 1].i - w.f > 0.25 : true;
    if (bruto === "é" || bruto === "eh" || bruto === "ah") return !pausaDepois;
    return !(HESITACOES.has(bruto) || (MULETAS.has(bruto) && solta));
  });
  if (!uteis.length) return [];
  const cortes: Timeline["cortes"] = [];
  let ini = Math.max(0, uteis[0].i - antes),
    fim = uteis[0].f + depois;
  for (let k = 1; k < uteis.length; k++) {
    const w = uteis[k],
      ant = uteis[k - 1];
    const pulouMuleta = palavras.indexOf(w) - palavras.indexOf(ant) > 1;
    if (w.i - ant.f > gap || pulouMuleta) {
      cortes.push({ de: +ini.toFixed(2), ate: +Math.min(duracao, fim, w.i - 0.02).toFixed(2) });
      ini = Math.max(fim - depois + 0.01, w.i - antes);
    }
    fim = w.f + depois;
  }
  cortes.push({ de: +ini.toFixed(2), ate: +Math.min(duracao, fim).toFixed(2) });
  return cortes;
}
