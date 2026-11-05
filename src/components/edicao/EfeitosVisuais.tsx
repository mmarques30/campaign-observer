// Seletor visual de efeitos no estúdio: escolhe a FALA (onde), vê o efeito rodando no próprio
// vídeo, naquele trecho, em loop (prévia), e só então aplica. Sem decorar comando de barra.
import { useMemo, useState } from "react";
import { Check, Eye, MessageSquare, Search, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EFEITOS, EFEITO_POR_TIPO, type Categoria, type EfeitoDef } from "@/video/catalogo";
import type { Palavra, Timeline } from "@/video/schema";
import type { Trecho } from "@/video/tempo";
import { fmtTempo } from "@/lib/vedit";
import { cn } from "@/lib/utils";

export type Efeito = Timeline["efeitos"][number];
type Frase = { texto: string; de: number; ate: number; cortada: boolean };

const ROTULO: Record<Categoria | "todos" | "sugeridos", string> = {
  sugeridos: "Para esta fala",
  todos: "Todos",
  texto: "Texto",
  dados: "Números",
  interface: "Telas e cards",
  midia: "Imagem e vídeo",
  transicao: "Transição",
  cta: "Chamada final",
};

/** Agrupa as palavras em falas curtas (pontuação ou ~9 palavras). */
export function falas(palavras: Palavra[], trechos: Trecho[]): Frase[] {
  const out: Frase[] = [];
  let atual: Palavra[] = [];
  const fecha = () => {
    if (!atual.length) return;
    const de = atual[0].i,
      ate = atual[atual.length - 1].f;
    const meio = (de + ate) / 2;
    out.push({
      texto: atual.map((p) => p.p).join(" "),
      de,
      ate,
      cortada: trechos.length > 0 && !trechos.some((t) => meio >= t.de && meio <= t.ate),
    });
    atual = [];
  };
  for (const p of palavras) {
    atual.push(p);
    // Fecha no fim de frase; na vírgula só se a fala já tem corpo; nunca passa de 14 palavras.
    if (/[.!?;:]$/.test(p.p) || (/,$/.test(p.p) && atual.length >= 4) || atual.length >= 14)
      fecha();
  }
  fecha();
  return out;
}

const limpa = (t: string) => t.replace(/[.,;:!?"]+$/g, "").trim();
const numeros = (t: string) =>
  [...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));

/** Campos que o efeito aceita, lidos da documentação de parâmetros do catálogo. */
function campos(def: EfeitoDef) {
  const s = new Set<string>();
  for (const m of def.params.matchAll(/(?:^|[,(|]\s*)(\w+)\??(?=\s*(?:[:(,|]|$))/g)) s.add(m[1]);
  const listaDeObjetos = (k: string) => new RegExp(`${k}\\??\\s*:\\s*\\[\\{`).test(def.params);
  return { tem: (k: string) => s.has(k) && !listaDeObjetos(k) };
}

/** Preenche o efeito com a fala escolhida (o resto vem do exemplo/padrão do efeito). */
export function preencher(def: EfeitoDef, frase: string): Record<string, any> {
  const p: Record<string, any> = structuredClone(def.exemplo ?? {});
  const t = limpa(frase);
  const ws = t.split(/\s+/).filter(Boolean);
  const maior = [...ws].sort((a, b) => b.length - a.length)[0] ?? t;
  const nums = numeros(t);
  const { tem } = campos(def);
  if (tem("linhas")) {
    const meio = Math.ceil(ws.length / 2);
    p.linhas = [ws.slice(0, meio).join(" "), ws.slice(meio).join(" ")]
      .filter(Boolean)
      .map((l) => l.toUpperCase());
  }
  if (tem("texto")) {
    if (def.tipo === "azulejos") p.texto = maior.slice(0, 6).toUpperCase();
    else if (def.tipo === "palavra-gigante" || def.tipo === "letreiro")
      p.texto = maior.toUpperCase();
    else if (def.tipo === "texto-atras")
      p.texto = [ws.slice(0, Math.ceil(ws.length / 2)), ws.slice(Math.ceil(ws.length / 2))]
        .map((x) => x.join(" "))
        .filter(Boolean)
        .join("|");
    else p.texto = t;
  }
  if (tem("titulo") && !p.titulo) p.titulo = t;
  if (tem("palavra")) p.palavra = maior.toUpperCase();
  const partes = t
    .split(/,\s*|\s+e\s+/)
    .map(limpa)
    .filter(Boolean);
  if (tem("itens") && partes.length > 1) p.itens = partes.slice(0, 5);
  if (tem("notas")) p.notas = partes.slice(0, 6);
  if (tem("valor") && nums.length) p.valor = nums[0];
  if (tem("valores") && nums.length > 1) p.valores = nums;
  if (tem("numero") && nums.length) p.numero = nums[0];
  return p;
}

/** Sugestões simples a partir do que foi falado. */
function sugeridos(f: Frase | null, primeira: boolean): string[] {
  if (!f) return [];
  const t = f.texto.toLowerCase();
  const s: string[] = [];
  if (primeira) s.push("titulo-cartaz", "palavra-gigante", "texto-atras");
  if (/\d/.test(t) || /\b(metade|dobro|triplo|mil|milh)/.test(t))
    s.push("contador", "numero-capitulo", "vidro", "grafico");
  if (/\b(clique|clica|link|botão|agende|comente|chama|diagnóstico)\b/.test(t))
    s.push("cta-final", "frase-caixa");
  if ((t.match(/,/g) ?? []).length >= 2) s.push("checklist", "lista-editorial", "post-its");
  if (/\b(whatsapp|instagram|planilha|e-?mail|crm|excel|drive)\b/.test(t))
    s.push("icones", "celular", "notificacao", "mockup");
  if (/\?$/.test(f.texto.trim())) s.push("frase-caixa");
  s.push("frase-caixa", "titulo", "papel", "trava", "texto-atras");
  return [...new Set(s)].filter((x) => EFEITO_POR_TIPO[x]?.disponivel);
}

export function EfeitosVisuais({
  tl,
  setTl,
  palavras,
  trechos,
  agora,
  onIr,
  previa,
  setPrevia,
  onComando,
}: {
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  palavras: Palavra[];
  trechos: Trecho[];
  agora: number;
  onIr: (s: number) => void;
  previa: Efeito | null;
  setPrevia: (e: Efeito | null) => void;
  onComando: (t: string) => void;
}) {
  const lista = useMemo(() => falas(palavras, trechos), [palavras, trechos]);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [cat, setCat] = useState<keyof typeof ROTULO>("sugeridos");
  const [busca, setBusca] = useState("");
  const [texto, setTexto] = useState("");

  // Fala selecionada: a clicada, ou a que está tocando agora.
  const idxAgora = lista.findIndex((f) => agora >= f.de - 0.05 && agora <= f.ate + 0.3);
  const idx = escolhida ?? (idxAgora >= 0 ? idxAgora : null);
  const frase = idx != null ? lista[idx] : null;
  const primeiraUsada = lista.findIndex((f) => !f.cortada);

  const disponiveis = EFEITOS.filter((e) => e.disponivel);
  const sug = sugeridos(frase, idx === primeiraUsada);
  const filtrados = (
    cat === "sugeridos"
      ? sug.map((t) => EFEITO_POR_TIPO[t])
      : cat === "todos"
        ? disponiveis
        : disponiveis.filter((e) => e.categoria === cat)
  ).filter(
    (e) =>
      !busca || `${e.nome} ${e.descricao} ${e.comando}`.toLowerCase().includes(busca.toLowerCase()),
  );

  const naFala = frase
    ? tl.efeitos.filter((e) => e.ate >= frase.de && e.de <= frase.ate + 0.5)
    : [];

  function ver(def: EfeitoDef) {
    if (!frase) return;
    const t = texto || frase.texto;
    const de = Math.max(0, frase.de - 0.05);
    const ate = Math.max(frase.ate + 0.2, de + def.duracaoPadrao);
    setPrevia({ id: `previa-${def.tipo}`, tipo: def.tipo, de, ate, props: preencher(def, t) });
  }

  function aplicar() {
    if (!previa) return;
    const def = EFEITO_POR_TIPO[previa.tipo];
    const novo = { ...previa, id: Math.random().toString(36).slice(2, 12) };
    setTl(
      { ...tl, efeitos: [...tl.efeitos, novo] },
      `${def?.nome ?? previa.tipo} em ${fmtTempo(previa.de)}`,
    );
    setPrevia(null);
  }

  return (
    <div className="space-y-3">
      {/* 1. Onde */}
      <section className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1. Escolha a fala
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
          {lista.map((f, i) => (
            <button
              key={i}
              disabled={f.cortada}
              onClick={() => {
                setEscolhida(i);
                setTexto("");
                setPrevia(null);
                onIr(f.de);
              }}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs flex gap-2 hover:bg-accent disabled:opacity-35 disabled:hover:bg-transparent",
                i === idx && "bg-primary/10",
              )}
              title={f.cortada ? "Trecho cortado da edição" : undefined}
            >
              <span className="tabular-nums text-muted-foreground shrink-0">{fmtTempo(f.de)}</span>
              <span className={cn("flex-1", f.cortada && "line-through")}>{f.texto}</span>
              {tl.efeitos.some((e) => e.ate >= f.de && e.de <= f.ate) && (
                <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </section>

      {frase && (
        <>
          {naFala.length > 0 && (
            <section className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Já nesta fala:</div>
              {naFala.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                >
                  <span className="flex-1 truncate">{EFEITO_POR_TIPO[e.tipo]?.nome ?? e.tipo}</span>
                  <button
                    title="Tirar este efeito"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setTl(
                        { ...tl, efeitos: tl.efeitos.filter((x) => x.id !== e.id) },
                        `${EFEITO_POR_TIPO[e.tipo]?.nome ?? e.tipo} removido`,
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* 2. Qual */}
          <section className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              2. Clique num efeito para ver no vídeo
            </div>
            <Input
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (previa && EFEITO_POR_TIPO[previa.tipo])
                  setPrevia({
                    ...previa,
                    props: preencher(EFEITO_POR_TIPO[previa.tipo], e.target.value || frase.texto),
                  });
              }}
              placeholder={`Texto na tela (padrão: "${limpa(frase.texto)}")`}
              className="h-8 text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(ROTULO) as (keyof typeof ROTULO)[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "text-[11px] rounded-full border px-2 py-0.5",
                    cat === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {ROTULO[c]}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar efeito"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {filtrados.map((e) => (
                <button
                  key={e.tipo}
                  onClick={() => ver(e)}
                  className={cn(
                    "text-left rounded-lg border p-2 hover:border-primary/60 hover:bg-accent/50",
                    previa?.tipo === e.tipo && "border-primary ring-1 ring-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{e.nome}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {e.descricao}
                  </div>
                </button>
              ))}
              {filtrados.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground">Nenhum efeito aqui.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* 3. Decide */}
      {previa && (
        <div className="sticky bottom-0 rounded-lg border border-primary bg-card p-2 space-y-1.5 shadow-lg">
          <div className="text-xs">
            <b>Prévia:</b> {EFEITO_POR_TIPO[previa.tipo]?.nome} · {fmtTempo(previa.de)}–
            {fmtTempo(previa.ate)}
            <div className="text-[10px] text-muted-foreground">
              Rodando em loop no vídeo. Nada foi salvo ainda.
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 flex-1" onClick={aplicar}>
              <Check className="h-3.5 w-3.5 mr-1" /> Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              title="Pedir ao Claude para montar este efeito com o conteúdo da fala"
              onClick={() => {
                const def = EFEITO_POR_TIPO[previa.tipo];
                onComando(
                  `${def?.comando ?? previa.tipo} na fala "${frase ? limpa(frase.texto) : ""}" (${fmtTempo(previa.de)}–${fmtTempo(previa.ate)}) `,
                );
                setPrevia(null);
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              title="Descartar prévia"
              onClick={() => setPrevia(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
