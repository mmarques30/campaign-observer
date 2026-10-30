// Roteiros a partir de um vídeo de alta performance: a Mariana diz o assunto e o idioma, o Claude
// escreve espelhando o esqueleto da referência (blocos, tamanho da fala e pausas) e ela pede
// ajustes numa conversa. Também salva um reel da Pesquisa como referência de edição.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Send,
  Copy,
  Bookmark,
  BookmarkCheck,
  FileText,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { db } from "@/lib/vedit";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { criarReferenciaPorLink } from "@/lib/referencias";
import { cn } from "@/lib/utils";

export const IDIOMAS_ROTEIRO: Record<string, string> = {
  "pt-BR": "Português (Brasil)",
  en: "Inglês",
  es: "Espanhol",
};

export type Bloco = {
  papel: string;
  ref?: string;
  fala: string;
  inicio_s?: number;
  duracao_s: number;
  pausa_depois_s: number;
  como_falar?: string;
  na_tela?: string;
};
export type RoteiroLinha = {
  id: string;
  created_at: string;
  updated_at: string;
  reel_id: string | null;
  referencia_id: string | null;
  tema: string;
  idioma: string;
  finalidade: string;
  notas: string | null;
  status: "gerando" | "pronto" | "erro";
  erro: string | null;
  estrutura: {
    fonte?: {
      autor?: string | null;
      url?: string | null;
      com_tempos?: boolean;
      metricas?: unknown;
    };
    duracao?: number | null;
    frases?: unknown[];
  } | null;
  roteiro: {
    titulo: string;
    duracao_estimada_s?: number;
    espelho?: string;
    blocos: Bloco[];
    cta: string;
    palavra_chave?: string | null;
    legenda: string;
  } | null;
  mensagens: { papel: "usuario" | "claude"; texto: string; em: string; versao?: number }[];
  versao: number;
  content_item_id: string | null;
};

/** Texto corrido para gravar: fala por fala com as pausas marcadas. */
export function roteiroCorrido(r: NonNullable<RoteiroLinha["roteiro"]>) {
  return r.blocos
    .map(
      (b) =>
        `${b.fala}${b.pausa_depois_s >= 0.3 ? `  [pausa ${b.pausa_depois_s.toFixed(1)}s]` : ""}`,
    )
    .join("\n");
}

/** Salva um reel da Pesquisa como referência de edição (baixa, transcreve e analisa no servidor). */
export async function salvarReelComoReferencia(reel: {
  id: string;
  permalink: string | null;
  caption: string | null;
  username: string | null;
  like_count?: number | null;
  comments_count?: number | null;
  indice?: number | null;
}) {
  if (!reel.permalink) throw new Error("este reel não tem link");
  const id = await criarReferenciaPorLink({ url: reel.permalink, legenda: reel.caption ?? "" });
  await db()
    .from("vedit_referencias")
    .update({
      autor: reel.username,
      metricas: {
        curtidas: reel.like_count ?? null,
        comentarios: reel.comments_count ?? null,
        indice: reel.indice ?? null,
        origem: "pesquisa",
      },
    })
    .eq("id", id)
    .is("autor", null);
  await db().from("vedit_nicho_reels").update({ referencia_id: id }).eq("id", reel.id);
  return id;
}

export function BotaoSalvarReferencia({
  reel,
  onSalvo,
}: {
  reel: Parameters<typeof salvarReelComoReferencia>[0] & { referencia_id?: string | null };
  onSalvo?: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const ref = useQuery({
    queryKey: ["vedit", "referencia-status", reel.referencia_id],
    enabled: !!reel.referencia_id,
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | undefined)?.status;
      return s && s !== "pronta" && s !== "erro" ? 5000 : false;
    },
    queryFn: async () =>
      (
        await db()
          .from("vedit_referencias")
          .select("status")
          .eq("id", reel.referencia_id!)
          .maybeSingle()
      ).data as { status: string } | null,
  });
  if (reel.referencia_id && ref.data) {
    const pronta = ref.data.status === "pronta";
    return (
      <Badge variant="outline" className="gap-1">
        {pronta ? (
          <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        )}
        {pronta
          ? "Salvo em Referências"
          : ref.data.status === "erro"
            ? "Erro ao salvar (veja Referências)"
            : "Salvando em Referências…"}
      </Badge>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={salvando}
      onClick={async () => {
        setSalvando(true);
        try {
          await salvarReelComoReferencia(reel);
          toast.success(
            "Salvando em Referências: baixa o vídeo, transcreve e analisa a edição (1 a 2 minutos).",
          );
          onSalvo?.();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setSalvando(false);
        }
      }}
    >
      {salvando ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bookmark className="h-4 w-4 mr-2" />
      )}
      Salvar como referência
    </Button>
  );
}

/** Janela "Criar roteiro com esta estrutura". */
export function NovoRoteiro({
  aberto,
  onFechar,
  reelId,
  referenciaId,
  origem,
  comTempos,
  onCriado,
}: {
  aberto: boolean;
  onFechar: () => void;
  reelId?: string | null;
  referenciaId?: string | null;
  origem: string;
  comTempos: boolean;
  onCriado: (id: string) => void;
}) {
  const [tema, setTema] = useState("");
  const [idioma, setIdioma] = useState("pt-BR");
  const [finalidade, setFinalidade] = useState("organico");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar() {
    if (!tema.trim()) return toast.error("Diga o assunto do vídeo.");
    setEnviando(true);
    try {
      const r: any = await callEdgeFunction("vedit-roteiro", {
        acao: "criar",
        reel_id: reelId ?? null,
        referencia_id: referenciaId ?? null,
        tema,
        idioma,
        finalidade,
        notas,
      });
      if (r?.error) throw new Error(r.error);
      setTema("");
      setNotas("");
      onCriado(r.id);
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !enviando && onFechar()}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Criar roteiro com esta estrutura</DialogTitle>
          <DialogDescription>
            Usa o esqueleto de {origem}: mesmo gancho, mesmas viradas, o mesmo tamanho de fala por
            bloco e as mesmas pausas. O assunto e os exemplos são seus.
          </DialogDescription>
        </DialogHeader>
        {!comTempos && (
          <p className="text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2 dark:bg-amber-950/40 dark:text-amber-200">
            Este vídeo ainda não foi salvo como referência, então o roteiro sai pela estrutura da
            legenda, sem as pausas exatas. Para usar as pausas reais, salve como referência antes e
            espere ficar pronto.
          </p>
        )}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Assunto do seu vídeo</Label>
            <Textarea
              rows={3}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="ex.: donos que pagam agência há um ano e não sabem de onde vem a venda"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select value={idioma} onValueChange={setIdioma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IDIOMAS_ROTEIRO).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Para</Label>
              <Select value={finalidade} onValueChange={setFinalidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organico">Orgânico</SelectItem>
                  <SelectItem value="anuncio">Anúncio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ex.: citar o caso da transportadora, terminar com a palavra DIAGNÓSTICO"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={criar} disabled={enviando}>
            {enviando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Criar roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const fmtS = (s?: number) => (s == null ? "" : `${s.toFixed(1)}s`);

/** Painel do roteiro: blocos com tempos e pausas + conversa de ajustes. */
export function PainelRoteiro({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const qc = useQueryClient();
  const [pedido, setPedido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimChat = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ["vedit", "roteiro", id],
    enabled: !!id,
    refetchInterval: (qq) =>
      (qq.state.data as RoteiroLinha | undefined)?.status === "gerando" ? 3000 : false,
    queryFn: async () =>
      (await db().from("vedit_roteiros").select("*").eq("id", id!).single()).data as RoteiroLinha,
  });
  const r = q.data;
  const gerando = r?.status === "gerando";
  useEffect(() => {
    fimChat.current?.scrollIntoView({ block: "end" });
  }, [r?.mensagens?.length, gerando]);
  useEffect(() => {
    if (r && r.status !== "gerando") qc.invalidateQueries({ queryKey: ["vedit", "roteiros"] });
  }, [r?.status, r?.versao, qc, r]);

  async function acao(corpo: Record<string, unknown>, ok?: string) {
    setEnviando(true);
    try {
      const x: any = await callEdgeFunction("vedit-roteiro", { id, ...corpo });
      if (x?.error) throw new Error(x.error);
      if (ok) toast.success(ok);
      await q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  async function ajustar() {
    if (!pedido.trim()) return;
    const p = pedido;
    setPedido("");
    await acao({ acao: "ajustar", pedido: p });
  }
  const ro = r?.roteiro;
  const fonte = r?.estrutura?.fonte;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle className="pr-6">{ro?.titulo ?? r?.tema ?? "Roteiro"}</SheetTitle>
          <SheetDescription>
            {r && (
              <>
                {IDIOMAS_ROTEIRO[r.idioma] ?? r.idioma} ·{" "}
                {r.finalidade === "anuncio" ? "anúncio" : "orgânico"}
                {fonte?.autor ? ` · esqueleto de @${fonte.autor}` : ""}
                {r.estrutura?.duracao ? ` (${r.estrutura.duracao.toFixed(0)}s)` : ""}
                {r.versao ? ` · versão ${r.versao}` : ""}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {!r ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : r.status === "erro" && !ro ? (
          <div className="space-y-2 text-sm">
            <p className="text-red-600">Não consegui escrever o roteiro: {r.erro}</p>
            <Button size="sm" onClick={() => acao({ acao: "refazer" })} disabled={enviando}>
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar de novo
            </Button>
          </div>
        ) : !ro ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Escrevendo o roteiro no esqueleto da
            referência (cerca de 1 minuto)…
          </div>
        ) : (
          <>
            {fonte && !fonte.com_tempos && (
              <p className="text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2 dark:bg-amber-950/40 dark:text-amber-200">
                Feito pela estrutura da legenda, sem as pausas exatas do vídeo. Salve o vídeo como
                referência e clique em Refazer para usar o ritmo real.
              </p>
            )}
            {ro.espelho && <p className="text-sm text-muted-foreground">{ro.espelho}</p>}
            <div className="rounded-lg border divide-y">
              {ro.blocos.map((b, i) => (
                <div key={i} className="p-3 grid grid-cols-[64px_1fr] gap-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-mono">{fmtS(b.inicio_s)}</div>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {b.papel}
                    </Badge>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm leading-relaxed">{b.fala}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{fmtS(b.duracao_s)} de fala</span>
                      {b.pausa_depois_s >= 0.3 && (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <Timer className="h-3 w-3" /> pausa {b.pausa_depois_s.toFixed(1)}s
                        </span>
                      )}
                      {b.ref && <span>espelha a frase {b.ref}</span>}
                    </div>
                    {b.como_falar && (
                      <p className="text-xs text-muted-foreground">
                        <b>Como falar:</b> {b.como_falar}
                      </p>
                    )}
                    {b.na_tela && (
                      <p className="text-xs text-muted-foreground">
                        <b>Na tela:</b> {b.na_tela}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm space-y-1">
              <p>
                <b>CTA:</b> {ro.cta}
                {ro.palavra_chave ? ` (palavra: ${ro.palavra_chave})` : ""}
              </p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                <b>Legenda:</b> {ro.legenda}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${roteiroCorrido(ro)}\n\nCTA: ${ro.cta}`);
                  toast.success("Roteiro copiado, com as pausas marcadas.");
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copiar roteiro
              </Button>
              {r.content_item_id ? (
                <Badge variant="outline">Já está no Marketing</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={enviando || gerando}
                  onClick={() =>
                    acao({ acao: "enviar_marketing" }, "Roteiro criado na página de Marketing.")
                  }
                >
                  <Send className="h-4 w-4 mr-2" /> Enviar para o Marketing
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={enviando || gerando}
                onClick={() => {
                  if (confirm("Refazer do zero? A conversa e as versões atuais são substituídas."))
                    void acao({ acao: "refazer" });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refazer
              </Button>
            </div>
          </>
        )}

        {r && (r.roteiro || r.mensagens?.length > 0) && (
          <div className="rounded-lg border p-3 space-y-3 mt-auto">
            <div className="text-sm font-semibold">Ajustes</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {r.mensagens.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "group relative rounded-lg px-3 py-2 text-sm max-w-[85%] select-text whitespace-pre-wrap",
                    m.papel === "usuario"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {m.texto}
                  {m.versao ? (
                    <span className="block text-[10px] opacity-70 mt-1">versão {m.versao}</span>
                  ) : null}
                  <BotaoCopiar
                    texto={m.texto}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100"
                  />
                </div>
              ))}
              {gerando && r.roteiro && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ajustando o roteiro…
                </div>
              )}
              <div ref={fimChat} />
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                rows={2}
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ajustar();
                  }
                }}
                placeholder="ex.: troque o exemplo do bloco 3 por um de transportadora; gancho mais curto"
                disabled={!r.roteiro}
              />
              <Button
                onClick={ajustar}
                disabled={!pedido.trim() || enviando || gerando || !r.roteiro}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
