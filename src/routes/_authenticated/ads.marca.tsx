import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePermissoes } from "@/lib/permissoes";
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
import { ImagePlus, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Preview } from "@/components/edicao/Preview";
import { assinar, BUCKET, db, type Marca } from "@/lib/vedit";
import { FONTES } from "@/video/fontes";
import {
  ESTILOS_LEGENDA,
  timelineSchema,
  type Palavra,
  type ReelProps,
  type Timeline,
} from "@/video/schema";

export const Route = createFileRoute("/_authenticated/ads/marca")({
  component: MarcaPage,
});

const FRASE = "Sua empresa respondendo lead em um minuto com IA".split(" ");
const PALAVRAS: Palavra[] = FRASE.map((p, i) => ({
  p,
  i: 2.6 + i * 0.34,
  f: 2.6 + i * 0.34 + 0.3,
}));

function MarcaPage() {
  const empresa = usePermissoes().empresa;
  const empresaNome = empresa?.nome;
  const [perfil, setPerfil] = useState({ o_que_faz: "", nicho: "", publico: "", objetivo: "" });
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [subindoLogo, setSubindoLogo] = useState(false);
  const logoUrl = useQuery({
    queryKey: ["vedit", "marca-logo", logoPath],
    enabled: !!logoPath,
    queryFn: () => assinar(logoPath!),
  });
  async function enviarLogo(arquivo: File) {
    if (!empresa?.id) return;
    setSubindoLogo(true);
    try {
      const ext = (arquivo.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `marca/${empresa.id}/logo-${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, arquivo, { contentType: arquivo.type || "image/png", upsert: true });
      if (up.error) throw new Error(up.error.message);
      setLogoPath(path);
      toast.success("Logo enviada. Clique em Salvar marca para valer.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubindoLogo(false);
    }
  }
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
      setPerfil({
        o_que_faz: atual.o_que_faz ?? "",
        nicho: atual.nicho ?? "",
        publico: atual.publico ?? "",
        objetivo: atual.objetivo ?? "",
      });
      setLogoPath(atual.logo_path ?? null);
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
      const dados = {
        marca,
        legenda_estilo: estilo,
        instrucoes,
        logo_path: logoPath,
        o_que_faz: perfil.o_que_faz.trim() || null,
        nicho: perfil.nicho.trim() || null,
        publico: perfil.publico.trim() || null,
        objetivo: perfil.objetivo.trim() || null,
      };
      const gravar = (d: Record<string, unknown>) =>
        atual
          ? db().from("vedit_marcas").update(d).eq("id", atual.id)
          : db()
              .from("vedit_marcas")
              .insert({ ...d, nome: empresaNome ?? "Marca", padrao: true });
      let r = await gravar(dados);
      // Banco ainda sem os campos novos (logo e perfil): salva o resto e avisa.
      if (
        r.error &&
        /logo_path|o_que_faz|nicho|publico|objetivo|schema cache/i.test(r.error.message)
      ) {
        r = await gravar({ marca, legenda_estilo: estilo, instrucoes });
        if (!r.error) {
          toast.warning(
            "Cores, fontes e guia salvos. Logo e dados do negócio ainda não puderam ser gravados.",
          );
          q.refetch();
          return;
        }
      }
      if (r.error) throw new Error(r.error.message);
      toast.success("Marca salva. Vale para os próximos vídeos, roteiros e criativos.");
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
          className="h-9 w-10 rounded-lg border bg-transparent"
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
        <h1 className="text-2xl font-bold tracking-tight">Marca</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A identidade e o negócio da empresa. O que você cadastra aqui é usado na edição de vídeos,
          nos roteiros, nas legendas e nos criativos.
        </p>
      </div>
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{atual?.nome ?? empresaNome ?? "Marca"}</CardTitle>
              <CardDescription>Vale para os próximos vídeos, roteiros e criativos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <Label className="text-xs">Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-40 rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {logoUrl.data ? (
                      <img
                        src={logoUrl.data}
                        alt="Logo"
                        className="max-h-14 max-w-36 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">sem logo</span>
                    )}
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-sm hover:bg-muted">
                    {subindoLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    {logoPath ? "Trocar logo" : "Enviar logo"}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void enviarLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  PNG com fundo transparente funciona melhor. Entra no vídeo quando a pessoa se
                  apresenta ou cita a empresa.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">O que a empresa faz</Label>
                <Textarea
                  rows={3}
                  value={perfil.o_que_faz}
                  onChange={(e) => setPerfil({ ...perfil, o_que_faz: e.target.value })}
                  placeholder="Em 2 ou 3 frases: o que vende ou entrega, e para quem."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nicho</Label>
                  <Input
                    value={perfil.nicho}
                    onChange={(e) => setPerfil({ ...perfil, nicho: e.target.value })}
                    placeholder="ex.: advocacia de família e sucessões"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Público</Label>
                  <Input
                    value={perfil.publico}
                    onChange={(e) => setPerfil({ ...perfil, publico: e.target.value })}
                    placeholder="ex.: famílias com patrimônio a organizar"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Objetivo do conteúdo</Label>
                <Input
                  value={perfil.objetivo}
                  onChange={(e) => setPerfil({ ...perfil, objetivo: e.target.value })}
                  placeholder="ex.: gerar pedidos de consulta; ser lembrado como referência no tema"
                />
              </div>
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
