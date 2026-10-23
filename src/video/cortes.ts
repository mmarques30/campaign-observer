// Edição manual dos cortes (trechos que FICAM, em segundos do original).
// Tudo aqui é puro: recebe cortes e devolve cortes novos, já ordenados e unidos.
import type { Palavra, Timeline } from "./schema";
import type { Trecho } from "./tempo";

type Corte = Timeline["cortes"][number];

const MIN_TRECHO = 0.12; // trecho menor que isso vira um "piscar" e sai
const RESPIRO = 0.12; // silêncio que sobra de cada lado de um corte feito pelo roteiro

/** Ordena, une sobreposições e descarta pedacinhos. */
export function limparCortes(cortes: Corte[], duracao: number): Corte[] {
  const fim = duracao || Infinity;
  const ord = cortes
    .map((c) => ({ de: Math.max(0, c.de), ate: Math.min(fim, c.ate) }))
    .filter((c) => c.ate - c.de >= MIN_TRECHO)
    .sort((a, b) => a.de - b.de);
  const out: Corte[] = [];
  for (const c of ord) {
    const u = out[out.length - 1];
    if (u && c.de <= u.ate + 0.02) u.ate = Math.max(u.ate, c.ate);
    else out.push({ de: +c.de.toFixed(3), ate: +c.ate.toFixed(3) });
  }
  for (const c of out) c.ate = +c.ate.toFixed(3);
  return out;
}

const base = (cortes: Corte[], duracao: number) =>
  cortes.length ? cortes : [{ de: 0, ate: duracao }];

/** Tira [de, ate] da edição. */
export function removerIntervalo(
  cortes: Corte[],
  de: number,
  ate: number,
  duracao: number,
): Corte[] {
  const out: Corte[] = [];
  for (const c of base(cortes, duracao)) {
    if (ate <= c.de || de >= c.ate) out.push(c);
    else {
      if (de > c.de) out.push({ de: c.de, ate: de });
      if (ate < c.ate) out.push({ de: ate, ate: c.ate });
    }
  }
  return limparCortes(out, duracao);
}

/** Devolve [de, ate] para a edição. */
export function restaurarIntervalo(
  cortes: Corte[],
  de: number,
  ate: number,
  duracao: number,
): Corte[] {
  if (!cortes.length) return cortes; // vídeo inteiro: nada para restaurar
  return limparCortes([...cortes, { de, ate }], duracao);
}

/** A palavra aparece no vídeo final? (o meio dela cai num trecho mantido) */
export function palavraMantida(trechos: Trecho[], w: Palavra) {
  const m = (w.i + w.f) / 2;
  return trechos.some((t) => m >= t.de && m <= t.ate);
}

/** Intervalo para cortar as palavras [a..b] (índices), levando junto o silêncio em volta. */
export function intervaloParaCortar(palavras: Palavra[], a: number, b: number, duracao: number) {
  const pa = palavras[a],
    pb = palavras[b],
    ant = palavras[a - 1],
    prox = palavras[b + 1];
  const de = ant ? Math.min(pa.i, ant.f + RESPIRO) : Math.max(0, pa.i - 0.05);
  const ate = prox ? Math.max(pb.f, prox.i - RESPIRO) : Math.min(duracao || pb.f + 0.3, pb.f + 0.3);
  return { de, ate };
}

/** Intervalo para trazer as palavras [a..b] de volta, com uma folguinha (sem engolir a vizinha). */
export function intervaloParaRestaurar(palavras: Palavra[], a: number, b: number) {
  const pa = palavras[a],
    pb = palavras[b],
    ant = palavras[a - 1],
    prox = palavras[b + 1];
  const de = Math.max(ant ? (ant.f + pa.i) / 2 : 0, pa.i - 0.1);
  const ate = Math.min(prox ? (pb.f + prox.i) / 2 : pb.f + 0.1, pb.f + 0.1);
  return { de, ate };
}

export type Pausa = {
  de: number; // original
  ate: number;
  duracao: number;
  depoisDe: number; // índice da palavra antes da pausa (-1 = início do trecho)
};

/** Silêncios que ficaram DENTRO do vídeo final e passam de `minimo` segundos. */
export function pausasLongas(palavras: Palavra[], trechos: Trecho[], minimo = 0.7): Pausa[] {
  const out: Pausa[] = [];
  for (const t of trechos) {
    const dentro: number[] = [];
    palavras.forEach((w, k) => {
      if (w.f > t.de && w.i < t.ate) dentro.push(k);
    });
    if (!dentro.length) {
      if (t.ate - t.de >= minimo)
        out.push({ de: t.de, ate: t.ate, duracao: t.ate - t.de, depoisDe: -1 });
      continue;
    }
    const primeira = palavras[dentro[0]];
    if (primeira.i - t.de >= minimo)
      out.push({ de: t.de, ate: primeira.i, duracao: primeira.i - t.de, depoisDe: -1 });
    for (let j = 0; j < dentro.length - 1; j++) {
      const w = palavras[dentro[j]],
        n = palavras[dentro[j + 1]];
      if (n.i - w.f >= minimo)
        out.push({ de: w.f, ate: n.i, duracao: n.i - w.f, depoisDe: dentro[j] });
    }
    const ultima = palavras[dentro[dentro.length - 1]];
    if (t.ate - ultima.f >= minimo)
      out.push({
        de: ultima.f,
        ate: t.ate,
        duracao: t.ate - ultima.f,
        depoisDe: dentro[dentro.length - 1],
      });
  }
  return out;
}

/** Encurta a pausa para `fica` segundos (respiro natural), cortando o miolo. */
export function encurtarPausa(cortes: Corte[], p: Pausa, duracao: number, fica = 0.3): Corte[] {
  const sobra = Math.min(fica, p.duracao) / 2;
  return removerIntervalo(cortes, p.de + sobra, p.ate - sobra, duracao);
}

/** Move a borda de um trecho mantido (delta em segundos; + estende o fim / atrasa o início). */
export function ajustarBorda(
  cortes: Corte[],
  trechos: Trecho[],
  idx: number,
  borda: "de" | "ate",
  delta: number,
  duracao: number,
): Corte[] {
  const t = trechos[idx];
  if (!t) return cortes;
  const atual = trechos.map((x) => ({ de: x.de, ate: x.ate }));
  const novo = { ...atual[idx] };
  if (borda === "de")
    novo.de = Math.max(
      idx ? atual[idx - 1].ate : 0,
      Math.min(novo.ate - MIN_TRECHO, novo.de + delta),
    );
  else
    novo.ate = Math.min(
      atual[idx + 1]?.de ?? (duracao || Infinity),
      Math.max(novo.de + MIN_TRECHO, novo.ate + delta),
    );
  atual[idx] = novo;
  return limparCortes(atual, duracao);
}

/** Tira o trecho inteiro da edição. */
export function excluirTrecho(trechos: Trecho[], idx: number, duracao: number): Corte[] {
  return limparCortes(
    trechos.filter((_, k) => k !== idx).map((t) => ({ de: t.de, ate: t.ate })),
    duracao,
  );
}

/**
 * Divide o trecho mantido em `t` (segundo do original) em dois, para poder apagar só uma parte.
 * O ponto encosta na pausa entre palavras mais próxima (o micro-corte cai no silêncio).
 */
export function dividirEm(
  cortes: Corte[],
  trechos: Trecho[],
  palavras: Palavra[],
  t: number,
  duracao: number,
): { cortes: Corte[]; ok: boolean } {
  const tr = trechos.find((x) => t > x.de + 0.15 && t < x.ate - 0.15);
  if (!tr) return { cortes, ok: false };
  // Pausas entre palavras dentro do trecho: escolhe a mais perto de t.
  let melhor = t;
  let dist = Infinity;
  for (let k = 0; k < palavras.length - 1; k++) {
    const a = palavras[k].f,
      b = palavras[k + 1].i;
    if (a < tr.de || b > tr.ate) continue;
    const meio = (a + b) / 2;
    if (Math.abs(meio - t) < dist && Math.abs(meio - t) < 1.2) {
      dist = Math.abs(meio - t);
      melhor = meio;
    }
  }
  const novos = trechos
    .flatMap((x) =>
      x === tr
        ? [
            { de: x.de, ate: melhor - 0.02 },
            { de: melhor + 0.02, ate: x.ate },
          ]
        : [{ de: x.de, ate: x.ate }],
    )
    .filter((c) => c.ate - c.de >= MIN_TRECHO);
  return { cortes: limparCortes(novos, duracao), ok: true };
}
