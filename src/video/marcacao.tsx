// Formatação de texto nos efeitos e na legenda (as marcas podem pegar várias palavras):
//   *destaque*   → realce do estilo do efeito (cor de destaque, serifa itálica, pílula…)
//   **negrito**  _itálico_  __sublinhado__  ~~riscado~~
//   [amarelo]colorido[/]  ou  [#FF5500]colorido[/]
import type { CSSProperties } from "react";

export type EstiloTexto = {
  destaque?: boolean;
  negrito?: boolean;
  italico?: boolean;
  sublinhado?: boolean;
  riscado?: boolean;
  cor?: string;
};
export type Pedaco = { t: string; e: EstiloTexto };

export const CORES_NOMEADAS: Record<string, string> = {
  amarelo: "#FFD60A",
  verde: "#C6F432",
  vermelho: "#FF3B30",
  azul: "#3B82F6",
  roxo: "#8B5CF6",
  rosa: "#FF4FA3",
  laranja: "#FF8A00",
  branco: "#FFFFFF",
  preto: "#0B0B0F",
  cinza: "#9CA3AF",
};

const TOKEN = /(\*\*|__|~~|\[\/\]|\[[#a-zA-ZÀ-ú0-9]+\]|\*|_)/g;

/** Quebra o texto em pedaços com estilo. Marca sem par vira texto normal. */
export function analisar(texto: string): Pedaco[] {
  const partes = String(texto ?? "")
    .split(TOKEN)
    .filter((x) => x !== "");
  // Só vale a marca que tem par mais à frente (evita "_" de nome_de_arquivo virar itálico até o fim).
  const fecha = (i: number, m: string) => partes.indexOf(m, i + 1) > i;
  const out: Pedaco[] = [];
  const e: EstiloTexto = {};
  const cores: string[] = [];
  const chave: Record<string, keyof EstiloTexto> = {
    "**": "negrito",
    __: "sublinhado",
    "~~": "riscado",
    "*": "destaque",
    _: "italico",
  };
  partes.forEach((p, i) => {
    const k = chave[p];
    if (k) {
      if (e[k]) return void (e[k] = false as never);
      if (fecha(i, p)) return void (e[k] = true as never);
    } else if (p === "[/]") {
      if (cores.length) {
        cores.pop();
        e.cor = cores[cores.length - 1];
        return;
      }
    } else if (/^\[[#a-zA-ZÀ-ú0-9]+\]$/.test(p)) {
      const nome = p.slice(1, -1).toLowerCase();
      const cor = nome.startsWith("#") ? nome : CORES_NOMEADAS[nome];
      if (cor && fecha(i, "[/]")) {
        cores.push(cor);
        e.cor = cor;
        return;
      }
    }
    const ult = out[out.length - 1];
    if (ult && JSON.stringify(ult.e) === JSON.stringify(e)) ult.t += p;
    else out.push({ t: p, e: { ...e } });
  });
  return out;
}

/** Texto sem marcas (para medir, digitar letra a letra, mostrar em listas). */
export const semMarcas = (texto: string) =>
  analisar(texto)
    .map((p) => p.t)
    .join("");

/** Palavras com seus pedaços (para efeitos que animam palavra por palavra). */
export function palavrasMarcadas(texto: string) {
  const palavras: { pedacos: Pedaco[]; destaque: boolean }[] = [];
  let atual: Pedaco[] = [];
  const fechar = () => {
    if (atual.some((p) => p.t.trim()))
      palavras.push({ pedacos: atual, destaque: atual.some((p) => p.e.destaque) });
    atual = [];
  };
  for (const p of analisar(texto)) {
    const pedacos = p.t.split(/(\s+)/);
    for (const t of pedacos) {
      if (/^\s+$/.test(t)) fechar();
      else if (t) atual.push({ t, e: p.e });
    }
  }
  fechar();
  return palavras;
}

/** CSS de negrito/itálico/sublinhado/riscado/cor (o destaque cada efeito desenha do seu jeito). */
export function cssDe(e: EstiloTexto, escala = 1): CSSProperties {
  const linhas = [e.sublinhado && "underline", e.riscado && "line-through"]
    .filter(Boolean)
    .join(" ");
  return {
    ...(e.negrito ? { fontWeight: 900 } : {}),
    ...(e.italico ? { fontStyle: "italic" } : {}),
    ...(e.cor ? { color: e.cor } : {}),
    ...(linhas
      ? {
          textDecorationLine: linhas,
          textDecorationThickness: Math.max(2, 4 * escala),
          textUnderlineOffset: 8 * escala,
        }
      : {}),
  };
}

/** Desenha o texto marcado; `destaque` é o estilo que o efeito dá ao *realce*. */
export function Marcado({
  texto,
  destaque,
  escala = 1,
}: {
  texto: string;
  destaque?: CSSProperties;
  escala?: number;
}) {
  return (
    <>
      {analisar(texto).map((p, i) => (
        <span key={i} style={{ ...(p.e.destaque ? destaque : {}), ...cssDe(p.e, escala) }}>
          {p.t}
        </span>
      ))}
    </>
  );
}
