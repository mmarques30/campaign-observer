// Ícones e logos que "aparecem" quando a pessoa fala de algo (WhatsApp, e-mail, planilha…).
// SVGs da Iconify (logos de marcas e emojis Fluent), sem chave e sem upload.
import { AbsoluteFill, Img, interpolate, spring, staticFile, useVideoConfig } from "remotion";
import { lista, u, useEntradaSaida, type EfeitoProps } from "./base";
import { f } from "../fontes";

/** Ícones conferidos na Iconify (nome curto → id). O Claude também pode usar qualquer id "prefixo:nome". */
export const ICONES: Record<string, string> = {
  whatsapp: "logos:whatsapp-icon",
  instagram: "logos:instagram-icon",
  gmail: "logos:google-gmail",
  email: "fluent-emoji-flat:e-mail",
  envelope: "fluent-emoji-flat:envelope",
  planilha: "vscode-icons:file-type-excel",
  excel: "vscode-icons:file-type-excel",
  word: "vscode-icons:file-type-word",
  pdf: "vscode-icons:file-type-pdf2",
  drive: "logos:google-drive",
  agenda: "logos:google-calendar",
  calendario: "fluent-emoji-flat:calendar",
  chatgpt: "logos:openai-icon",
  claude: "logos:claude-icon",
  notion: "logos:notion-icon",
  trello: "logos:trello",
  hubspot: "logos:hubspot",
  meta: "logos:meta-icon",
  google: "logos:google-icon",
  youtube: "logos:youtube-icon",
  tiktok: "logos:tiktok-icon",
  linkedin: "logos:linkedin-icon",
  zapier: "logos:zapier-icon",
  n8n: "simple-icons:n8n",
  slack: "logos:slack-icon",
  teams: "logos:microsoft-teams",
  shopify: "logos:shopify",
  stripe: "logos:stripe",
  dinheiro: "fluent-emoji-flat:money-bag",
  nota: "fluent-emoji-flat:dollar-banknote",
  "nota-fiscal": "fluent-emoji-flat:receipt",
  grafico: "fluent-emoji-flat:chart-increasing",
  queda: "fluent-emoji-flat:chart-decreasing",
  barras: "fluent-emoji-flat:bar-chart",
  relogio: "fluent-emoji-flat:alarm-clock",
  ampulheta: "fluent-emoji-flat:hourglass-not-done",
  robo: "fluent-emoji-flat:robot",
  ia: "fluent-emoji-flat:robot",
  cerebro: "fluent-emoji-flat:brain",
  telefone: "fluent-emoji-flat:telephone-receiver",
  celular: "fluent-emoji-flat:mobile-phone",
  notebook: "fluent-emoji-flat:laptop",
  check: "fluent-emoji-flat:check-mark-button",
  erro: "fluent-emoji-flat:cross-mark",
  alerta: "fluent-emoji-flat:warning",
  foguete: "fluent-emoji-flat:rocket",
  equipe: "fluent-emoji-flat:busts-in-silhouette",
  documento: "fluent-emoji-flat:page-facing-up",
  cliente: "fluent-emoji-flat:pouting-face",
  trofeu: "fluent-emoji-flat:trophy",
  estrela: "fluent-emoji-flat:star",
  ideia: "fluent-emoji-flat:light-bulb",
  fogo: "fluent-emoji-flat:fire",
  festa: "fluent-emoji-flat:party-popper",
  duvida: "fluent-emoji-flat:thinking-face",
  acordo: "fluent-emoji-flat:handshake",
  empresa: "fluent-emoji-flat:office-building",
  busca: "fluent-emoji-flat:magnifying-glass-tilted-left",
  lista: "fluent-emoji-flat:clipboard",
  engrenagem: "fluent-emoji-flat:gear",
  brilho: "fluent-emoji-flat:sparkles",
  alfinete: "fluent-emoji-flat:pushpin",
  mensagem: "fluent-emoji-flat:speech-balloon",
  sino: "fluent-emoji-flat:bell",
};

const LOCAIS = new Set(Object.values(ICONES));
/** Os da lista vêm do próprio app (public/vedit/icones); outros ids, da Iconify. */
export const urlIcone = (nome: string) => {
  const id = ICONES[nome.toLowerCase()] ?? nome;
  const [pre, ...resto] = id.split(":");
  if (!resto.length) return null;
  if (LOCAIS.has(id)) return staticFile(`vedit/icones/${pre}--${resto.join(":")}.svg`);
  return `https://api.iconify.design/${pre}/${resto.join(":")}.svg?height=512`;
};

const POS: Record<string, React.CSSProperties> = {
  topo: { top: "11%", left: 0, right: 0, justifyContent: "center", flexDirection: "row" },
  centro: { top: "36%", left: 0, right: 0, justifyContent: "center", flexDirection: "row" },
  direita: { top: "22%", right: "5%", flexDirection: "column", alignItems: "center" },
  esquerda: { top: "22%", left: "5%", flexDirection: "column", alignItems: "center" },
};

export function Icones({ p, dur }: EfeitoProps) {
  const { width } = useVideoConfig();
  const k = u(width);
  const { frame, fps, saida } = useEntradaSaida(dur, { saidaFrames: 8 });
  const nomes = lista(p.icones, [p.icone ?? "whatsapp"]).slice(0, 4);
  const rotulos = lista(p.rotulos);
  const pos = POS[String(p.posicao ?? "topo")] ?? POS.topo;
  const lado = (Number(p.tamanho) || 1) * (nomes.length > 2 ? 150 : 190) * k;
  return (
    <AbsoluteFill style={{ opacity: saida, pointerEvents: "none" }}>
      <div style={{ position: "absolute", display: "flex", gap: 34 * k, ...pos }}>
        {nomes.map((n, i) => {
          const url = urlIcone(n);
          if (!url) return null;
          const s = spring({
            frame: frame - i * 5,
            fps,
            config: { damping: 11, stiffness: 220, mass: 0.6 },
          });
          const flutua = Math.sin((frame + i * 9) / 11) * 6 * k;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10 * k,
                transform: `translateY(${interpolate(s, [0, 1], [60 * k, 0]) + flutua}px) scale(${interpolate(s, [0, 1], [0.3, 1])}) rotate(${interpolate(s, [0, 1], [i % 2 ? 14 : -14, 0])}deg)`,
                opacity: Math.min(1, s * 1.4),
              }}
            >
              <div
                style={{
                  width: lado,
                  height: lado,
                  borderRadius: 0.24 * lado,
                  background: p.fundo === false ? "transparent" : "rgba(255,255,255,.96)",
                  boxShadow:
                    p.fundo === false ? "none" : `0 ${14 * k}px ${40 * k}px rgba(0,0,0,.35)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Img
                  src={url}
                  onError={() => console.warn("[vedit] ícone não encontrado", n)}
                  style={{ width: "68%", height: "68%", objectFit: "contain" }}
                />
              </div>
              {rotulos[i] && (
                <div
                  style={{
                    fontFamily: f("Inter"),
                    fontWeight: 800,
                    fontSize: 30 * k,
                    color: "#fff",
                    textShadow: "0 3px 14px rgba(0,0,0,.7)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rotulos[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
