// Automações do Instagram: comentário com palavra-chave → resposta pública + DM em blocos +
// contato no CRM. Lista todas, status da conexão com a Meta e o que falta configurar.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { db } from "@/lib/vedit";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import {
  EditorAutomacao,
  useAutomacoes,
  type Automacao,
} from "@/components/publicacoes/AutomacaoComentarios";

export const Route = createFileRoute("/_authenticated/ads/automacoes")({
  component: AutomacoesPage,
});

type Status = {
  conta?: { username?: string; erro?: string };
  permissoes?: { comentarios: boolean; mensagens: boolean };
  verify_token?: { verify_token: string; webhook_recebido_em: string | null } | null;
  webhook_url?: string;
  automacoes_ativas?: number;
  error?: string;
};

function AutomacoesPage() {
  const qc = useQueryClient();
  const autos = useAutomacoes();
  const [edit, setEdit] = useState<Automacao | null>(null);
  const [varrendo, setVarrendo] = useState(false);
  const status = useQuery({
    queryKey: ["ig", "status"],
    queryFn: () => callEdgeFunction<Status>("ig-automacoes", { acao: "status" }),
    staleTime: 60_000,
  });
  const posts = useQuery({
    queryKey: ["ig", "posts-publicados"],
    queryFn: async () =>
      ((
        await db()
          .from("publicacoes")
          .select("id, nome, permalink, ig_media_id, publicado_em, thumb")
          .eq("destino", "instagram")
          .eq("status", "publicado")
          .not("ig_media_id", "is", null)
          .order("publicado_em", { ascending: false })
          .limit(30)
      ).data ?? []) as {
        id: string;
        nome: string | null;
        permalink: string | null;
        ig_media_id: string;
        publicado_em: string;
        thumb: string | null;
      }[],
  });
  const [novoPara, setNovoPara] = useState<NonNullable<typeof posts.data>[number] | null>(null);

  async function alternar(a: Automacao, v: boolean) {
    const { error } = await db()
      .from("instagram_automations")
      .update({ is_active: v })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ig", "automacoes"] });
  }
  async function varrer() {
    setVarrendo(true);
    try {
      const r = await callEdgeFunction("ig-automacoes", { acao: "varrer" });
      if (r.error) throw new Error(r.error);
      toast.success(
        `${r.comentarios} comentário(s) lidos, ${r.novos} respondido(s) agora${r.fila ? `, ${r.fila} DM(s) da fila liberadas` : ""}.${r.erros?.length ? ` Erros: ${r.erros.join("; ")}` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["ig"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVarrendo(false);
    }
  }

  const s = status.data;
  const webhookOk = !!s?.verify_token?.webhook_recebido_em;
  const semAutomacao = (posts.data ?? []).filter(
    (p) => !(autos.data ?? []).some((a) => a.post_id === p.ig_media_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações do Instagram</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Quem comenta a palavra-chave no post recebe uma resposta pública e uma DM com o que você
            montar (texto, imagem, link com botão, passo a passo), e entra no CRM como contato vindo
            do Instagram. O sistema confere os comentários a cada minuto; com o webhook ligado, a
            resposta sai na hora.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={varrer} disabled={varrendo}>
          {varrendo ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Conferir comentários agora
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="font-semibold">Conexão com a Meta</div>
          {status.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : s?.error ? (
            <p className="text-red-600">{s.error}</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <Item
                ok={!!s?.conta?.username}
                texto={
                  s?.conta?.username
                    ? `Conta @${s.conta.username}`
                    : `Conta: ${s?.conta?.erro ?? "não encontrada"}`
                }
              />
              <Item
                ok={!!s?.permissoes?.comentarios}
                texto="Permissão para responder comentários"
              />
              <Item ok={!!s?.permissoes?.mensagens} texto="Permissão para enviar DM" />
              <Item ok={true} texto="Conferência a cada minuto (funciona mesmo sem webhook)" />
              <Item
                ok={webhookOk}
                texto={
                  webhookOk
                    ? `Webhook da Meta ativo (último evento ${formatDistanceToNow(new Date(s!.verify_token!.webhook_recebido_em!), { locale: ptBR, addSuffix: true })})`
                    : "Webhook da Meta ainda não ligado (resposta instantânea)"
                }
              />
            </div>
          )}
          {s && !webhookOk && s.verify_token && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5 mt-2">
              <p className="font-medium">
                Para ligar o webhook (resposta na hora), no painel de desenvolvedor da Meta, no app
                que já publica os Reels, em Webhooks → Instagram:
              </p>
              <p className="flex items-center gap-2">
                URL de callback:{" "}
                <code className="bg-background px-1.5 py-0.5 rounded break-all">
                  {s.webhook_url}
                </code>
                <BotaoCopiar texto={s.webhook_url ?? ""} />
              </p>
              <p className="flex items-center gap-2">
                Token de verificação:{" "}
                <code className="bg-background px-1.5 py-0.5 rounded break-all">
                  {s.verify_token.verify_token}
                </code>
                <BotaoCopiar texto={s.verify_token.verify_token} />
              </p>
              <p>
                Depois, assine os campos <b>comments</b> e <b>messages</b>. Enquanto isso, a
                conferência por minuto já responde todo mundo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {autos.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !autos.data?.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma automação ainda. Crie a partir de um post abaixo.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {autos.data.map((a) => (
            <Card key={a.id} className={!a.is_active ? "opacity-70" : undefined}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="text-left font-medium text-sm flex-1 hover:underline"
                    onClick={() => setEdit(a)}
                  >
                    {a.nome || a.post_url}
                  </button>
                  <Switch checked={a.is_active} onCheckedChange={(v) => alternar(a, v)} />
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline">
                    {a.palavras?.length
                      ? a.palavras.join(", ")
                      : a.keyword || "qualquer comentário"}
                  </Badge>
                  <Badge variant="outline">{a.replies_count} resposta(s)</Badge>
                  <Badge variant="outline">{a.dms_enviadas} DM(s)</Badge>
                  {a.dms_pendentes > 0 && (
                    <Badge variant="outline">{a.dms_pendentes} aguardando resposta</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.varrido_em
                    ? `conferido ${formatDistanceToNow(new Date(a.varrido_em), { locale: ptBR, addSuffix: true })}`
                    : "ainda não conferido"}
                  {a.ultimo_erro ? <span className="text-red-600"> · {a.ultimo_erro}</span> : null}
                  {a.post_url?.startsWith("http") && (
                    <>
                      {" · "}
                      <a href={a.post_url} target="_blank" rel="noreferrer" className="underline">
                        ver post
                      </a>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">Criar automação para um post publicado</div>
          {posts.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : !semAutomacao.length ? (
            <p className="text-sm text-muted-foreground">
              Todos os posts publicados já têm automação. Posts novos aparecem aqui depois de
              publicados (ou ligados em{" "}
              <Link to="/ads/edicao/publicados" className="underline">
                Publicados
              </Link>
              ).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {semAutomacao.map((p) => (
                <Button key={p.id} size="sm" variant="outline" onClick={() => setNovoPara(p)}>
                  <Bot className="h-4 w-4 mr-1.5" /> {p.nome || "Sem nome"}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditorAutomacao aberto={!!edit} onFechar={() => setEdit(null)} existente={edit} />
      <EditorAutomacao
        aberto={!!novoPara}
        onFechar={() => setNovoPara(null)}
        post={
          novoPara
            ? {
                ig_media_id: novoPara.ig_media_id,
                permalink: novoPara.permalink,
                nome: novoPara.nome,
                publicacao_id: novoPara.id,
              }
            : undefined
        }
      />
    </div>
  );
}

function Item({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
      )}
      <span>{texto}</span>
    </div>
  );
}
