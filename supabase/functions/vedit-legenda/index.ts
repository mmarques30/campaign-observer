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

async function gerar(sb: any, req: Request, projetoId: string, pedido: string) {
  const { data: p } = await sb
    .from("vedit_projetos")
    .select("id, objetivo, transcricao_texto, timeline, marca_id")
    .eq("id", projetoId)
    .single();
  if (!p) throw new Error("vídeo não encontrado");
  const fala = String(p.transcricao_texto ?? "").trim();
  if (!fala) throw new Error("a transcrição deste vídeo ainda não terminou");
  const modeloId = String(p.timeline?.modelo?.id ?? "");
  const refId = modeloId.startsWith("ref-") ? modeloId.slice(4) : null;
  const [{ data: ref }, { data: marca }] = await Promise.all([
    refId
      ? sb.from("vedit_referencias").select("autor, legenda, analise").eq("id", refId).maybeSingle()
      : Promise.resolve({ data: null }),
    p.marca_id
      ? sb.from("vedit_marcas").select("instrucoes").eq("id", p.marca_id).maybeSingle()
      : sb
          .from("vedit_marcas")
          .select("instrucoes")
          .order("padrao", { ascending: false })
          .limit(1)
          .maybeSingle(),
  ]);
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
Siga a FORMA dela: tamanho, estrutura (gancho, quebras de linha, lista, pergunta), tom e tipo de CTA. Não copie frases, assunto, nomes, números, @ nem a palavra de CTA dela: o conteúdo sai da fala DESTE vídeo.${ref.analise?.resumo ? `\nO que a referência faz: ${ref.analise.resumo}` : ""}
`
    : "";
  const prompt = `Escreva 3 opções de legenda de Instagram para este Reel da Mariana Marques (IAplicada, IA aplicada a negócios). Objetivo: ${p.objetivo === "anuncio" ? "anúncio" : "orgânico (salvamentos, compartilhamentos e comentários)"}.
${marca?.instrucoes ? `Tom da marca: ${marca.instrucoes}\n` : ""}
O QUE ELA FALA NO VÍDEO (transcrição):
"""
${fala.slice(0, 6000)}
"""
${molde}${palavraCta ? `\nO vídeo termina pedindo: "${palavraCta}". O CTA da legenda usa a mesma palavra.\n` : ""}${pedido ? `\nPEDIDO DA MARIANA PARA ESTAS OPÇÕES: ${pedido}\n` : ""}
Regras:
- ${molde ? "As 3 opções seguem o molde da referência e variam o gancho: uma direta (resultado/benefício), uma pela curiosidade ou tensão do vídeo e uma que puxa comentário (pergunta ou opinião)." : 'Cada opção com uma abordagem diferente: "Direta" (resultado/benefício logo de cara), "Curiosidade" (abre o que o vídeo revela sem entregar tudo) e "Conversa" (pergunta ou opinião que puxa comentário).'}
- A 1ª linha é o gancho (aparece antes do "mais"): específica, até 12 palavras, sem repetir a primeira frase do vídeo palavra por palavra.
- Complementa o vídeo (contexto, por que importa, o próximo passo); não transcreve a fala.
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
  const body = await req.json().catch(() => ({}));
  try {
    return json(await gerar(sb, req, String(body.projeto_id ?? ""), String(body.pedido ?? "")));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
