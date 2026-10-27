// Conversão entre o tempo do vídeo ORIGINAL (o da transcrição, que o Claude usa)
// e o tempo do vídeo FINAL (depois dos cortes).
import type { Timeline } from "./schema";

export type Trecho = { de: number; ate: number; saidaDe: number; vel: number };

/** Duração do trecho no vídeo final (acelerado fica mais curto). */
export const duracaoTrecho = (t: Pick<Trecho, "de" | "ate" | "vel">) =>
  (t.ate - t.de) / (t.vel || 1);

export function trechosMantidos(tl: Timeline, duracaoFonte: number): Trecho[] {
  const brutos = tl.cortes.length ? tl.cortes : [{ de: 0, ate: duracaoFonte }];
  const limpos = brutos
    .map((c) => ({
      de: Math.max(0, c.de),
      ate: Math.min(duracaoFonte || c.ate, c.ate),
      vel: Math.min(4, Math.max(0.5, Number((c as { velocidade?: number }).velocidade) || 1)),
    }))
    .filter((c) => c.ate - c.de > 0.04);
  // Ordem livre: os trechos tocam na ordem em que estão (dá para puxar o CTA do fim para o meio).
  if (!tl.ordemLivre) limpos.sort((a, b) => a.de - b.de);
  // Junta sobreposições (só de mesma velocidade; com velocidade diferente, o seguinte começa depois).
  const unidos: { de: number; ate: number; vel: number }[] = [];
  for (const c of limpos) {
    const u = unidos[unidos.length - 1];
    if (u && c.de < u.de - 0.01)
      unidos.push({ ...c }); // volta no tempo: só com ordem livre
    else if (u && c.de <= u.ate + 0.01 && c.vel === u.vel) u.ate = Math.max(u.ate, c.ate);
    else if (u && c.de < u.ate) {
      if (c.ate - u.ate > 0.04) unidos.push({ ...c, de: u.ate });
    } else unidos.push({ ...c });
  }
  let acc = 0;
  return unidos.map((c) => {
    const t = { ...c, saidaDe: acc };
    acc += duracaoTrecho(c);
    return t;
  });
}

export function duracaoSaida(trechos: Trecho[]): number {
  const u = trechos[trechos.length - 1];
  return u ? u.saidaDe + duracaoTrecho(u) : 0;
}

/** Tempo original → tempo final. Se cair num trecho cortado, encosta no próximo trecho mantido
 * (o próximo no tempo do ORIGINAL, o que também vale quando os trechos estão em ordem livre). */
export function paraSaida(trechos: Trecho[], s: number): number {
  let prox: Trecho | null = null;
  for (const t of trechos) {
    if (s >= t.de && s <= t.ate) return t.saidaDe + (s - t.de) / t.vel;
    if (t.de > s && (!prox || t.de < prox.de)) prox = t;
  }
  return prox ? prox.saidaDe : duracaoSaida(trechos);
}

/** Trecho onde um instante do original cai (ou o próximo mantido). */
export function trechoDe(trechos: Trecho[], s: number): Trecho | null {
  let prox: Trecho | null = null;
  for (const t of trechos) {
    if (s >= t.de && s <= t.ate) return t;
    if (t.de > s && (!prox || t.de < prox.de)) prox = t;
  }
  return prox;
}

/** Tempo final → tempo original. */
export function paraFonte(trechos: Trecho[], o: number): number {
  for (const t of trechos) {
    const len = duracaoTrecho(t);
    if (o <= t.saidaDe + len) return t.de + Math.max(0, o - t.saidaDe) * t.vel;
  }
  const u = trechos[trechos.length - 1];
  return u ? u.ate : 0;
}

/** Intervalo original → [inicio, duracao] em frames de saída (mínimo 1 frame). */
export function janelaFrames(
  trechos: Trecho[],
  de: number,
  ate: number,
  fps: number,
): [number, number] {
  const a = paraSaida(trechos, de);
  let b = paraSaida(trechos, Math.max(de, ate));
  // Ordem livre: o fim caiu num trecho que toca ANTES do início → vai até o fim do trecho do início.
  if (b < a) {
    const t = trechoDe(trechos, de);
    b = t ? t.saidaDe + duracaoTrecho(t) : a;
  }
  const ini = Math.round(a * fps);
  return [ini, Math.max(1, Math.round(b * fps) - ini)];
}
