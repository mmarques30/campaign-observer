// Cortes sempre em silêncio: mede o volume do áudio (WAV PCM 16 bits) e encosta cada começo e
// fim de corte no silêncio mais próximo, para nenhuma palavra entrar ou sair pela metade.

export type Silencio = { de: number; ate: number };

/** Trechos de silêncio (≥ 70 ms) do áudio. Limiar adaptado ao ruído de fundo da gravação. */
export function silenciosDoWav(bytes: Uint8Array): Silencio[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 12,
    taxa = 16000,
    canais = 1,
    bits = 16,
    ini = -1,
    tam = 0;
  while (pos + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    const n = dv.getUint32(pos + 4, true);
    if (id === "fmt ") {
      canais = dv.getUint16(pos + 10, true);
      taxa = dv.getUint32(pos + 12, true);
      bits = dv.getUint16(pos + 22, true);
    } else if (id === "data") {
      ini = pos + 8;
      tam = Math.min(n, bytes.length - ini);
      break;
    }
    pos += 8 + n + (n % 2);
  }
  if (ini < 0 || bits !== 16) return [];
  const passo = Math.round(taxa * 0.01); // janelas de 10 ms
  const bloco = passo * canais * 2;
  const nJ = Math.floor(tam / bloco);
  const db = new Float32Array(nJ);
  for (let j = 0; j < nJ; j++) {
    let soma = 0;
    const o = ini + j * bloco;
    for (let k = 0; k < passo; k++) {
      const v = dv.getInt16(o + k * canais * 2, true) / 32768;
      soma += v * v;
    }
    db[j] = 10 * Math.log10(soma / passo + 1e-10);
  }
  const ord = Float32Array.from(db).sort();
  const piso = ord[Math.floor(nJ * 0.1)],
    fala = ord[Math.floor(nJ * 0.9)];
  const limiar = piso + (fala - piso) * 0.3;
  const out: Silencio[] = [];
  let a = -1;
  for (let j = 0; j <= nJ; j++) {
    const quieto = j < nJ && db[j] < limiar;
    if (quieto && a < 0) a = j;
    if (!quieto && a >= 0) {
      if (j - a >= 7) out.push({ de: a * 0.01, ate: j * 0.01 });
      a = -1;
    }
  }
  return out;
}

/** Encosta os cortes no silêncio. Só mexe nas bordas que não estão em `manter` (as que a pessoa
 *  já tinha ajustado à mão). Alcance: 0,3 s para cada lado. */
export function cortesNoSilencio(
  cortes: { de: number; ate: number }[],
  sil: Silencio[],
  manter: Set<string> = new Set(),
  alcance = 0.3,
) {
  if (!sil.length) return { cortes, mexidos: 0 };
  let mexidos = 0;
  const chave = (n: number) => n.toFixed(2);
  const out = cortes.map((c) => ({ ...c }));
  for (const c of out) {
    if (!manter.has(chave(c.de))) {
      // Começo: logo antes de a fala começar (fim de um silêncio), o mais perto do ponto pedido.
      let melhor: number | null = null;
      for (const s of sil) {
        if (s.ate < c.de - alcance || s.de > c.de + alcance) continue;
        const alvo =
          c.de >= s.de && c.de <= s.ate
            ? Math.max(s.de, Math.min(c.de, s.ate - 0.05))
            : Math.max(s.de, s.ate - 0.05);
        if (
          Math.abs(alvo - c.de) <= alcance &&
          (melhor == null || Math.abs(alvo - c.de) < Math.abs(melhor - c.de))
        )
          melhor = alvo;
      }
      if (melhor != null && Math.abs(melhor - c.de) > 0.015) {
        c.de = +melhor.toFixed(2);
        mexidos++;
      }
    }
    if (!manter.has(chave(c.ate))) {
      // Fim: logo depois de a fala terminar (começo de um silêncio).
      let melhor: number | null = null;
      for (const s of sil) {
        if (s.ate < c.ate - alcance || s.de > c.ate + alcance) continue;
        const alvo =
          c.ate >= s.de && c.ate <= s.ate
            ? Math.min(s.ate, Math.max(c.ate, s.de + 0.06))
            : Math.min(s.ate, s.de + 0.08);
        if (
          Math.abs(alvo - c.ate) <= alcance &&
          (melhor == null || Math.abs(alvo - c.ate) < Math.abs(melhor - c.ate))
        )
          melhor = alvo;
      }
      if (melhor != null && Math.abs(melhor - c.ate) > 0.015) {
        c.ate = +melhor.toFixed(2);
        mexidos++;
      }
    }
  }
  // Nunca inverter nem sobrepor.
  const ok = out.filter((c) => c.ate - c.de > 0.15).sort((a, b) => a.de - b.de);
  for (let i = 1; i < ok.length; i++) if (ok[i].de < ok[i - 1].ate) ok[i].de = ok[i - 1].ate;
  return { cortes: ok.filter((c) => c.ate - c.de > 0.15), mexidos };
}
