import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, Zap, Loader2, AlertTriangle, Crown, Sparkles, Brain } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Plans() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [location] = useLocation();

  const isTrialExpired = user?.subscriptionStatus === "trial_expired";
  const isActive = user?.subscriptionStatus === "active";
  const isTrial = user?.subscriptionStatus === "trial";

  function getTrialDaysLeft() {
    if (!user?.trialEndDate || !isTrial) return null;
    const end = new Date(user.trialEndDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  const trialDays = getTrialDaysLeft();

  async function handleCheckout(type: "subscription" | "mentoria") {
    setLoading(type);
    try {
      const productsRes = await fetch("/api/stripe/products", { credentials: "include" });
      const products = await productsRes.json();

      if (type === "subscription") {
        const appProduct = products.find((p: any) => p.name === "Mente Financeira Premium");
        const monthlyPrice = appProduct?.prices?.find((p: any) => p.recurring?.interval === "month" && p.currency === "eur");
        if (!monthlyPrice) {
          toast({ title: "Erro", description: "Plano não encontrado", variant: "destructive" });
          return;
        }
        const res = await apiRequest("POST", "/api/stripe/create-checkout", {
          priceId: monthlyPrice.id,
          mode: "subscription",
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        const mentoriaProduct = products.find((p: any) => p.name === "Mentoria Premium SGS");
        const mentoriaPrice = mentoriaProduct?.prices?.[0];
        if (!mentoriaPrice) {
          toast({ title: "Erro", description: "Mentoria não encontrada", variant: "destructive" });
          return;
        }
        const res = await apiRequest("POST", "/api/stripe/create-checkout", {
          priceId: mentoriaPrice.id,
          mode: "payment",
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: "Não foi possível iniciar o pagamento", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-portal");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro", description: "Não foi possível abrir o portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleSyncSubscription() {
    try {
      const res = await apiRequest("POST", "/api/stripe/webhook-subscription");
      const data = await res.json();
      if (data.status === "active") {
        toast({ title: "Sucesso", description: "Assinatura ativada com sucesso!" });
        refetchUser();
      }
    } catch {}
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("status") === "success" && !isActive) {
    handleSyncSubscription();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-16">
      {isTrialExpired && (
        <Card className="p-5 sm:p-6 rounded-2xl border-destructive/30 bg-destructive/5 mt-6 sm:mt-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground" data-testid="text-trial-expired">
                Seu período de teste expirou
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Para continuar usando todas as funcionalidades do Mente Financeira, assine o plano Premium.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isActive && (
        <Card className="p-5 sm:p-6 rounded-2xl border-secondary/30 bg-secondary/5 mt-6 sm:mt-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground" data-testid="text-subscription-active">
                Assinatura Premium Ativa
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você tem acesso completo ao ecossistema Mente Financeira.
              </p>
              <Button
                variant="outline"
                className="mt-3 sm:mt-4 rounded-xl text-sm"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                data-testid="button-manage-subscription"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Gerenciar Assinatura
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center mt-6 sm:mt-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-2 sm:mb-4" data-testid="text-plans-title">
          {isActive ? "Seus Planos" : "Escolha sua Trajetória"}
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          {isActive
            ? "Obrigado por confiar no SGS Group. Expanda sua jornada com a Mentoria Premium."
            : "Sua Mente Financeira pode ir muito além. Desbloqueie o poder completo do ecossistema SGS Group."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto items-start">
        <Card className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-border/50 bg-card">
          <div className="mb-5 sm:mb-7">
            <h3 className="text-lg sm:text-xl font-bold font-display text-foreground">Teste Gratuito</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">15 dias para explorar</p>
            <div className="mt-3 sm:mt-5 font-display">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">€0</span>
              <span className="text-muted-foreground ml-2 text-sm">/15 dias</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6 sm:mb-8">
            {["6 Contas pré-definidas", "Distribuição automatizada", "Projeções financeiras", "Painel completo"].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl py-5 text-sm sm:text-base" disabled>
            {isTrial
              ? `${trialDays} ${trialDays === 1 ? 'dia restante' : 'dias restantes'}`
              : isTrialExpired
                ? "Período expirado"
                : "Plano atual"
            }
          </Button>
        </Card>

        <Card className="p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border-primary shadow-xl shadow-primary/15 bg-gradient-to-b from-card to-primary/5 relative z-10">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> RECOMENDADO
          </div>
          <div className="mb-5 sm:mb-7 mt-2">
            <h3 className="text-lg sm:text-2xl font-bold font-display text-foreground">Premium SGS</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Controle absoluto do seu dinheiro</p>
            <div className="mt-3 sm:mt-5 font-display flex items-end gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-primary">€49,97</span>
              <span className="text-muted-foreground mb-0.5 text-sm">/mês</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6 sm:mb-8">
            {[
              "Contas ilimitadas personalizadas", 
              "Mentor IA automático",
              "Projeções avançadas",
              "Exportação de relatórios",
              "Acesso completo ao ecossistema"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground font-medium">
                <Check className="w-4 h-4 text-secondary shrink-0" /> {item}
              </li>
            ))}
          </ul>
          {isActive ? (
            <Button className="w-full rounded-xl py-5 text-sm sm:text-base" disabled>
              <Crown className="w-4 h-4 mr-2" /> Plano Ativo
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-5 text-sm sm:text-base shadow-lg shadow-primary/25 hover:shadow-xl group"
              onClick={() => handleCheckout("subscription")}
              disabled={loading === "subscription"}
              data-testid="button-upgrade"
            >
              {loading === "subscription" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Fazer Upgrade <Zap className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" /></>
              )}
            </Button>
          )}
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-3">
            Pagamento seguro via Stripe. Cancele quando quiser.
          </p>
        </Card>

        <Card className="p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border-amber-400/50 shadow-xl shadow-amber-500/10 bg-gradient-to-b from-card via-amber-50/30 to-amber-100/20 dark:from-card dark:via-amber-950/10 dark:to-amber-900/5 relative">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> TRANSFORMAÇÃO
          </div>
          <div className="mb-5 sm:mb-7 mt-2">
            <h3 className="text-lg sm:text-2xl font-bold font-display text-foreground">Mentoria Premium</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Transformação financeira completa</p>
            <div className="mt-3 sm:mt-5 font-display flex items-end gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400">€197,97</span>
              <span className="text-muted-foreground mb-0.5 text-sm">único</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6 sm:mb-8">
            {[
              "Tudo do plano Premium incluso",
              "Sessão de PNL — Mentalidade",
              "Guia do Método das 5 Contas",
              "Mentoria online ao vivo",
              "Vídeo-aulas exclusivas",
              "Acesso vitalício ao app"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground font-medium">
                <Check className="w-4 h-4 text-amber-500 shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full rounded-xl py-5 text-sm sm:text-base bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl group"
            onClick={() => handleCheckout("mentoria")}
            disabled={loading === "mentoria"}
            data-testid="button-mentoria"
          >
            {loading === "mentoria" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Quero a Mentoria <Brain className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" /></>
            )}
          </Button>
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-3">
            Pagamento único. Inclui app + mentoria + sessão PNL.
          </p>
        </Card>
      </div>
    </div>
  );
}
