// vedit-legenda — legenda do post para um vídeo editado no Estúdio.
//   { projeto_id, pedido? } → { opcoes: [{titulo, texto}], referencia }
// Parte da fala (transcrição) e segue a legenda do post da referência usada na edição
// (timeline.modelo.id = "ref-<id>") como molde de FORMA (tamanho, estrutura, tom, CTA), nunca de texto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function logUso(sb: any, req: Request, usage: any) {
  try {
    const input = usage?.input_tokens ?? 0,
      output = usage?.output_tokens ?? 0;
    if (!input && !output) return;
    let empresa: string | null = null;
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = jwt ? await sb.auth.getUser(jwt) : { data: null };
    if (data?.user?.id) {
      const { data: emp } = await sb.rpc("mads_empresa_ativa_de", { _uid: data.user.id });
      empresa = (emp as string) ?? null;
    }
    await sb.from("api_usage_log").insert({
      provider: "anthropic",
      empresa_id: empresa,
      origem: "vedit-legenda",
      model: MODELO,
      input_tokens: input,
      output_tokens: output,
      custo_usd: (input * 5 + output * 25) / 1_000_000,
    });
  } catch (_) {
    /* telemetria */
  }
}

async function claude(prompt: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  for (let t = 0; t < 3; t++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const txt = await r.text();
    if (r.status === 429 || r.status === 529 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 4000 * (t + 1)));
      continue;
    }
    const j = JSON.parse(txt);
    if (!r.ok)
      throw new Error(`Erro do Claude (${r.status}): ${j.error?.message ?? txt.slice(0, 300)}`);
    return j;
  }
  throw new Error("O Claude está sobrecarregado. Tente de novo em instantes.");
}

async function gerar(
  sb: any,
  req: Request,
  projetoId: string,
  pedido: string,
  empresaAtiva: string | null,
) {
  const { data: p } = await sb
    .from("vedit_projetos")
    .select(
      "id, objetivo, transcricao_texto, timeline, marca_id, empresa_id, roteiro_id, referencia_id",
    )
    .eq("id", projetoId)
    .single();
  // Só vídeos da conta de quem pediu.
  if (!p || (empresaAtiva && p.empresa_id !== empresaAtiva))
    throw new Error("vídeo não encontrado");
  const fala = String(p.transcricao_texto ?? "").trim();
  if (!fala) throw new Error("a transcrição deste vídeo ainda não terminou");
  const modeloId = String(p.timeline?.modelo?.id ?? "");
  const refId = modeloId.startsWith("ref-") ? modeloId.slice(4) : (p.referencia_id ?? null);
  const { data: rot } = p.roteiro_id
    ? await sb.from("vedit_roteiros").select("tema, roteiro").eq("id", p.roteiro_id).maybeSingle()
    : { data: null };
  const [{ data: ref }, { data: marca }, { data: empresa }] = await Promise.all([
    refId
      ? sb
          .from("vedit_referencias")
          .select("autor, legenda, analise, url")
          .eq("id", refId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    p.marca_id
      ? sb.from("vedit_marcas").select("*").eq("id", p.marca_id).maybeSingle()
      : sb
          .from("vedit_marcas")
          .select("*")
          .eq("empresa_id", p.empresa_id)
          .order("padrao", { ascending: false })
          .limit(1)
          .maybeSingle(),
    sb.from("mads_empresas").select("nome, interna").eq("id", p.empresa_id).maybeSingle(),
  ]);
  // A referência é um vídeo que esta própria conta já publicou (aba "Meus publicados")? Então a
  // legenda dela já foi usada e funcionou: a primeira opção é ela mesma, adaptada ao tema novo.
  let propria = false;
  if (ref?.url) {
    const cod = String(ref.url).match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1];
    if (cod) {
      const { data: pub } = await sb
        .from("publicacoes")
        .select("id")
        .eq("empresa_id", p.empresa_id)
        .ilike("permalink", `%/${cod}%`)
        .limit(1);
      propria = !!pub?.length;
    }
  }
  const quem =
    !empresa || empresa.interna
      ? "da Mariana Marques (IAplicada, IA aplicada a negócios)"
      : `da ${empresa.nome} (escreva como a própria empresa; nunca mencione a IAplicada)`;
  const cta = (p.timeline?.efeitos ?? []).find((e: any) => e?.tipo === "cta-final")?.props ?? null;
  const palavraCta = cta?.palavra ? `${cta.verbo ?? "Comenta"} ${cta.palavra}` : "";
  // Tamanho segue o da referência (legenda de 1 linha pede legenda curta), com um piso para caber o CTA.
  const nRef = String(ref?.legenda ?? "")
    .split(/\s+/)
    .filter(Boolean).length;
  const faixa = nRef
    ? [Math.max(8, Math.round(nRef * 0.7)), Math.max(palavraCta ? 35 : 25, Math.round(nRef * 1.5))]
    : [40, 140];
  const molde = ref?.legenda
    ? `LEGENDA DO POST DA REFERÊNCIA${ref.autor ? ` (@${ref.autor})` : ""}, que a Mariana usou como modelo desta edição:
"""
${String(ref.legenda).slice(0, 2000)}
"""
Ela é o MOLDE. Antes de escrever, leia parágrafo por parágrafo e anote a FUNÇÃO de cada um (ex.: "pergunta de opinião + pedido de comentário com a palavra-chave", "um detalhe que não está no vídeo", "uma observação sobre o caso", "a tese em uma frase"). A nossa legenda tem os MESMOS parágrafos, na MESMA ordem, com a mesma função, o mesmo tamanho e o mesmo jeito de falar (primeira pessoa, conversa, opinião), só que sobre o assunto DESTE vídeo. Se ela não vende nada no texto, a nossa também não vende. ${propria ? "Como a referência é da própria conta, as frases de estrutura dela podem ser reaproveitadas; só o assunto, os fatos e a palavra de CTA mudam para os DESTE vídeo." : "Não copie frases, assunto, nomes, números, @ nem a palavra de CTA dela: o conteúdo sai da fala DESTE vídeo."} Parágrafo cuja função pede um fato que a fala não tem (ex.: "detalhe que pouca gente sabe") usa um fato que ESTÁ na fala e não foi o centro do vídeo; se não houver, o parágrafo sai.${ref.analise?.resumo ? `\nO que a referência faz: ${ref.analise.resumo}` : ""}
`
    : "";
  const prompt = `Escreva 3 opções de legenda de Instagram para este Reel ${quem}. Objetivo: ${p.objetivo === "anuncio" ? "anúncio" : "orgânico (salvamentos, compartilhamentos e comentários)"}.
${marca?.instrucoes ? `Vocabulário da marca (só para palavras e restrições; NÃO é para vender nem citar público-alvo ou faturamento): ${marca.instrucoes}\n` : ""}
${[marca?.o_que_faz ? `O que a empresa faz: ${marca.o_que_faz}` : "", marca?.nicho ? `Nicho: ${marca.nicho}` : "", marca?.publico ? `Público: ${marca.publico}` : ""].filter(Boolean).join(" · ") ? `Contexto da empresa (para acertar o assunto e as palavras; não é para vender): ${[marca?.o_que_faz ? `O que a empresa faz: ${marca.o_que_faz}` : "", marca?.nicho ? `Nicho: ${marca.nicho}` : "", marca?.publico ? `Público: ${marca.publico}` : ""].filter(Boolean).join(" · ")}\n` : ""}
O QUE ELA FALA NO VÍDEO (transcrição):
"""
${fala.slice(0, 6000)}
"""
${rot?.tema ? `\nTEMA DO ROTEIRO deste vídeo (a legenda fala do mesmo assunto, pelo mesmo ângulo): ${String(rot.tema).slice(0, 600)}\n` : ""}${molde}${palavraCta ? `\nO vídeo termina pedindo: "${palavraCta}". O CTA da legenda usa a mesma palavra.\n` : ""}${pedido ? `\nPEDIDO DA MARIANA PARA ESTAS OPÇÕES: ${pedido}\n` : ""}
Regras:
- É legenda de CONTEÚDO, de gente falando com quem segue: primeira pessoa, conversa, opinião sobre o assunto do vídeo. NÃO é texto de anúncio${p.objetivo === "anuncio" ? " institucional" : ""}: nada de oferta, benefício do serviço, "a gente implementa", "nossos clientes", "quer entender como isso funcionaria no seu negócio", "agende", promessa de resultado ou apresentação da empresa. A empresa só aparece se a fala do vídeo a cita, e do mesmo tamanho que lá.
- ${molde ? (propria ? 'A referência é um post desta mesma conta, que já foi publicado e funcionou. A opção 1, "A que já funcionou, adaptada", reaproveita a legenda dela quase inteira: mesmas frases de estrutura, mesmo jeito de falar e mesmo CTA, trocando só o que é do assunto antigo pelo assunto deste vídeo (e a palavra do CTA pela deste vídeo). ' : "") + 'As opções seguem o molde da referência parágrafo a parágrafo e mudam só a entrada: "Igual à referência" (a mais fiel à estrutura dela), "Pela história" (abre pelo caso/fato do vídeo) e "Pela opinião" (abre pela tese, puxando comentário).' : 'Cada opção com uma entrada diferente: "Pela história" (abre pelo caso/fato do vídeo), "Curiosidade" (abre o que o vídeo revela sem entregar tudo) e "Pela opinião" (abre pela tese, puxando comentário).'}
- A 1ª linha é o gancho (aparece antes do "mais"): específica, até 12 palavras, sem repetir a primeira frase do vídeo palavra por palavra.
- Continua a conversa do vídeo (um detalhe, a opinião, a pergunta); não transcreve a fala nem resume o vídeo em tópicos.
- TAMANHO: cada opção tem entre ${faixa[0]} e ${faixa[1]} palavras no total (hashtags fora da conta).${nRef ? ` A legenda da referência tem ${nRef} palavras: se ela é de uma linha só, a nossa também é curta (gancho + CTA), sem parágrafos explicando o vídeo.` : ""}
- Parágrafos curtos com linha em branco entre eles.
- Hashtags: no máximo 3, só se forem relevantes, na última linha.
- Use só fatos e números que estão na fala; não invente dados.
- Português do Brasil, direto, sem clichês de IA ("no mundo de hoje", "revolucionar", "desbloqueie", "jornada"), sem "PME" (use "empresa").
- Sem emojis (mesmo que a referência use), a não ser que o pedido da Mariana peça.
Responda só com JSON: {"opcoes":[{"titulo":"nome curto da abordagem","texto":"..."}]}`;
  const j = await claude(prompt);
  await logUso(sb, req, j.usage);
  const txt = (j.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
  const m = txt.match(/\{[\s\S]*\}/);
  const r = m ? JSON.parse(m[0]) : null;
  const opcoes = (r?.opcoes ?? [])
    .filter((o: any) => o?.texto)
    .map((o: any) => ({ titulo: String(o.titulo ?? "Opção"), texto: String(o.texto).trim() }));
  if (!opcoes.length) throw new Error("não consegui gerar as legendas, tente de novo");
  return { opcoes, referencia: ref ? (ref.autor ? `@${ref.autor}` : "referência") : null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // O deploy automático publica as funções sem exigir login: a checagem fica aqui.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await sb.auth.getUser(token) : { data: null };
  if (!u?.user) return json({ error: "faça login para gerar a legenda" }, 401);
  const { data: empAtiva } = await sb.rpc("mads_empresa_ativa_de", { _uid: u.user.id });
  const body = await req.json().catch(() => ({}));
  try {
    return json(
      await gerar(sb, req, String(body.projeto_id ?? ""), String(body.pedido ?? ""), empAtiva),
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
