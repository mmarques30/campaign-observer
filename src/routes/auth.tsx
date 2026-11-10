import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  carregarPermissoes, limparPermissoesCache, primeiraTelaLiberada, registrarAcesso, trocarEmpresa, type Empresa,
} from "@/lib/permissoes";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

/*
 * Login IAplicada — casca visual do padrão dos sistemas IAplicada (blobs líquidos
 * com filtro "gooey"), na marca IAplicada:
 *  - os blobs são as quatro folhas do símbolo, nas quatro cores do logo
 *    (#EAECC8, #D9DFA2, #AFC041, #738A25), com a ponta da folha em ângulos diferentes;
 *  - fundo charcoal da marca, botão lime, rótulos em JetBrains Mono (fontes já servidas pelo app).
 * Só a casca muda: autenticação, validação de acesso, nomes/autocomplete dos campos
 * e redirecionamento seguem os mesmos.
 * Depois de entrar, quem tem mais de uma empresa escolhe em qual quer trabalhar.
 */
const MARCA = {
  sistema: "IAplicada · Ads",
  titulo: ["ACESSO", "RESTRITO"],
  bg: "#10120b",
  folhas: ["#EAECC8", "#D9DFA2", "#AFC041", "#738A25"],
  accent: "#AFC041",
  accentText: "#10120b",
  display: "'Inter Tight', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  radius: "999px",
  logo: "/brand/iaplicada-logo-dark.png",
};

type Blob = { size: number; left: number; top: number; delay: number; dur: number; cor: string; cor2: string; giro: number; folha: boolean };

function AuthPage() {
  const navigate = useNavigate();
  const gooId = `goo${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [passo, setPasso] = useState<"login" | "empresa">("login");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // Já logado: segue direto para a primeira tela liberada da empresa ativa.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) carregarPermissoes(true).then((p) => { if (p.empresa) navigate({ to: primeiraTelaLiberada(p) as any }); });
    });
    const motivo = new URLSearchParams(window.location.search).get("motivo");
    if (motivo === "sem_acesso") setErro("Sua conta não tem acesso liberado. Fale com um administrador da IAplicada.");
  }, [navigate]);

  // Blobs gerados só no navegador (evita divergência de hidratação) e adaptados à tela.
  useEffect(() => {
    const estreita = window.innerWidth < 768;
    const n = estreita ? 4 : 8;
    setBlobs(Array.from({ length: n }).map((_, i) => {
      const k = i % MARCA.folhas.length;
      return {
        size: (estreita ? 110 : 170) + Math.random() * (estreita ? 90 : 190),
        left: 6 + Math.random() * 82,
        top: 6 + Math.random() * 82,
        delay: -Math.random() * 20,
        dur: 16 + Math.random() * 16,
        cor: MARCA.folhas[k],
        cor2: MARCA.folhas[(k + 1) % MARCA.folhas.length],
        giro: [0, 90, 180, 270][i % 4],
        folha: i % 3 !== 2, // mistura folhas (do símbolo) e gotas redondas
      };
    }));
  }, []);

  // Paralaxe sutil no mouse (desligado em touch e com movimento reduzido).
  useEffect(() => {
    const touch = matchMedia("(pointer: coarse)").matches;
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (touch || reduz) return;
    const mv = (e: MouseEvent) => {
      const x = e.clientX / innerWidth, y = e.clientY / innerHeight;
      refs.current.forEach((b, i) => {
        if (!b) return;
        const v = (i + 1) * 12;
        b.style.marginLeft = `${x * v}px`;
        b.style.marginTop = `${y * v}px`;
      });
    };
    document.addEventListener("mousemove", mv);
    return () => document.removeEventListener("mousemove", mv);
  }, [blobs.length]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setCarregando(false); setErro("E-mail ou senha incorretos."); return; }
    // Acesso ao Ads é liberado pelo administrador (Administração › Usuários).
    const { data: ok } = await (supabase as any).rpc("mads_tem_acesso", { _user_id: auth.user?.id });
    if (!ok) {
      await supabase.auth.signOut();
      setCarregando(false);
      setErro("Esta conta não tem acesso ao IAplicada Ads. Fale com um administrador.");
      return;
    }
    limparPermissoesCache();
    const p = await carregarPermissoes(true);
    if (!p.empresa) {
      await supabase.auth.signOut();
      setCarregando(false);
      setErro("Sua conta ainda não está vinculada a nenhuma empresa. Fale com um administrador.");
      return;
    }
    await registrarAcesso("login");
    // Só os ambientes em que a pessoa é membro (o admin global também vê a IAplicada).
    // Empresas de clientes em que o admin não é membro ficam fora do login; ele troca
    // para elas pela sidebar quando precisar dar suporte.
    const { data: vinculos } = await (supabase as any)
      .from("mads_empresa_membros").select("empresa_id").eq("user_id", p.userId);
    const membro = new Set(((vinculos ?? []) as { empresa_id: string }[]).map((v) => v.empresa_id));
    const acessiveis = p.empresas.filter((e) => membro.has(e.id) || (e.interna && p.isAdmin));
    const lista = acessiveis.length ? acessiveis : p.empresas.filter((e) => e.id === p.empresa!.id);
    if (lista.length > 1) {
      setEmpresas(lista);
      setPasso("empresa");
      setCarregando(false);
      return;
    }
    if (lista[0] && lista[0].id !== p.empresa.id) {
      setCarregando(false);
      await escolher(lista[0]);
      return;
    }
    setCarregando(false);
    navigate({ to: primeiraTelaLiberada(p) as any });
  }

  async function escolher(emp: Empresa) {
    setErro(null);
    setCarregando(true);
    try {
      const p = await trocarEmpresa(emp.id);
      navigate({ to: primeiraTelaLiberada(p) as any });
    } catch (err) {
      setErro((err as Error).message);
      setCarregando(false);
    }
  }

  return (
    <div
      className="iap-login"
      style={{
        // @ts-expect-error variáveis CSS
        "--l-bg": MARCA.bg, "--l-accent": MARCA.accent, "--l-accent-text": MARCA.accentText,
        "--l-display": MARCA.display, "--l-mono": MARCA.mono, "--l-radius": MARCA.radius,
        "--l-glow": MARCA.folhas[2],
      }}
    >
      <style>{`
        .iap-login{min-height:100dvh;width:100%;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;background:var(--l-bg);color:#f4f5ee;font-family:var(--l-display);-webkit-font-smoothing:antialiased}
        .iap-login *{box-sizing:border-box}
        .iap-login .stage{position:absolute;inset:0;z-index:0;opacity:.5;filter:url(#${gooId})}
        .iap-login .blob{position:absolute;filter:blur(18px);animation:iapfloat 20s infinite alternate ease-in-out;transition:margin .1s ease-out;box-shadow:inset -10px -10px 22px rgba(0,0,0,.45),10px 10px 30px rgba(244,245,238,.12)}
        .iap-login .blob.folha{border-radius:50% 50% 50% 6%}
        .iap-login .blob.gota{border-radius:50%}
        @keyframes iapfloat{0%{transform:translate(0,0) scale(1) rotate(var(--giro))}33%{transform:translate(9vw,18vh) scale(1.15) rotate(calc(var(--giro) + 25deg))}66%{transform:translate(-5vw,9vh) scale(.85) rotate(calc(var(--giro) - 15deg))}100%{transform:translate(5vw,-9vh) scale(1.08) rotate(var(--giro))}}
        .iap-login .vinheta{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse 60% 70% at 50% 50%,rgba(16,18,11,.15) 0%,rgba(16,18,11,.8) 100%)}
        @media (prefers-reduced-motion:reduce){.iap-login .blob{animation:none}}
        .iap-login .auth{position:relative;z-index:10;width:100%;max-width:440px;padding:24px}
        @media (min-width:640px){.iap-login .auth{padding:40px}}
        .iap-login .logo{height:26px;width:auto;margin-bottom:44px;display:block}
        .iap-login .brand-id{font-family:var(--l-mono);font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(244,245,238,.5);margin-bottom:10px;display:block}
        .iap-login h1{font-weight:800;font-size:clamp(2.2rem,7vw,3.25rem);line-height:.9;letter-spacing:-.04em;margin:0 0 48px -2px}
        .iap-login h1 span{color:var(--l-accent)}
        .iap-login .fg{position:relative;margin-bottom:28px;transition:transform .4s cubic-bezier(.2,1,.3,1)}
        .iap-login .fg:focus-within{transform:translateX(8px)}
        .iap-login label{display:block;font-family:var(--l-mono);font-size:11px;color:rgba(244,245,238,.5);margin-bottom:10px;text-transform:uppercase;letter-spacing:.1em}
        .iap-login input{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(244,245,238,.14);color:#f4f5ee;padding:12px 0;font-size:18px;outline:none;border-radius:0;font-family:var(--l-display)}
        .iap-login input::placeholder{color:rgba(244,245,238,.25)}
        .iap-login input:-webkit-autofill{-webkit-text-fill-color:#f4f5ee;box-shadow:0 0 0 1000px var(--l-bg) inset;caret-color:#f4f5ee}
        .iap-login .glow{position:absolute;bottom:0;left:0;width:0;height:2px;background:var(--l-glow);box-shadow:0 0 15px var(--l-glow);transition:width .6s cubic-bezier(.2,1,.3,1)}
        .iap-login input:focus + .glow{width:100%}
        .iap-login .erro{color:#fca5a5;font-size:13px;line-height:1.4;margin:-8px 0 20px}
        .iap-login .wrap{margin-top:40px;position:relative;filter:url(#${gooId})}
        .iap-login .btn{width:100%;background:var(--l-accent);color:var(--l-accent-text);border:0;padding:18px 32px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;cursor:pointer;position:relative;z-index:2;transition:letter-spacing .3s;border-radius:var(--l-radius);min-height:56px;display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--l-display)}
        .iap-login .btn:hover{letter-spacing:4px}
        .iap-login .btn:focus-visible{outline:2px solid #f4f5ee;outline-offset:4px}
        .iap-login .btn:disabled{opacity:.6;cursor:wait}
        .iap-login .drop{position:absolute;top:50%;left:50%;width:100%;height:100%;background:${MARCA.folhas[1]};transform:translate(-50%,-50%);z-index:1;border-radius:var(--l-radius);transition:all .5s cubic-bezier(.175,.885,.32,1.275)}
        .iap-login .wrap:hover .drop{transform:translate(-50%,-50%) scale(1.05,1.25);filter:brightness(1.1)}
        .iap-login .empresas{display:flex;flex-direction:column;gap:10px;margin-bottom:8px}
        .iap-login .emp{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px 16px;border-radius:16px;border:1px solid rgba(244,245,238,.12);background:rgba(244,245,238,.03);color:#f4f5ee;cursor:pointer;transition:border-color .2s,background .2s,transform .3s cubic-bezier(.2,1,.3,1);font-family:var(--l-display)}
        .iap-login .emp:hover,.iap-login .emp:focus-visible{border-color:var(--l-accent);background:rgba(175,192,65,.08);transform:translateX(6px);outline:none}
        .iap-login .emp:disabled{opacity:.5;cursor:wait}
        .iap-login .emp .ini{height:38px;width:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;background:rgba(175,192,65,.16);color:var(--l-accent);flex-shrink:0}
        .iap-login .emp .nome{font-size:17px;font-weight:600;line-height:1.2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .iap-login .emp .sub{font-family:var(--l-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(244,245,238,.45);margin-top:3px}
        .iap-login .emp .seta{margin-left:auto;color:rgba(244,245,238,.4)}
        .iap-login .voltar{background:none;border:0;color:rgba(244,245,238,.5);font-family:var(--l-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;margin-top:18px;padding:0}
        .iap-login .voltar:hover{color:#f4f5ee}
        .iap-login .foot{margin-top:36px;display:flex;justify-content:space-between;gap:16px;font-family:var(--l-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(244,245,238,.45)}
        .iap-login .foot a{color:rgba(244,245,238,.5);text-decoration:none;transition:color .3s}
        .iap-login .foot a:hover{color:#f4f5ee}
        .iap-login .foot span{display:inline-flex;align-items:center;gap:6px}
      `}</style>

      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
        <defs>
          <filter id={gooId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="stage" aria-hidden>
        {blobs.map((b, i) => (
          <div
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className={`blob ${b.folha ? "folha" : "gota"}`}
            style={{
              width: b.size, height: b.size, left: `${b.left}%`, top: `${b.top}%`,
              animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
              background: `linear-gradient(135deg, ${b.cor}, ${b.cor2})`,
              // @ts-expect-error variável CSS
              "--giro": `${b.giro}deg`,
            }}
          />
        ))}
      </div>
      <div className="vinheta" aria-hidden />

      <main className="auth">
        <img className="logo" src={MARCA.logo} alt="IAplicada" />
        <span className="brand-id">{MARCA.sistema}</span>

        {passo === "login" ? (
          <>
            <h1>{MARCA.titulo[0]}<br /><span>{MARCA.titulo[1]}</span></h1>
            <form onSubmit={entrar} noValidate>
              <div className="fg">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" autoComplete="username" required
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
                <div className="glow" />
              </div>
              <div className="fg">
                <label htmlFor="senha">Senha</label>
                <input id="senha" name="password" type="password" autoComplete="current-password" required
                  value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
                <div className="glow" />
              </div>
              {erro && <p className="erro" role="alert">{erro}</p>}
              <div className="wrap">
                <div className="drop" />
                <button type="submit" className="btn" disabled={carregando || !email || !senha}>
                  {carregando ? "Entrando" : <>Entrar <ArrowRight size={16} strokeWidth={2.5} /></>}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1>ESCOLHA A<br /><span>EMPRESA</span></h1>
            <div className="empresas" role="list">
              {empresas.map((emp) => (
                <button key={emp.id} type="button" className="emp" role="listitem" disabled={carregando} onClick={() => escolher(emp)}>
                  <span className="ini">{emp.nome.slice(0, 2).toUpperCase()}</span>
                  <span className="nome">{emp.nome}</span>
                  <ArrowRight className="seta" size={18} />
                </button>
              ))}
            </div>
            {erro && <p className="erro" role="alert" style={{ marginTop: 12 }}>{erro}</p>}
            <button type="button" className="voltar" onClick={async () => { await supabase.auth.signOut(); setPasso("login"); setSenha(""); }}>
              ← Entrar com outra conta
            </button>
          </>
        )}

        <footer className="foot">
          <span>{passo === "login" ? <><ShieldCheck size={12} />Acesso por convite</> : <><Building2 size={12} />{empresas.length} {empresas.length === 1 ? "empresa" : "empresas"}</>}</span>
          <a href="https://iaplicada.com" target="_blank" rel="noreferrer">IAplicada</a>
        </footer>
      </main>
    </div>
  );
}
