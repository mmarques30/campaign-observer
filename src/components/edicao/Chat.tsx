import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, Loader2, Sparkles } from "lucide-react";
import { COMANDOS, EFEITOS } from "@/video/catalogo";
import type { Cena, Mensagem } from "@/lib/vedit";
import { fmtTempo } from "@/lib/vedit";
import { cn } from "@/lib/utils";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { BotaoVoz } from "@/components/BotaoVoz";

type Sugestao = { comando: string; titulo: string; descricao: string };

const SUGESTOES: Sugestao[] = [
  ...COMANDOS.map((c) => ({ comando: c.comando, titulo: c.titulo, descricao: c.descricao })),
  ...EFEITOS.filter((e) => e.disponivel).map((e) => ({
    comando: e.comando,
    titulo: e.nome,
    descricao: e.descricao,
  })),
];

const ATALHOS = [
  "/editar edição completa no padrão do Reels",
  "/storyboard",
  "/cortar",
  "/gancho",
  "/variacoes 3",
];

export function Chat({
  mensagens,
  enviando,
  onEnviar,
  storyboardPendente,
  rascunho,
  setRascunho,
}: {
  mensagens: Mensagem[];
  enviando: boolean;
  onEnviar: (t: string) => void;
  storyboardPendente: Cena[] | null;
  rascunho: string;
  setRascunho: (t: string) => void;
}) {
  const fim = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length, enviando]);

  const filtro = /^\/\S*$/.test(rascunho) ? rascunho.toLowerCase() : null;
  const sugestoes = useMemo(
    () => (filtro ? SUGESTOES.filter((s) => s.comando.startsWith(filtro)).slice(0, 8) : []),
    [filtro],
  );
  useEffect(() => setSel(0), [filtro]);

  function enviar() {
    const t = rascunho.trim();
    if (!t || enviando) return;
    onEnviar(t);
    setRascunho("");
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {mensagens.length === 0 && (
          <div className="text-sm text-muted-foreground space-y-3 p-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> O que você quer neste vídeo?
            </div>
            <p>
              Escreva normal ("deixa no padrão do Reels, com a placa de vidro nos números") ou use
              um comando com barra. Digite <b>/</b> para ver todos.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATALHOS.map((a) => (
                <button
                  key={a}
                  onClick={() => onEnviar(a)}
                  className="text-xs border rounded-full px-2.5 py-1 hover:bg-accent"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.papel === "usuario" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "group relative max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap select-text",
                m.papel === "usuario"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : m.papel === "sistema"
                    ? "bg-muted text-muted-foreground text-xs"
                    : "bg-card border rounded-bl-sm",
              )}
            >
              {m.comando && m.papel === "usuario" ? (
                <>
                  <span className="font-mono font-semibold">{m.comando}</span>
                  {m.conteudo.slice(m.comando.length)}
                </>
              ) : (
                m.conteudo
              )}
              {m.storyboard && m.storyboard.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.storyboard.map((c) => (
                    <div key={c.cena} className="rounded-lg bg-muted/60 p-2 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>Cena {c.cena}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtTempo(c.de)}–{fmtTempo(c.ate)}
                        </span>
                      </div>
                      <div className="italic text-muted-foreground">"{c.fala}"</div>
                      <div>{c.visual}</div>
                      {(c.efeito || c.som) && (
                        <div className="text-primary">
                          {[c.efeito, c.som && `som: ${c.som}`].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {m.versao != null && m.papel === "claude" && (
                <div className="text-[10px] opacity-60 mt-1">versão {m.versao}</div>
              )}
              {m.papel !== "sistema" && (
                <BotaoCopiar
                  texto={m.conteudo}
                  className="absolute -bottom-2 right-1 bg-background text-foreground border shadow-sm opacity-0 group-hover:opacity-100"
                />
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Editando… (edições completas levam até 1
            min)
          </div>
        )}
        <div ref={fim} />
      </div>

      {storyboardPendente && !enviando && (
        <div className="px-3 pb-2 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onEnviar("Aprovado, pode aplicar o storyboard.")}
          >
            <Check className="h-4 w-4 mr-1" /> Aprovar e aplicar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRascunho("Ajusta o storyboard: ")}>
            Pedir ajuste
          </Button>
        </div>
      )}

      <div className="relative border-t p-3">
        {sugestoes.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border bg-popover shadow-lg overflow-hidden z-20">
            {sugestoes.map((s, i) => (
              <button
                key={s.comando}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setRascunho(`${s.comando} `);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent",
                  i === sel && "bg-accent",
                )}
              >
                <div className="text-sm">
                  <span className="font-mono font-semibold">{s.comando}</span>{" "}
                  <span className="text-muted-foreground">· {s.titulo}</span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{s.descricao}</div>
              </button>
            ))}
          </div>
        )}
        <div className="rounded-2xl border bg-card p-2 focus-within:ring-2 ring-primary/30">
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (sugestoes.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                setSel(
                  (s) =>
                    (s + (e.key === "ArrowDown" ? 1 : -1) + sugestoes.length) % sugestoes.length,
                );
                return;
              }
              if (sugestoes.length && (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey))) {
                e.preventDefault();
                setRascunho(`${sugestoes[sel].comando} `);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Peça uma edição ou digite / para os comandos"
            rows={2}
            className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-0 p-1"
          />
          <div className="flex justify-end gap-1.5">
            <BotaoVoz
              className="h-8 w-8 rounded-full"
              disabled={enviando}
              onTexto={(t) => setRascunho(rascunho.trim() ? `${rascunho.trim()} ${t}` : t)}
            />
            <Button
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={enviar}
              disabled={!rascunho.trim() || enviando}
              aria-label="Enviar"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
