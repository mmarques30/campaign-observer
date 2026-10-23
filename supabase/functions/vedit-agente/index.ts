// vedit-agente — o "editor" de verdade. Recebe o pedido (texto livre ou /comando),
// lê transcrição palavra a palavra, edição atual, marca e histórico, e devolve a
// nova edição como JSON (nunca código). Storyboard primeiro quando a edição é
// grande, para a pessoa aprovar antes de aplicar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectarRepeticoes, descreverRepeticoes } from "./repeticoes.ts";

// Trilhas que vêm com o editor (espelho de src/video/trilhas.ts) + biblioteca da marca no bucket.
const TRILHAS_BASE = [
  { id: "base-pulso", nome: "Pulso", humor: ["energetico", "moderno", "confiante"], energia: "alta", bpm: 118, uso: "Anúncio direto (dor → solução → CTA), listas rápidas, estilo viral.", ganho: 1 },
  { id: "base-corporativo", nome: "Corporativo leve", humor: ["inspirador", "corporativo", "positivo"], energia: "media", bpm: 100, uso: "Método, autoridade, institucional, estilo editorial ou limpo.", ganho: 1 },
  { id: "base-tensao", nome: "Tensão", humor: ["tenso", "dramatico", "urgente"], energia: "media", bpm: 92, uso: "Abrir com dor/problema/prejuízo; virada antes da solução.", ganho: 1 },
  { id: "base-lofi", nome: "Lo-fi", humor: ["calmo", "intimo", "bastidor"], energia: "baixa", bpm: 84, uso: "Orgânico conversado, bastidor, história pessoal.", ganho: 1 },
];
async function listarTrilhas(sb: any) {
  let marca: any[] = [];
  try {
    const { data } = await sb.storage.from("video-edicao").download("trilhas/biblioteca.json");
    if (data) marca = JSON.parse(await data.text());
  } catch (_) {
    /* sem biblioteca ainda */
  }
  return [...TRILHAS_BASE, ...marca];
}

// Mesmo modelo das outras funções do projeto (centenas de chamadas ok com esta chave).
const MODELO = Deno.env.get("VEDIT_MODELO") || "claude-opus-5";

/** Consumo em api_usage_log (aba Custo do PMO), como as demais funções. Nunca lança. */
async function logUso(sb: any, origem: string, usage: any, projetoId: string | null) {
  try {
    const input = usage?.input_tokens ?? 0,
      output = usage?.output_tokens ?? 0;
    if (!input && !output) return;
    await sb.from("api_usage_log").insert({
      provider: "anthropic",
      origem,
      model: MODELO,
      input_tokens: input,
      output_tokens: output,
      custo_usd: (input * 5 + output * 25) / 1_000_000,
      metadata: { vedit_projeto_id: projetoId },
    });
  } catch (_) {
    /* telemetria não derruba a função */
  }
}
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

const FERRAMENTA = {
  name: "aplicar_edicao",
  description:
    "Devolve a resposta para a pessoa e, quando houver mudança, a edição completa (timeline) e/ou o storyboard.",
  input_schema: {
    type: "object",
    properties: {
      resposta: {
        type: "string",
        description:
          "Mensagem curta em português para a pessoa: o que você fez ou propõe. Sem emojis. Máx. 4 frases.",
      },
      storyboard: {
        type: "array",
        description:
          "Plano cena a cena (use em /storyboard ou quando a edição for grande e ainda não aprovada).",
        items: {
          type: "object",
          properties: {
            cena: { type: "integer" },
            de: { type: "number" },
            ate: { type: "number" },
            fala: { type: "string" },
            visual: { type: "string" },
            efeito: { type: "string" },
            som: { type: "string" },
          },
          required: ["cena", "de", "ate", "fala", "visual"],
        },
      },
      aguardando_aprovacao: {
        type: "boolean",
        description: "true quando você mandou storyboard e NÃO aplicou a timeline ainda.",
      },
      timeline: {
        type: "object",
        description: "A edição COMPLETA (não um pedaço), no formato descrito. Omita se nada mudou.",
      },
      variacoes: {
        type: "array",
        description:
          "Só para /variacoes: versões completas alternativas (mudando principalmente os 3 primeiros segundos).",
        items: {
          type: "object",
          properties: { nome: { type: "string" }, timeline: { type: "object" } },
          required: ["nome", "timeline"],
        },
      },
      resumo_mudanca: { type: "string", description: "Uma linha para o histórico de versões." },
    },
    required: ["resposta"],
  },
};

function sistema(
  catalogo: string,
  marca: any,
  instrucoes: string,
  objetivo: string,
  formato: string,
  duracao: number,
  estilo: string,
  duracaoAlvo: number | null,
  marketing: string,
) {
  return `Você é o editor de vídeo da IAplicada, no nível dos melhores editores de Reels do Brasil. Você edita vídeos curtos (Reels e anúncios Meta) devolvendo um JSON de edição. Você NUNCA escreve código.

COMO O SISTEMA FUNCIONA
- A pessoa grava um vídeo cru. Você recebe a transcrição palavra a palavra, no formato "[índice] início-fim palavra" (segundos do ORIGINAL).
- Todos os tempos que você escreve (cortes, efeitos, zooms, sons) são em segundos do ORIGINAL. O sistema converte para o vídeo final depois dos cortes.
- Você devolve a timeline COMPLETA a cada mudança (copie o que não mudou; mantenha os mesmos "id" dos efeitos que continuam).

FORMATO DA TIMELINE
{
  "versao": 1, "formato": "9:16"|"4:5"|"1:1", "fps": 30,
  "cortes": [{"de": s, "ate": s}],            // trechos que FICAM, em ordem. [] = vídeo inteiro
  "enquadramento": {"x":0.5,"y":0.5,"escala":1}, // p/ reenquadrar vídeo deitado em 9:16 (x/y = ponto de foco)
  "zoom": {"alternar": true, "eventos": [{"de","ate","escala":1.1–1.4,"x":0.5,"y":0.4,"tipo":"soco"|"suave"}]},
  "legenda": {"ativa": true, "estilo": "karaoke"|"simples"|"caixa"|"editorial"|"neon"|"maquina"|"impacto", "posicao": "inferior"|"centro"|"superior", "altura": null ou 0.1–0.9 (ajuste fino: 0.72 ≈ inferior, maior = mais baixo; "desce a legenda" → aumente ~0.05), "tamanho": 0.5–1.8 (1 = padrão; "legenda maior/menor" → ±0.15), "palavrasPorBloco": 1–8 ("simples" = legenda comum, frase em letra normal, use 5–7), "destaques": [índices de palavras], "correcoes": {"índice": "grafia certa"}, "caixaAlta": false},
  "efeitos": [{"id": "e1", "tipo": "<tipo do catálogo>", "de": s, "ate": s, "props": {...}}],
  "sfx": [{"em": s, "som": "whoosh|swipe|pop|click|ding|sucesso|riser|impacto|obturador|digitar|glitch|papel", "volume": 0–1}],
  "musica": {"midia": "trilha:<id>" (lista TRILHAS DISPONÍVEIS) | "<id de áudio enviado>" | null, "volume": 0.08–0.3, "abaixarNaVoz": true, "abaixarPara": 0.2–0.5, "fade": true},
  "visual": {"look": "natural|quente|frio|cinema|pb|vivo", "grao": 0–1, "vinheta": 0–1, "barraProgresso": bool, "transicao": "nenhuma|suave|escurecer|desfoque|zoom-suave|flash|chicote|glitch|zoom" (suave = dissolve curto entre os cortes; escurecer = passa rápido pelo preto; desfoque = desfoca e volta; zoom-suave = aproximação leve; "transição suave/sem ser só zoom" → "suave"),
             "brilho": 0.5–1.6 (1 = original), "contraste": 0.5–1.6, "saturacao": 0–2, "temperatura": -1 (frio) … 1 (quente), "sombras": 0–1 (clareia rosto escuro), "nitidez": 0–1},   // /luz mexe só nestes; ajustes sutis (±0.05–0.2) ficam naturais
  "audio": {"limpar": true, "intensidade": "leve"|"media"|"forte", "volumeVoz": 0.3–1},  // voz limpa (ruído de fundo fora); "barulho"/"ruído" → intensidade mais forte
  "modelo": {…} | null,  // modelo de edição salvo (veja MODELO DE EDIÇÃO); devolva como recebeu
  "marca": ${JSON.stringify(marca)}
}

${catalogo}

REGRAS DE EDIÇÃO (padrão de qualidade alto, nada amador)
1. Cortes: remova silêncios acima de ~0,35s, respiros, "é…", "ãh", "tipo", "né" usados como muleta, gaguejos e frases repetidas. Quem grava sozinho repete a mesma fala várias vezes (tomadas): o roteiro final tem que ficar UNIFICADO, cada fala UMA vez só — fique com a ÚLTIMA tomada de cada frase e tire tudo que ficou entre as tomadas ("não, pera", "de novo", risos). O contexto traz FALAS REPETIDAS DETECTADAS já calculadas: use essa lista como base obrigatória e confira na transcrição se há outras que o detector não pegou (reformulações com palavras diferentes mas mesmo sentido). Deixe ~0,06s de respiro antes e ~0,10s depois de cada trecho para não comer sílaba. Nunca corte no meio de uma palavra.
2. Gancho: os primeiros 3s decidem tudo. Abra com a frase mais forte (pode reordenar só cortando o começo fraco) e um efeito "titulo" ou "palavra-gigante".
3. Ritmo: um estímulo visual novo a cada 3–6s (efeito, zoom de soco, b-roll). Nunca dois efeitos de tela cheia sobrepostos; no máximo 2 efeitos ao mesmo tempo.
4. Zoom: "alternar": true por padrão; "soco" de 1.15–1.3 nas palavras de ênfase (números, promessas, viradas).
5. Legenda: sempre ativa, salvo pedido contrário. Marque em "destaques" 1 palavra-chave a cada 1–2 frases. Corrija grafia de marcas em "correcoes" (IAplicada, Claude, CRM).
6. Som: todo efeito ganha o som sugerido no instante em que entra; todo corte para efeito de tela cheia ganha whoosh/swipe. Volume de sfx 0,35–0,6.
7. Efeitos usam o conteúdo real do que a pessoa fala (números, nomes, listas ditas). Textos curtos: título ≤ 7 palavras, itens ≤ 4 palavras.
8. Só use tipos do catálogo disponível. Para mídias, use apenas ids da lista de MÍDIAS ENVIADAS, ids devolvidos por buscar_midia, ou "tempo" (trecho do próprio vídeo).
8b. Imagens: quando a fala cita um app, canal ou ferramenta (WhatsApp, e-mail, planilha, Instagram, Google…) ou um objeto simples (dinheiro, relógio, gráfico), prefira o efeito "icones" (logos/ícones que saltam na tela, entrando na palavra exata) — não precisa buscar nada. Para FOTOS ou VÍDEOS reais da internet (cenário, pessoas, escritório), chame buscar_midia (consulta em inglês, concreta e visual) ANTES de aplicar_edicao e use os ids devolvidos em broll, fundo-imagem, dividir, reagir ou celular. Uma busca por vez. Nunca invente ids. Até 3 buscas por pedido.
9. Fim: orgânico termina com "cta-final" (palavra-chave para comentar). Anúncio termina com CTA falado + título de ação, sem pedir comentário.
10. Música de fundo: anúncio SEMPRE tem música (dá ritmo); orgânico quase sempre (só não quando a pessoa pedir). Escolha da lista TRILHAS DISPONÍVEIS pelo clima do vídeo e use "musica": {"midia": "trilha:<id>", "volume": 0.16 em anúncio / 0.12 em orgânico, "abaixarNaVoz": true, "abaixarPara": 0.3, "fade": true}. Prefira trilhas da marca quando combinarem. "/musica" sem detalhe = escolha e aplique; "/musica mais alta|mais baixa|outra|sem" ajusta. Volume nunca acima de 0.3 (a voz manda).
${
  objetivo === "anuncio"
    ? `
MODO ANÚNCIO (Meta Ads)
- Duração: NÃO é regra. Quem manda é o conteúdo: corte o que não prende e pare aí. Como referência de mercado, anúncios de Reels costumam render melhor entre 15 e 45s, e o Meta aceita até 90s; se a fala boa tem 50s, entregue 50s. ${duracaoAlvo ? `A pessoa aprovou duração alvo de ~${duracaoAlvo}s; chegue perto sem cortar ideia inteira.` : "Se o vídeo cru passa de 60s, diga na resposta qual trecho você deixaria de fora e por quê."}
- Gancho em ≤3s com a dor ou o resultado.
- Zonas seguras: nada importante nos 14% de cima nem nos 35% de baixo; legenda "centro" ou "inferior" ("inferior" fica a ~71% da altura; em anúncio, se a pessoa não pediu para descer, prefira altura ≤ 0.66 para não ficar sob o botão do Meta).
- Legenda obrigatória (muita gente vê sem som). Mostre prova (número, antes/depois, print) até a metade.`
    : `
MODO ORGÂNICO (Reels)
- Duração livre, mas corte tudo que não prende.${duracaoAlvo ? ` Duração alvo aprovada: ~${duracaoAlvo}s.` : ""}
- Termine com "cta-final".`
}

ESTILO VISUAL DESTE VÍDEO: "${estilo}". Siga as regras desse estilo (lista em ESTILOS VISUAIS). "/estilo X" troca o estilo e você refaz legenda, look, transição e troca os efeitos pelos preferidos do novo estilo, mantendo cortes e conteúdo.

MODELO DE EDIÇÃO: se timeline.modelo existir, a pessoa salvou esse padrão de um vídeo que aprovou. Mantenha legenda, posição/altura, look, transição, zoom e música como estão na timeline (não troque sem ela pedir), use de preferência os tipos de efeito em timeline.modelo.efeitos (na mesma ordem de preferência) e mire em ~timeline.modelo.ritmo efeitos por minuto. Siga timeline.modelo.notas. Sempre devolva "modelo" igual ao recebido.

CORTES À MÃO: a pessoa também corta pelo roteiro (aba Cortes). Ao receber pedidos como "tira de 0:12 a 0:15", "corta a parte que eu falo X" ou "essa pausa está longa", ajuste só "cortes" (segundos do ORIGINAL) e preserve o resto.

MARCA E TOM: ${instrucoes}

CONTEXTO DO MARKETING (roteiro planejado, nomes e desempenho dos anúncios atuais):
${marketing}

COMO RESPONDER
- "/storyboard" ou pedido de edição completa de um vídeo ainda sem edição: devolva o storyboard (cenas com tempo, fala, visual, efeito, som) e aguardando_aprovacao=true, SEM timeline. Quando a pessoa aprovar ("aprovado", "pode aplicar", "manda"), aplique tudo na timeline.
- Pedidos pontuais ("/legenda neon", "tira o zoom do começo", "/vidro com os números que eu falei"): aplique direto e devolva a timeline completa.
- "/gancho": proponha 3 ganchos na resposta (texto + qual efeito), sem aplicar, salvo se pedirem.
- "/variacoes N": devolva N variações completas em "variacoes" (mude o gancho/abertura e o título), mantendo o resto.
- Formato do vídeo: ${formato}. Duração do original: ${duracao.toFixed(1)}s.
- Responda curto, em português do Brasil, sem emojis, sem jargão.`;
}

const FERRAMENTA_BUSCA = {
  name: "buscar_midia",
  description:
    "Busca fotos ou vídeos liberados para uso comercial (Pexels/Unsplash com chave; Wikimedia Commons para fotos sem chave), salva os melhores no projeto e devolve os ids para usar em broll, fundo-imagem, dividir, reagir ou celular. Para logos de apps/ferramentas use o efeito icones, não esta busca.",
  input_schema: {
    type: "object",
    properties: {
      consulta: {
        type: "string",
        description:
          "Termos de busca EM INGLÊS, concretos e visuais (ex.: 'crowded office people stressed', 'dentist clinic reception').",
      },
      tipo: {
        type: "string",
        enum: ["imagem", "video"],
        description: "imagem para fundo/dividir/celular; video para broll e reagir.",
      },
      quantidade: { type: "integer", minimum: 1, maximum: 3 },
      orientacao: { type: "string", enum: ["vertical", "horizontal", "qualquer"] },
    },
    required: ["consulta", "tipo"],
  },
};

/** Wikimedia Commons: rápido (<1 s), sem chave. Prefere domínio público/CC0/CC BY; completa com CC BY-SA. */
async function wikimedia(consulta: string, n: number) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${consulta} filetype:bitmap`,
    gsrlimit: String(Math.min(30, n * 3)),
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "1600",
  }))
    u.searchParams.set(k, v);
  const r = await fetch(u, {
    headers: { "User-Agent": "IAplicada-editor/1.0 (contato@iaplicada.com.br)" },
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json();
  const limpa = (h: string) => String(h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const itens = Object.values(j?.query?.pages ?? {})
    .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    .map((p: any) => {
      const ii = p.imageinfo?.[0] ?? {};
      const m = ii.extmetadata ?? {};
      const lic = String(m.License?.value ?? "").toLowerCase();
      return {
        url: ii.thumburl ?? ii.url,
        thumb: ii.thumburl ?? ii.url,
        largura: ii.thumbwidth ?? ii.width,
        altura: ii.thumbheight ?? ii.height,
        lic,
        credito: `${limpa(p.title).replace(/^File:/, "").replace(/\.[a-z]+$/i, "")} — ${limpa(m.Artist?.value) || "autor"} (${m.LicenseShortName?.value ?? lic}, Wikimedia Commons)`,
      };
    })
    .filter((x: any) => x.url && (x.largura ?? 0) >= 600 && /^(pd|cc0|cc-by)/.test(x.lic));
  const livres = itens.filter((x: any) => !x.lic.includes("sa"));
  const sa = itens.filter((x: any) => x.lic.includes("sa"));
  return [...livres, ...sa].slice(0, n);
}

/** Busca no Pexels/Unsplash (com chave) ou Wikimedia Commons (sem chave) e salva no bucket do projeto. */
async function buscarMidia(sb: any, projetoId: string, args: any) {
  const pexels = Deno.env.get("PEXELS_API_KEY");
  const unsplash = Deno.env.get("UNSPLASH_ACCESS_KEY");
  const n = Math.min(3, Math.max(1, Number(args.quantidade ?? 2)));
  const orient =
    args.orientacao === "vertical"
      ? "portrait"
      : args.orientacao === "horizontal"
        ? "landscape"
        : "";
  const achados: {
    url: string;
    nome: string;
    credito: string;
    tipo: "imagem" | "video";
    duracao?: number;
  }[] = [];
  try {
    if (args.tipo === "video" && pexels) {
      const r = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(args.consulta)}&per_page=${n}${orient ? `&orientation=${orient}` : ""}&size=medium`,
        { headers: { Authorization: pexels }, signal: AbortSignal.timeout(10000) },
      );
      const j = await r.json();
      for (const v of j.videos ?? []) {
        const arq = (v.video_files ?? [])
          .filter((f: any) => f.file_type === "video/mp4" && f.height <= 1920 && f.width <= 1920)
          .sort((a: any, b: any) => b.height - a.height)[0];
        if (arq)
          achados.push({
            url: arq.link,
            nome: `pexels-video-${v.id}.mp4`,
            credito: `Vídeo de ${v.user?.name ?? "Pexels"} no Pexels`,
            tipo: "video",
            duracao: v.duration,
          });
      }
    } else if (pexels) {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(args.consulta)}&per_page=${n}${orient ? `&orientation=${orient}` : ""}`,
        { headers: { Authorization: pexels }, signal: AbortSignal.timeout(10000) },
      );
      const j = await r.json();
      for (const ph of j.photos ?? [])
        achados.push({
          url: ph.src?.large2x ?? ph.src?.large,
          nome: `pexels-${ph.id}.jpg`,
          credito: `Foto de ${ph.photographer} no Pexels`,
          tipo: "imagem",
        });
    }
    // Pixabay (chave grátis): fotos e vídeos.
    const chavePixabay = Deno.env.get("PIXABAY_API_KEY");
    if (achados.length < n && chavePixabay) {
      const video = args.tipo === "video";
      const qs = new URLSearchParams({
        key: chavePixabay,
        q: String(args.consulta).slice(0, 100),
        per_page: "5",
        safesearch: "true",
        ...(video ? {} : { image_type: "photo", ...(orient ? { orientation: orient === "portrait" ? "vertical" : "horizontal" } : {}) }),
      });
      try {
        const j = await (
          await fetch(`https://pixabay.com/api/${video ? "videos/" : ""}?${qs}`, { signal: AbortSignal.timeout(10000) })
        ).json();
        for (const h of j.hits ?? []) {
          if (achados.length >= n) break;
          if (video) {
            const v = h.videos?.medium?.url ? h.videos.medium : h.videos?.small;
            if (v?.url)
              achados.push({
                url: v.url,
                nome: `pixabay-video-${h.id}.mp4`,
                credito: `Vídeo de ${h.user ?? "Pixabay"} no Pixabay`,
                tipo: "video",
                duracao: h.duration,
              });
          } else
            achados.push({
              url: h.largeImageURL ?? h.webformatURL,
              nome: `pixabay-${h.id}.jpg`,
              credito: `Imagem de ${h.user ?? "Pixabay"} no Pixabay`,
              tipo: "imagem",
            });
        }
      } catch (_) {
        /* segue para as outras fontes */
      }
    }
    if (achados.length < n && unsplash && args.tipo !== "video") {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(args.consulta)}&per_page=${n - achados.length}${orient ? `&orientation=${orient === "portrait" ? "portrait" : "landscape"}` : ""}`,
        { headers: { Authorization: `Client-ID ${unsplash}` }, signal: AbortSignal.timeout(10000) },
      );
      const j = await r.json();
      for (const ph of j.results ?? [])
        achados.push({
          url: `${ph.urls?.raw}&w=1600&q=85&fm=jpg`,
          nome: `unsplash-${ph.id}.jpg`,
          credito: `Foto de ${ph.user?.name} no Unsplash`,
          tipo: "imagem",
        });
    }
    // Sem chave (ou nada achado): Wikimedia Commons, rápido e liberado (só imagens).
    if (achados.length < n && args.tipo !== "video") {
      const extra = await wikimedia(args.consulta, n - achados.length).catch(() => []);
      for (const w of extra)
        achados.push({ url: w.url, nome: `commons-${Date.now()}-${achados.length}.jpg`, credito: w.credito, tipo: "imagem" });
    }
  } catch (e) {
    return { erro: `Busca falhou: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!achados.length)
    return {
      erro:
        args.tipo === "video" && !pexels && !Deno.env.get("PIXABAY_API_KEY")
          ? "Vídeos de banco precisam da chave PIXABAY_API_KEY (ou PEXELS_API_KEY). Busque uma imagem (tipo imagem) ou use o efeito icones."
          : "Nada encontrado. Tente termos mais simples em inglês, ou use o efeito icones.",
    };
  const salvas: { id: string; nome: string; tipo: string; duracao?: number; credito: string }[] =
    [];
  for (const a of achados) {
    try {
      const dl = await fetch(a.url, {
        headers: { "User-Agent": "IAplicada-editor/1.0 (contato@iaplicada.com.br)" },
        signal: AbortSignal.timeout(20000),
      });
      if (!dl.ok) continue;
      const blob = await dl.blob();
      const path = `${projetoId}/midias/${Date.now()}-${a.nome}`;
      const up = await sb.storage.from("video-edicao").upload(path, blob, {
        contentType: blob.type || (a.tipo === "video" ? "video/mp4" : "image/jpeg"),
        upsert: true,
      });
      if (up.error) continue;
      const { data } = await sb
        .from("vedit_midias")
        .insert({
          projeto_id: projetoId,
          tipo: a.tipo,
          nome: a.nome,
          path,
          duracao: a.duracao ?? null,
          descricao: `${args.consulta} — ${a.credito}`,
        })
        .select("id")
        .single();
      if (data)
        salvas.push({
          id: data.id,
          nome: a.nome,
          tipo: a.tipo,
          duracao: a.duracao,
          credito: a.credito,
        });
    } catch (_) {
      /* pula */
    }
  }
  if (!salvas.length) return { erro: "Não consegui baixar as imagens encontradas. Use o efeito icones." };
  return { midias: salvas };
}

const FERRAMENTA_SUGESTAO = {
  name: "sugerir_projeto",
  description:
    "Sugere como este vídeo deve ser tratado, a partir da transcrição e do contexto de marketing.",
  input_schema: {
    type: "object",
    properties: {
      nome: {
        type: "string",
        description:
          "Nome no padrão dos anúncios existentes: 'R<n> - <gancho em até 6 palavras, sem acento>'. Se for orgânico: '<gancho em até 6 palavras>'. Nunca genérico.",
      },
      objetivo: { type: "string", enum: ["anuncio", "organico"] },
      formato: { type: "string", enum: ["9:16", "4:5", "1:1"] },
      estilo: { type: "string", enum: ["viral", "editorial", "limpo"] },
      duracao_alvo: {
        type: "integer",
        description: "Duração final sugerida em segundos, decidida pelo conteúdo (não por regra).",
      },
      content_item_id: {
        type: ["string", "null"],
        description:
          "id do roteiro do Marketing que corresponde a este vídeo, ou null se nenhum bate.",
      },
      palavra_cta: {
        type: ["string", "null"],
        description: "Palavra-chave para 'Comenta X' (orgânico) ou null.",
      },
      resumo: { type: "string", description: "Uma frase: do que o vídeo fala." },
      motivo: {
        type: "string",
        description:
          "2 frases: por que esse objetivo, formato, estilo e duração. Cite o roteiro ou anúncio que embasou.",
      },
      gancho_atual: {
        type: "string",
        description: "A frase de abertura que você usaria como gancho (copiada da transcrição).",
      },
    },
    required: [
      "nome",
      "objetivo",
      "formato",
      "estilo",
      "duracao_alvo",
      "resumo",
      "motivo",
      "gancho_atual",
    ],
  },
};

/** Roteiros planejados, padrão de nome dos anúncios e o que está performando. */
async function contextoMarketing(sb: any, contentItemId: string | null) {
  const [{ data: roteiros }, { data: ads }, { data: top }] = await Promise.all([
    sb
      .from("content_items")
      .select(
        "id, titulo, finalidade, tipo_video, status, anuncio_nome_meta, auto_resposta_palavra_chave, roteiro, recomendacoes_edicao, legenda, produto, updated_at",
      )
      .neq("status", "cancelado")
      .order("updated_at", { ascending: false })
      .limit(contentItemId ? 1 : 25)
      .then((r: any) =>
        contentItemId
          ? sb
              .from("content_items")
              .select(
                "id, titulo, finalidade, tipo_video, status, anuncio_nome_meta, auto_resposta_palavra_chave, roteiro, recomendacoes_edicao, legenda, produto, updated_at",
              )
              .eq("id", contentItemId)
          : Promise.resolve(r),
      ),
    sb
      .from("mads_ads")
      .select("nome, status, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    sb
      .from("mads_v_criativos_metricas")
      .select("ad_nome, hook_rate_pct, retencao_75_pct, cpmql_brl, mql_no_crm, gasto, diagnostico")
      .gt("gasto", 300)
      .order("mql_no_crm", { ascending: false })
      .limit(8),
  ]);
  const rot = (roteiros ?? [])
    .map(
      (c: any) =>
        `- id "${c.id}" | "${c.titulo}" | ${c.finalidade ?? "?"} / ${c.tipo_video ?? "?"} / ${c.status}${c.anuncio_nome_meta ? ` | nome Meta: ${c.anuncio_nome_meta}` : ""}${c.auto_resposta_palavra_chave ? ` | palavra CTA: ${c.auto_resposta_palavra_chave}` : ""}${c.produto ? ` | produto: ${c.produto}` : ""}\n  roteiro: ${String(
          c.roteiro ?? "",
        )
          .replace(/\s+/g, " ")
          .slice(
            0,
            contentItemId ? 2500 : 420,
          )}${c.recomendacoes_edicao ? `\n  recomendações de edição: ${String(c.recomendacoes_edicao).slice(0, 400)}` : ""}`,
    )
    .join("\n");
  const nomes = (ads ?? []).map((a: any) => `- ${a.nome} (${a.status})`).join("\n");
  const perf = (top ?? [])
    .map(
      (t: any) =>
        `- ${t.ad_nome}: gancho ${Number(t.hook_rate_pct ?? 0).toFixed(0)}%, retenção 75% ${Number(t.retencao_75_pct ?? 0).toFixed(0)}%, ${t.mql_no_crm ?? 0} MQL, CPMQL R$${Number(t.cpmql_brl ?? 0).toFixed(0)}${t.diagnostico ? ` — ${t.diagnostico}` : ""}`,
    )
    .join("\n");
  return `ROTEIROS NA PÁGINA DE MARKETING${contentItemId ? " (este vídeo está ligado a este roteiro)" : " (os mais recentes)"}:\n${rot || "(nenhum)"}\n\nPADRÃO DE NOME DOS ANÚNCIOS NO META (siga o mesmo: código + gancho curto sem acento):\n${nomes || "(nenhum)"}\n\nANÚNCIOS QUE MAIS GERAM MQL (o que funciona neste público):\n${perf || "(sem dados)"}`;
}

async function sugerir(sb: any, proj: any, key: string, catalogo: string, marcaRow: any) {
  const palavras = (proj.palavras ?? []) as { p: string; i: number; f: number }[];
  const texto = palavras.map((w) => w.p).join(" ");
  const reps = detectarRepeticoes(palavras);
  const marketing = await contextoMarketing(sb, null);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 2000,
      system: `Você é o editor de vídeo da IAplicada. Antes de editar, você decide como tratar um vídeo cru a partir da transcrição e do que o time de marketing já planejou. Regras:
- Se a transcrição bate com um roteiro da página de Marketing (mesmas frases, mesmo tema), ligue a ele (content_item_id) e herde finalidade, nome Meta e palavra CTA quando existirem.
- Objetivo: "anuncio" quando o texto vende, tem CTA de clique/agendamento, fala direto com dono de empresa sobre dor+solução, ou o roteiro é de anúncio. "organico" quando ensina, conta história, pede comentário ou segue a linha de conteúdo.
- Formato: 9:16 por padrão; 4:5 só se o vídeo cru for deitado e a pessoa ficar pequena em 9:16; 1:1 quase nunca.
- Estilo: "viral" para dor/resultado direto e listas rápidas; "editorial" para bastidor, método, autoridade e tom mais calmo; "limpo" para depoimento e institucional.
- Duração alvo é decidida pelo conteúdo: estime o que sobra depois de cortar silêncios e repetições (≈ 80–88% do bruto) e ajuste ao objetivo. Nunca force 15–30s.
- Nome: no padrão dos anúncios existentes ("R<n> - gancho"), com n = próximo número livre da série R. Sem acento, sem aspas.
${marcaRow?.instrucoes ? `MARCA: ${marcaRow.instrucoes}` : ""}
Estilos disponíveis:\n${catalogo.split("ESTILOS VISUAIS:")[1]?.split("COMANDOS DE BARRA:")[0] ?? ""}`,
      tools: [FERRAMENTA_SUGESTAO],
      tool_choice: { type: "tool", name: "sugerir_projeto" },
      messages: [
        {
          role: "user",
          content: `VÍDEO CRU: ${Number(proj.fonte_duracao ?? 0).toFixed(0)}s, ${proj.fonte_largura}x${proj.fonte_altura}${Number(proj.fonte_largura) > Number(proj.fonte_altura) ? " (deitado)" : ""}.\n\nTRANSCRIÇÃO:\n${texto || "(vazia)"}\n\nFALAS REPETIDAS (tomadas) DETECTADAS: ${reps.length}${reps.length ? ` — ~${reps.reduce((t, r) => t + (r.mantida.de - r.descartada.de), 0).toFixed(0)}s saem; o roteiro final usa só a última tomada de cada:\n${descreverRepeticoes(reps)}` : ""}\n\n${marketing}`,
        },
      ],
    }),
  });
  const txt = await r.text();
  try {
    await logUso(sb, "vedit-agente:sugerir", JSON.parse(txt)?.usage, proj.id);
  } catch (_) {
    /* corpo não-JSON */
  }
  if (!r.ok) {
    await sb.from("vedit_mensagens").insert({
      projeto_id: proj.id,
      papel: "sistema",
      conteudo: `Erro do Claude na sugestão (${r.status}): ${txt.slice(0, 300)}`,
    });
    return json({ error: `Claude ${r.status}: ${txt.slice(0, 300)}` }, 502);
  }
  const uso = JSON.parse(txt).content?.find((c: any) => c.type === "tool_use")?.input ?? {};
  await sb.from("vedit_projetos").update({ sugestao: uso }).eq("id", proj.id);
  return json({ sugestao: uso });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const body = await req.json().catch(() => ({}));
  const { projeto_id, mensagem, catalogo, acao } = body as {
    projeto_id?: string;
    mensagem?: string;
    catalogo?: string;
    acao?: string;
  };
  if (!projeto_id) return json({ error: "projeto_id obrigatório" }, 400);
  if (acao !== "sugerir" && !mensagem) return json({ error: "mensagem obrigatória" }, 400);

  const { data: proj, error } = await sb
    .from("vedit_projetos")
    .select("*")
    .eq("id", projeto_id)
    .single();
  if (error || !proj) return json({ error: "projeto não encontrado" }, 404);
  const { data: marcaRow } = proj.marca_id
    ? await sb.from("vedit_marcas").select("*").eq("id", proj.marca_id).single()
    : await sb.from("vedit_marcas").select("*").eq("padrao", true).limit(1).maybeSingle();
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!key) return json({ error: "CLAUDE_API_KEY não configurada" }, 500);
  if (acao === "sugerir") return sugerir(sb, proj, key, catalogo ?? "", marcaRow);
  const marketing = await contextoMarketing(sb, proj.content_item_id ?? null);
  const { data: hist } = await sb
    .from("vedit_mensagens")
    .select("papel, conteudo")
    .eq("projeto_id", projeto_id)
    .order("created_at", { ascending: false })
    .limit(12);
  const { data: midias } = await sb
    .from("vedit_midias")
    .select("id, tipo, nome, duracao, descricao")
    .eq("projeto_id", projeto_id);

  const comando = mensagem!.trim().startsWith("/") ? mensagem!.trim().split(/\s+/)[0] : null;
  await sb
    .from("vedit_mensagens")
    .insert({ projeto_id, papel: "usuario", conteudo: mensagem, comando });

  const palavras = (proj.palavras ?? []) as { p: string; i: number; f: number }[];
  const transcricao = palavras
    .map((w, i) => `[${i}] ${w.i.toFixed(2)}-${w.f.toFixed(2)} ${w.p}`)
    .join("\n");
  const reps = detectarRepeticoes(palavras);
  const trilhas = await listarTrilhas(sb);
  const listaTrilhas = trilhas
    .map((t: any) => `- id "trilha:${t.id}" — ${t.nome} (${t.base === undefined && t.id.startsWith("base-") ? "vem com o editor" : "marca"}; energia ${t.energia}; ${(t.humor ?? []).join(", ")}${t.bpm ? `; ${t.bpm} bpm` : ""}): ${t.uso}`)
    .join("\n");
  const contexto = `TRILHAS DISPONÍVEIS:\n${listaTrilhas}\n\nTRANSCRIÇÃO (${palavras.length} palavras):\n${transcricao || "(sem transcrição)"}\n\nFALAS REPETIDAS DETECTADAS (${reps.length}; a anterior sai, a última fica):\n${reps.length ? descreverRepeticoes(reps) : "(nenhuma pelo detector — ainda assim confira reformulações)"}\n\nMÍDIAS ENVIADAS:\n${(midias ?? []).map((m) => `- id "${m.id}" ${m.tipo} "${m.nome}"${m.duracao ? ` ${m.duracao}s` : ""}${m.descricao ? ` — ${m.descricao}` : ""}`).join("\n") || "(nenhuma)"}\n\nEDIÇÃO ATUAL (versão ${proj.versao}):\n${proj.timeline ? JSON.stringify(proj.timeline) : "(nenhuma ainda)"}${proj.storyboard ? `\n\nSTORYBOARD PROPOSTO ANTES:\n${JSON.stringify(proj.storyboard)}` : ""}`;

  const historico = (hist ?? [])
    .reverse()
    .slice(0, -1)
    .filter((h) => h.papel !== "sistema" || !String(h.conteudo).startsWith("Erro do Claude"))
    .map((h) => ({ role: h.papel === "claude" ? "assistant" : "user", content: h.conteudo }));
  // A API exige alternância começando por user: junta mensagens seguidas do mesmo papel.
  const msgs: { role: string; content: any }[] = [];
  for (const m of [...historico, { role: "user", content: `${contexto}\n\nPEDIDO: ${mensagem}` }]) {
    const u = msgs[msgs.length - 1];
    if (u && u.role === m.role) u.content += `\n\n${m.content}`;
    else msgs.push({ ...m });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();

  // Comandos que mudam o projeto valem já nesta edição.
  const objetivoAtual = /^\/anuncio\b/i.test(mensagem!)
    ? "anuncio"
    : /^\/organico\b/i.test(mensagem!)
      ? "organico"
      : proj.objetivo;
  const formatoAtual = mensagem!.match(/^\/formato\s+(9:16|4:5|1:1)/)?.[1] ?? proj.formato;
  const estiloAtual =
    mensagem!.match(/^\/estilo\s+(viral|editorial|limpo)/i)?.[1]?.toLowerCase() ??
    proj.estilo ??
    "viral";
  const sistemaTxt = sistema(
    catalogo ?? "",
    marcaRow?.marca ?? {},
    marcaRow?.instrucoes ?? "",
    objetivoAtual,
    formatoAtual,
    Number(proj.fonte_duracao ?? 0),
    estiloAtual,
    proj.duracao_alvo ?? null,
    marketing,
  );
  // Laço: o Claude pode buscar mídias na internet (até 3 vezes) antes de aplicar a edição.
  const conversa: any[] = msgs;
  let resp: any = null;
  let uso: any = {};
  let buscas = 0;
  for (let volta = 0; volta < 5; volta++) {
    const ultima = volta >= 4 || buscas >= 3;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 16000,
        system: sistemaTxt,
        tools: ultima ? [FERRAMENTA] : [FERRAMENTA, FERRAMENTA_BUSCA],
        tool_choice: ultima ? { type: "tool", name: "aplicar_edicao" } : { type: "any" },
        messages: conversa,
      }),
    });
    const txt = await r.text();
    if (!r.ok) {
      await sb
        .from("vedit_mensagens")
        .insert({
          projeto_id,
          papel: "sistema",
          conteudo: `Erro do Claude (${r.status}): ${txt.slice(0, 300)}`,
        });
      return json({ error: `Claude ${r.status}: ${txt.slice(0, 400)}` }, 502);
    }
    resp = JSON.parse(txt);
    await logUso(sb, "vedit-agente", resp?.usage, projeto_id);
    const chamadas = (resp.content ?? []).filter((c: any) => c.type === "tool_use");
    const aplicar = chamadas.find((c: any) => c.name === "aplicar_edicao");
    if (aplicar) {
      uso = aplicar.input ?? {};
      break;
    }
    if (!chamadas.length) break;
    // Toda chamada de ferramenta precisa de resposta (o Claude às vezes pede várias buscas de uma vez).
    const respostas = [];
    for (const c of chamadas) {
      let resultado: unknown;
      if (c.name === "buscar_midia" && buscas < 3) {
        buscas++;
        resultado = await buscarMidia(sb, projeto_id, c.input ?? {});
      } else resultado = { erro: "Limite de buscas atingido. Use as mídias que já tem e aplique a edição." };
      respostas.push({ type: "tool_result", tool_use_id: c.id, content: JSON.stringify(resultado) });
    }
    conversa.push({ role: "assistant", content: resp.content });
    conversa.push({ role: "user", content: respostas });
  }
  const resposta = String(uso.resposta ?? "Pronto.");

  let versao = proj.versao as number;
  const upd: Record<string, unknown> = { status: "editando" };
  const mEstilo = mensagem!.match(/^\/estilo\s+(viral|editorial|limpo)/i);
  if (mEstilo) upd.estilo = mEstilo[1].toLowerCase();
  if (/^\/anuncio\b/i.test(mensagem!)) upd.objetivo = "anuncio";
  if (/^\/organico\b/i.test(mensagem!)) upd.objetivo = "organico";
  const mFormato = mensagem!.match(/^\/formato\s+(9:16|4:5|1:1)/);
  if (mFormato) upd.formato = mFormato[1];
  if (uso.storyboard?.length) upd.storyboard = uso.storyboard;
  if (uso.timeline && typeof uso.timeline === "object") {
    const tl = uso.timeline;
    tl.formato = mFormato ? mFormato[1] : (tl.formato ?? proj.formato);
    // O modelo salvo não se perde se o Claude esquecer de devolver.
    if (tl.modelo === undefined && proj.timeline?.modelo) tl.modelo = proj.timeline.modelo;
    if (tl.audio === undefined && proj.timeline?.audio) tl.audio = proj.timeline.audio;
    // Nivelamento da trilha escolhida (ganho medido no upload).
    const chave = tl.musica?.midia as string | undefined;
    if (chave?.startsWith("trilha:")) {
      const t = trilhas.find((x: any) => `trilha:${x.id}` === chave);
      if (t) tl.musica.ganho = t.ganho ?? 1;
      else tl.musica.midia = null;
      if (typeof tl.musica.volume === "number") tl.musica.volume = Math.min(0.3, tl.musica.volume);
    }
    (tl.efeitos ?? []).forEach((e: any, i: number) => {
      if (!e.id) e.id = `e${Date.now().toString(36)}${i}`;
    });
    versao += 1;
    upd.timeline = tl;
    upd.versao = versao;
    if (!uso.aguardando_aprovacao) upd.storyboard = null;
    await sb.from("vedit_versoes").insert({
      projeto_id,
      versao,
      timeline: tl,
      origem: "claude",
      resumo: uso.resumo_mudanca ?? mensagem!.slice(0, 120),
    });
  }
  await sb.from("vedit_projetos").update(upd).eq("id", projeto_id);

  // Variações viram projetos irmãos (mesmo vídeo, outra abertura).
  const criadas: { id: string; nome: string }[] = [];
  for (const v of uso.variacoes ?? []) {
    const { data: novo } = await sb
      .from("vedit_projetos")
      .insert({
        nome: `${proj.nome} — ${v.nome}`,
        objetivo: proj.objetivo,
        formato: proj.formato,
        status: "editando",
        fonte_path: proj.fonte_path,
        fonte_duracao: proj.fonte_duracao,
        fonte_largura: proj.fonte_largura,
        fonte_altura: proj.fonte_altura,
        audio_path: proj.audio_path,
        palavras: proj.palavras,
        transcricao_texto: proj.transcricao_texto,
        marca_id: proj.marca_id,
        timeline: v.timeline,
        versao: 1,
        created_by: proj.created_by,
      })
      .select("id, nome")
      .single();
    if (novo) {
      criadas.push(novo);
      await sb.from("vedit_versoes").insert({
        projeto_id: novo.id,
        versao: 1,
        timeline: v.timeline,
        origem: "claude",
        resumo: `Variação: ${v.nome}`,
      });
    }
  }

  await sb.from("vedit_mensagens").insert({
    projeto_id,
    papel: "claude",
    conteudo: resposta,
    storyboard: uso.storyboard ?? null,
    versao,
  });
  return json({
    resposta,
    storyboard: uso.storyboard ?? null,
    aguardando_aprovacao: !!uso.aguardando_aprovacao,
    timeline: upd.timeline ?? null,
    versao,
    variacoes: criadas,
    uso_tokens: resp?.usage,
  });
});
