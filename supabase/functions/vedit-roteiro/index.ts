// vedit-roteiro — Edição → Roteiros. Escreve um roteiro no idioma escolhido, sobre o assunto que a
// Mariana quer abordar, espelhando o esqueleto de um vídeo de alta performance: os mesmos blocos,
// o mesmo tamanho de fala por bloco e as mesmas pausas (tiradas da transcrição palavra a palavra
// quando o vídeo foi salvo como referência). Ações:
//   criar    { reel_id?, referencia_id?, tema, idioma?, finalidade?, notas? } → { id }
//   ajustar  { id, pedido }                                                → nova versão + resposta no chat (em segundo plano)
//   refazer  { id }                                                        → gera de novo do zero
//   enviar_marketing { id }                                                → cria o roteiro em content_items
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

const IDIOMAS: Record<string, string> = {
  "pt-BR": "português do Brasil",
  en: "inglês (americano)",
  es: "espanhol (latino-americano)",
};

/**
 * Empresa ativa de quem chamou (multiempresa do IAplicada Ads): atribui o gasto
 * de API à empresa certa. Resolvida só na hora de gravar o log, uma vez por
 * requisição. Nunca lança — sem usuário identificado, o banco usa a IAplicada.
 */
async function empresaDoChamador(sb: any): Promise<string | null> {
  if (sb.__empresa !== undefined) return sb.__empresa;
  sb.__empresa = null;
  try {
    const jwt = (sb.__req?.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    const { data } = await sb.auth.getUser(jwt);
    const uid = data?.user?.id;
    if (!uid) return null;
    const { data: emp } = await sb.rpc("mads_empresa_ativa_de", { _uid: uid });
    sb.__empresa = (emp as string) ?? null;
  } catch (_) {
    /* sem empresa: fica a IAplicada */
  }
  return sb.__empresa;
}

async function logUso(sb: any, origem: string, usage: any) {
  try {
    const input = usage?.input_tokens ?? 0,
      output = usage?.output_tokens ?? 0;
    if (!input && !output) return;
    await sb.from("api_usage_log").insert({
      provider: "anthropic",
      empresa_id: await empresaDoChamador(sb),
      origem,
      model: MODELO,
      input_tokens: input,
      output_tokens: output,
      custo_usd: (input * 5 + output * 25) / 1_000_000,
    });
  } catch (_) {
    /* telemetria */
  }
}
async function claude(sb: any, body: any, origem: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || "";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODELO, ...body }),
  });
  const txt = await r.text();
  let j: any = null;
  try {
    j = JSON.parse(txt);
  } catch (_) {
    /* */
  }
  await logUso(sb, origem, j?.usage);
  if (!r.ok) throw new Error(`Claude ${r.status}: ${txt.slice(0, 300)}`);
  return j;
}

// ─── esqueleto do vídeo de referência ──────────────────────────────────────
type Palavra = { i: number; f: number; p: string };
type Frase = {
  n: number;
  inicio: number;
  fim: number;
  texto: string;
  palavras: number;
  pausa_depois: number;
};

/** Frases faladas da referência: quebra em pausa (≥ 0,25 s) ou fim de frase. */
function frases(palavras: Palavra[]): Frase[] {
  const out: Frase[] = [];
  let atual: Palavra[] = [];
  const fecha = (prox?: Palavra) => {
    if (!atual.length) return;
    const ini = atual[0].i,
      fim = atual[atual.length - 1].f;
    out.push({
      n: out.length + 1,
      inicio: +ini.toFixed(2),
      fim: +fim.toFixed(2),
      texto: atual.map((w) => w.p).join(" "),
      palavras: atual.length,
      pausa_depois: prox ? +Math.max(0, prox.i - fim).toFixed(2) : 0,
    });
    atual = [];
  };
  palavras.forEach((w, k) => {
    atual.push(w);
    const prox = palavras[k + 1];
    const pausa = prox ? prox.i - w.f : 0;
    if (!prox || pausa >= 0.25 || (/[.!?…]$/.test(w.p) && atual.length >= 3)) fecha(prox);
  });
  return out;
}

async function montarEstrutura(sb: any, reelId?: string | null, refId?: string | null) {
  const reel = reelId
    ? (await sb.from("vedit_nicho_reels").select("*").eq("id", reelId).maybeSingle()).data
    : null;
  const idRef = refId ?? reel?.referencia_id ?? null;
  const ref = idRef
    ? (
        await sb
          .from("vedit_referencias")
          .select(
            "id, autor, url, legenda, duracao, palavras, transcricao_texto, analise, metricas, status",
          )
          .eq("id", idRef)
          .maybeSingle()
      ).data
    : null;
  const pals: Palavra[] = Array.isArray(ref?.palavras) ? ref.palavras : [];
  const fr = pals.length ? frases(pals) : [];
  const fala = fr.reduce((s, x) => s + (x.fim - x.inicio), 0);
  const nPal = pals.length;
  return {
    fonte: {
      autor: ref?.autor ?? reel?.username ?? null,
      url: ref?.url ?? reel?.permalink ?? null,
      metricas: reel
        ? { curtidas: reel.like_count, comentarios: reel.comments_count, indice: reel.indice }
        : (ref?.metricas ?? null),
      referencia_id: ref?.id ?? null,
      com_tempos: fr.length > 0,
    },
    duracao: ref?.duracao ? Number(ref.duracao) : null,
    palavras_por_segundo: fala > 0 ? +(nPal / fala).toFixed(2) : null,
    frases: fr,
    transcricao: ref?.transcricao_texto ?? null,
    legenda: reel?.caption ?? ref?.legenda ?? null,
    analise_reel: reel?.analise ?? null,
    analise_edicao: ref?.analise
      ? {
          resumo: ref.analise.resumo,
          gancho: ref.analise.gancho,
          ritmo: ref.analise.ritmo,
          cta: ref.analise.cta,
          aprendizados: ref.analise.aprendizados,
        }
      : null,
  };
}

/**
 * A edição da referência, momento a momento (o que aparece na tela em cada trecho: tela dividida,
 * vídeo/foto em tela cheia, janela, só a fala, texto). Lida sempre da análise atual da referência,
 * para roteiros antigos também receberem.
 */
async function edicaoDaReferencia(sb: any, refId?: string | null) {
  if (!refId) return "";
  const { data } = await sb.from("vedit_referencias").select("analise").eq("id", refId).maybeSingle();
  const a = data?.analise;
  if (!a) return "";
  const linhas: string[] = [];
  if (a.estilo) linhas.push(`FORMATO VISUAL DA REFERÊNCIA: ${a.estilo.nome ?? ""} — ${a.estilo.descricao ?? ""}`);
  const tecs = (a.tecnicas ?? []) as any[];
  if (tecs.length) {
    linhas.push("EDIÇÃO DA REFERÊNCIA, MOMENTO A MOMENTO (segundos · tipo · o que aparece):");
    for (const t of [...tecs].sort((x, y) => (x.de ?? 0) - (y.de ?? 0)))
      linhas.push(`${t.de ?? "?"}–${t.ate ?? "?"}s · ${t.categoria ?? ""} · ${t.nome ?? ""}: ${String(t.como_reproduzir ?? "").slice(0, 220)}`);
  }
  return linhas.join("\n");
}

function textoEstrutura(e: any) {
  const linhas: string[] = [];
  linhas.push(
    `VÍDEO DE REFERÊNCIA: ${e.fonte.autor ? "@" + e.fonte.autor : "?"}${e.fonte.url ? " · " + e.fonte.url : ""}`,
  );
  if (e.fonte.metricas) linhas.push(`MÉTRICAS: ${JSON.stringify(e.fonte.metricas)}`);
  if (e.duracao)
    linhas.push(
      `DURAÇÃO: ${e.duracao.toFixed(1)} s · RITMO: ${e.palavras_por_segundo ?? "?"} palavras/s`,
    );
  if (e.analise_reel) linhas.push(`POR QUE FUNCIONOU: ${JSON.stringify(e.analise_reel)}`);
  if (e.analise_edicao) linhas.push(`LEITURA DA EDIÇÃO: ${JSON.stringify(e.analise_edicao)}`);
  if (e.frases?.length) {
    linhas.push(
      "FALA DA REFERÊNCIA, FRASE A FRASE (n · início–fim em s · nº de palavras · pausa depois em s):",
    );
    for (const f of e.frases)
      linhas.push(
        `${f.n} · ${f.inicio.toFixed(1)}–${f.fim.toFixed(1)} · ${f.palavras}p · pausa ${f.pausa_depois.toFixed(2)} · "${f.texto}"`,
      );
  } else {
    linhas.push(
      "SEM TRANSCRIÇÃO COM TEMPOS (o vídeo ainda não foi salvo como referência): use a legenda e o 'por que funcionou' para inferir a estrutura e marque pausas onde a mecânica pede.",
    );
    if (e.legenda) linhas.push(`LEGENDA DO POST: ${String(e.legenda).slice(0, 1500)}`);
  }
  return linhas.join("\n");
}

// ─── geração ────────────────────────────────────────────────────────────────
const FERRAMENTA = {
  name: "salvar_roteiro",
  description:
    "Grava o roteiro (completo, mesmo quando só uma parte mudou) e a resposta para a Mariana.",
  input_schema: {
    type: "object",
    properties: {
      resposta: {
        type: "string",
        description:
          "1 a 3 frases para a Mariana: o que foi feito ou mudado. Nunca diga que mudou algo que não está no roteiro gravado.",
      },
      roteiro: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          duracao_estimada_s: { type: "number" },
          espelho: {
            type: "string",
            description:
              "Como o roteiro espelha a referência (gancho, viradas, ritmo, pausas) em 1-2 frases.",
          },
          blocos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                papel: {
                  type: "string",
                  description: "gancho, contexto, tensão, virada, prova, passo, payoff, cta…",
                },
                ref: {
                  type: "string",
                  description: "Frase(s) da referência que este bloco espelha, ex.: '1' ou '3-4'.",
                },
                fala: {
                  type: "string",
                  description: "Exatamente o que ela fala, no idioma pedido.",
                },
                inicio_s: { type: "number" },
                duracao_s: { type: "number" },
                pausa_depois_s: {
                  type: "number",
                  description: "Pausa depois da fala, igual à da referência.",
                },
                como_falar: {
                  type: "string",
                  description: "Entonação, ênfase, olhar, ritmo (curto).",
                },
                na_tela: {
                  type: "string",
                  description: "Texto/efeito na tela nesse momento, se fizer sentido.",
                },
                visual: {
                  type: "object",
                  description:
                    "O que aparece na tela neste bloco, IGUAL ao formato da referência neste mesmo momento (é o plano de edição).",
                  properties: {
                    formato: {
                      type: "string",
                      enum: ["dividida-cima", "dividida-lado", "tela-cheia", "janela", "so-fala", "texto"],
                      description:
                        "dividida-cima = mídia em cima e a pessoa falando embaixo; dividida-lado = lado a lado; tela-cheia = mídia ocupa a tela (a voz continua); janela = mídia num quadro sobre a fala; so-fala = só a pessoa; texto = palavra/frase grande na tela.",
                    },
                    midia: {
                      type: "string",
                      description:
                        "O que mostrar, concreto (ex.: 'print da manchete do boato do apagão', 'vídeo de cidade apagando à noite', 'foto do episódio dos Simpsons'). Vazio em so-fala/texto.",
                    },
                    tipo: { type: "string", enum: ["video", "foto", "print", "nenhum"] },
                    busca: {
                      type: "string",
                      description:
                        "Consulta curta em inglês para achar a mídia num banco de vídeos/fotos (ex.: 'city blackout night'); vazio se for print/arquivo que a Mariana precisa enviar.",
                    },
                  },
                },
              },
              required: ["papel", "fala", "duracao_s", "pausa_depois_s"],
            },
          },
          cta: { type: "string" },
          palavra_chave: { type: ["string", "null"] },
          legenda: { type: "string", description: "Legenda do post no idioma pedido, sem emojis." },
        },
        required: ["titulo", "blocos", "cta", "legenda"],
      },
    },
    required: ["resposta", "roteiro"],
  },
};

async function sistema(
  sb: any,
  idioma: string,
  finalidade: string,
  empresaRoteiro?: string | null,
) {
  // A empresa é a do roteiro (gravada na criação); sem ela, a de quem chamou.
  const emp =
    empresaRoteiro ??
    (await empresaDoChamador(sb)) ??
    ((await sb.rpc("mads_iaplicada_id")).data as string);
  const { data: cfg } = await sb
    .from("vedit_nicho_config")
    .select("*")
    .eq("empresa_id", emp)
    .maybeSingle();
  const { data: marca } = await sb
    .from("vedit_marcas")
    .select("instrucoes")
    .eq("empresa_id", emp)
    .order("padrao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: empresa } = await sb
    .from("mads_empresas")
    .select("nome, interna")
    .eq("id", emp)
    .maybeSingle();
  const interna = !empresa || !!empresa.interna;
  // O que fazemos de verdade: os anúncios que mais geraram demanda (MQL no CRM) e os posts
  // orgânicos de maior alcance, para o roteiro tirar daí os exemplos (e não inventar).
  let fazemos = "";
  try {
    const { data: ads } = await sb
      .from("mads_v_criativos_metricas")
      .select("meta_ad_id, ad_nome, mql_no_crm")
      .order("mql_no_crm", { ascending: false, nullsFirst: false })
      .limit(6);
    const ids = (ads ?? []).map((a: any) => a.meta_ad_id).filter(Boolean);
    const { data: pubs } = ids.length
      ? await sb.from("publicacoes").select("meta_ad_id, legenda").in("meta_ad_id", ids)
      : { data: [] };
    const leg = new Map((pubs ?? []).map((p: any) => [p.meta_ad_id, p.legenda]));
    const { data: org } = await sb
      .from("publicacoes")
      .select("nome, legenda, metricas")
      .eq("destino", "instagram")
      .eq("status", "publicado")
      .eq("empresa_id", emp)
      .order("publicado_em", { ascending: false })
      .limit(20);
    const topOrg = (org ?? [])
      .filter((p: any) => p.metricas?.reach)
      .sort((a: any, b: any) => (b.metricas.reach ?? 0) - (a.metricas.reach ?? 0))
      .slice(0, 3);
    const linhas = [
      ...(interna ? (ads ?? []) : [])
        .filter((a: any) => leg.get(a.meta_ad_id))
        .map((a: any) => `- anúncio "${a.ad_nome}" (${a.mql_no_crm ?? 0} MQL): ${String(leg.get(a.meta_ad_id)).replace(/\s+/g, " ").slice(0, 500)}`),
      ...topOrg.map((p: any) => `- post orgânico "${p.nome ?? ""}" (alcance ${p.metricas.reach}): ${String(p.legenda ?? "").replace(/\s+/g, " ").slice(0, 400)}`),
    ];
    if (linhas.length)
      fazemos = `O QUE FAZEMOS DE VERDADE (conteúdos que mais geraram demanda e alcance; é daqui que saem os casos e exemplos, nunca copiados):\n${linhas.join("\n")}`;
  } catch (_) {
    /* sem histórico: segue sem */
  }
  const lingua = IDIOMAS[idioma] ?? idioma;
  const quem = interna
    ? `Você é roteirista da IAplicada (IA aplicada a negócios, para donos de empresa) e escreve para a Mariana Marques gravar falando para a câmera. Ela foi executiva por 11 anos (AngloGold Ashanti, Mercado Livre, Suzano) e hoje constrói sistemas com IA para empresas.`
    : `Você é roteirista da ${empresa.nome} e escreve para a pessoa da ${empresa.nome} gravar falando para a câmera. O roteiro é da ${empresa.nome}: nunca mencione a IAplicada nem a Mariana, e os exemplos vêm do negócio e do público da ${empresa.nome} (veja NICHO, PÚBLICO e MARCA abaixo; sem isso, deduza do assunto pedido).`;
  return `${quem}

TAREFA: escrever um roteiro ORIGINAL sobre o ASSUNTO pedido, espelhando o esqueleto de um vídeo que performou muito bem:
- o que se copia da referência é a MECÂNICA: a sequência de papéis (gancho, contexto, virada, prova, payoff, CTA), o ritmo (frases curtas onde ela é curta, pausas antes das viradas), a duração aproximada e o formato visual. Não é molde de frase: a quantidade de blocos e o tamanho de cada fala se adaptam ao NOSSO assunto (pode ter mais ou menos blocos), desde que cada papel apareça na mesma ordem e o vídeo fique com duração parecida. Em "ref", diga qual trecho da referência o bloco espelha;
- "inicio_s", "duracao_s" e "pausa_depois_s" calculados para o nosso roteiro (pausas maiores antes das viradas, como ela faz);
- o mesmo tipo de gancho e de mecanismo (curiosidade, quebra de crença, lista, história…), nunca a mesma frase: nada copiado, tema e exemplos nossos;
- o MESMO FORMATO VISUAL: cada bloco tem "visual" igual ao que a referência mostra naquele momento (veja EDIÇÃO DA REFERÊNCIA, MOMENTO A MOMENTO): se ali ela usa tela dividida com vídeo em cima, o nosso bloco também; se corta para vídeo em tela cheia na palavra concreta, o nosso também, com uma mídia do NOSSO assunto que prove aquela fala (o equivalente ao que ela mostrou). Mesma quantidade de trocas de mídia e mesmos momentos; nada de bloco "só fala" onde ela tem imagem.
- a CONEXÃO: o assunto do momento é a porta de entrada; o roteiro tem que ligar esse assunto, sem forçar, à dor da empresa que a Mariana indicar e à IA aplicada como saída. Se ela disser qual é a ponte (ex.: "depender de uma pessoa só, de um sistema só, de processo na cabeça do dono"), essa ponte é o miolo do roteiro, com as palavras dela.
- INSTRUÇÕES DA MARIANA têm prioridade: se ela sugerir gancho, frase na tela ou visual (ex.: "tela dividida: o print do boato de um lado e você do outro com 'Se a internet caísse hoje, sua empresa parava?'"), use exatamente isso no ponto indicado.

IDIOMA: escreva TODA fala, CTA e legenda em ${lingua}${idioma === "pt-BR" ? "" : " (natural para nativos, sem soar traduzido); as indicações 'como_falar' e 'na_tela' ficam em português"}.
VOZ: direta, concreta, de quem já fez; ${interna ? "exemplos de empresa real (WhatsApp, CRM, comercial, atendimento, operação, relatórios)" : "exemplos concretos do dia a dia do público dessa empresa"}; números quando houver. Sem emojis, sem jargão, nunca a palavra "PME" (use "empresa"), nunca "teu/tua".
FINALIDADE: ${finalidade === "anuncio" ? `anúncio — termina chamando para ${interna ? "agendar um diagnóstico com a IAplicada" : `falar com a ${empresa.nome}`}.` : "orgânico — termina pedindo um comentário com palavra-chave."}
${finalidade === "anuncio" ? "" : `ORGÂNICO NÃO É ANÚNCIO (regra dura):
- Ninguém está vendendo nada: zero "se você tem indústria, distribuidora, clínica…", zero faixa de faturamento, zero "a ${interna ? "IAplicada" : "empresa"} faz", zero promessa de diagnóstico. Fala de criador de conteúdo para o feed, não de anúncio segmentado.
- ${interna ? "A Mariana aparece como pessoa: fala em primeira pessoa, com opinião e bastidor dela (o que ela viu como executiva, o que ela faz hoje construindo sistemas com IA), do jeito que alguém se apresenta no próprio perfil, no ponto em que a referência traz a voz/opinião de quem fala." : "Quem fala aparece como pessoa, em primeira pessoa, com opinião e bastidor próprios."}
- IA de verdade, concreta e LIGADA AO ASSUNTO: diga o que a IA resolve naquele problema, com o caso e o resultado. Tire o exemplo do que a ${interna ? "IAplicada" : "empresa"} faz de verdade (veja O QUE FAZEMOS DE VERDADE), escolhendo o caso que conversa com o assunto do vídeo. Não use sempre o mesmo exemplo (agente lendo WhatsApp, relatório de segunda) nem invente o que não fazemos. Proibido genérico ("colocar IA no bastidor", "IA que resolve", "transformação digital").
- ARCO: o assunto do momento abre e FECHA o vídeo. A IA/o nosso trabalho entra no MEIO, como a virada (o que muda na prática); depois o roteiro VOLTA ao assunto e termina nele. A CTA continua o assunto do vídeo (a palavra-chave e a promessa são do tema, não de um material genérico solto).
- Nada genérico: cada frase precisa de um detalhe específico (um caso, um número real do assunto, uma cena). Se a frase serviria para qualquer tema, reescreva.`}
NICHO: ${cfg?.nicho ?? (interna ? "IA aplicada a negócios" : "(não cadastrado)")} · PÚBLICO: ${cfg?.publico ?? (interna ? "donos de empresa" : "(não cadastrado)")}
${marca?.instrucoes ? `MARCA: ${marca.instrucoes}` : ""}
${fazemos}

CTA: nunca reaproveite a palavra-chave nem a oferta da referência. A palavra-chave sai do NOSSO assunto (ex.: APAGÃO) e o que ela recebe tem ligação direta com o que o vídeo acabou de mostrar (ex.: o teste que ela faz para descobrir o que trava quando alguém some), dito de forma específica. Proibido CTA genérico ("te mando o material no privado sem custo", "mapa das aplicações").

AJUSTES: leia o pedido da Mariana pelo que ela QUER, não ao pé da letra das palavras soltas:
- pedido pontual ("troca a CTA", "encurta o bloco 3") → mude só aquilo e mantenha o resto;
- crítica de direção ("ficou péssimo", "não falou do assunto", "parece anúncio", "não conectou") → reescreva TODAS as partes afetadas por inteiro, quantas forem, até o problema sumir; não troque só uma frase;
- o pedido mais recente vale mais que os anteriores, mas não desfaça o que ela já pediu antes (veja PEDIDOS ANTERIORES) a não ser que ela mande;
- antes de salvar, releia o roteiro inteiro como a Mariana: se ainda tem o problema que ela apontou, corrija. Grave sempre o roteiro completo com salvar_roteiro e, na resposta, diga com honestidade o que mudou.`;
}

async function gerar(sb: any, id: string) {
  const { data: r } = await sb.from("vedit_roteiros").select("*").eq("id", id).single();
  try {
    const est = r.estrutura ?? (await montarEstrutura(sb, r.reel_id, r.referencia_id));
    const j = await claude(
      sb,
      {
        max_tokens: 12000,
        system: await sistema(sb, r.idioma, r.finalidade, r.empresa_id),
        tools: [FERRAMENTA],
        tool_choice: { type: "tool", name: "salvar_roteiro" },
        messages: [
          {
            role: "user",
            content: `${textoEstrutura(est)}\n\n${await edicaoDaReferencia(sb, est.fonte?.referencia_id ?? r.referencia_id)}\n\nASSUNTO DO NOSSO VÍDEO: ${r.tema}${r.notas ? `\nOBSERVAÇÕES DA MARIANA: ${r.notas}` : ""}\n\nEscreva o roteiro e chame salvar_roteiro.`,
          },
        ],
      },
      "vedit-roteiro:criar",
    );
    const out = j.content?.find((c: any) => c.type === "tool_use")?.input;
    if (!out?.roteiro?.blocos?.length) throw new Error("o roteiro veio vazio, tente de novo");
    await sb
      .from("vedit_roteiros")
      .update({
        estrutura: est,
        referencia_id: est.fonte?.referencia_id ?? r.referencia_id,
        roteiro: out.roteiro,
        versao: 1,
        status: "pronto",
        erro: null,
        updated_at: new Date().toISOString(),
        mensagens: [
          { papel: "claude", texto: out.resposta, em: new Date().toISOString(), versao: 1 },
        ],
      })
      .eq("id", id);
  } catch (e) {
    await sb
      .from("vedit_roteiros")
      .update({ status: "erro", erro: e instanceof Error ? e.message : String(e) })
      .eq("id", id);
  }
}

async function ajustar(sb: any, r: any, msgs: any[], pedido: string) {
  const id = r.id;
  try {
    const historico = (r.mensagens ?? [])
      .filter((m: any) => m.papel === "usuario")
      .map((m: any) => `- ${m.texto}`)
      .join("\n");
    const j = await claude(
      sb,
      {
        max_tokens: 12000,
        system: await sistema(sb, r.idioma, r.finalidade, r.empresa_id),
        tools: [FERRAMENTA],
        tool_choice: { type: "tool", name: "salvar_roteiro" },
        messages: [
          {
            role: "user",
            content: `${textoEstrutura(r.estrutura ?? {})}\n\n${await edicaoDaReferencia(sb, r.estrutura?.fonte?.referencia_id ?? r.referencia_id)}\n\nTEMA DA CRIAÇÃO: ${r.tema} (se os pedidos trocaram o tema, vale o tema dos pedidos e do roteiro atual)\n${historico ? `PEDIDOS ANTERIORES (já aplicados):\n${historico}\n` : ""}\nROTEIRO ATUAL (versão ${r.versao}):\n${JSON.stringify(r.roteiro)}\n\nPEDIDO DE AJUSTE DA MARIANA: ${pedido}\n\n${(r.roteiro?.blocos ?? []).some((b: any) => b.visual) ? "" : "O roteiro atual ainda não tem o plano visual: além do ajuste, preencha 'visual' em TODOS os blocos seguindo a edição da referência momento a momento.\\n"}Atenda esse pedido seguindo as regras de AJUSTES e chame salvar_roteiro com o roteiro completo.`,
          },
        ],
      },
      "vedit-roteiro:ajustar",
    );
    const out = j.content?.find((c: any) => c.type === "tool_use")?.input;
    if (!out?.roteiro?.blocos?.length) throw new Error("o ajuste veio vazio, tente de novo");
    const versao = (r.versao ?? 0) + 1;
    await sb
      .from("vedit_roteiros")
      .update({
        roteiro: out.roteiro,
        versao,
        status: "pronto",
        erro: null,
        updated_at: new Date().toISOString(),
        mensagens: [
          ...msgs,
          { papel: "claude", texto: out.resposta, em: new Date().toISOString(), versao },
        ],
      })
      .eq("id", id);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await sb
      .from("vedit_roteiros")
      .update({
        status: "pronto",
        erro,
        mensagens: [
          ...msgs,
          {
            papel: "claude",
            texto: `Não consegui aplicar esse ajuste (${erro}). O roteiro continua na versão ${r.versao}; pode pedir de novo.`,
            em: new Date().toISOString(),
          },
        ],
      })
      .eq("id", id);
  }
}

function textoCorrido(ro: any) {
  return (ro.blocos ?? [])
    .map(
      (b: any) =>
        `${b.fala}${b.pausa_depois_s >= 0.3 ? `  [pausa ${Number(b.pausa_depois_s).toFixed(1)}s]` : ""}`,
    )
    .join("\n");
}

async function enviarMarketing(sb: any, id: string) {
  const { data: r } = await sb.from("vedit_roteiros").select("*").eq("id", id).single();
  if (!r?.roteiro) throw new Error("o roteiro ainda não está pronto");
  // O quadro de marketing (content_items) é só da IAplicada.
  const { data: dona } = await sb
    .from("mads_empresas")
    .select("interna")
    .eq("id", r.empresa_id)
    .maybeSingle();
  if (dona && !dona.interna)
    throw new Error("enviar para o marketing só existe na conta da IAplicada");
  const ro = r.roteiro;
  const fonte = r.estrutura?.fonte ?? {};
  const { data: ci, error } = await sb
    .from("content_items")
    .insert({
      titulo: ro.titulo,
      descricao: `Roteiro no esqueleto de ${fonte.autor ? "@" + fonte.autor : "um vídeo de referência"}${fonte.url ? ` (${fonte.url})` : ""}. ${ro.espelho ?? ""}`,
      tipo_video: "reel",
      categoria: "reels",
      plataforma: "instagram",
      plataformas: ["instagram"],
      status: "backlog",
      finalidade: r.finalidade ?? "organico",
      produto: "business",
      link_referencia: fonte.url ?? null,
      roteiro: `${textoCorrido(ro)}\n\nCTA: ${ro.cta}`,
      legenda: ro.legenda ?? null,
      auto_resposta_palavra_chave: ro.palavra_chave ?? null,
      auto_resposta_ativa: !!ro.palavra_chave,
      recomendacoes_edicao: (ro.blocos ?? [])
        .filter((b: any) => b.na_tela)
        .map(
          (b: any) =>
            `${b.inicio_s != null ? `${Number(b.inicio_s).toFixed(1)}s: ` : ""}${b.na_tela}`,
        )
        .join("\n"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await sb.from("vedit_roteiros").update({ content_item_id: ci.id }).eq("id", id);
  return { ok: true, content_item_id: ci.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  (sb as any).__req = req;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "criar") {
      const tema = String(body.tema ?? "").trim();
      if (!tema) return json({ error: "diga o assunto do vídeo" }, 400);
      if (!body.reel_id && !body.referencia_id)
        return json({ error: "escolha o vídeo de referência" }, 400);
      const est = await montarEstrutura(sb, body.reel_id, body.referencia_id);
      const { data, error } = await sb
        .from("vedit_roteiros")
        .insert({
          // Função roda como serviço: sem isso o roteiro ia para a IAplicada e sumia da conta que pediu.
          ...((await empresaDoChamador(sb)) ? { empresa_id: await empresaDoChamador(sb) } : {}),
          reel_id: body.reel_id ?? null,
          referencia_id: est.fonte.referencia_id,
          tema,
          idioma: body.idioma || "pt-BR",
          finalidade: body.finalidade || "organico",
          notas: body.notas?.trim() || null,
          estrutura: est,
          status: "gerando",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      // Gera em segundo plano: a tela acompanha pelo status.
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      EdgeRuntime.waitUntil(gerar(sb, data.id));
      return json({ id: data.id });
    }
    if (body.acao === "ajustar") {
      const pedido = String(body.pedido ?? "").trim();
      if (!pedido) return json({ error: "escreva o ajuste" }, 400);
      const { data: r } = await sb.from("vedit_roteiros").select("*").eq("id", body.id).single();
      if (!r?.roteiro) return json({ error: "o roteiro ainda não está pronto" }, 400);
      if (r.status === "gerando") return json({ error: "espere terminar o ajuste anterior" }, 409);
      const msgs = [
        ...(r.mensagens ?? []),
        { papel: "usuario", texto: pedido, em: new Date().toISOString() },
      ];
      await sb
        .from("vedit_roteiros")
        .update({ mensagens: msgs, status: "gerando", erro: null })
        .eq("id", r.id);
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      EdgeRuntime.waitUntil(ajustar(sb, r, msgs, pedido));
      return json({ ok: true });
    }
    if (body.acao === "refazer") {
      // Refaz com o esqueleto atualizado (o vídeo pode ter sido salvo como referência depois).
      await sb
        .from("vedit_roteiros")
        .update({ status: "gerando", erro: null, estrutura: null })
        .eq("id", body.id);
      // @ts-ignore
      EdgeRuntime.waitUntil(gerar(sb, body.id));
      return json({ ok: true });
    }
    if (body.acao === "enviar_marketing") return json(await enviarMarketing(sb, body.id));
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
