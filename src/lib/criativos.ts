// Edição de criativos: fotos, projetos, chamadas ao agente e exportação em PNG.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { BUCKET, db } from "@/lib/vedit";
import { FORMATOS, normalizarDesign, type CriaFoto, type Formato } from "@/criativos/design";

export type FotoComUrl = CriaFoto & { url: string };

/** Biblioteca de fotos com links assinados (um pedido só para todas). */
export function useFotos() {
  return useQuery({
    queryKey: ["cria", "fotos"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db()
        .from("cria_fotos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(600);
      if (error) throw new Error(error.message);
      const fotos = (data ?? []) as CriaFoto[];
      if (!fotos.length) return { lista: [] as FotoComUrl[], porId: new Map<string, FotoComUrl>() };
      const { data: urls } = await supabase.storage.from(BUCKET).createSignedUrls(
        fotos.map((f) => f.path),
        60 * 60 * 12,
      );
      const porPath = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
      const lista = fotos
        .map((f) => ({ ...f, url: porPath.get(f.path) ?? "" }))
        .filter((f) => f.url);
      return { lista, porId: new Map(lista.map((f) => [f.id, f])) };
    },
  });
}

/** Reduz para no máx. 2048px (as APIs de imagem não precisam de mais) e salva na biblioteca. */
export async function enviarFoto(file: File): Promise<CriaFoto> {
  const blob = await reduzirImagem(file, 2048);
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `criativos/fotos/up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await db()
    .from("cria_fotos")
    .insert({ path, nome: file.name.replace(/\.[^.]+$/, "").slice(0, 80), origem: "upload" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  // Descrição automática (quem está, roupa, cenário) para o Claude escolher as fotos certas.
  void callEdgeFunction("cria-agente", { acao: "descrever_foto", foto_id: data.id }).catch(
    () => {},
  );
  return data as CriaFoto;
}

async function reduzirImagem(file: File, max: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} não é imagem`);
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && /jpe?g|png/.test(file.type) && file.size < 6_000_000) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.92));
}

export async function excluirFoto(f: CriaFoto) {
  await supabase.storage.from(BUCKET).remove([f.path]);
  const { error } = await db().from("cria_fotos").delete().eq("id", f.id);
  if (error) throw new Error(error.message);
}

type Resposta = { error?: string; fotos?: CriaFoto[] } & Record<string, unknown>;

export async function editarFoto(dados: {
  fotos_ids: string[];
  prompt: string;
  formato: string;
  n?: number;
  qualidade?: "alta" | "rapida";
}) {
  const r = await callEdgeFunction<Resposta>("cria-imagem", { acao: "editar", ...dados });
  if (r?.error) throw new Error(r.error);
  return r.fotos ?? [];
}

export async function gerarFoto(dados: { prompt: string; formato: string; n?: number }) {
  const r = await callEdgeFunction<Resposta>("cria-imagem", { acao: "gerar", ...dados });
  if (r?.error) throw new Error(r.error);
  return r.fotos ?? [];
}

export async function chamarAgente(body: Record<string, unknown>) {
  const r = await callEdgeFunction<Resposta>("cria-agente", body);
  if (r?.error) throw new Error(r.error);
  return r;
}

export async function salvarDesign(projetoId: string, design: unknown, resumo: string) {
  const d = normalizarDesign(design);
  const { data: p } = await db()
    .from("cria_projetos")
    .select("versao")
    .eq("id", projetoId)
    .single();
  const versao = (p?.versao ?? 0) + 1;
  await db().from("cria_versoes").insert({ projeto_id: projetoId, versao, design: d, resumo });
  const { error } = await db()
    .from("cria_projetos")
    .update({ design: d, versao, updated_at: new Date().toISOString() })
    .eq("id", projetoId);
  if (error) throw new Error(error.message);
}

/** Volta para a versão anterior do design. */
export async function desfazerDesign(projetoId: string, versaoAtual: number) {
  const { data } = await db()
    .from("cria_versoes")
    .select("versao, design")
    .eq("projeto_id", projetoId)
    .lt("versao", versaoAtual)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Não há versão anterior.");
  const { error } = await db()
    .from("cria_projetos")
    .update({ design: data.design, versao: data.versao, updated_at: new Date().toISOString() })
    .eq("id", projetoId);
  if (error) throw new Error(error.message);
  await db().from("cria_versoes").delete().eq("projeto_id", projetoId).gt("versao", data.versao);
}

// Fontes do editor de vídeo (public/vedit/fontes) também servem aos slides.
const FONTES_SLIDE: [string, string, string, string][] = [
  ["Anton", "normal", "400", "Anton-normal-400"],
  ["Archivo Black", "normal", "400", "ArchivoBlack-normal-400"],
  ["Bricolage Grotesque", "normal", "600", "BricolageGrotesque-normal-600"],
  ["Bricolage Grotesque", "normal", "800", "BricolageGrotesque-normal-800"],
  ["Caveat", "normal", "700", "Caveat-normal-700"],
  ["DM Mono", "normal", "500", "DMMono-normal-500"],
  ["Fraunces", "italic", "600", "Fraunces-italic-600"],
  ["Instrument Serif", "italic", "400", "InstrumentSerif-italic-400"],
  ["Instrument Serif", "normal", "400", "InstrumentSerif-normal-400"],
  ["Inter", "normal", "400", "Inter-normal-400"],
  ["Inter", "normal", "600", "Inter-normal-600"],
  ["Inter", "normal", "800", "Inter-normal-800"],
  ["Inter", "normal", "900", "Inter-normal-900"],
  ["Montserrat", "normal", "800", "Montserrat-normal-800"],
  ["Montserrat", "normal", "900", "Montserrat-normal-900"],
  ["Playfair Display", "italic", "700", "PlayfairDisplay-italic-700"],
  ["Space Grotesk", "normal", "500", "SpaceGrotesk-normal-500"],
  ["Space Grotesk", "normal", "700", "SpaceGrotesk-normal-700"],
  ["Sora", "normal", "600", "Sora-normal-600"],
  ["Sora", "normal", "800", "Sora-normal-800"],
  ["Manrope", "normal", "500", "Manrope-normal-500"],
  ["Manrope", "normal", "800", "Manrope-normal-800"],
  ["Poppins", "normal", "500", "Poppins-normal-500"],
  ["Poppins", "normal", "700", "Poppins-normal-700"],
  ["Poppins", "normal", "900", "Poppins-normal-900"],
  ["Syne", "normal", "700", "Syne-normal-700"],
  ["Syne", "normal", "800", "Syne-normal-800"],
  ["Outfit", "normal", "500", "Outfit-normal-500"],
  ["Outfit", "normal", "800", "Outfit-normal-800"],
  ["Plus Jakarta Sans", "normal", "500", "PlusJakartaSans-normal-500"],
  ["Plus Jakarta Sans", "normal", "800", "PlusJakartaSans-normal-800"],
  ["Bebas Neue", "normal", "400", "BebasNeue-normal-400"],
  ["Unbounded", "normal", "600", "Unbounded-normal-600"],
  ["Unbounded", "normal", "900", "Unbounded-normal-900"],
  ["Oswald", "normal", "600", "Oswald-normal-600"],
  ["DM Serif Display", "normal", "400", "DMSerifDisplay-normal-400"],
  ["Archivo", "normal", "500", "Archivo-normal-500"],
  ["Archivo", "normal", "900", "Archivo-normal-900"],
];
export const FONTES_CRIATIVO = [...new Set(FONTES_SLIDE.map((f) => f[0]))];

const regra = (familia: string, estilo: string, peso: string, src: string) =>
  `@font-face{font-family:"${familia}";font-style:${estilo};font-weight:${peso};font-display:block;src:url(${src}) format("woff2")}`;

let fontes: Promise<void> | null = null;
/** Fontes como @font-face em CSS (o exportador de PNG só enxerga regras de CSS, não FontFace via JS). */
export function carregarFontes() {
  if (fontes) return fontes;
  if (typeof document === "undefined") return Promise.resolve();
  const st = document.createElement("style");
  st.id = "cria-fontes";
  st.textContent = FONTES_SLIDE.map(([f, e, p, a]) =>
    regra(f, e, p, `/vedit/fontes/${a}.woff2`),
  ).join("\n");
  document.head.appendChild(st);
  fontes = Promise.all(
    FONTES_SLIDE.map(([f, e, p]) => document.fonts.load(`${e} ${p} 40px "${f}"`)),
  )
    .then(() => undefined)
    .catch((e) => console.warn("[criativos] fonte falhou", e));
  return fontes;
}

let cssEmbutido: Promise<string> | null = null;
/** Mesmas fontes em base64, para o PNG sair idêntico ao preview sem depender de rede. */
function fontesEmbutidas() {
  cssEmbutido ??= Promise.all(
    FONTES_SLIDE.map(async ([f, e, p, a]) => {
      const b = await (await fetch(`/vedit/fontes/${a}.woff2`)).blob();
      const data = await new Promise<string>((ok) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.readAsDataURL(b);
      });
      return regra(f, e, p, data);
    }),
  ).then((l) => l.join("\n"));
  return cssEmbutido;
}

/** Gera o PNG de cada slide a partir dos nós já desenhados em tamanho real. */
export async function exportarPngs(nos: HTMLElement[], formato: Formato) {
  const { toPng } = await import("html-to-image");
  await carregarFontes();
  await Promise.all(
    nos.flatMap((n) =>
      [...n.querySelectorAll("img")].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((ok) => ((img.onload = ok), (img.onerror = ok))),
      ),
    ),
  );
  const [w, h] = FORMATOS[formato];
  const fontEmbedCSS = await fontesEmbutidas();
  const pngs: string[] = [];
  for (const n of nos)
    pngs.push(await toPng(n, { width: w, height: h, pixelRatio: 1, fontEmbedCSS }));
  return pngs;
}

const nomeBase = (nome: string) =>
  nome
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "criativo";
const baixar = (href: string, arq: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = arq;
  a.click();
};
/** Nome da pasta/sufixo de cada formato no zip. */
export const PASTA_FORMATO: Record<Formato, string> = {
  "4:5": "feed-4x5",
  "1:1": "quadrado-1x1",
  "9:16": "stories-9x16",
};

/** Zip com uma pasta por formato e arquivos numerados na ordem dos cards. */
export async function baixarPacote(porFormato: Partial<Record<Formato, string[]>>, nome: string) {
  const base = nomeBase(nome);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const [f, pngs] of Object.entries(porFormato) as [Formato, string[]][]) {
    const pasta = zip.folder(PASTA_FORMATO[f])!;
    pngs.forEach((p, i) =>
      pasta.file(
        `${base}-${PASTA_FORMATO[f]}-${String(i + 1).padStart(2, "0")}.png`,
        p.split(",")[1],
        { base64: true },
      ),
    );
  }
  const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
  baixar(url, `${base}-todos-os-formatos.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function baixarPngs(pngs: string[], nome: string) {
  const base = nomeBase(nome);
  if (pngs.length === 1) return baixar(pngs[0], `${base}.png`);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  pngs.forEach((p, i) =>
    zip.file(`${base}-${String(i + 1).padStart(2, "0")}.png`, p.split(",")[1], { base64: true }),
  );
  const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
  baixar(url, `${base}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
