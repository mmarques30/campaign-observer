// Camada de dados do módulo Edição (editor de vídeo com IA).
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { catalogoParaClaude } from "@/video/catalogo";
import {
  normalizarTimeline,
  timelineVazia,
  type Formato,
  type Palavra,
  type Timeline,
} from "@/video/schema";

export const BUCKET = "video-edicao";
// As tabelas vedit_* ainda não estão nos tipos gerados do Supabase.
export const db = () => supabase as any;

export type Sugestao = {
  nome: string;
  objetivo: "anuncio" | "organico";
  formato: Formato;
  estilo: "viral" | "editorial" | "limpo";
  duracao_alvo: number;
  content_item_id: string | null;
  palavra_cta: string | null;
  resumo: string;
  motivo: string;
  gancho_atual: string;
};

export type Projeto = {
  id: string;
  created_at: string;
  updated_at: string;
  nome: string;
  nome_automatico: boolean;
  estilo: "viral" | "editorial" | "limpo";
  duracao_alvo: number | null;
  content_item_id: string | null;
  sugestao: Sugestao | null;
  objetivo: "anuncio" | "organico";
  formato: Formato;
  status: string;
  fonte_path: string | null;
  fonte_duracao: number | null;
  fonte_largura: number | null;
  fonte_altura: number | null;
  palavras: Palavra[];
  transcricao_texto: string | null;
  timeline: Timeline | null;
  storyboard: Cena[] | null;
  versao: number;
  marca_id: string | null;
  render_path: string | null;
  ig_media_id: string | null;
  erro: string | null;
};
export type Cena = {
  cena: number;
  de: number;
  ate: number;
  fala: string;
  visual: string;
  efeito?: string;
  som?: string;
};
export type Mensagem = {
  id: string;
  created_at: string;
  papel: "usuario" | "claude" | "sistema";
  conteudo: string;
  comando: string | null;
  storyboard: Cena[] | null;
  versao: number | null;
};
export type Midia = {
  id: string;
  tipo: "imagem" | "video" | "audio";
  nome: string;
  path: string;
  duracao: number | null;
  descricao: string | null;
};
export type Marca = {
  id: string;
  nome: string;
  padrao: boolean;
  marca: Timeline["marca"];
  legenda_estilo: string;
  instrucoes: string | null;
};

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviando: "Enviando",
  transcrevendo: "Transcrevendo",
  pronto_para_editar: "Pronto para editar",
  editando: "Em edição",
  renderizando: "Renderizando",
  renderizado: "Renderizado",
  publicado: "Publicado",
  erro: "Erro",
};

export async function assinar(path: string, segundos = 60 * 60 * 6) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, segundos);
  if (error || !data) throw new Error(`Não consegui abrir ${path}: ${error?.message}`);
  return data.signedUrl;
}

/** Lê duração e tamanho do vídeo no navegador. */
export function metadadosVideo(
  file: File,
): Promise<{ duracao: number; largura: number; altura: number }> {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      res({ duracao: v.duration, largura: v.videoWidth, altura: v.videoHeight });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => rej(new Error("Não consegui ler esse vídeo. Use MP4 ou MOV."));
  });
}

/** Extrai o áudio do vídeo no navegador: WAV 16 kHz mono (≈2 MB por minuto). */
export async function extrairAudioWav(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new Ctx();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  await ctx.close();
  const sr = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(audio.duration * sr), sr);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  const r = await off.startRendering();
  const pcm = r.getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++)
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([view], { type: "audio/wav" });
}

/** Cria o projeto, sobe vídeo + áudio e dispara a transcrição. */
export async function criarProjeto(
  dados: {
    nome?: string;
    objetivo?: "anuncio" | "organico";
    formato?: Formato;
    arquivo: File;
    marcaId?: string | null;
  },
  etapa: (t: string) => void,
): Promise<string> {
  etapa("Lendo o vídeo");
  const meta = await metadadosVideo(dados.arquivo);
  // Sem formato escolhido: 9:16 (vídeo deitado é reenquadrado; a sugestão pode trocar p/ 4:5).
  const formato: Formato = dados.formato ?? "9:16";
  const tl = timelineVazia(formato);
  const nomeAuto = !dados.nome?.trim();
  const { data: proj, error } = await db()
    .from("vedit_projetos")
    .insert({
      nome: nomeAuto ? dados.arquivo.name.replace(/\.[^.]+$/, "") : dados.nome!.trim(),
      nome_automatico: nomeAuto,
      objetivo: dados.objetivo ?? "organico",
      formato,
      status: "enviando",
      fonte_duracao: meta.duracao,
      fonte_largura: meta.largura,
      fonte_altura: meta.altura,
      marca_id: dados.marcaId ?? null,
      timeline: tl,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = proj.id as string;
  const ext = (dados.arquivo.name.split(".").pop() || "mp4").toLowerCase();
  etapa("Enviando o vídeo");
  const up = await supabase.storage.from(BUCKET).upload(`${id}/fonte.${ext}`, dados.arquivo, {
    contentType: dados.arquivo.type || "video/mp4",
    upsert: true,
  });
  if (up.error) throw new Error(`Upload: ${up.error.message}`);
  etapa("Separando o áudio");
  const wav = await extrairAudioWav(dados.arquivo);
  const upA = await supabase.storage
    .from(BUCKET)
    .upload(`${id}/audio.wav`, wav, { contentType: "audio/wav", upsert: true });
  if (upA.error) throw new Error(`Upload do áudio: ${upA.error.message}`);
  await db()
    .from("vedit_projetos")
    .update({
      fonte_path: `${id}/fonte.${ext}`,
      audio_path: `${id}/audio.wav`,
      status: "transcrevendo",
    })
    .eq("id", id);
  // Reenquadra automaticamente vídeo deitado para o centro.
  if (meta.largura > meta.altura)
    await db()
      .from("vedit_projetos")
      .update({ timeline: { ...tl, enquadramento: { x: 0.5, y: 0.45, escala: 1 } } })
      .eq("id", id);
  etapa("Transcrevendo palavra por palavra");
  const r = await callEdgeFunction("vedit-transcrever", { projeto_id: id });
  if (r?.error) throw new Error(r.error);
  return id;
}

export async function enviarAoClaude(projetoId: string, mensagem: string) {
  const r = await callEdgeFunction<{
    resposta: string;
    timeline: Timeline | null;
    storyboard: Cena[] | null;
    versao: number;
    variacoes: { id: string; nome: string }[];
    error?: string;
  }>("vedit-agente", { projeto_id: projetoId, mensagem, catalogo: catalogoParaClaude() });
  if (r?.error) throw new Error(r.error);
  return r;
}

/** Pede ao Claude a sugestão de nome, objetivo, formato, estilo e duração (lê roteiros do Marketing). */
export async function pedirSugestao(projetoId: string) {
  const r = await callEdgeFunction<{ sugestao: Sugestao; error?: string }>("vedit-agente", {
    projeto_id: projetoId,
    acao: "sugerir",
    catalogo: catalogoParaClaude(),
  });
  if (r?.error) throw new Error(r.error);
  return r.sugestao;
}

/** Aplica a sugestão (toda ou com ajustes da pessoa) no projeto. */
export async function aplicarSugestao(p: Projeto, s: Sugestao) {
  const tl = normalizarTimeline({ ...(p.timeline ?? {}), formato: s.formato }).timeline;
  const { error } = await db()
    .from("vedit_projetos")
    .update({
      nome: s.nome,
      nome_automatico: false,
      objetivo: s.objetivo,
      formato: s.formato,
      estilo: s.estilo,
      duracao_alvo: s.duracao_alvo,
      content_item_id: s.content_item_id ?? null,
      timeline: tl,
      sugestao: { ...s, aceita: true },
    })
    .eq("id", p.id);
  if (error) throw new Error(error.message);
  await db()
    .from("vedit_mensagens")
    .insert({
      projeto_id: p.id,
      papel: "sistema",
      conteudo: `Projeto definido: "${s.nome}" · ${s.objetivo === "anuncio" ? "anúncio" : "orgânico"} · ${s.formato} · estilo ${s.estilo} · alvo ~${s.duracao_alvo}s.${s.palavra_cta ? ` Palavra do CTA: ${s.palavra_cta}.` : ""}`,
    });
}

/** Salva uma edição feita à mão (controles rápidos, corte rápido, apagar efeito). */
export async function salvarManual(
  p: Projeto,
  timeline: Timeline,
  resumo: string,
  origem: "manual" | "desfazer" = "manual",
) {
  const versao = p.versao + 1;
  const { error } = await db()
    .from("vedit_projetos")
    .update({ timeline, versao, status: p.status === "renderizado" ? "editando" : p.status })
    .eq("id", p.id);
  if (error) throw new Error(error.message);
  await db().from("vedit_versoes").insert({ projeto_id: p.id, versao, timeline, origem, resumo });
  return versao;
}

export async function desfazer(p: Projeto) {
  const { data } = await db()
    .from("vedit_versoes")
    .select("timeline, versao")
    .eq("projeto_id", p.id)
    .lt("versao", p.versao)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Não há versão anterior.");
  await salvarManual(
    p,
    normalizarTimeline(data.timeline).timeline,
    `Voltou para a versão ${data.versao}`,
    "desfazer",
  );
  await db()
    .from("vedit_mensagens")
    .insert({
      projeto_id: p.id,
      papel: "sistema",
      conteudo: `Voltei para a versão ${data.versao}.`,
    });
}

export async function pedirRender(p: Projeto, midias: Midia[]) {
  if (!p.fonte_path || !p.timeline) throw new Error("Projeto sem vídeo ou sem edição.");
  const props = {
    timeline: p.timeline,
    palavras: p.palavras,
    duracaoFonte: Number(p.fonte_duracao ?? 0),
    fontePath: p.fonte_path,
    midiasPaths: Object.fromEntries(midias.map((m) => [m.id, m.path])),
  };
  const { error } = await db()
    .from("vedit_renders")
    .insert({ projeto_id: p.id, versao: p.versao, props });
  if (error) throw new Error(error.message);
  await db().from("vedit_projetos").update({ status: "renderizando", erro: null }).eq("id", p.id);
}

export async function enviarMidia(projetoId: string, file: File) {
  const tipo = file.type.startsWith("image/")
    ? "imagem"
    : file.type.startsWith("audio/")
      ? "audio"
      : "video";
  const path = `${projetoId}/midias/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (up.error) throw new Error(up.error.message);
  let duracao: number | null = null;
  if (tipo !== "imagem") {
    duracao = await new Promise((res) => {
      const el = document.createElement(tipo === "audio" ? "audio" : "video");
      el.preload = "metadata";
      el.src = URL.createObjectURL(file);
      el.onloadedmetadata = () => res(Math.round(el.duration * 10) / 10);
      el.onerror = () => res(null);
    });
  }
  const { error } = await db()
    .from("vedit_midias")
    .insert({ projeto_id: projetoId, tipo, nome: file.name, path, duracao });
  if (error) throw new Error(error.message);
}

export const fmtTempo = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
};
