// Edição → Referências: pipeline no navegador (quadros + áudio) e chamadas às funções.
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { catalogoParaClaude } from "@/video/catalogo";
import { BUCKET, db, extrairAudioWav, metadadosVideo } from "@/lib/vedit";

export type Tecnica = {
  nome: string;
  de: number;
  ate: number;
  categoria: string;
  descricao: string;
  como_reproduzir: string;
  status: "temos" | "adaptar" | "criar";
  efeito_nosso?: string | null;
  props_sugeridos?: string | null;
};
export type Analise = {
  resumo: string;
  gancho: { texto: string; tecnica: string; segundos?: number };
  estilo: {
    nome: string;
    descricao: string;
    paleta?: string[];
    tipografia?: string;
    com_pessoa?: boolean;
  };
  ritmo?: {
    estimulo_medio_s?: number;
    legenda_estilo?: string;
    legenda_palavras_por_bloco?: number;
    legenda_posicao?: string;
  };
  tecnicas: Tecnica[];
  cta?: { texto?: string; tecnica?: string };
  aprendizados: string[];
  preset_estilo?: {
    legenda?: string;
    look?: string;
    transicao?: string;
    efeitos_preferidos?: string[];
    estilo_base?: string;
  };
  prompt_para_editor: string;
};
export type Referencia = {
  id: string;
  created_at: string;
  updated_at: string;
  url: string | null;
  plataforma: "instagram" | "tiktok" | "youtube" | "arquivo";
  codigo: string | null;
  autor: string | null;
  titulo: string | null;
  legenda: string | null;
  metricas: Record<string, number | string>;
  notas: string | null;
  status: "nova" | "enviando" | "transcrevendo" | "analisando" | "pronta" | "erro";
  video_path: string | null;
  audio_path: string | null;
  duracao: number | null;
  largura: number | null;
  altura: number | null;
  folhas: string[];
  palavras: { p: string; i: number; f: number }[];
  transcricao_texto: string | null;
  analise: Analise | null;
  erro: string | null;
};

export const STATUS_REF: Record<Referencia["status"], string> = {
  nova: "Nova",
  enviando: "Enviando",
  transcrevendo: "Transcrevendo",
  analisando: "Analisando",
  pronta: "Pronta",
  erro: "Erro",
};

/** Progresso do processamento, por referência (só nesta aba). */
type Etapa = { etapa: string; pct: number };
const etapas = new Map<string, Etapa>();
const ouvintes = new Set<() => void>();
const setEtapa = (id: string, e: Etapa) => {
  etapas.set(id, e);
  ouvintes.forEach((f) => f());
};
export const lerEtapa = (id: string) => etapas.get(id) ?? null;
export function assinarEtapas(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/**
 * Folhas de quadros: 1 quadro a cada `passo` s, 12 por folha (3×4), com o tempo carimbado.
 * É o que o Claude "assiste". Precisa da aba visível (o Chrome pausa decodificação escondida).
 */
export async function extrairFolhas(
  file: File,
  opts?: { passo?: number; onProgresso?: (p: number) => void },
): Promise<Blob[]> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = URL.createObjectURL(file);
  v.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:.01;pointer-events:none";
  document.body.appendChild(v);
  try {
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("Não consegui abrir o vídeo no navegador."));
    });
    const dur = v.duration;
    const passo = opts?.passo ?? (dur > 60 ? 2 : dur > 35 ? 1.6 : 1.2);
    const tempos: number[] = [];
    for (let t = 0.3; t < dur; t += passo) tempos.push(t);
    const vertical = v.videoHeight >= v.videoWidth;
    const W = vertical ? 324 : 576,
      H = vertical ? 576 : 324,
      COLS = 3,
      ROWS = 4;
    const folhas: Blob[] = [];
    for (let i = 0; i < tempos.length; i += COLS * ROWS) {
      const lote = tempos.slice(i, i + COLS * ROWS);
      const cv = document.createElement("canvas");
      cv.width = W * COLS;
      cv.height = H * Math.ceil(lote.length / COLS);
      const ctx = cv.getContext("2d")!;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (let k = 0; k < lote.length; k++) {
        await new Promise<void>((res) => {
          const to = setTimeout(res, 4000);
          v.onseeked = () => {
            clearTimeout(to);
            res();
          };
          v.currentTime = lote[k];
        });
        const x = (k % COLS) * W,
          y = Math.floor(k / COLS) * H;
        ctx.drawImage(v, x, y, W, H);
        ctx.fillStyle = "rgba(0,0,0,.65)";
        ctx.fillRect(x, y, 64, 22);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(`${lote[k].toFixed(1)}s`, x + 4, y + 16);
        opts?.onProgresso?.((i + k + 1) / tempos.length);
      }
      folhas.push(await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), "image/jpeg", 0.72)));
    }
    return folhas;
  } finally {
    URL.revokeObjectURL(v.src);
    v.remove();
  }
}

/** Cria a referência e devolve o id na hora; o processamento segue em segundo plano. */
export async function criarReferencia(dados: {
  url?: string;
  arquivo: File;
  notas?: string;
  legenda?: string;
}): Promise<string> {
  const meta = await metadadosVideo(dados.arquivo);
  const url = dados.url?.trim() || null;
  const plataforma = !url
    ? "arquivo"
    : /instagram\.com/i.test(url)
      ? "instagram"
      : /tiktok\.com/i.test(url)
        ? "tiktok"
        : /youtube\.com|youtu\.be/i.test(url)
          ? "youtube"
          : "arquivo";
  const { data, error } = await db()
    .from("vedit_referencias")
    .insert({
      url,
      plataforma,
      codigo: url?.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1] ?? null,
      notas: dados.notas?.trim() || null,
      legenda: dados.legenda?.trim() || null,
      titulo: dados.arquivo.name.replace(/\.[^.]+$/, ""),
      status: "enviando",
      duracao: meta.duracao,
      largura: meta.largura,
      altura: meta.altura,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = data.id as string;
  void processar(id, dados.arquivo, url);
  return id;
}

async function processar(id: string, arquivo: File, url: string | null) {
  const st = supabase.storage.from(BUCKET);
  const patch = (p: Record<string, unknown>) => db().from("vedit_referencias").update(p).eq("id", id);
  try {
    // Metadados por oEmbed (não bloqueia).
    if (url)
      void callEdgeFunction("vedit-referencia", { acao: "metadados", url })
        .then((m: any) => {
          if (!m || m.error) return;
          const upd: Record<string, unknown> = {};
          if (m.autor) upd.autor = m.autor;
          if (m.titulo) upd.titulo = m.titulo;
          if (Object.keys(upd).length) void patch(upd);
        })
        .catch(() => {});

    // 1) Áudio → transcrição
    setEtapa(id, { etapa: "Separando o áudio", pct: 5 });
    const wav = await extrairAudioWav(arquivo);
    const audioPath = `referencias/${id}/audio.wav`;
    let up = await st.upload(audioPath, wav, { contentType: "audio/wav", upsert: true });
    if (up.error) throw new Error(up.error.message);
    await patch({ audio_path: audioPath, status: "transcrevendo" });
    const transcricao = callEdgeFunction("vedit-referencia", { acao: "transcrever", id });

    // 2) Quadros
    setEtapa(id, { etapa: "Extraindo quadros", pct: 15 });
    const folhas = await extrairFolhas(arquivo, {
      onProgresso: (p) => setEtapa(id, { etapa: "Extraindo quadros", pct: 15 + Math.round(p * 40) }),
    });
    const caminhos: string[] = [];
    for (let i = 0; i < folhas.length; i++) {
      const p = `referencias/${id}/folha-${String(i + 1).padStart(2, "0")}.jpg`;
      up = await st.upload(p, folhas[i], { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error(up.error.message);
      caminhos.push(p);
      setEtapa(id, { etapa: "Enviando quadros", pct: 55 + Math.round(((i + 1) / folhas.length) * 10) });
    }
    await patch({ folhas: caminhos });

    // 3) Vídeo (para rever depois) — referências costumam ser leves (720p).
    setEtapa(id, { etapa: "Enviando o vídeo", pct: 66 });
    const videoPath = `referencias/${id}/video.${(arquivo.name.split(".").pop() || "mp4").toLowerCase()}`;
    up = await st.upload(videoPath, arquivo, { contentType: arquivo.type || "video/mp4", upsert: true });
    if (!up.error) await patch({ video_path: videoPath });

    const tr: any = await transcricao;
    if (tr?.error) throw new Error(`Transcrição: ${tr.error}`);

    // 4) Análise
    setEtapa(id, { etapa: "Claude analisando", pct: 75 });
    const r: any = await callEdgeFunction("vedit-referencia", {
      acao: "analisar",
      id,
      catalogo: catalogoParaClaude(),
    });
    if (r?.error) throw new Error(r.error);
    setEtapa(id, { etapa: "Pronta", pct: 100 });
  } catch (e) {
    const msg = (e as Error).message;
    setEtapa(id, { etapa: `Erro: ${msg}`, pct: 0 });
    await patch({ status: "erro", erro: msg });
  }
}

/** Reanalisa com o catálogo atual (ex.: depois de criar efeitos novos). */
export async function reanalisar(id: string) {
  const r: any = await callEdgeFunction("vedit-referencia", {
    acao: "analisar",
    id,
    catalogo: catalogoParaClaude(),
  });
  if (r?.error) throw new Error(r.error);
}

export async function excluirReferencia(id: string) {
  const st = supabase.storage.from(BUCKET);
  const { data } = await st.list(`referencias/${id}`, { limit: 200 });
  const arquivos = (data ?? []).map((f) => `referencias/${id}/${f.name}`);
  if (arquivos.length) await st.remove(arquivos);
  const { error } = await db().from("vedit_referencias").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function urlAssinada(path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
