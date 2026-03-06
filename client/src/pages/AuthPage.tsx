import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, TrendingUp, Shield, Zap } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isLogin && !gdprConsent) {
        toast({ title: "Consentimento necessário", description: "Você precisa aceitar a Política de Privacidade e os Termos de Uso para criar sua conta.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      setLocation("/");
    } catch (err: any) {
      let msg = "Ocorreu um erro";
      try {
        const data = JSON.parse(err.message.replace(/^\d+:\s*/, ""));
        if (data.message) msg = data.message;
      } catch {
        if (err.message) msg = err.message;
      }
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Mente Financeira
          </h1>
          <p className="text-xl opacity-90 mb-2 font-display italic">
            Prosperar é Viver
          </p>
          <p className="text-lg opacity-70 mb-12">
            SGS Group — Foco na Solução
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Método das 6 Contas</h3>
                <p className="opacity-70 text-sm">Distribua sua renda de forma inteligente e automatizada</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Projeções Inteligentes</h3>
                <p className="opacity-70 text-sm">Visualize seus compromissos e planeje seu futuro financeiro</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">15 Dias Grátis</h3>
                <p className="opacity-70 text-sm">Teste todas as funcionalidades sem compromisso</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-display font-bold text-primary">SGS Group</h1>
            <p className="text-sm text-muted-foreground mt-1">Mente Financeira — Prosperar é Viver</p>
          </div>

          <Card className="p-8 rounded-3xl border-border/50 shadow-xl">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2" data-testid="text-auth-title">
              {isLogin ? "Entrar na sua conta" : "Criar sua conta"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isLogin
                ? "Acesse seu ecossistema financeiro"
                : "Comece seus 15 dias gratuitos agora"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="h-12 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="gdpr-consent"
                    checked={gdprConsent}
                    onCheckedChange={(checked) => setGdprConsent(checked === true)}
                    data-testid="checkbox-gdpr-consent"
                    className="mt-0.5"
                  />
                  <Label htmlFor="gdpr-consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Concordo com a{" "}
                    <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>
                    {" "}e os{" "}
                    <a href="/terms-of-use" target="_blank" className="text-primary hover:underline">Termos de Uso</a>.
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-lg font-semibold"
                disabled={loading || (!isLogin && !gdprConsent)}
                data-testid="button-submit-auth"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  "Entrar"
                ) : (
                  "Criar Conta Gratuita"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setName("");
                  setEmail("");
                  setPassword("");
                  setGdprConsent(false);
                }}
                className="text-sm text-primary hover:underline font-medium"
                data-testid="button-toggle-auth-mode"
              >
                {isLogin
                  ? "Não tem conta? Cadastre-se grátis"
                  : "Já tem conta? Faça login"}
              </button>
            </div>
          </Card>

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
