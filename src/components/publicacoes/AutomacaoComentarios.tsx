// Automação de comentários (estilo ManyChat): quem comenta a palavra no post recebe uma resposta
// pública (sorteada entre variantes) e uma DM em blocos — texto, imagem, link com botão, passo
// a passo — e entra no CRM. Editor + lista + log, usados em Publicados e na página Automações.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  Loader2,
  MessageSquareText,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/vedit";
import { useFotos } from "@/lib/criativos";
import { cn } from "@/lib/utils";

export type Bloco =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem"; path?: string; url?: string; legenda?: string }
  | { tipo: "link"; titulo: string; texto?: string; url: string; botao?: string }
  | { tipo: "passos"; titulo?: string; passos: string[] };

export type Automacao = {
  id: string;
  nome: string | null;
  post_url: string;
  post_id: string | null;
  publicacao_id: string | null;
  keyword: string;
  palavras: string[];
  respostas: string[];
  comment_reply: string;
  dm_message: string;
  dm_link: string | null;
  dm: Bloco[];
  is_active: boolean;
  replies_count: number;
  dms_enviadas: number;
  dms_pendentes: number;
  ultimo_erro: string | null;
  varrido_em: string | null;
  created_at: string;
  updated_at: string;
};

export type LogComentario = {
  id: string;
  automation_id: string;
  comment_id: string;
  commenter_username: string | null;
  comment_text: string | null;
  replied_at: string;
  resposta_enviada: string | null;
  resposta_erro: string | null;
  dm_blocos_total: number;
  dm_blocos_enviados: number;
  dm_pendente: boolean;
  dm_error: string | null;
  contact_id: string | null;
  origem: string;
};

export function useAutomacoes() {
  return useQuery({
    queryKey: ["ig", "automacoes"],
    refetchInterval: 30_000,
    queryFn: async () =>
      ((
        await db()
          .from("instagram_automations")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? []) as Automacao[],
  });
}

const TIPOS: { tipo: Bloco["tipo"]; nome: string; icone: typeof Bot }[] = [
  { tipo: "texto", nome: "Texto", icone: MessageSquareText },
  { tipo: "imagem", nome: "Imagem", icone: ImageIcon },
  { tipo: "link", nome: "Link com botão", icone: Link2 },
  { tipo: "passos", nome: "Passo a passo", icone: ListOrdered },
];
const novoBloco = (tipo: Bloco["tipo"]): Bloco =>
  tipo === "texto"
    ? { tipo, texto: "" }
    : tipo === "imagem"
      ? { tipo, legenda: "" }
      : tipo === "link"
        ? { tipo, titulo: "", url: "", botao: "Abrir" }
        : { tipo, titulo: "", passos: [""] };

const RESPOSTAS_PADRAO = [
  "Te mandei os detalhes na DM, {nome}. Dá uma olhada.",
  "Acabei de te enviar no direct. Confere lá.",
  "Mandei tudo na sua DM, {nome}.",
  "Olha a DM, acabou de chegar.",
];

/** Editor de uma automação (nova ou existente) para um post do Instagram. */
export function EditorAutomacao({
  aberto,
  onFechar,
  post,
  existente,
}: {
  aberto: boolean;
  onFechar: () => void;
  /** Post do Instagram ao qual a automação pertence (obrigatório para criar). */
  post?: {
    ig_media_id: string;
    permalink: string | null;
    nome: string | null;
    publicacao_id?: string | null;
  };
  existente?: Automacao | null;
}) {
  const qc = useQueryClient();
  const fotos = useFotos();
  const [nome, setNome] = useState("");
  const [palavras, setPalavras] = useState("");
  const [respostas, setRespostas] = useState<string[]>(RESPOSTAS_PADRAO);
  const [dm, setDm] = useState<Bloco[]>([{ tipo: "texto", texto: "" }]);
  const [ativa, setAtiva] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("config");

  useEffect(() => {
    if (!aberto) return;
    if (existente) {
      setNome(existente.nome ?? "");
      setPalavras(
        (existente.palavras?.length ? existente.palavras : existente.keyword.split(","))
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", "),
      );
      const r = existente.respostas?.length
        ? existente.respostas
        : existente.comment_reply
          ? [existente.comment_reply]
          : RESPOSTAS_PADRAO;
      setRespostas(r);
      const blocos = existente.dm?.length
        ? existente.dm
        : existente.dm_message
          ? [
              {
                tipo: "texto" as const,
                texto: `${existente.dm_message}${existente.dm_link ? `\n\n${existente.dm_link}` : ""}`,
              },
            ]
          : [{ tipo: "texto" as const, texto: "" }];
      setDm(blocos);
      setAtiva(existente.is_active);
    } else {
      setNome(post?.nome ?? "");
      setPalavras("");
      setRespostas(RESPOSTAS_PADRAO);
      setDm([{ tipo: "texto", texto: "" }]);
      setAtiva(true);
    }
    setAba("config");
  }, [aberto, existente, post]);

  const mudaBloco = (i: number, b: Bloco) => setDm((l) => l.map((x, k) => (k === i ? b : x)));
  const move = (i: number, d: -1 | 1) =>
    setDm((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const problemas = useMemo(() => {
    const p: string[] = [];
    const resps = respostas.map((r) => r.trim()).filter(Boolean);
    if (!resps.length) p.push("escreva pelo menos uma resposta pública");
    const blocosOk = dm.filter((b) =>
      b.tipo === "texto"
        ? b.texto.trim()
        : b.tipo === "imagem"
          ? b.path || b.url
          : b.tipo === "link"
            ? b.titulo.trim() && /^https?:\/\//.test(b.url)
            : b.passos.some((x) => x.trim()),
    );
    if (!blocosOk.length) p.push("monte pelo menos um bloco da DM");
    return p;
  }, [respostas, dm]);

  async function salvar() {
    if (problemas.length) return toast.error(problemas[0]);
    const mediaId = existente?.post_id ?? post?.ig_media_id;
    if (!mediaId) return toast.error("Este post ainda não tem o id do Instagram.");
    setSalvando(true);
    try {
      const lista = palavras
        .split(/[,;\n]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const resps = respostas.map((r) => r.trim()).filter(Boolean);
      const blocos = dm
        .filter((b) =>
          b.tipo === "texto"
            ? b.texto.trim()
            : b.tipo === "imagem"
              ? b.path || b.url
              : b.tipo === "link"
                ? b.titulo.trim() && b.url
                : b.passos.some((x) => x.trim()),
        )
        .map((b) => (b.tipo === "passos" ? { ...b, passos: b.passos.filter((x) => x.trim()) } : b));
      const primeiro = blocos[0];
      const linha = {
        nome: nome.trim() || post?.nome || null,
        post_url: existente?.post_url ?? post?.permalink ?? `ig:${mediaId}`,
        post_id: mediaId,
        publicacao_id: existente?.publicacao_id ?? post?.publicacao_id ?? null,
        keyword: lista.join(", "),
        palavras: lista,
        respostas: resps,
        comment_reply: resps[0],
        dm_message:
          primeiro?.tipo === "texto"
            ? primeiro.texto
            : primeiro?.tipo === "passos"
              ? primeiro.passos.join("\n")
              : primeiro?.tipo === "link"
                ? primeiro.titulo
                : "Veja a DM",
        dm_link:
          blocos.find((b): b is Extract<Bloco, { tipo: "link" }> => b.tipo === "link")?.url ?? null,
        dm: blocos,
        is_active: ativa,
        updated_at: new Date().toISOString(),
      };
      const q = existente
        ? db().from("instagram_automations").update(linha).eq("id", existente.id)
        : db().from("instagram_automations").insert(linha);
      const { error } = await q;
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ["ig", "automacoes"] });
      toast.success(
        existente
          ? "Automação atualizada."
          : "Automação criada. Vale para comentários a partir de agora.",
      );
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!existente || !confirm("Excluir esta automação? O histórico de respostas também some."))
      return;
    const { error } = await db().from("instagram_automations").delete().eq("id", existente.id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["ig", "automacoes"] });
    onFechar();
  }

  return (
    <Sheet open={aberto} onOpenChange={(o) => !o && !salvando && onFechar()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Automação de comentários
          </SheetTitle>
          <SheetDescription>
            Quem comentar a palavra no post recebe uma resposta pública (sorteada entre as
            variantes) e uma DM com o que você montar aqui. A pessoa entra no CRM como contato vindo
            do Instagram.
            {post?.permalink || existente?.post_url ? (
              <>
                {" "}
                <a
                  href={post?.permalink ?? existente?.post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Ver o post
                </a>
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={aba} onValueChange={setAba} className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="config">Gatilho e resposta</TabsTrigger>
            <TabsTrigger value="dm">DM ({dm.length})</TabsTrigger>
            <TabsTrigger value="log" disabled={!existente}>
              Quem comentou{existente ? ` (${existente.replies_count})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Nome (só para você)</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: 5 ferramentas — palavra FERRAMENTAS"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Palavras-chave</Label>
              <Input
                value={palavras}
                onChange={(e) => setPalavras(e.target.value)}
                placeholder="ex.: quero, eu quero, ferramentas"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Vale maiúscula, minúscula e com ou sem acento. Deixe vazio para
                responder qualquer comentário do post.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Respostas públicas (uma é sorteada por comentário)</Label>
                <Button size="sm" variant="ghost" onClick={() => setRespostas((l) => [...l, ""])}>
                  <Plus className="h-4 w-4 mr-1" /> Variante
                </Button>
              </div>
              {respostas.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r}
                    onChange={(e) =>
                      setRespostas((l) => l.map((x, k) => (k === i ? e.target.value : x)))
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => setRespostas((l) => l.filter((_, k) => k !== i))}
                    disabled={respostas.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Use {"{nome}"} para o @ de quem comentou. Variar as respostas evita parecer robô.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={ativa} onCheckedChange={setAtiva} /> Ativa
            </label>
          </TabsContent>

          <TabsContent value="dm" className="space-y-3 pt-3">
            <p className="text-xs rounded-md border bg-muted/40 p-2 text-muted-foreground">
              O primeiro bloco chega como resposta privada ao comentário, sempre em texto (regra da
              Meta). Os blocos seguintes saem em seguida; se a pessoa nunca falou com você na DM, a
              Meta segura e eles saem sozinhos assim que ela responder qualquer coisa. Por isso,
              feche o primeiro bloco com uma pergunta ou um "me responde aqui" quando houver mais
              blocos.
            </p>
            {dm.map((b, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {i + 1} · {TIPOS.find((t) => t.tipo === b.tipo)?.nome}
                  </Badge>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => move(i, 1)}
                      disabled={i === dm.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setDm((l) => l.filter((_, k) => k !== i))}
                      disabled={dm.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {b.tipo === "texto" && (
                  <Textarea
                    rows={4}
                    value={b.texto}
                    onChange={(e) => mudaBloco(i, { ...b, texto: e.target.value })}
                    placeholder="Oi {nome}! Aqui está o que prometi…"
                  />
                )}
                {b.tipo === "imagem" && (
                  <div className="space-y-2">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(fotos.data?.lista ?? []).slice(0, 40).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => mudaBloco(i, { ...b, path: f.path, url: undefined })}
                          className={cn(
                            "h-16 w-16 shrink-0 rounded border overflow-hidden",
                            b.path === f.path && "ring-2 ring-primary",
                          )}
                          title={f.nome ?? ""}
                        >
                          <img src={f.url} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <Input
                      value={b.url ?? ""}
                      onChange={(e) =>
                        mudaBloco(i, {
                          ...b,
                          url: e.target.value || undefined,
                          path: e.target.value ? undefined : b.path,
                        })
                      }
                      placeholder="ou cole a URL pública de uma imagem"
                    />
                    <Input
                      value={b.legenda ?? ""}
                      onChange={(e) => mudaBloco(i, { ...b, legenda: e.target.value })}
                      placeholder="Texto junto com a imagem (opcional)"
                    />
                  </div>
                )}
                {b.tipo === "link" && (
                  <div className="grid gap-2">
                    <Input
                      value={b.titulo}
                      onChange={(e) => mudaBloco(i, { ...b, titulo: e.target.value })}
                      placeholder="Título (até 80 caracteres)"
                      maxLength={80}
                    />
                    <Input
                      value={b.texto ?? ""}
                      onChange={(e) => mudaBloco(i, { ...b, texto: e.target.value })}
                      placeholder="Linha de apoio (opcional, até 80)"
                      maxLength={80}
                    />
                    <Input
                      value={b.url}
                      onChange={(e) => mudaBloco(i, { ...b, url: e.target.value })}
                      placeholder="https://…"
                    />
                    <Input
                      value={b.botao ?? ""}
                      onChange={(e) => mudaBloco(i, { ...b, botao: e.target.value })}
                      placeholder="Texto do botão (até 20)"
                      maxLength={20}
                    />
                  </div>
                )}
                {b.tipo === "passos" && (
                  <div className="space-y-2">
                    <Input
                      value={b.titulo ?? ""}
                      onChange={(e) => mudaBloco(i, { ...b, titulo: e.target.value })}
                      placeholder="Título (opcional), ex.: Como acessar:"
                    />
                    {b.passos.map((p, k) => (
                      <div key={k} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-5">{k + 1}.</span>
                        <Input
                          value={p}
                          onChange={(e) =>
                            mudaBloco(i, {
                              ...b,
                              passos: b.passos.map((x, j) => (j === k ? e.target.value : x)),
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            mudaBloco(i, { ...b, passos: b.passos.filter((_, j) => j !== k) })
                          }
                          disabled={b.passos.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => mudaBloco(i, { ...b, passos: [...b.passos, ""] })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Passo
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <Button
                  key={t.tipo}
                  size="sm"
                  variant="outline"
                  onClick={() => setDm((l) => [...l, novoBloco(t.tipo)])}
                >
                  <t.icone className="h-4 w-4 mr-1.5" /> {t.nome}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log" className="pt-3">
            {existente && <LogAutomacao automacaoId={existente.id} />}
          </TabsContent>
        </Tabs>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existente ? "Salvar" : "Criar automação"}
          </Button>
          {existente && (
            <Button variant="ghost" className="text-red-600" onClick={excluir}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
            </Button>
          )}
          {problemas.length > 0 && (
            <span className="text-xs text-amber-700 self-center">{problemas[0]}</span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LogAutomacao({ automacaoId }: { automacaoId: string }) {
  const q = useQuery({
    queryKey: ["ig", "log", automacaoId],
    refetchInterval: 20_000,
    queryFn: async () =>
      ((
        await db()
          .from("instagram_comment_logs")
          .select("*")
          .eq("automation_id", automacaoId)
          .order("replied_at", { ascending: false })
          .limit(200)
      ).data ?? []) as LogComentario[],
  });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!q.data?.length)
    return (
      <p className="text-sm text-muted-foreground py-4">Ninguém comentou com a palavra ainda.</p>
    );
  return (
    <div className="divide-y rounded-md border">
      {q.data.map((l) => {
        const dmOk = l.dm_blocos_enviados >= l.dm_blocos_total && l.dm_blocos_total > 0;
        return (
          <div key={l.id} className="p-2.5 text-sm space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">@{l.commenter_username}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(l.replied_at), { locale: ptBR, addSuffix: true })}
              </span>
              <Badge variant="outline" className="gap-1 text-xs">
                {l.resposta_enviada ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-600" />
                )}
                resposta
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                {dmOk ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : l.dm_pendente ? (
                  <Loader2 className="h-3 w-3 text-amber-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-600" />
                )}
                DM {l.dm_blocos_enviados}/{l.dm_blocos_total}
                {l.dm_pendente ? " · aguardando ela responder" : ""}
              </Badge>
              {l.contact_id && (
                <Badge variant="outline" className="text-xs">
                  no CRM
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">"{l.comment_text}"</p>
            {(l.resposta_erro || (l.dm_error && !l.dm_pendente && !dmOk)) && (
              <p className="text-xs text-red-600">{l.resposta_erro ?? l.dm_error}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Botão para o card de um post em Publicados: cria ou abre a automação do post. */
export function BotaoAutomacao({
  post,
  automacoes,
}: {
  post: {
    ig_media_id: string | null;
    permalink: string | null;
    nome: string | null;
    publicacao_id: string;
  };
  automacoes?: Automacao[];
}) {
  const [aberto, setAberto] = useState(false);
  if (!post.ig_media_id) return null;
  const existente = (automacoes ?? []).find((a) => a.post_id === post.ig_media_id) ?? null;
  return (
    <>
      <Button
        size="sm"
        variant={existente ? "secondary" : "outline"}
        className="h-8"
        onClick={() => setAberto(true)}
      >
        <Bot className="h-3.5 w-3.5 mr-1.5" />
        {existente
          ? `Automação${existente.is_active ? "" : " (pausada)"} · ${existente.replies_count}`
          : "Automação"}
      </Button>
      <EditorAutomacao
        aberto={aberto}
        onFechar={() => setAberto(false)}
        post={{
          ig_media_id: post.ig_media_id,
          permalink: post.permalink,
          nome: post.nome,
          publicacao_id: post.publicacao_id,
        }}
        existente={existente}
      />
    </>
  );
}
