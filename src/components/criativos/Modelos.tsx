// Modelos de criativo: salvar um criativo pronto como modelo (a estrutura: slides, layouts,
// visuais, tema) e escolher um modelo ao criar um novo — o Claude mantém a estrutura e troca
// só o conteúdo pelo do briefing/roteiro.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Check, LayoutTemplate, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlideEscalado } from "@/components/criativos/SlideView";
import { db } from "@/lib/vedit";
import { chamarAgente, useFotos } from "@/lib/criativos";
import { normalizarDesign, type CriaProjeto, type Design, type Formato } from "@/criativos/design";
import { cn } from "@/lib/utils";

export type CriaModelo = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "carrossel" | "unico";
  formato: Formato;
  design: unknown;
  origem_id: string | null;
  created_at: string;
};

export function useModelos() {
  return useQuery({
    queryKey: ["cria", "modelos"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("cria_modelos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CriaModelo[];
    },
  });
}

/** Botão + janela "Salvar como modelo" do editor de criativo. */
export function SalvarModelo({
  projeto,
  design,
  disabled,
}: {
  projeto: CriaProjeto;
  design: Design | null;
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!design?.slides?.length) return;
    setSalvando(true);
    try {
      const { error } = await db()
        .from("cria_modelos")
        .insert({
          nome: nome.trim() || projeto.nome,
          descricao: descricao.trim() || null,
          tipo: projeto.tipo,
          formato: projeto.formato,
          design,
          origem_id: projeto.id,
        });
      if (error) throw new Error(error.message);
      qc.invalidateQueries({ queryKey: ["cria", "modelos"] });
      toast.success("Modelo salvo. Ele aparece em Novo criativo.");
      setAberto(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || !design?.slides?.length}
        onClick={() => {
          setNome(projeto.nome);
          setDescricao("");
          setAberto(true);
        }}
      >
        <Bookmark className="h-4 w-4 mr-1.5" /> Salvar como modelo
      </Button>
      <Dialog open={aberto} onOpenChange={(o) => !salvando && setAberto(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>
              Guarda a estrutura deste criativo: quantidade de slides, layout de cada um, visuais,
              botões, cores e fontes. Num criativo novo baseado nele, o Claude mantém essa estrutura
              e troca só o conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do modelo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Quando usar (opcional)</Label>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: bastidor de caso real, 6 slides, termina com botão Quero conversar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Lista de modelos para escolher ao criar um criativo novo (clique de novo para desmarcar). */
export function EscolherModelo({
  valor,
  onChange,
}: {
  valor: string | null;
  onChange: (m: CriaModelo | null) => void;
}) {
  const qc = useQueryClient();
  const modelos = useModelos();
  const fotos = useFotos();
  const lista = modelos.data ?? [];
  if (modelos.isError || !lista.length) return null;

  async function excluir(m: CriaModelo) {
    if (!confirm(`Excluir o modelo "${m.nome}"? Os criativos feitos com ele continuam.`)) return;
    const { error } = await db().from("cria_modelos").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    if (valor === m.id) onChange(null);
    qc.invalidateQueries({ queryKey: ["cria", "modelos"] });
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        Meus modelos (o Claude mantém a estrutura e troca o conteúdo)
      </Label>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {lista.map((m) => {
          const d = normalizarDesign(m.design);
          const s = d.slides[0];
          const on = valor === m.id;
          return (
            <div
              key={m.id}
              className={cn(
                "group relative w-28 shrink-0 rounded-lg border p-1.5 text-left cursor-pointer",
                on ? "border-primary ring-2 ring-primary" : "hover:bg-muted",
              )}
              onClick={() => onChange(on ? null : m)}
              title={m.descricao ?? m.nome}
            >
              <div className="rounded overflow-hidden bg-muted">
                {s && fotos.data ? (
                  <SlideEscalado
                    slide={s}
                    design={d}
                    formato={m.formato}
                    fotos={fotos.data.porId}
                    indice={0}
                    total={d.slides.length}
                  />
                ) : (
                  <div className="aspect-[4/5]" />
                )}
              </div>
              <div className="mt-1 text-[11px] font-medium leading-tight line-clamp-2">
                {m.nome}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {m.tipo === "unico" ? "Post único" : `${d.slides.length} slides`} · {m.formato}
              </div>
              {on && (
                <Check className="absolute top-2 left-2 h-4 w-4 rounded-full bg-primary text-primary-foreground p-0.5" />
              )}
              <button
                type="button"
                title="Excluir modelo"
                className="absolute top-2 right-2 h-6 w-6 rounded bg-background/90 items-center justify-center hidden group-hover:flex hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  void excluir(m);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Botão + janela "Aplicar modelo" do editor: refaz o criativo na estrutura/visual do modelo,
 * mantendo o conteúdo que já está nele. */
export function AplicarModelo({
  projeto,
  disabled,
  temAlteracaoNaoSalva,
}: {
  projeto: CriaProjeto;
  disabled?: boolean;
  temAlteracaoNaoSalva?: boolean;
}) {
  const qc = useQueryClient();
  const modelos = useModelos();
  const [aberto, setAberto] = useState(false);
  const [modelo, setModelo] = useState<CriaModelo | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (modelos.isError || !(modelos.data ?? []).length) return null;

  async function aplicar() {
    if (!modelo) return;
    setEnviando(true);
    try {
      await chamarAgente({ acao: "aplicar_modelo", projeto_id: projeto.id, modelo_id: modelo.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cria", "projeto", projeto.id] }),
        qc.invalidateQueries({ queryKey: ["cria", "mensagens", projeto.id] }),
      ]);
      toast.success("Aplicando o modelo. Leva cerca de 1 minuto; dá para desfazer depois.");
      setAberto(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setModelo(null);
          setAberto(true);
        }}
      >
        <LayoutTemplate className="h-4 w-4 mr-1.5" /> Aplicar modelo
      </Button>
      <Dialog open={aberto} onOpenChange={(o) => !enviando && setAberto(o)}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Aplicar um modelo neste criativo</DialogTitle>
            <DialogDescription>
              O Claude mantém o conteúdo deste criativo (textos, dados e a ordem das ideias) e refaz
              o layout no modelo escolhido: cores, fontes, layout de cada slide, visuais, rótulos,
              botão e logo. A versão atual fica guardada; se não gostar, é só clicar em Desfazer.
            </DialogDescription>
          </DialogHeader>
          <EscolherModelo valor={modelo?.id ?? null} onChange={setModelo} />
          {temAlteracaoNaoSalva && (
            <p className="text-xs text-amber-700">
              Você tem edições não salvas. Salve antes, senão elas ficam de fora.
            </p>
          )}
          <DialogFooter>
            <Button onClick={aplicar} disabled={!modelo || enviando}>
              {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {modelo ? `Aplicar "${modelo.nome}"` : "Escolha um modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
