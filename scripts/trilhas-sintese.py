"""Trilhas de base do editor (geradas por síntese, sem direitos de terceiros).
Cada trilha tem 64 compassos-alvo ~ 60-70 s, em loop perfeito (termina no fim do compasso)."""
import numpy as np
import scipy.signal as sg
import wave, sys, os

SR = 44100
rng = np.random.default_rng(7)
OUT = sys.argv[1]

def nota(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.2, dur=None):
    tot = n
    A = int(a * SR); D = int(d * SR); R = int(r * SR)
    S = max(0, tot - A - D - R)
    e = np.concatenate([np.linspace(0, 1, A, False), np.linspace(1, s, D, False), np.full(S, s), np.linspace(s, 0, R)])
    return e[:tot] if len(e) >= tot else np.pad(e, (0, tot - len(e)))

def lp(x, fc, ordem=2):
    b, a = sg.butter(ordem, fc / (SR / 2), "low")
    return sg.lfilter(b, a, x)

def hp(x, fc, ordem=2):
    b, a = sg.butter(ordem, fc / (SR / 2), "high")
    return sg.lfilter(b, a, x)

def kick(dur=0.45, vol=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7) + 0.25 * np.sin(ph * 2) * np.exp(-t * 30)
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.15
    return (x + click) * vol

def snare(dur=0.25, vol=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    ruido = hp(rng.standard_normal(n), 1500) * np.exp(-t * 22)
    tom = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (0.8 * ruido + 0.5 * tom) * vol

def clap(vol=0.5):
    n = int(0.22 * SR); t = np.arange(n) / SR
    r = hp(rng.standard_normal(n), 1000)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        i = int(o * SR); e[i:] += np.exp(-(t[: n - i]) * 35)
    return lp(r * e, 7000) * vol * 0.6

def hat(dur=0.06, vol=0.25, aberto=False):
    if aberto: dur = 0.25
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (18 if aberto else 80)) * vol

def shaker(vol=0.12):
    n = int(0.09 * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2
    return hp(rng.standard_normal(n), 5000) * e * vol

def pluck(f, dur, vol=0.3, brilho=4000):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum((1 / k) * np.sin(2 * np.pi * f * k * t) for k in range(1, 7))
    x = lp(x, brilho) * np.exp(-t * 4.5)
    return x * vol

def rhodes(f, dur, vol=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 1.0 * t) * 1.2 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * f * t + mod) * env_adsr(n, 0.004, 0.6, 0.35, min(0.4, dur * 0.4))
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t)
    return x * trem * vol

def pad(freqs, dur, vol=0.12, fc=1800):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            x += sg.sawtooth(2 * np.pi * ff * t + rng.random() * 6)
    x = lp(x / (len(freqs) * 3), fc, 2)
    return x * env_adsr(n, 0.4, 0.3, 0.85, 0.6) * vol

def baixo(f, dur, vol=0.35, fc=380):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.35 * sg.square(2 * np.pi * f * t)
    return lp(x, fc) * env_adsr(n, 0.004, 0.08, 0.8, 0.05) * vol

def drone(f, dur, vol=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sg.sawtooth(2 * np.pi * f * t) + sg.sawtooth(2 * np.pi * f * 1.003 * t)
    corte = 300 + 250 * (1 + np.sin(2 * np.pi * 0.05 * t))
    y = np.zeros(n); blk = 2048
    for i in range(0, n, blk):
        y[i:i + blk] = lp(x[i:i + blk], float(corte[i]), 2)
    return y * vol

def acorde(raiz, tipo="m"):
    iv = {"M": (0, 4, 7), "m": (0, 3, 7), "M7": (0, 4, 7, 11), "m7": (0, 3, 7, 10), "sus": (0, 5, 7)}[tipo]
    return [raiz + i for i in iv]

def por(buf, x, pos):
    i = int(pos * SR)
    if i >= len(buf): return
    m = min(len(x), len(buf) - i)
    buf[i:i + m] += x[:m]

def reverb(x, mix=0.18):
    n = int(1.8 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir = lp(ir, 5000)
    w = sg.fftconvolve(x, ir)[: len(x)]
    w /= np.max(np.abs(w)) + 1e-9
    return x + mix * w * np.max(np.abs(x))

def masterizar(L, R, alvo_db=-15.0):
    s = np.stack([L, R])
    s = s - np.mean(s, axis=1, keepdims=True)
    rms = np.sqrt(np.mean(s ** 2))
    s *= 10 ** (alvo_db / 20) / (rms + 1e-9)
    s = np.tanh(s * 1.15) / np.tanh(1.15)  # saturação/limitador suave
    pico = np.max(np.abs(s))
    if pico > 0.97: s *= 0.97 / pico
    # fade de 10 ms nas pontas (loop sem estalo)
    f = int(0.01 * SR)
    s[:, :f] *= np.linspace(0, 1, f); s[:, -f:] *= np.linspace(1, 0, f)
    return s

def salvar(nome, s):
    w = os.path.join(OUT, nome + ".wav")
    d = (np.clip(s.T, -1, 1) * 32767).astype("<i2")
    with wave.open(w, "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(d.tobytes())
    print("ok", nome, s.shape[1] / SR)

def trilha_pulso():
    bpm = 118; b = 60 / bpm; bar = 4 * b; nb = 32
    n = int(nb * bar * SR) + SR; L = np.zeros(n); R = np.zeros(n)
    prog = [(57, "m"), (53, "M"), (48, "M"), (55, "M")]  # Am F C G
    for c in range(nb):
        raiz, tp = prog[c % 4]; t0 = c * bar
        sec = 0 if c < 2 else (2 if 10 <= c < 26 else 1)  # intro curta (anúncio pede ritmo cedo)
        P = pad([nota(x) for x in acorde(raiz, tp)], bar, 0.10 if sec else 0.13, 1400 + 600 * (sec >= 2))
        por(L, P, t0); por(R, P, t0)
        if sec >= 1:
            for k in range(4):
                por(L, kick(vol=0.9), t0 + k * b); por(R, kick(vol=0.9), t0 + k * b)
                h = hat(vol=0.18); por(L, h, t0 + k * b + b / 2); por(R, h * 0.7, t0 + k * b + b / 2)
            for k in (1, 3):
                cp = clap(0.5); por(L, cp, t0 + k * b); por(R, cp, t0 + k * b)
            for k in range(8):
                f = nota(raiz - 24 + (12 if k % 4 == 3 else 0))
                bb = baixo(f, b / 2 * 0.9, 0.32); por(L, bb, t0 + k * b / 2); por(R, bb, t0 + k * b / 2)
        if sec == 2:
            notas = acorde(raiz + 12, tp)
            for k in range(8):
                pk = pluck(nota(notas[k % len(notas)] + (12 if k >= 4 else 0)), b, 0.13, 3500)
                por(L, pk * 0.8, t0 + k * b / 2); por(R, pk, t0 + k * b / 2 + 0.012)
    return reverb(L, 0.15), reverb(R, 0.15)

def trilha_corporativa():
    bpm = 100; b = 60 / bpm; bar = 4 * b; nb = 28
    n = int(nb * bar * SR) + SR; L = np.zeros(n); R = np.zeros(n)
    prog = [(60, "M"), (55, "M"), (57, "m"), (53, "M")]  # C G Am F
    for c in range(nb):
        raiz, tp = prog[c % 4]; t0 = c * bar; sec = 0 if c < 2 else (2 if c >= 10 else 1)
        notas = acorde(raiz, tp) + [raiz + 12]
        for k in range(8):
            pk = pluck(nota(notas[(k * 3) % len(notas)] + 12), b * 1.4, 0.16, 3000)
            pan = 0.5 + 0.35 * np.sin(k)
            por(L, pk * (1 - pan) * 1.6, t0 + k * b / 2); por(R, pk * pan * 1.6, t0 + k * b / 2)
        P = pad([nota(x) for x in acorde(raiz - 12, tp)], bar, 0.07, 1200)
        por(L, P, t0); por(R, P, t0)
        if sec >= 1:
            for k in range(16):
                sh = shaker(0.10 if k % 2 else 0.06); por(L, sh * 0.8, t0 + k * b / 4); por(R, sh, t0 + k * b / 4)
            for k in (0, 2):
                por(L, kick(vol=0.6), t0 + k * b); por(R, kick(vol=0.6), t0 + k * b)
            for k in range(4):
                bb = baixo(nota(raiz - 24), b * 0.9, 0.24, 300); por(L, bb, t0 + k * b); por(R, bb, t0 + k * b)
        if sec >= 2:
            for k in (1, 3):
                s_ = snare(vol=0.32); por(L, s_, t0 + k * b); por(R, s_, t0 + k * b)
    return reverb(L, 0.22), reverb(R, 0.22)

def trilha_tensao():
    bpm = 92; b = 60 / bpm; bar = 4 * b; nb = 24
    n = int(nb * bar * SR) + SR; L = np.zeros(n); R = np.zeros(n)
    D = drone(nota(38), nb * bar + 1, 0.16); L += D[:n]; R += D[:n]
    prog = [62, 62, 58, 60]  # D D Bb C (menor)
    for c in range(nb):
        t0 = c * bar; raiz = prog[c % 4]; sec = 0 if c < 2 else 1
        for k in range(8):
            bb = baixo(nota(raiz - 24), b / 2 * 0.7, 0.30, 260); por(L, bb, t0 + k * b / 2); por(R, bb, t0 + k * b / 2)
        for k in range(16):
            h = hat(0.04, 0.10 if k % 4 else 0.16); por(L, h * (0.6 if k % 2 else 1), t0 + k * b / 4); por(R, h, t0 + k * b / 4)
        if sec >= 1:
            for k in (0, 2.5):
                por(L, kick(vol=0.85), t0 + k * b); por(R, kick(vol=0.85), t0 + k * b)
            s_ = snare(vol=0.45); por(L, s_, t0 + 3 * b); por(R, s_, t0 + 3 * b)
            P = pad([nota(raiz), nota(raiz + 3), nota(raiz + 7)], bar, 0.07, 900)
            por(L, P, t0); por(R, P, t0)
        if c % 8 == 7:
            nn = int(bar * SR); t = np.arange(nn) / SR
            riser = hp(rng.standard_normal(nn), 2000) * (t / bar) ** 2 * 0.25
            por(L, riser, t0); por(R, riser, t0)
    return reverb(L, 0.2), reverb(R, 0.2)

def trilha_lofi():
    bpm = 84; b = 60 / bpm; bar = 4 * b; nb = 22
    n = int(nb * bar * SR) + SR; L = np.zeros(n); R = np.zeros(n)
    prog = [(62, "m7"), (55, "M7"), (60, "M7"), (57, "m7")]  # Dm7 G7-ish Cmaj7 Am7
    swing = b / 2 * 0.16
    for c in range(nb):
        raiz, tp = prog[c % 4]; t0 = c * bar
        for nt in acorde(raiz - 12, tp):
            rh = rhodes(nota(nt), bar * 0.95, 0.10); por(L, rh * 0.9, t0 + 0.01 * (nt % 3)); por(R, rh, t0)
        por(L, kick(vol=0.55), t0); por(R, kick(vol=0.55), t0)
        por(L, kick(vol=0.4), t0 + 2.5 * b); por(R, kick(vol=0.4), t0 + 2.5 * b)
        for k in (1, 3):
            s_ = lp(snare(vol=0.32), 4500); por(L, s_, t0 + k * b); por(R, s_, t0 + k * b)
        for k in range(8):
            h = lp(hat(vol=0.10), 9000); por(L, h, t0 + k * b / 2 + (swing if k % 2 else 0)); por(R, h * 0.8, t0 + k * b / 2 + (swing if k % 2 else 0))
        bb = baixo(nota(raiz - 24), b * 1.8, 0.22, 250); por(L, bb, t0); por(R, bb, t0)
        bb = baixo(nota(raiz - 24 + 7), b * 1.8, 0.18, 250); por(L, bb, t0 + 2 * b); por(R, bb, t0 + 2 * b)
    vinil = lp(rng.standard_normal(n), 3000) * 0.006
    estalos = (rng.random(n) > 0.99985) * rng.standard_normal(n) * 0.25
    L += vinil + estalos; R += vinil + estalos
    L, R = lp(L, 6500), lp(R, 6500)
    return reverb(L, 0.25), reverb(R, 0.25)

for nome, fn in [("pulso", trilha_pulso), ("corporativo", trilha_corporativa), ("tensao", trilha_tensao), ("lofi", trilha_lofi)]:
    L, R = fn()
    salvar(nome, masterizar(L, R))
