// Biblioteca de trilhas sonoras da marca: arquivos em video-edicao/trilhas/ + manifesto JSON.
// Sem tabela nova: o manifesto mora no próprio bucket (trilhas/biblioteca.json).
import { supabase } from "@/integrations/supabase/client";
import { staticFile } from "remotion";
import { BUCKET } from "@/lib/vedit";
import { CHAVE_TRILHA, TRILHAS_BASE, type TrilhaInfo } from "@/video/trilhas";

export type Trilha = TrilhaInfo & {
  path?: string; // biblioteca (bucket)
  arquivo?: string; // base (public/)
  duracao?: number;
  licenca?: string | null;
  base?: boolean;
};

const MANIFESTO = "trilhas/biblioteca.json";

async function lerManifesto(): Promise<Trilha[]> {
  // Uma falha de leitura aqui fazia o próximo "salvar" apagar as outras faixas: agora para.
  const { data, error } = await supabase.storage.from(BUCKET).download(MANIFESTO);
  let lista: Trilha[] = [];
  if (data) {
    try {
      lista = JSON.parse(await data.text()) as Trilha[];
    } catch {
      throw new Error("Não consegui ler a biblioteca de músicas. Tente de novo.");
    }
  } else if (error && !/not.?found|404|does not exist/i.test(error.message))
    throw new Error(`Não consegui ler a biblioteca de músicas: ${error.message}`);
  // Faixas que estão no bucket mas saíram do manifesto voltam para a lista.
  const { data: arquivos } = await supabase.storage.from(BUCKET).list("trilhas", { limit: 500 });
  const conhecidos = new Set(lista.map((t) => t.path));
  let n = 0;
  for (const a of arquivos ?? []) {
    if (!/\.(mp3|m4a|wav|ogg|aac)$/i.test(a.name)) continue;
    const path = `trilhas/${a.name}`;
    if (conhecidos.has(path)) continue;
    n++;
    lista.push({
      id: a.name.replace(/\.[^.]+$/, ""),
      nome: `Música salva ${n}`,
      humor: ["corporativo"],
      energia: "media",
      uso: "Recuperada da biblioteca",
      ganho: 1,
      path,
      licenca: null,
    } as Trilha);
  }
  return lista;
}
async function gravarManifesto(lista: Trilha[]) {
  const blob = new Blob([JSON.stringify(lista, null, 1)], { type: "application/json" });
  const { error } = await supabase.storage.from(BUCKET).upload(MANIFESTO, blob, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
  if (error) throw new Error(error.message);
}

/** Todas as trilhas: as de base (vêm com o editor) + as enviadas pela marca. */
export async function listarTrilhas(): Promise<Trilha[]> {
  const base: Trilha[] = TRILHAS_BASE.map((t) => ({ ...t, base: true }));
  return [...base, ...(await lerManifesto())];
}

export const chaveTrilha = (t: Pick<Trilha, "id">) => `${CHAVE_TRILHA}${t.id}`;

export async function urlTrilha(t: Trilha) {
  if (t.arquivo) return staticFile(t.arquivo);
  if (!t.path) return undefined;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(t.path, 6 * 3600);
  return data?.signedUrl;
}

/** Andamento aproximado (BPM) pela autocorrelação da envoltória de ataques. */
function estimarBpm(buf: AudioBuffer) {
  const d = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const passo = Math.round(sr / 100); // envoltória a 100 Hz
  const ini = Math.floor(Math.min(d.length, sr * 15)); // pula a introdução
  const fim = Math.min(d.length, ini + sr * 45);
  const env: number[] = [];
  let ant = 0;
  for (let i = ini; i + passo < fim; i += passo) {
    let e = 0;
    for (let k = 0; k < passo; k++) e += d[i + k] * d[i + k];
    e = Math.sqrt(e / passo);
    env.push(Math.max(0, e - ant)); // só subidas (ataques)
    ant = e;
  }
  const media = env.reduce((x, y) => x + y, 0) / Math.max(1, env.length);
  for (let i = 0; i < env.length; i++) env[i] -= media;
  let melhor = -Infinity,
    bpm = 0;
  for (let lag = 33; lag <= 100; lag++) {
    // 60–180 bpm; preferência suave por ~110 bpm evita pegar metade/dobro do andamento.
    let soma = 0;
    for (let i = lag; i < env.length; i++) soma += env[i] * env[i - lag];
    const b = 6000 / lag;
    const nota = (soma / (env.length - lag)) * Math.exp(-0.5 * (Math.log2(b / 110) / 0.7) ** 2);
    if (nota > melhor) {
      melhor = nota;
      bpm = b;
    }
  }
  return bpm ? Math.round(bpm) : undefined;
}

/** Mede a faixa (duração, volume médio e andamento) para nivelar todas no mesmo volume percebido. */
export async function medir(file: Blob) {
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  let soma = 0,
    n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i += 4) {
      soma += d[i] * d[i];
      n++;
    }
  }
  const rms = Math.sqrt(soma / Math.max(1, n));
  // Alvo: o mesmo das trilhas de base (~-13 dBFS RMS).
  const ganho = Math.min(4, Math.max(0.25, 0.22 / Math.max(1e-4, rms)));
  const bpm = estimarBpm(buf);
  const energia: Trilha["energia"] = !bpm
    ? "media"
    : bpm >= 115
      ? "alta"
      : bpm <= 90
        ? "baixa"
        : "media";
  return { duracao: Math.round(buf.duration), ganho: +ganho.toFixed(2), bpm, energia };
}

export const HUMOR_POR_ENERGIA: Record<Trilha["energia"], string[]> = {
  alta: ["energetico", "confiante", "moderno"],
  media: ["corporativo", "inspirador", "positivo"],
  baixa: ["calmo", "bastidor", "intimo"],
};

/** Registra no manifesto uma faixa que já está no bucket (ex.: baixada pela busca de músicas). */
export async function registrarTrilha(
  path: string,
  info: {
    id?: string;
    nome: string;
    humor?: string[];
    uso?: string;
    licenca?: string;
    credito?: string;
  },
) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "não consegui ler a faixa");
  const m = await medir(data);
  const lista = await lerManifesto();
  const t: Trilha = {
    id: info.id ?? `t${Date.now().toString(36)}`,
    nome: info.nome,
    humor: info.humor?.length ? info.humor : HUMOR_POR_ENERGIA[m.energia],
    energia: m.energia,
    uso: info.uso ?? "Uso geral",
    bpm: m.bpm,
    ganho: m.ganho,
    duracao: m.duracao,
    path,
    licenca: [info.licenca, info.credito].filter(Boolean).join(" · ") || null,
  };
  lista.push(t);
  await gravarManifesto(lista);
  return t;
}

export async function enviarTrilha(
  file: File,
  info: {
    nome: string;
    humor: string[];
    energia: Trilha["energia"];
    uso: string;
    bpm?: number;
    licenca?: string;
  },
) {
  const { duracao, ganho, bpm } = await medir(file);
  const id = `t${Date.now().toString(36)}`;
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
  const path = `trilhas/${id}.${ext}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "audio/mpeg" });
  if (up.error) throw new Error(up.error.message);
  const lista = await lerManifesto();
  lista.push({ id, bpm, ...info, ganho, duracao, path, licenca: info.licenca ?? null });
  await gravarManifesto(lista);
}

export async function removerTrilha(id: string) {
  const lista = await lerManifesto();
  const t = lista.find((x) => x.id === id);
  if (t?.path) await supabase.storage.from(BUCKET).remove([t.path]);
  await gravarManifesto(lista.filter((x) => x.id !== id));
}

/** Escolhe a trilha pelo objetivo e estilo (usado no corte automático e no botão "Escolher"). */
export function sugerirTrilha(lista: Trilha[], objetivo: string, estilo: string) {
  const pref =
    objetivo === "anuncio"
      ? estilo === "editorial" || estilo === "limpo"
        ? ["corporativo", "inspirador"]
        : ["energetico", "confiante"]
      : estilo === "editorial"
        ? ["inspirador", "corporativo"]
        : ["calmo", "bastidor", "positivo"];
  // Prefere as da marca quando combinam; senão as de base.
  const ordenadas = [...lista].sort((a, b) => Number(!!a.base) - Number(!!b.base));
  return ordenadas.find((t) => t.humor.some((h) => pref.includes(h))) ?? lista[0];
}
