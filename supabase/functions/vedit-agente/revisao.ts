// Revisão automática no fim de cada edição feita pelo agente.
// Roda sem IA, sobre a timeline pronta (tempos no vídeo original, os mesmos de cortes/efeitos):
// corrige o que é seguro corrigir sozinho (tela preta, mídia fora do vídeo, mídias sobrepostas)
// e avisa o que precisa de olho humano (fala repetida que ficou, imagem repetida, mídia que
// aparece rápido demais). Nunca mexe nos cortes: eles podem ser ajustes manuais da pessoa.
import { palavrasRepetidas, type PalavraT, type Repeticao } from "./repeticoes.ts";

type Midia = { id: string; tipo?: string; path?: string | null; duracao?: number | null };
type Corte = { de: number; ate: number };

const TELA = ["broll", "dividir", "reagir", "fundo-imagem", "tela-verde"];
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return m ? `${m}min${String(r).padStart(2, "0")}s` : `${r}s`;
};

/** Segundos do trecho [a,b] que ficam no vídeo final. */
function visivel(cortes: Corte[], a: number, b: number) {
  if (!cortes.length) return Math.max(0, b - a);
  return cortes.reduce((t, c) => t + Math.max(0, Math.min(b, c.ate) - Math.max(a, c.de)), 0);
}

/** Tempo original → tempo no vídeo final (para citar posições que a pessoa encontra no player). */
function noFinal(cortes: Corte[], t: number) {
  if (!cortes.length) return t;
  let acc = 0;
  for (const c of cortes) {
    if (t >= c.ate) acc += c.ate - c.de;
    else if (t >= c.de) return acc + (t - c.de);
    else break;
  }
  return acc;
}

const midiaDe = (e: any): string | null =>
  typeof e?.props?.midia === "string" ? e.props.midia : null;

export function revisarEdicao(
  tl: any,
  palavras: PalavraT[],
  midias: Midia[],
  reps: Repeticao[],
  duracao: number,
) {
  const corrigido: string[] = [];
  const aviso: string[] = [];
  const cortes = ((tl.cortes ?? []) as Corte[])
    .filter((c) => typeof c?.de === "number" && typeof c?.ate === "number" && c.ate > c.de)
    .sort((a, b) => a.de - b.de);
  const porId = new Map(midias.map((m) => [m.id, m]));
  let efeitos = (Array.isArray(tl.efeitos) ? tl.efeitos : []) as any[];

  // 1. Efeito além do fim do vídeo: encosta no fim.
  if (duracao > 0)
    for (const e of efeitos)
      if (typeof e.ate === "number" && e.ate > duracao + 0.05) e.ate = duracao;

  // 2. Mídia sem arquivo (ainda baixando ou que falhou) vira tela preta: sai.
  const semArquivo = efeitos.filter((e) => {
    const id = midiaDe(e);
    return TELA.includes(e.tipo) && id && porId.has(id) && !porId.get(id)?.path;
  });
  if (semArquivo.length) {
    efeitos = efeitos.filter((e) => !semArquivo.includes(e));
    corrigido.push(
      `${semArquivo.length} imagem(ns) sem arquivo carregado saíram (dariam tela preta)`,
    );
  }

  // 3. Efeito que cai inteiro num trecho cortado não aparece: sai, para não confundir a timeline.
  const sumidos = efeitos.filter(
    (e) => typeof e.de === "number" && typeof e.ate === "number" && visivel(cortes, e.de, e.ate) < 0.05,
  );
  if (sumidos.length) {
    efeitos = efeitos.filter((e) => !sumidos.includes(e));
    corrigido.push(`${sumidos.length} efeito(s) que ficavam em partes cortadas foram retirados`);
  }

  // 4. Duas mídias de tela cheia ao mesmo tempo: a anterior termina quando a seguinte entra.
  const cheias = efeitos
    .filter((e) => e.tipo === "broll" && typeof e.de === "number")
    .sort((a, b) => a.de - b.de);
  let sobre = 0;
  for (let i = 1; i < cheias.length; i++) {
    const ant = cheias[i - 1];
    if (ant.ate > cheias[i].de + 0.05) {
      ant.ate = cheias[i].de;
      sobre++;
    }
  }
  if (sobre) corrigido.push(`${sobre} imagem(ns) de tela cheia que se sobrepunham foram encaixadas`);
  efeitos = efeitos.filter((e) => !(e.tipo === "broll" && e.ate - e.de < 0.05));

  // 5. Avisos (não mexe): mídia repetida, mídia rápida demais, vídeo de apoio curto demais.
  const usos = new Map<string, any[]>();
  for (const e of efeitos) {
    const id = midiaDe(e);
    if (id && TELA.includes(e.tipo)) usos.set(id, [...(usos.get(id) ?? []), e]);
  }
  const repetidas = [...usos.values()].filter((l) => l.length > 1);
  if (repetidas.length)
    aviso.push(
      `${repetidas.length} imagem(ns) aparece(m) mais de uma vez (em ${repetidas
        .map((l) => l.map((e: any) => fmt(noFinal(cortes, e.de))).join(" e "))
        .slice(0, 3)
        .join("; ")})`,
    );
  const rapidas = efeitos.filter((e) => {
    if (!TELA.includes(e.tipo) || !midiaDe(e)) return false;
    const v = visivel(cortes, e.de, e.ate);
    return v > 0 && v < 0.6;
  });
  if (rapidas.length)
    aviso.push(
      `${rapidas.length} imagem(ns) fica(m) menos de 0,6s na tela (em ${rapidas
        .slice(0, 4)
        .map((e) => fmt(noFinal(cortes, e.de)))
        .join(", ")}) — quase não dá para ver`,
    );
  const videoCurto = efeitos.filter((e) => {
    const m = porId.get(midiaDe(e) ?? "");
    return (
      m?.tipo === "video" &&
      Number(m.duracao) > 0 &&
      visivel(cortes, e.de, e.ate) > Number(m.duracao) + 0.3
    );
  });
  if (videoCurto.length)
    aviso.push(
      `${videoCurto.length} vídeo(s) de apoio é(são) mais curto(s) que o espaço dele(s) e vai(vão) repetir (em ${videoCurto
        .slice(0, 3)
        .map((e) => fmt(noFinal(cortes, e.de)))
        .join(", ")})`,
    );

  // 6. Fala repetida (tomada descartada) que ainda está dentro dos cortes mantidos.
  if (reps.length && palavras.length) {
    const fora = palavrasRepetidas(palavras, reps);
    const dentro = (t: number) => !cortes.length || cortes.some((c) => t >= c.de && t < c.ate);
    const trechos: number[] = [];
    let ultimo = -10;
    [...fora]
      .sort((a, b) => a - b)
      .forEach((i) => {
        const w = palavras[i];
        if (!w || !dentro(w.i)) return;
        if (w.i - ultimo > 2) trechos.push(w.i);
        ultimo = w.i;
      });
    if (trechos.length)
      aviso.push(
        `fala repetida ainda no vídeo em ${trechos
          .slice(0, 5)
          .map((t) => fmt(noFinal(cortes, t)))
          .join(", ")} — peça "tire as repetições" se não foi de propósito`,
      );
  }

  // 7. Pedaço mantido curto demais vira piscada.
  const piscadas = cortes.filter((c) => c.ate - c.de < 0.3);
  if (piscadas.length)
    aviso.push(
      `${piscadas.length} pedaço(s) de vídeo com menos de 0,3s (em ${piscadas
        .slice(0, 4)
        .map((c) => fmt(noFinal(cortes, c.de)))
        .join(", ")}) — parece um salto`,
    );

  tl.efeitos = efeitos;
  return { corrigido, aviso };
}

export function textoRevisao(r: { corrigido: string[]; aviso: string[] }) {
  if (!r.corrigido.length && !r.aviso.length)
    return "\n\nRevisão automática: nada a corrigir (sem tela preta, sem mídia repetida, sem fala repetida).";
  const partes: string[] = ["\n\nRevisão automática:"];
  if (r.corrigido.length) partes.push(`Corrigido: ${r.corrigido.join("; ")}.`);
  if (r.aviso.length) partes.push(`Vale conferir: ${r.aviso.join("; ")}.`);
  return partes.join("\n");
}
