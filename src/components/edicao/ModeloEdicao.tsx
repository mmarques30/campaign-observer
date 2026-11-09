// Modelo de edição: salva o estilo deste vídeo e aplica em outros (ou em todo vídeo novo).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark, Check, Loader2, Star, Trash2 } from "lucide-react";
import type { Projeto } from "@/lib/vedit";
import type { Timeline } from "@/video/schema";
import {
  aplicarModelo,
  definirPadrao,
  extrairModelo,
  listarModelos,
  removerModelo,
  salvarModelo,
} from "@/lib/modelos";

export function ModeloEdicao({
  projeto,
  tl,
  setTl,
  duracaoFonte,
}: {
  projeto: Projeto;
  tl: Timeline;
  setTl: (t: Timeline, resumo: string) => void;
  duracaoFonte: number;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vedit", "modelos"], queryFn: listarModelos });
  const modelos = q.data ?? [];
  const [escolhido, setEscolhido] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [padrao, setPadrao] = useState(true);
  const [luz, setLuz] = useState(false);
  const [notas, setNotas] = useState("");
  const [coresRef, setCoresRef] = useState(false);

  const atual = tl.modelo?.id;
  const sel = escolhido || atual || "";

  async function salvar() {
    if (!nome.trim()) return toast.error("Dê um nome ao modelo.");
    setSalvando(true);
    try {
      const m = extrairModelo(
        tl,
        {
          nome: nome.trim(),
          projeto_id: projeto.id,
          projeto_nome: projeto.nome,
          objetivo: projeto.objetivo,
          estilo: projeto.estilo,
          duracaoFonte,
        },
        { luz, padrao, notas: notas.trim() },
      );
      await salvarModelo(m);
      await qc.invalidateQueries({ queryKey: ["vedit", "modelos"] });
      setTl({ ...tl, modelo: aplicarModelo(tl, m).modelo }, `Salvou o modelo "${m.nome}"`);
      setAberto(false);
      setNome("");
      setNotas("");
      toast.success(
        padrao
          ? `Modelo "${m.nome}" salvo. Todo vídeo novo já sai assim.`
          : `Modelo "${m.nome}" salvo.`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const selModelo = modelos.find((x) => x.id === sel);
  const base = modelos.filter((m) => m.base);
  const salvos = modelos.filter((m) => !m.base);

  function aplicar() {
    const m = modelos.find((x) => x.id === sel);
    if (!m) return;
    setTl(
      aplicarModelo(tl, m, { coresDaReferencia: coresRef }),
      `Aplicou o modelo "${m.nome}"${coresRef ? " com as cores da referência" : ""}`,
    );
    toast.success(
      `Modelo "${m.nome}" aplicado. Peça /editar para o editor colocar os efeitos no mesmo padrão.`,
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
          Modelo de edição
        </span>
        {tl.modelo && (
          <span className="text-[11px] text-emerald-600 truncate">usando "{tl.modelo.nome}"</span>
        )}
      </div>

      {modelos.length > 0 && (
        <div className="flex gap-1.5">
          <Select value={sel} onValueChange={setEscolhido}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Escolher modelo salvo" />
            </SelectTrigger>
            <SelectContent>
              {base.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px]">Kit das referências</SelectLabel>
                  {base.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {salvos.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px]">Salvos</SelectLabel>
                  {salvos.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.padrao ? "★ " : ""}
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" disabled={!sel} onClick={aplicar}>
            Aplicar
          </Button>
          {sel && !selModelo?.base && (
            <>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                title={
                  modelos.find((m) => m.id === sel)?.padrao
                    ? "Deixar de usar em vídeos novos"
                    : "Usar em todo vídeo novo"
                }
                onClick={async () => {
                  const eraPadrao = modelos.find((m) => m.id === sel)?.padrao;
                  await definirPadrao(eraPadrao ? null : sel);
                  await qc.invalidateQueries({ queryKey: ["vedit", "modelos"] });
                  toast.success(
                    eraPadrao
                      ? "Vídeos novos sem modelo automático."
                      : "Todo vídeo novo vai sair com esse modelo.",
                  );
                }}
              >
                <Star
                  className={
                    modelos.find((m) => m.id === sel)?.padrao
                      ? "h-3.5 w-3.5 fill-amber-400 text-amber-500"
                      : "h-3.5 w-3.5"
                  }
                />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                title="Apagar modelo"
                onClick={async () => {
                  await removerModelo(sel);
                  setEscolhido("");
                  await qc.invalidateQueries({ queryKey: ["vedit", "modelos"] });
                  toast.success("Modelo apagado.");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}

      {selModelo?.base && (
        <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            Feito a partir de: {selModelo.referencias?.join(", ")}. Aplica legenda, look, transição
            e zoom; depois peça <b>/editar</b> para o editor colocar os grafismos, sons e cortes no
            padrão do estilo.
          </p>
          {selModelo.efeitos.includes("texto-atras") && (
            <p className="text-[11px] text-amber-700">
              O título grande passa por trás da sua cabeça: quando a edição pedir, o editor gera
              sozinho o recorte da pessoa (alguns minutos, com a aba aberta). O MP4 só sai depois
              que o recorte estiver pronto.
            </p>
          )}
          {selModelo.paleta && (
            <label className="flex items-center gap-2 text-[11px]">
              <Switch checked={coresRef} onCheckedChange={setCoresRef} />
              Usar as cores da referência
              <span className="flex gap-0.5">
                {Object.values(selModelo.paleta)
                  .filter((c) => typeof c === "string" && c.startsWith("#"))
                  .map((c) => (
                    <span
                      key={c as string}
                      className="h-3 w-3 rounded-md border"
                      style={{ background: c as string }}
                    />
                  ))}
              </span>
              <span className="text-muted-foreground">(desligado = cores da marca)</span>
            </label>
          )}
        </div>
      )}

      {!aberto ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => setAberto(true)}
        >
          <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Salvar o estilo deste vídeo como modelo
        </Button>
      ) : (
        <div className="rounded-lg border p-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Guarda legenda, posição, look, transição, zoom, música e o tipo de efeito que este vídeo
            usa. Cortes e textos não vão (são de cada vídeo).
          </p>
          <Input
            className="h-8 text-xs"
            placeholder="Nome (ex.: Anúncio Business)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Input
            className="h-8 text-xs"
            placeholder="Observação para o editor (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Usar em todo vídeo novo</Label>
            <Switch checked={padrao} onCheckedChange={setPadrao} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Levar a correção de luz e cor</Label>
            <Switch checked={luz} onCheckedChange={setLuz} />
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="h-8 text-xs flex-1" onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}{" "}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
