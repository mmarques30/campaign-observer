// Sons automáticos (hack do celfstudies): cada ação na tela ganha o som que combina com ela e os
// cortes secos ganham um clique/obturador discreto. Regra de uso dos sons:
//   whoosh/swipe = movimento e transição · clique/obturador = corte rápido · pop = algo aparecendo
//   brilho = destaque/revelação · digitando = texto sendo escrito · impacto = título/número forte
// Nunca o mesmo som duas vezes seguidas. Tempos no relógio do vídeo original (como tl.sfx).
import { EFEITO_POR_TIPO } from "./catalogo";
import type { Timeline } from "./schema";
import type { Trecho } from "./tempo";

const POR_CATEGORIA: Record<string, string> = {
  texto: "pop",
  dados: "ding",
  interface: "click",
  midia: "whoosh",
  transicao: "whoosh",
  cta: "ding",
};
// Alternativa quando o som se repetiria logo em seguida.
const PAR: Record<string, string> = {
  pop: "click",
  click: "pop",
  whoosh: "swipe",
  swipe: "whoosh",
  impacto: "ding",
  ding: "brilho",
  brilho: "ding",
  obturador: "click",
  digitar: "click",
  glitch: "whoosh",
};

function somDoEfeito(e: Timeline["efeitos"][number]): string {
  const def = EFEITO_POR_TIPO[e.tipo];
  const p = (e.props ?? {}) as Record<string, any>;
  if (e.tipo === "painel" && p.modo === "documento") return "digitar";
  if (e.tipo === "composicao") {
    const els = Array.isArray(p.elementos) ? p.elementos : [];
    if (els.some((x: any) => x?.entrada === "digita")) return "digitar";
  }
  return def?.somPadrao ?? POR_CATEGORIA[def?.categoria ?? ""] ?? "pop";
}

export function sonsAutomaticos(
  tl: Timeline,
  trechos: Trecho[],
  opts?: { cortes?: boolean },
): Timeline["sfx"] {
  const sons: Timeline["sfx"] = tl.efeitos
    .map((e) => ({ em: e.de, som: somDoEfeito(e), volume: 0.45 }))
    .sort((a, b) => a.em - b.em);
  if (opts?.cortes !== false) {
    // Cortes secos: começo de cada trecho mantido (menos o primeiro), longe de outro som.
    let ultimo = -Infinity;
    let alterna = false;
    for (const t of trechos.slice(1)) {
      const perto = sons.some((s) => Math.abs(s.em - t.de) < 0.5);
      if (perto || t.de - ultimo < 1.2) continue;
      sons.push({ em: t.de, som: alterna ? "obturador" : "click", volume: 0.18 });
      alterna = !alterna;
      ultimo = t.de;
    }
  }
  sons.sort((a, b) => a.em - b.em);
  // Nunca o mesmo som duas vezes seguidas (dentro de 2s).
  for (let i = 1; i < sons.length; i++) {
    const a = sons[i - 1],
      b = sons[i];
    if (a.som === b.som && b.em - a.em < 2 && PAR[b.som]) b.som = PAR[b.som];
  }
  return sons;
}
