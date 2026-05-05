import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Eye, EyeOff, TrendingUp, Shield, Zap, ArrowLeft,
  User, Building2, BarChart3, Wallet, Target, BookOpen, ChevronRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type View = "login" | "select-type" | "register";

export default function AuthPage() {
  const [view, setView] = useState<View>("login");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      toast({ title: "Erro", description: "Erro ao enviar email de recuperação", variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      let msg = "Ocorreu um erro";
      try { const d = JSON.parse(err.message.replace(/^\d+:\s*/, "")); if (d.message) msg = d.message; } catch { if (err.message) msg = err.message; }
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gdprConsent) {
      toast({ title: "Consentimento necessário", description: "Você precisa aceitar a Política de Privacidade e os Termos de Uso.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, accountType);
      setLocation("/");
    } catch (err: any) {
      let msg = "Ocorreu um erro";
      try { const d = JSON.parse(err.message.replace(/^\d+:\s*/, "")); if (d.message) msg = d.message; } catch { if (err.message) msg = err.message; }
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Left panel content per view ──────────────────────────────────────────
  const leftPanel = {
    login: (
      <div className="space-y-6">
        <Feature icon={TrendingUp} title="Método das 6 Contas" desc="Distribua sua renda de forma inteligente e automatizada" />
        <Feature icon={Shield} title="Projeções Inteligentes" desc="Visualize seus compromissos e planeje seu futuro financeiro" />
        <Feature icon={Zap} title="15 Dias Grátis" desc="Teste todas as funcionalidades sem compromisso" />
      </div>
    ),
    "select-type": (
      <div className="space-y-6">
        <Feature icon={User} title="Conta Pessoal" desc="6 contas, lançamentos, projeções e controle total das suas finanças" />
        <Feature icon={Building2} title="Conta Empresarial" desc="Custos fixos administrativos, distribuição de lucro e gestão avançada" />
        <Feature icon={Zap} title="15 Dias Grátis" desc="Qualquer tipo de conta inclui o período de experiência completo" />
      </div>
    ),
    register: accountType === "business" ? (
      <div className="space-y-6">
        <Feature icon={BarChart3} title="Distribuição de Resultados" desc="Calcule e distribua o lucro líquido por período entre sócios e reservas" />
        <Feature icon={Wallet} title="Custos Fixos" desc="Cadastre folha, contabilidade, aluguel e outros custos mensais recorrentes" />
        <Feature icon={Target} title="Visão Empresarial" desc="Painel focado em indicadores e resultados do seu negócio" />
      </div>
    ) : (
      <div className="space-y-6">
        <Feature icon={TrendingUp} title="Método das 6 Contas" desc="Sistema comprovado para distribuição inteligente da renda pessoal" />
        <Feature icon={Shield} title="Projeções e Compromissos" desc="Acompanhe parcelas, mensalidades e planeje o futuro com clareza" />
        <Feature icon={BookOpen} title="Educação Financeira" desc="Conteúdos para construir uma mentalidade próspera e consistente" />
      </div>
    ),
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-display font-bold leading-tight mb-3">Mente Financeira</h1>
          <p className="text-xl opacity-90 mb-2 font-display italic">Prosperar é Viver</p>
          <p className="text-lg opacity-70 mb-12">SGS Group — Foco na Solução</p>
          {leftPanel[view]}
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-display font-bold text-primary">SGS Group</h1>
            <p className="text-sm text-muted-foreground mt-1">Mente Financeira — Prosperar é Viver</p>
          </div>

          {/* ── FORGOT PASSWORD ── */}
          {showForgot && (
            <Card className="p-8 rounded-3xl border-border/50 shadow-xl">
              {forgotSent ? (
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-forgot-sent">Email enviado!</h2>
                  <p className="text-muted-foreground mb-6">Se existe uma conta com esse email, você receberá um link para redefinir sua senha.</p>
                  <Button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} className="w-full h-12 rounded-xl" data-testid="button-back-to-login">
                    Voltar ao login
                  </Button>
                </div>
              ) : (
                <>
                  <button onClick={() => { setShowForgot(false); setForgotEmail(""); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="button-back-from-forgot">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-forgot-title">Esqueceu sua senha?</h2>
                  <p className="text-muted-foreground mb-6">Digite seu email e enviaremos um link de recuperação.</p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input id="forgot-email" data-testid="input-forgot-email" type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required className="h-12 rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={forgotLoading} data-testid="button-submit-forgot">
                      {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar link de recuperação"}
                    </Button>
                  </form>
                </>
              )}
            </Card>
          )}

          {/* ── LOGIN ── */}
          {!showForgot && view === "login" && (
            <Card className="p-8 rounded-3xl border-border/50 shadow-xl">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2" data-testid="text-auth-title">Entrar na sua conta</h2>
              <p className="text-muted-foreground mb-6">Acesse seu ecossistema financeiro</p>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" data-testid="input-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); }} className="text-xs text-primary hover:underline font-medium" data-testid="button-forgot-password">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="password" data-testid="input-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-toggle-password">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={loading} data-testid="button-submit-auth">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => setView("select-type")} className="text-sm text-primary hover:underline font-medium" data-testid="button-toggle-auth-mode">
                  Não tem conta? Cadastre-se grátis
                </button>
              </div>
            </Card>
          )}

          {/* ── SELECT ACCOUNT TYPE ── */}
          {!showForgot && view === "select-type" && (
            <div className="space-y-5">
              <div>
                <button onClick={() => setView("login")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="button-back-to-login-from-select">
                  <ArrowLeft className="w-4 h-4" /> Voltar ao login
                </button>
                <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-select-type-title">Qual tipo de conta?</h2>
                <p className="text-muted-foreground mt-1 text-sm">Escolha o perfil que melhor descreve o seu uso. Isso define as funcionalidades disponíveis.</p>
              </div>

              <button
                data-testid="button-select-personal"
                onClick={() => { setAccountType("personal"); setView("register"); }}
                className="w-full text-left p-6 rounded-3xl border-2 border-border/50 hover:border-primary/50 hover:bg-primary/[0.03] transition-all group shadow-sm bg-background"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">Conta Pessoal</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Gestão financeira pessoal com o método das 6 contas, lançamentos de receitas e despesas, projeções e educação financeira.</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {["6 Contas", "Lançamentos", "Projeções", "Dívidas", "Educação"].map(f => (
                          <span key={f} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>

              <button
                data-testid="button-select-business"
                onClick={() => { setAccountType("business"); setView("register"); }}
                className="w-full text-left p-6 rounded-3xl border-2 border-border/50 hover:border-secondary/50 hover:bg-secondary/[0.03] transition-all group shadow-sm bg-background"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/15 transition-colors">
                      <Building2 className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">Conta Empresarial</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Gestão financeira do seu negócio com custos fixos administrativos, cálculo de lucro líquido e distribuição de resultados.</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {["Custos Fixos", "Lucro Líquido", "Distribuição", "Projeções", "Rastreamento"].map(f => (
                          <span key={f} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/8 text-secondary border border-secondary/20">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors shrink-0 mt-1" />
                </div>
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Já tem conta?{" "}
                <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">Faça login</button>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {!showForgot && view === "register" && (
            <Card className="p-8 rounded-3xl border-border/50 shadow-xl">
              <button onClick={() => setView("select-type")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5" data-testid="button-back-to-select-type">
                <ArrowLeft className="w-4 h-4" /> Alterar tipo de conta
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accountType === "business" ? "bg-secondary/10" : "bg-primary/10"}`}>
                  {accountType === "business" ? <Building2 className="w-5 h-5 text-secondary" /> : <User className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground" data-testid="text-auth-title">
                    {accountType === "business" ? "Conta Empresarial" : "Conta Pessoal"}
                  </h2>
                  <p className="text-xs text-muted-foreground">15 dias grátis · sem cartão de crédito</p>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{accountType === "business" ? "Nome / Empresa" : "Nome completo"}</Label>
                  <Input id="name" data-testid="input-name" placeholder={accountType === "business" ? "Nome da empresa ou sócio" : "Seu nome"} value={name} onChange={e => setName(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-reg">Email</Label>
                  <Input id="email-reg" data-testid="input-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-reg">Senha</Label>
                  <div className="relative">
                    <Input id="password-reg" data-testid="input-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-toggle-password">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox id="gdpr-consent" checked={gdprConsent} onCheckedChange={c => setGdprConsent(c === true)} data-testid="checkbox-gdpr-consent" className="mt-0.5" />
                  <Label htmlFor="gdpr-consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Concordo com a{" "}
                    <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>{" "}e os{" "}
                    <a href="/terms-of-use" target="_blank" className="text-primary hover:underline">Termos de Uso</a>.
                  </Label>
                </div>
                <Button type="submit" className={`w-full h-12 rounded-xl text-lg font-semibold ${accountType === "business" ? "bg-secondary hover:bg-secondary/90" : ""}`} disabled={loading || !gdprConsent} data-testid="button-submit-auth">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta Gratuita"}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button onClick={() => setView("login")} className="text-sm text-primary hover:underline font-medium" data-testid="button-toggle-auth-mode">
                  Já tem conta? Faça login
                </button>
              </div>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/privacy-policy" target="_blank" className="hover:underline">Política de Privacidade</a>
            {" · "}
            <a href="/terms-of-use" target="_blank" className="hover:underline">Termos de Uso</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="opacity-70 text-sm">{desc}</p>
      </div>
    </div>
  );
}
