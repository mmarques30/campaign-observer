// Revisão das falas repetidas pelo ÁUDIO.
// O whisper, num áudio longo, "limpa" retomadas: quando a pessoa repete a frase ("eu vou te
// explicar o que é um… eu vou te explicar o que é um skill"), ele escreve uma vez só e estica
// uma palavra no tempo ("um" com 1,5 s). Aí a detecção de tomadas, que é por texto, não vê nada.
// Aqui: acha esses pontos (palavra longa demais ou buraco sem palavra onde o áudio tem voz),
// retranscreve só aquele pedaço (clipes curtos saem literais, com a repetição) e troca as
// palavras do trecho. Depois disso a detecção de tomadas enxerga a repetição.

export type Palavra = { p: string; i: number; f: number };

const SR = 16000;

/** PCM 16-bit mono do WAV (procura o bloco "data"). */
export function lerWav(buf: Uint8Array): { pcm: Int16Array; sr: number } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let sr = SR;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
    const tam = dv.getUint32(p + 4, true);
    if (id === "fmt ") sr = dv.getUint32(p + 12, true);
    if (id === "data") {
      const ini = p + 8;
      const n = Math.floor(Math.min(tam, buf.length - ini) / 2);
      return {
        pcm: new Int16Array(buf.buffer.slice(buf.byteOffset + ini, buf.byteOffset + ini + n * 2)),
        sr,
      };
    }
    p += 8 + tam + (tam % 2);
  }
  throw new Error("WAV sem bloco de dados");
}

function wav(pcm: Int16Array, sr: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length * 2);
  const dv = new DataView(out.buffer);
  const s = (o: number, t: string) => [...t].forEach((c, k) => (out[o + k] = c.charCodeAt(0)));
  s(0, "RIFF");
  dv.setUint32(4, 36 + pcm.length * 2, true);
  s(8, "WAVE");
  s(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  s(36, "data");
  dv.setUint32(40, pcm.length * 2, true);
  new Int16Array(out.buffer, 44).set(pcm);
  return out;
}

/** "Tem voz" a cada 10 ms (energia acima do chão de ruído + 12 dB). */
function voz(pcm: Int16Array, sr: number): Uint8Array {
  const hop = Math.round(sr / 100);
  const n = Math.floor(pcm.length / hop);
  const db = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let j = k * hop; j < (k + 1) * hop; j++) s += (pcm[j] / 32768) ** 2;
    db[k] = 10 * Math.log10(s / hop + 1e-12);
  }
  const ord = [...db].sort((a, b) => a - b);
  const lim = ord[Math.floor(ord.length * 0.15)] + 12;
  const out = new Uint8Array(n);
  for (let k = 1; k < n - 1; k++) out[k] = (db[k - 1] + db[k] + db[k + 1]) / 3 > lim ? 1 : 0;
  return out;
}

const fracVoz = (v: Uint8Array, a: number, b: number) => {
  const i0 = Math.max(0, Math.floor(a * 100)),
    i1 = Math.min(v.length, Math.ceil(b * 100));
  if (i1 <= i0) return 0;
  let s = 0;
  for (let k = i0; k < i1; k++) s += v[k];
  return s / (i1 - i0);
};

/** Trechos suspeitos de esconder repetição: [início, fim] em segundos. */
export function suspeitos(palavras: Palavra[], v: Uint8Array): [number, number][] {
  const out: [number, number][] = [];
  palavras.forEach((w, k) => {
    // Palavra esticada com voz por dentro.
    if (w.f - w.i > 0.9 && fracVoz(v, w.i, w.f) > 0.4) out.push([w.i, w.f]);
    // Buraco entre palavras com voz por dentro.
    const prox = palavras[k + 1];
    if (prox && prox.i - w.f > 0.9 && fracVoz(v, w.f, prox.i) > 0.4) out.push([w.f, prox.i]);
  });
  return out;
}

type Transcrever = (wavBytes: Uint8Array) => Promise<Palavra[]>;

/**
 * Retranscreve as janelas suspeitas e devolve as palavras com os trechos trocados.
 * `transcrever` recebe um WAV curto e devolve palavras com tempo relativo ao clipe.
 */
export async function revisarRepeticoes(
  palavras: Palavra[],
  audio: Uint8Array,
  transcrever: Transcrever,
  maxJanelas = 20,
): Promise<{ palavras: Palavra[]; janelas: number; trocas: number }> {
  const { pcm, sr } = lerWav(audio);
  const dur = pcm.length / sr;
  const v = voz(pcm, sr);
  const sus = suspeitos(palavras, v);
  if (!sus.length) return { palavras, janelas: 0, trocas: 0 };

  // Janela: algumas palavras antes e depois do ponto (contexto para a repetição aparecer).
  const janelas: [number, number][] = [];
  for (const [a, b] of sus) {
    const ia = palavras.findIndex((w) => w.f > a - 0.01);
    const ib = palavras.findIndex((w) => w.i >= b - 0.01);
    const ini = Math.max(0, (palavras[Math.max(0, ia - 4)]?.i ?? a) - 0.3, a - 3);
    const fim = Math.min(
      dur,
      (palavras[Math.min(palavras.length - 1, (ib < 0 ? palavras.length : ib) + 2)]?.f ?? b) + 0.3,
      b + 3,
    );
    const u = janelas[janelas.length - 1];
    if (u && ini <= u[1]) u[1] = Math.max(u[1], fim);
    else janelas.push([ini, fim]);
  }
  const usar = janelas.slice(0, maxJanelas);

  let atual = palavras;
  let trocas = 0;
  // Em lotes de 4 para não estourar o tempo da função.
  for (let k = 0; k < usar.length; k += 4) {
    const lote = usar.slice(k, k + 4);
    const res = await Promise.all(
      lote.map(async ([a, b]) => {
        const clip = pcm.subarray(Math.floor(a * sr), Math.ceil(b * sr));
        try {
          const ws = await transcrever(wav(clip, sr));
          return {
            a,
            b,
            ws: ws.map((w) => ({ p: w.p, i: +(w.i + a).toFixed(2), f: +(w.f + a).toFixed(2) })),
          };
        } catch {
          return null;
        }
      }),
    );
    for (const r of res) {
      if (!r || !r.ws.length) continue;
      // Troca só o miolo da janela (as pontas do clipe costumam sair cortadas).
      const m0 = r.a + 0.35,
        m1 = r.b - 0.35;
      const meio = (w: Palavra) => (w.i + w.f) / 2;
      const antes = atual.filter((w) => meio(w) >= m0 && meio(w) <= m1);
      const novas = r.ws.filter((w) => meio(w) >= m0 && meio(w) <= m1);
      // Só troca quando o clipe achou MAIS palavras (é a repetição escondida aparecendo).
      if (novas.length <= antes.length) continue;
      atual = [
        ...atual.filter((w) => meio(w) < m0),
        ...novas,
        ...atual.filter((w) => meio(w) > m1),
      ];
      trocas++;
    }
  }
  return { palavras: atual, janelas: usar.length, trocas };
}

/** Índices antigos → novos, pelo tempo da palavra (correções e destaques da legenda). */
export function remapearIndices(antigas: Palavra[], novas: Palavra[]) {
  const mapa = new Map<number, number>();
  let j = 0;
  antigas.forEach((w, k) => {
    while (j < novas.length - 1 && novas[j + 1].i <= w.i + 0.06) j++;
    const cand = [j - 1, j, j + 1].filter((x) => x >= 0 && x < novas.length);
    const melhor = cand.sort((x, y) => Math.abs(novas[x].i - w.i) - Math.abs(novas[y].i - w.i))[0];
    if (melhor != null && Math.abs(novas[melhor].i - w.i) < 0.15) mapa.set(k, melhor);
  });
  return mapa;
}
