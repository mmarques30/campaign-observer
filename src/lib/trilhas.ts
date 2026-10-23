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
  const { data, error } = await supabase.storage.from(BUCKET).download(MANIFESTO);
  if (error || !data) return [];
  try {
    return JSON.parse(await data.text()) as Trilha[];
  } catch {
    return [];
  }
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

/** Mede a faixa (duração e volume médio) para nivelar todas no mesmo volume percebido. */
async function medir(file: File) {
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
  return { duracao: Math.round(buf.duration), ganho: +ganho.toFixed(2) };
}

export async function enviarTrilha(
  file: File,
  info: { nome: string; humor: string[]; energia: Trilha["energia"]; uso: string; bpm?: number; licenca?: string },
) {
  const { duracao, ganho } = await medir(file);
  const id = `t${Date.now().toString(36)}`;
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
  const path = `trilhas/${id}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "audio/mpeg" });
  if (up.error) throw new Error(up.error.message);
  const lista = await lerManifesto();
  lista.push({ id, ...info, ganho, duracao, path, licenca: info.licenca ?? null });
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
