import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/ads/Logo";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { carregarPermissoes, limparPermissoesCache, primeiraTelaLiberada, registrarAcesso } from "@/lib/permissoes";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) carregarPermissoes(true).then((p) => navigate({ to: primeiraTelaLiberada(p) as any }));
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return toast.error("E-mail ou senha incorretos."); }
    // Acesso ao Ads é liberado pelo administrador (cadastro em Administração › Usuários).
    const { data: ok } = await (supabase as any).rpc("mads_tem_acesso", { _user_id: auth.user?.id });
    if (!ok) {
      await supabase.auth.signOut();
      setLoading(false);
      return toast.error("Esta conta não tem acesso ao IAplicada Ads. Fale com um administrador.");
    }
    limparPermissoesCache();
    await registrarAcesso("login");
    // Leva direto para a primeira tela liberada (quem não vê o Dashboard não cai em "sem acesso").
    const p = await carregarPermissoes(true);
    setLoading(false);
    navigate({ to: primeiraTelaLiberada(p) as any });
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-background text-foreground bg-grain">
      {/* Painel de marca */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-aurora border-r border-border/60">
        <div className="relative z-[1]"><Logo size={26} /></div>
        <div className="relative z-[1] max-w-md">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-3">Cockpit de mídia paga</div>
          <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">Campanhas, criativos e landing pages em um só painel.</h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">Dados da Meta sincronizados a cada 15 minutos e cruzados com os dados de qualificação vindos do CRM.</p>
        </div>
        <div className="relative z-[1] text-[11px] text-muted-foreground/70 flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Acesso restrito a usuários cadastrados pela administração</div>
        {/* Símbolo grande ao fundo, bem discreto */}
        <LogoMark size={520} className="absolute -right-32 -bottom-32 opacity-[0.06] pointer-events-none" />
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden mb-8"><Logo size={24} /></div>
          <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
          <p className="text-sm text-muted-foreground mt-1">Use sua conta IAplicada.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@iaplicada.com" className="h-10 rounded-lg bg-card/60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 rounded-lg bg-card/60" />
            </div>
            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Entrando…" : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
