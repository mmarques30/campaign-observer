import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Preview } from "@/components/edicao/Preview";
import { EFEITOS, type Categoria } from "@/video/catalogo";
import { ESTILOS_LEGENDA, timelineSchema, type Palavra, type ReelProps } from "@/video/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ads/edicao/efeitos")({
  component: Galeria,
});

const ROTULO: Record<Categoria, string> = {
  texto: "Texto",
  dados: "Dados",
  interface: "Interface",
  midia: "Mídia",
  transicao: "Transição",
  cta: "CTA",
};

// Frase de exemplo para as legendas (tempos fictícios).
const FRASE = "A IAplicada automatiza o atendimento da sua empresa em sete dias".split(" ");
const PALAVRAS: Palavra[] = FRASE.map((p, i) => ({
  p,
  i: 0.3 + i * 0.36,
  f: 0.3 + i * 0.36 + 0.3,
}));

function Galeria() {
  const [tipo, setTipo] = useState<string>("vidro");
  const [legenda, setLegenda] = useState<string | null>(null);
  const def = EFEITOS.find((e) => e.tipo === tipo)!;

  const props: ReelProps = useMemo(() => {
    if (legenda) {
      const tl = timelineSchema.parse({
        legenda: {
          estilo: legenda,
          destaques: [1, 4],
          palavrasPorBloco: legenda === "impacto" ? 1 : 3,
        },
      });
      return {
        timeline: tl,
        palavras: PALAVRAS,
        fonteUrl: "",
        duracaoFonte: 5,
        midias: {},
        modoGaleria: true,
      };
    }
    const dur = def.duracaoPadrao;
    const tl = timelineSchema.parse({
      legenda: { ativa: false },
      efeitos: [{ id: "g", tipo: def.tipo, de: 0.2, ate: 0.2 + dur, props: {} }],
      sfx: def.somPadrao ? [{ em: 0.2, som: def.somPadrao, volume: 0.5 }] : [],
    });
    return {
      timeline: tl,
      palavras: [],
      fonteUrl: "",
      duracaoFonte: dur + 0.8,
      midias: {},
      modoGaleria: true,
    };
  }, [def, legenda]);

  const disponiveis = EFEITOS.filter((e) => e.disponivel);
  const fase2 = EFEITOS.filter((e) => !e.disponivel);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca de efeitos</h1>
        <p className="text-sm text-muted-foreground">
          Cada efeito vira um comando de barra no editor. O Claude só usa o que está aqui, por isso
          a qualidade é sempre a mesma.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Disponíveis ({disponiveis.length})
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {disponiveis.map((e) => (
                <button
                  key={e.tipo}
                  onClick={() => {
                    setTipo(e.tipo);
                    setLegenda(null);
                  }}
                  className="text-left"
                >
                  <Card
                    className={cn(
                      "h-full transition hover:border-primary/50",
                      tipo === e.tipo && !legenda && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{e.nome}</span>
                        <span className="font-mono text-xs text-primary">{e.comando}</span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {e.descricao}
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {ROTULO[e.categoria]}
                        </Badge>
                        {e.telaCheia && (
                          <Badge variant="outline" className="text-[10px]">
                            tela cheia
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estilos de legenda
            </div>
            <div className="flex flex-wrap gap-2">
              {ESTILOS_LEGENDA.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={legenda === s ? "default" : "outline"}
                  onClick={() => setLegenda(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fase 2 (precisam recortar a pessoa do fundo ou gerar cena por IA)
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {fase2.map((e) => (
                <Card key={e.tipo} className="opacity-70">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{e.nome}</span>
                      <span className="font-mono text-xs text-muted-foreground">{e.comando}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{e.descricao}</div>
                    {e.inspiracao && (
                      <div className="text-[10px] text-muted-foreground">Ref.: {e.inspiracao}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-20 self-start space-y-3">
          <Preview
            key={legenda ?? tipo}
            props={props}
            loop
            autoPlay
            controles
            className="mx-auto w-full max-w-[340px]"
            maxAltura="70vh"
          />
          {!legenda && (
            <Card>
              <CardContent className="p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{def.nome}</span>
                  <span className="font-mono text-primary">{def.comando}</span>
                </div>
                <div className="text-muted-foreground">{def.descricao}</div>
                <div>
                  <span className="font-medium">Quando usar:</span> {def.quandoUsar}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Parâmetros:</span> {def.params}
                </div>
                {def.inspiracao && (
                  <div className="text-xs text-muted-foreground">Referência: {def.inspiracao}</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
