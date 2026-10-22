import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { Preview } from "@/components/edicao/Preview";
import { db, type Marca } from "@/lib/vedit";
import { FONTES } from "@/video/fontes";
import {
  ESTILOS_LEGENDA,
  timelineSchema,
  type Palavra,
  type ReelProps,
  type Timeline,
} from "@/video/schema";

export const Route = createFileRoute("/_authenticated/ads/edicao/marca")({
  component: MarcaPage,
});

const FRASE = "Sua empresa respondendo lead em um minuto com IA".split(" ");
const PALAVRAS: Palavra[] = FRASE.map((p, i) => ({
  p,
  i: 2.6 + i * 0.34,
  f: 2.6 + i * 0.34 + 0.3,
}));

function MarcaPage() {
  const q = useQuery({
    queryKey: ["vedit", "marcas"],
    queryFn: async () =>
      ((await db().from("vedit_marcas").select("*").order("padrao", { ascending: false })).data ??
        []) as Marca[],
  });
  const atual = q.data?.[0];
  const [m, setM] = useState<Timeline["marca"] | null>(null);
  const [estilo, setEstilo] = useState("karaoke");
  const [instrucoes, setInstrucoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (atual && !m) {
      setM(timelineSchema.shape.marca.parse(atual.marca));
      setEstilo(atual.legenda_estilo);
      setInstrucoes(atual.instrucoes ?? "");
    }
  }, [atual, m]);
  const marca = m ?? timelineSchema.shape.marca.parse({});

  const props: ReelProps = useMemo(() => {
    const tl = timelineSchema.parse({
      marca,
      legenda: { estilo, destaques: [4, 7] },
      efeitos: [
        {
          id: "t",
          tipo: "titulo",
          de: 0.1,
          ate: 2.4,
          props: {
            texto: "Atendimento que *nunca dorme*",
            subtitulo: "IA aplicada ao seu negócio",
          },
        },
        {
          id: "c",
          tipo: "cta-final",
          de: 5.9,
          ate: 7.6,
          props: { palavra: "QUERO", miniaturas: false },
        },
      ],
    });
    return {
      timeline: tl,
      palavras: PALAVRAS,
      fonteUrl: "",
      duracaoFonte: 7.6,
      midias: {},
      modoGaleria: true,
    };
  }, [marca, estilo]);

  async function salvar() {
    setSalvando(true);
    try {
      const dados = { marca, legenda_estilo: estilo, instrucoes };
      const r = atual
        ? await db().from("vedit_marcas").update(dados).eq("id", atual.id)
        : await db()
            .from("vedit_marcas")
            .insert({ ...dados, nome: "IAplicada", padrao: true });
      if (r.error) throw new Error(r.error.message);
      toast.success("Marca salva. Vale para os próximos pedidos ao Claude.");
      q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const cor = (k: keyof Timeline["marca"], rotulo: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{rotulo}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={String(marca[k])}
          onChange={(e) => setM({ ...marca, [k]: e.target.value })}
          className="h-9 w-10 rounded border bg-transparent"
        />
        <Input
          value={String(marca[k])}
          onChange={(e) => setM({ ...marca, [k]: e.target.value })}
          className="h-9 font-mono text-xs"
        />
      </div>
    </div>
  );
  const fonte = (k: keyof Timeline["marca"], rotulo: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{rotulo}</Label>
      <Select value={String(marca[k])} onValueChange={(v) => setM({ ...marca, [k]: v })}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTES.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marca do editor</h1>
        <p className="text-sm text-muted-foreground">
          Cores, fontes, estilo de legenda e o guia de tom que o Claude segue em toda edição.
        </p>
      </div>
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{atual?.nome ?? "IAplicada"}</CardTitle>
              <CardDescription>Padrão para vídeos novos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {cor("primaria", "Cor principal")}
                {cor("destaque", "Cor de destaque")}
                {cor("texto", "Texto")}
                {cor("fundo", "Fundo das cartelas")}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {fonte("fonteTitulo", "Fonte de título")}
                {fonte("fonteLegenda", "Fonte de apoio")}
                {fonte("fonteSerif", "Fonte editorial")}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estilo de legenda padrão</Label>
                <Select value={estilo} onValueChange={setEstilo}>
                  <SelectTrigger className="h-9 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTILOS_LEGENDA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Guia de estilo para o Claude</Label>
                <Textarea
                  rows={7}
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Tom, palavras proibidas, público, referências de Reels que você gosta…"
                />
              </div>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar marca
              </Button>
            </CardContent>
          </Card>
          <div className="lg:sticky lg:top-20 self-start">
            <Preview
              props={props}
              loop
              autoPlay
              className="mx-auto w-full max-w-[320px]"
              maxAltura="70vh"
            />
          </div>
        </div>
      )}
    </div>
  );
}
