// Biblioteca de efeitos + comandos de barra. É daqui que sai o "manual" que o
// Claude recebe: ele só pode usar efeitos desta lista, pelos ids e parâmetros
// descritos. Para criar um efeito novo: componente em efeitos/*.tsx + entrada aqui.
import type { ComponentType } from "react";
import type { EfeitoProps } from "./efeitos/base";
import {
  Capa,
  Letreiro,
  PalavraGigante,
  Papel,
  PostIts,
  TituloGancho,
  Trava,
} from "./efeitos/texto";
import {
  Celular,
  Checklist,
  Comentario,
  Contador,
  CtaFinal,
  Grafico,
  Notificacao,
  Orbita,
  Vidro,
} from "./efeitos/ui";
import { AntesDepois, Broll, Colagem, Particulas, Rabisco } from "./efeitos/midia";
import { Azulejos, Cracha, FraseCaixa, ListaEditorial, NumeroCapitulo } from "./efeitos/editorial";
import { Dividir, FundoImagem, Reagir } from "./efeitos/formatos";
import { Contorno, MolduraQuebrada, TextoAtras, TrocaFundo, Vertigo } from "./efeitos/recorte";
import { ICONES, Icones } from "./efeitos/icones";

export type Categoria = "texto" | "dados" | "interface" | "midia" | "transicao" | "cta";

export type EfeitoDef = {
  tipo: string;
  comando: string; // barra
  nome: string;
  categoria: Categoria;
  descricao: string;
  quandoUsar: string;
  params: string; // documentação dos props pro Claude
  duracaoPadrao: number; // segundos
  somPadrao?: string;
  telaCheia?: boolean; // cobre o vídeo inteiro (some a pessoa)
  escondeLegenda?: boolean; // painel no meio da tela: a legenda sai enquanto ele está visível
  disponivel: boolean;
  precisaRecorte?: boolean; // depende de recorte da pessoa (fase 2)
  inspiracao?: string;
  componente?: ComponentType<EfeitoProps>;
};

export const EFEITOS: EfeitoDef[] = [
  {
    tipo: "icones",
    comando: "/icone",
    nome: "Ícones que aparecem",
    categoria: "interface",
    descricao:
      "Logos e ícones (WhatsApp, e-mail, planilha, dinheiro, relógio…) saltam na tela no instante em que a pessoa fala deles, com rótulo opcional. Não cobre a pessoa.",
    quandoUsar:
      'Sempre que a fala cita um app, canal, ferramenta ou objeto concreto ("registra no WhatsApp, por e-mail e na planilha" → 3 ícones entrando um a um). Ótimo para ritmo; entre exatamente na palavra.',
    params: `icones: string[] (até 4; nomes: ${Object.keys(ICONES).join(", ")}; ou qualquer id Iconify "prefixo:nome"), rotulos?: string[], posicao: 'topo'|'centro'|'direita'|'esquerda', tamanho?: 0.6–1.5, fundo?: false (sem o quadrado branco)`,
    duracaoPadrao: 2.2,
    somPadrao: "pop",
    disponivel: true,
    componente: Icones,
  },
  {
    tipo: "titulo",
    comando: "/titulo",
    nome: "Título gancho",
    categoria: "texto",
    descricao:
      "Frase de gancho no topo, palavras entrando em sequência; *palavra* entre asteriscos ganha destaque.",
    quandoUsar: "Primeiros 0–3s de qualquer vídeo. Obrigatório em anúncio.",
    params: "texto (use *x* p/ destacar), subtitulo?, estilo: 'bloco'|'serif'",
    duracaoPadrao: 3,
    somPadrao: "whoosh",
    disponivel: true,
    componente: TituloGancho,
  },
  {
    tipo: "palavra-gigante",
    comando: "/gigante",
    nome: "Palavra ou número gigante",
    categoria: "texto",
    descricao: "Uma palavra ou número enorme no centro, com soco de escala.",
    quandoUsar: "Número de impacto, virada de chave, punchline. No máx. 1 a cada 8s.",
    params: "texto, legenda?, fundo: 'escurecer'|'desfocar'|'marca'|'nenhum', cor?, fonte?",
    duracaoPadrao: 1.2,
    somPadrao: "impacto",
    disponivel: true,
    inspiracao: "tenfoldmarc ('26', 'internet.')",
    componente: PalavraGigante,
  },
  {
    tipo: "capa",
    comando: "/capa",
    nome: "Capa de revista",
    categoria: "texto",
    descricao: "Vira capa de revista: nome no topo, chamadas laterais e selo.",
    quandoUsar: "Autoridade, bastidor, apresentação de quem fala.",
    params: "titulo, edicao?, chamadas: string[], selo?, cor?",
    duracaoPadrao: 3,
    somPadrao: "obturador",
    disponivel: true,
    inspiracao: "tenfoldmarc cover story, castilho",
    componente: Capa,
  },
  {
    tipo: "trava",
    comando: "/trava",
    nome: "Trava",
    categoria: "texto",
    descricao: "Páginas de texto passando rápido e uma palavra travada e marcada no centro.",
    quandoUsar: "Introduzir um nome, conceito ou produto (ex.: o nome do método).",
    params: "palavra, texto? (corpo; padrão = o que foi falado perto)",
    duracaoPadrao: 2.2,
    somPadrao: "digitar",
    telaCheia: true,
    disponivel: true,
    inspiracao: "castilho.ia /trava",
    componente: Trava,
  },
  {
    tipo: "letreiro",
    comando: "/letreiro",
    nome: "Letreiro de LED",
    categoria: "texto",
    descricao: "Palavra empurrada num painel de LED, que acende.",
    quandoUsar: "Nome de marca, palavra-chave, transição entre blocos.",
    params: "texto, legenda?, cor?",
    duracaoPadrao: 2,
    somPadrao: "glitch",
    telaCheia: true,
    disponivel: true,
    inspiracao: "castilho.ia /letreiro",
    componente: Letreiro,
  },
  {
    tipo: "papel",
    comando: "/recorte",
    nome: "Letras recortadas",
    categoria: "texto",
    descricao: "Letras de bilhete recortadas de revista, em stop-motion.",
    quandoUsar: "Número/percentual com personalidade, tom irreverente.",
    params: "texto, posicao: 'superior'|'centro'|'inferior'",
    duracaoPadrao: 2,
    somPadrao: "papel",
    disponivel: true,
    inspiracao: "tenfoldmarc paper cut",
    componente: Papel,
  },
  {
    tipo: "post-its",
    comando: "/postit",
    nome: "Mural de post-its",
    categoria: "texto",
    descricao: "Post-its escritos à mão colando nas bordas, sem cobrir o rosto.",
    quandoUsar: "Listar dores, tarefas ou ideias de forma humana.",
    params: "notas: string[] (até 6, curtas)",
    duracaoPadrao: 3,
    somPadrao: "papel",
    disponivel: true,
    inspiracao: "tenfoldmarc headline wall",
    componente: PostIts,
  },
  {
    tipo: "checklist",
    comando: "/checklist",
    nome: "Checklist",
    categoria: "interface",
    descricao: "Lista que vai sendo marcada no ritmo da fala.",
    quandoUsar: "Passo a passo, entregáveis, 'o que você recebe'.",
    params: "itens: string[], titulo?, lado: 'esquerda'|'direita'",
    duracaoPadrao: 4,
    somPadrao: "click",
    disponivel: true,
    inspiracao: "tenfoldmarc checklist",
    componente: Checklist,
  },
  {
    tipo: "celular",
    comando: "/celular",
    nome: "Celular flutuando",
    categoria: "interface",
    descricao:
      "Celular 3D flutuando ao lado da pessoa, mostrando vídeo, print ou conversa de WhatsApp.",
    quandoUsar: "Demonstrar produto, prova de conversa, resultado no app.",
    params:
      "midia? (id) | tempo? (s do original) | mensagens?: string[] (conversa alternada), lado: 'direita'|'esquerda'|'centro'",
    duracaoPadrao: 3.5,
    somPadrao: "swipe",
    disponivel: true,
    inspiracao: "tenfoldmarc phone mockup",
    componente: Celular,
  },
  {
    tipo: "vidro",
    comando: "/vidro",
    nome: "Placa de vidro com gráfico",
    categoria: "dados",
    descricao: "Placa de vidro fosco na frente da pessoa com uma linha de gráfico subindo.",
    quandoUsar: "Mostrar evolução/resultado com sofisticação.",
    params: "titulo, subtitulo?, valores: number[]",
    duracaoPadrao: 3.5,
    somPadrao: "whoosh",
    escondeLegenda: true,
    disponivel: true,
    inspiracao: "castilho.ia /vidro",
    componente: Vidro,
  },
  {
    tipo: "grafico",
    comando: "/grafico",
    nome: "Gráfico crescendo",
    categoria: "dados",
    descricao: "Barras crescendo com valores contando.",
    quandoUsar: "Antes x depois em números, crescimento mês a mês.",
    params: "titulo, valores: number[], rotulos: string[], sufixo?",
    duracaoPadrao: 3.5,
    somPadrao: "riser",
    escondeLegenda: true,
    disponivel: true,
    inspiracao: "tenfoldmarc chart grow",
    componente: Grafico,
  },
  {
    tipo: "contador",
    comando: "/contador",
    nome: "Contador",
    categoria: "dados",
    descricao: "Número contando até o valor.",
    quandoUsar: "Estatística única forte (R$, %, horas economizadas).",
    params: "valor: number, prefixo?, sufixo?, legenda?, posicao: 'topo'|'centro'",
    duracaoPadrao: 2.5,
    somPadrao: "ding",
    disponivel: true,
    componente: Contador,
  },
  {
    tipo: "comentario",
    comando: "/comentario",
    nome: "Comentário",
    categoria: "interface",
    descricao: "Card de comentário do Instagram aparecendo.",
    quandoUsar: "Responder dúvida/objeção, prova social real.",
    params: "usuario, texto, curtidas?, posicao: 'topo'|'inferior'",
    duracaoPadrao: 3,
    somPadrao: "pop",
    disponivel: true,
    inspiracao: "tenfoldmarc comment bubble",
    componente: Comentario,
  },
  {
    tipo: "notificacao",
    comando: "/notificacao",
    nome: "Notificações",
    categoria: "interface",
    descricao: "Notificações caindo do topo, empilhando.",
    quandoUsar: "Mostrar automação funcionando (lead novo, venda, proposta).",
    params: "itens: string[] (até 4), app?",
    duracaoPadrao: 3,
    somPadrao: "ding",
    disponivel: true,
    componente: Notificacao,
  },
  {
    tipo: "orbita",
    comando: "/orbita",
    nome: "Órbita",
    categoria: "interface",
    descricao: "Cards girando em volta da pessoa.",
    quandoUsar: "Mostrar tudo que um sistema/serviço cobre.",
    params: "itens: string[]",
    duracaoPadrao: 3.5,
    somPadrao: "whoosh",
    disponivel: true,
    inspiracao: "tenfoldmarc orbit",
    componente: Orbita,
  },
  {
    tipo: "broll",
    comando: "/broll",
    nome: "B-roll",
    categoria: "midia",
    descricao: "Corte para outra imagem/vídeo: tela cheia, janela ou metade de cima.",
    quandoUsar: "Ilustrar o que está sendo falado, quebrar monotonia a cada 4–6s.",
    params:
      "midia? (id enviado) | tempo? (outro trecho do original), modo: 'tela-cheia'|'janela'|'metade', legenda?",
    duracaoPadrao: 2.5,
    somPadrao: "swipe",
    disponivel: true,
    componente: Broll,
  },
  {
    tipo: "colagem",
    comando: "/colagem",
    nome: "Colagem",
    categoria: "midia",
    descricao: "Seus vídeos/fotos caindo na mesa (metade de cima), você falando embaixo.",
    quandoUsar: "Portfólio, cases, 'olha o que já fizemos'.",
    params:
      "midias?: string[] (ids; sem isso usa trechos do próprio vídeo), rotulos?: string[], quantidade?",
    duracaoPadrao: 3.5,
    somPadrao: "obturador",
    disponivel: true,
    inspiracao: "castilho.ia /colagem",
    componente: Colagem,
  },
  {
    tipo: "antes-depois",
    comando: "/antesdepois",
    nome: "Antes e depois",
    categoria: "midia",
    descricao: "Cortina revelando o depois sobre o antes.",
    quandoUsar: "Transformação, prova de resultado. Ótimo para anúncio.",
    params:
      "antes: string[], depois: string[], rotuloAntes?, rotuloDepois?, midiaAntes?, midiaDepois?",
    duracaoPadrao: 4,
    somPadrao: "sucesso",
    telaCheia: true,
    disponivel: true,
    inspiracao: "tenfoldmarc before + after",
    componente: AntesDepois,
  },
  {
    tipo: "particulas",
    comando: "/particulas",
    nome: "Partículas",
    categoria: "transicao",
    descricao: "Grãos enchem um celular e viram o vídeo pronto.",
    quandoUsar: "Abertura ou revelação de 'vídeo pronto/sistema pronto'.",
    params: "midia? | tempo?, texto?",
    duracaoPadrao: 3,
    somPadrao: "riser",
    telaCheia: true,
    disponivel: true,
    inspiracao: "castilho.ia /particulas",
    componente: Particulas,
  },
  {
    tipo: "rabisco",
    comando: "/rabisco",
    nome: "Rabisco à mão",
    categoria: "texto",
    descricao: "Círculo, seta, sublinhado ou estrela desenhados à mão, tremendo (doodle boil).",
    quandoUsar: "Apontar algo na tela, ênfase leve.",
    params:
      "forma: 'circulo'|'seta'|'sublinhado'|'estrela'|'xis', x, y (0–1), tamanho?, texto?, cor?",
    duracaoPadrao: 2,
    somPadrao: "papel",
    disponivel: true,
    inspiracao: "tenfoldmarc doodle boil",
    componente: Rabisco,
  },
  {
    tipo: "cta-final",
    comando: "/cta",
    nome: "Cartela de CTA",
    categoria: "cta",
    descricao: "Tela final 'Comenta PALAVRA' com miniaturas do próprio vídeo.",
    quandoUsar: "Últimos 2–3s do orgânico (palavra-chave pro ManyChat).",
    params: "verbo?, palavra, texto?, miniaturas?: boolean",
    duracaoPadrao: 2.5,
    somPadrao: "pop",
    telaCheia: true,
    disponivel: true,
    inspiracao: "castilho / tenfoldmarc",
    componente: CtaFinal,
  },
  // ── Estilo editorial (referência: justyn.ai) ──
  {
    tipo: "numero-capitulo",
    comando: "/numero",
    nome: "Número de capítulo",
    categoria: "texto",
    descricao: "Número gigante em serifa no canto ('1', '2'), com legenda opcional.",
    quandoUsar: "Marcar o início de cada ponto de uma lista falada ('primeiro…', 'segundo…').",
    params: "numero, texto?, lado: 'esquerda'|'direita', cor?",
    duracaoPadrao: 2.5,
    somPadrao: "ding",
    disponivel: true,
    inspiracao: "justyn.ai",
    componente: NumeroCapitulo,
  },
  {
    tipo: "cracha",
    comando: "/cracha",
    nome: "Crachá",
    categoria: "interface",
    descricao: "Etiqueta 'HELLO my name is' com o nome sendo escrito à mão.",
    quandoUsar: "Apresentação de quem fala, nos primeiros 5s.",
    params: "nome, titulo?, subtitulo?, posicao: 'topo'|'centro', cor?",
    duracaoPadrao: 3,
    somPadrao: "papel",
    disponivel: true,
    inspiracao: "justyn.ai",
    componente: Cracha,
  },
  {
    tipo: "azulejos",
    comando: "/azulejos",
    nome: "Letras de azulejo",
    categoria: "texto",
    descricao: "Palavra curta em ladrilhos de serifa caindo um a um.",
    quandoUsar: "Palavra-chave do CTA ('EDIT', 'QUERO') ou nome do método. Até 6 letras.",
    params: "texto (≤ 6 letras), posicao: 'topo'|'centro', cor?",
    duracaoPadrao: 2.5,
    somPadrao: "click",
    disponivel: true,
    inspiracao: "justyn.ai",
    componente: Azulejos,
  },
  {
    tipo: "frase-caixa",
    comando: "/caixa",
    nome: "Frase em caixa",
    categoria: "texto",
    descricao: "Frase em caixa verde-musgo, com a palavra entre *asteriscos* em serifa itálica.",
    quandoUsar: "Promessa ou frase de efeito no meio do vídeo.",
    params:
      "texto (use *x* p/ a palavra em itálico), posicao: 'superior'|'centro'|'inferior', cor?",
    duracaoPadrao: 3,
    somPadrao: "pop",
    disponivel: true,
    inspiracao: "justyn.ai",
    componente: FraseCaixa,
  },
  {
    tipo: "lista-editorial",
    comando: "/lista",
    nome: "Lista editorial",
    categoria: "texto",
    descricao: "Itens numerados em serifa, entrando um a um pela esquerda.",
    quandoUsar: "'3 motivos', '5 passos', sem cara de checklist de app.",
    params: "titulo?, itens: string[] (até 5)",
    duracaoPadrao: 4,
    somPadrao: "swipe",
    disponivel: true,
    inspiracao: "justyn.ai",
    componente: ListaEditorial,
  },
  // ── Formatos de tela ──
  {
    tipo: "dividir",
    comando: "/dividir",
    nome: "Tela dividida",
    categoria: "midia",
    descricao:
      "Uma mídia ocupa metade da tela (cima, baixo, esquerda ou direita); você fica na outra metade.",
    quandoUsar: "Comparar, mostrar o que está sendo comentado, demonstração ao lado da fala.",
    params:
      "midia (id) | tempo?, lado: 'cima'|'baixo'|'esquerda'|'direita', proporcao?: 0.3–0.7, legenda?, som?: boolean",
    duracaoPadrao: 4,
    somPadrao: "swipe",
    escondeLegenda: false,
    disponivel: true,
    componente: Dividir,
  },
  {
    tipo: "reagir",
    comando: "/reagir",
    nome: "React",
    categoria: "midia",
    descricao: "Vídeo ou print em tela cheia e você numa janelinha no canto, reagindo.",
    quandoUsar:
      "Comentar notícia, print, vídeo de outra pessoa ou resultado de cliente. Evite cortes dentro do trecho.",
    params:
      "midia (id) | tempo?, canto: 'inferior-direito'|'inferior-esquerdo'|'superior-direito'|'superior-esquerdo', tamanho?: 0.25–0.45, janela?: 'quadrada'|'redonda', titulo?, som?: boolean",
    duracaoPadrao: 5,
    somPadrao: "pop",
    telaCheia: true,
    disponivel: true,
    componente: Reagir,
  },
  {
    tipo: "fundo-imagem",
    comando: "/fundo",
    nome: "Imagem de fundo",
    categoria: "midia",
    descricao:
      "Foto da internet (ou enviada) toma a tela como fundo, e você aparece numa janela na frente.",
    quandoUsar:
      "Ilustrar o contexto da fala (escritório, cidade, produto) sem precisar recortar a pessoa.",
    params: "midia (id), titulo?, tamanho?: 0.6–0.85, desfocar?: boolean",
    duracaoPadrao: 4,
    somPadrao: "whoosh",
    telaCheia: true,
    disponivel: true,
    componente: FundoImagem,
  },
  // ── Fase 2: usam a pessoa recortada (botão "Recortar pessoa" no editor gera o WebM com alfa) ──
  {
    tipo: "texto-atras",
    comando: "/atras",
    nome: "Texto atrás da pessoa",
    categoria: "texto",
    descricao: "Título enorme passando por trás da cabeça.",
    quandoUsar: "Gancho premium.",
    params: "texto (use | para quebrar linha), cor?, altura? (0–1, padrão 0.3)",
    duracaoPadrao: 3,
    disponivel: true,
    precisaRecorte: true,
    componente: TextoAtras,
    inspiracao: "castilho 'letras caindo atrás de mim'",
  },
  {
    tipo: "moldura-quebrada",
    comando: "/moldura",
    nome: "Moldura quebrada",
    categoria: "midia",
    descricao: "A pessoa sai de dentro da moldura.",
    quandoUsar: "Pattern interrupt.",
    params:
      "escala? (0.6–0.9), topo? (0.15–0.45, padrão 0.3: onde fica a borda de cima; a cabeça acima dela sai da moldura), cor?, fundo?",
    duracaoPadrao: 2,
    disponivel: true,
    precisaRecorte: true,
    componente: MolduraQuebrada,
    inspiracao: "tenfoldmarc frame break",
  },
  {
    tipo: "tela-verde",
    comando: "/trocarfundo",
    nome: "Troca de fundo",
    categoria: "midia",
    descricao: "Você na frente de um print, site ou vídeo.",
    quandoUsar: "Reagir a notícia, mostrar tela.",
    params: "midia (id de imagem/vídeo), desfocar? (bool)",
    duracaoPadrao: 4,
    disponivel: true,
    precisaRecorte: true,
    componente: TrocaFundo,
    inspiracao: "tenfoldmarc green screen",
  },
  {
    tipo: "vertigo",
    comando: "/vertigo",
    nome: "Vertigo",
    categoria: "transicao",
    descricao: "Dolly zoom: você parado, fundo esticando.",
    quandoUsar: "Momento de revelação.",
    params: "forca? (0.2–0.8)",
    duracaoPadrao: 2,
    disponivel: true,
    precisaRecorte: true,
    componente: Vertigo,
    inspiracao: "tenfoldmarc vertigo",
  },
  {
    tipo: "contorno",
    comando: "/contorno",
    nome: "Contorno rabiscado",
    categoria: "texto",
    descricao: "Linha desenhada à mão contornando a pessoa.",
    quandoUsar: "Destaque de quem fala.",
    params: "cor?, espessura? (4–12)",
    duracaoPadrao: 2,
    disponivel: true,
    precisaRecorte: true,
    componente: Contorno,
    inspiracao: "tenfoldmarc doodle boil",
  },
  {
    tipo: "cena-ia",
    comando: "/cena",
    nome: "Cena gerada por IA",
    categoria: "midia",
    descricao: "Gera uma cena cinematográfica (produto, personagem) por IA de vídeo.",
    quandoUsar: "Anúncio de marca/produto sem gravação.",
    params: "prompt",
    duracaoPadrao: 5,
    disponivel: false,
    inspiracao: "mr.pynk (Buzzy/Higgsfield)",
  },
];

export const EFEITO_POR_TIPO: Record<string, EfeitoDef> = Object.fromEntries(
  EFEITOS.map((e) => [e.tipo, e]),
);

export type ComandoDef = { comando: string; titulo: string; descricao: string; exemplo?: string };

// Comandos de operação (não são um efeito só).
export const COMANDOS: ComandoDef[] = [
  {
    comando: "/storyboard",
    titulo: "Storyboard",
    descricao: "Plano cena a cena para você aprovar antes de aplicar.",
    exemplo: "/storyboard anúncio de 30s para dono de clínica",
  },
  {
    comando: "/editar",
    titulo: "Edição completa",
    descricao: "Corta, legenda, aplica efeitos, sons e CTA de uma vez.",
  },
  {
    comando: "/cortar",
    titulo: "Cortar silêncios e repetições",
    descricao:
      "Remove pausas, respiros, 'é…', 'tipo', 'né' e as falas repetidas (fica a última tomada de cada) — roteiro unificado.",
  },
  {
    comando: "/legenda",
    titulo: "Legenda",
    descricao:
      'Liga ou troca o estilo: karaoke, simples (legenda comum), caixa, editorial, neon, maquina, impacto. Também sobe/desce: "/legenda mais baixa".',
    exemplo: "/legenda neon",
  },
  {
    comando: "/gancho",
    titulo: "Ganchos",
    descricao: "Cria 3 opções de gancho para os 3 primeiros segundos.",
  },
  { comando: "/zoom", titulo: "Zooms", descricao: "Socos de zoom nas palavras de ênfase." },
  {
    comando: "/sons",
    titulo: "Sons",
    descricao: "Coloca efeitos sonoros sincronizados com cortes e efeitos.",
  },
  {
    comando: "/anuncio",
    titulo: "Modo anúncio",
    descricao: "Gancho em 3s, legenda obrigatória, zonas seguras do Meta, CTA claro, 15–30s.",
  },
  {
    comando: "/organico",
    titulo: "Modo orgânico",
    descricao: "Ritmo de Reels, efeito a cada 4–6s, CTA 'Comenta PALAVRA'.",
  },
  {
    comando: "/variacoes",
    titulo: "Variações",
    descricao: "Gera versões com ganchos diferentes para testar (Trial Reels / teste A/B).",
    exemplo: "/variacoes 3",
  },
  {
    comando: "/formato",
    titulo: "Formato",
    descricao: "9:16, 4:5 ou 1:1.",
    exemplo: "/formato 4:5",
  },
  {
    comando: "/look",
    titulo: "Look",
    descricao: "Cor e textura: natural, quente, frio, cinema, pb, vivo; grão; vinheta.",
  },
  {
    comando: "/musica",
    titulo: "Música de fundo",
    descricao:
      "Escolhe e aplica a trilha pelo clima do vídeo, volume equilibrado e baixando na voz. Ex.: /musica, /musica mais alta, /musica outra, /musica sem.",
  },
  {
    comando: "/luz",
    titulo: "Correção de luz",
    descricao:
      "Corrige a imagem: brilho, contraste, saturação, temperatura (frio/quente), sombras (clareia rosto escuro) e nitidez. Ex.: /luz está escuro e amarelado.",
  },
  {
    comando: "/imagem",
    titulo: "Buscar imagem ou vídeo na internet",
    descricao:
      "Busca em bancos gratuitos (Pexels/Unsplash) e encaixa como b-roll, fundo, tela dividida ou react.",
    exemplo: "/imagem escritório lotado de gente estressada, no fundo",
  },
  {
    comando: "/estilo",
    titulo: "Estilo",
    descricao:
      "Troca o estilo visual inteiro: viral (castilho/tenfoldmarc), editorial (justyn.ai) ou limpo.",
    exemplo: "/estilo editorial",
  },
  {
    comando: "/desfazer",
    titulo: "Desfazer",
    descricao: "Volta para a versão anterior da edição.",
  },
];

// Estilos visuais: definem legenda, fontes, look e quais efeitos combinam.
export const ESTILOS: Record<string, { nome: string; descricao: string; regras: string }> = {
  viral: {
    nome: "Viral",
    descricao:
      "Caixa alta pesada, cores fortes, zoom de soco, efeitos chamativos (castilho.ia / tenfoldmarc).",
    regras:
      'legenda "karaoke" ou "neon"; título "bloco"; look "vivo" ou "cinema"; transição "zoom"; efeitos preferidos: titulo, palavra-gigante, trava, letreiro, vidro, celular, colagem, checklist, cta-final.',
  },
  editorial: {
    nome: "Editorial",
    descricao:
      "Serifa, paleta verde-musgo e creme, números de capítulo, crachá, letras de azulejo, frase em caixa (justyn.ai).",
    regras:
      'legenda "editorial" (ou "caixa" com poucas palavras); título estilo "serif"; look "cinema" com grao 0.25 e vinheta 0.35; transição "flash"; zoom suave (escala ≤ 1.15, tipo "suave"); efeitos preferidos: numero-capitulo (um por item da lista falada), cracha na apresentação, frase-caixa na promessa, lista-editorial, capa, azulejos na palavra do CTA, contador; evite letreiro, particulas e papel. Sons discretos (volume ≤ 0.4).',
  },
  limpo: {
    nome: "Limpo",
    descricao: "Só corte, legenda discreta e um título. Para depoimento e vídeo institucional.",
    regras:
      'legenda "simples" (ou "caixa"); look "natural"; transição "suave" ou nenhuma; no máximo 3 efeitos no vídeo todo (titulo, contador ou antes-depois, cta-final); sem sfx além do título.',
  },
};

export function catalogoParaClaude(): string {
  const disp = EFEITOS.filter((e) => e.disponivel)
    .map(
      (e) =>
        `- tipo "${e.tipo}" (${e.comando}) — ${e.nome}: ${e.descricao} Quando usar: ${e.quandoUsar} Props: ${e.params}. Duração típica ${e.duracaoPadrao}s.${e.telaCheia ? " COBRE A TELA INTEIRA (a pessoa some)." : ""}${e.escondeLegenda ? " A legenda some enquanto ele aparece: use o painel para a ideia principal." : ""}${e.somPadrao ? ` Som sugerido: ${e.somPadrao}.` : ""}${e.precisaRecorte ? ' PRECISA DO RECORTE DA PESSOA: só use se em MÍDIAS ENVIADAS existir "recorte-pessoa.webm"; senão diga para clicar em Recortar pessoa no topo do editor.' : ""}`,
    )
    .join("\n");
  const fase2 = EFEITOS.filter((e) => !e.disponivel)
    .map((e) => `${e.comando} (${e.nome})`)
    .join(", ");
  const cmds = COMANDOS.map((c) => `- ${c.comando}: ${c.descricao}`).join("\n");
  const estilos = Object.entries(ESTILOS)
    .map(([id, e]) => `- "${id}" (${e.nome}): ${e.descricao} Regras: ${e.regras}`)
    .join("\n");
  return `EFEITOS DISPONÍVEIS:\n${disp}\n\nAINDA NÃO DISPONÍVEIS (não use; se pedirem, explique que depende de integração com IA de vídeo): ${fase2 || "(nenhum)"}\n\nESTILOS VISUAIS:\n${estilos}\n\nCOMANDOS DE BARRA:\n${cmds}`;
}
