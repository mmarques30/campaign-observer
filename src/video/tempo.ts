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
    .filter((c) => c.ate - c.de > 0.04)
    .sort((a, b) => a.de - b.de);
  // Junta sobreposições (só de mesma velocidade; com velocidade diferente, o seguinte começa depois).
  const unidos: { de: number; ate: number; vel: number }[] = [];
  for (const c of limpos) {
    const u = unidos[unidos.length - 1];
    if (u && c.de <= u.ate + 0.01 && c.vel === u.vel) u.ate = Math.max(u.ate, c.ate);
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

/** Tempo original → tempo final. Se cair num trecho cortado, encosta no próximo trecho mantido. */
export function paraSaida(trechos: Trecho[], s: number): number {
  for (const t of trechos) {
    if (s < t.de) return t.saidaDe;
    if (s <= t.ate) return t.saidaDe + (s - t.de) / t.vel;
  }
  return duracaoSaida(trechos);
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
  const b = paraSaida(trechos, Math.max(de, ate));
  const ini = Math.round(a * fps);
  return [ini, Math.max(1, Math.round(b * fps) - ini)];
}
