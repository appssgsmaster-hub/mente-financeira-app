import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, Zap, Loader2, AlertTriangle, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Plans() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  async function handleCheckout() {
    setLoading(true);
    try {
      const productsRes = await fetch("/api/stripe/products", { credentials: "include" });
      const products = await productsRes.json();
      const product = products[0];
      const monthlyPrice = product?.prices?.find((p: any) => p.recurring?.interval === "month");
      if (!monthlyPrice) {
        toast({ title: "Erro", description: "Plano não encontrado", variant: "destructive" });
        return;
      }
      const res = await apiRequest("POST", "/api/stripe/create-checkout", {
        priceId: monthlyPrice.id,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: "Não foi possível iniciar o pagamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-portal");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
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
    } catch {
    }
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("status") === "success" && !isActive) {
    handleSyncSubscription();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-16">
      {isTrialExpired && (
        <Card className="p-6 rounded-2xl border-destructive/30 bg-destructive/5 mt-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-trial-expired">
                Seu período de teste expirou
              </h3>
              <p className="text-muted-foreground mt-1">
                Para continuar usando todas as funcionalidades do Mente Financeira, assine o plano Premium.
                Seus dados estão salvos e esperando por você.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isActive && (
        <Card className="p-6 rounded-2xl border-secondary/30 bg-secondary/5 mt-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-subscription-active">
                Assinatura Premium Ativa
              </h3>
              <p className="text-muted-foreground mt-1">
                Você tem acesso completo ao ecossistema Mente Financeira.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
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

      <div className="text-center mt-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-4" data-testid="text-plans-title">
          {isActive ? "Seu Plano" : "Escolha sua Trajetória"}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          {isActive
            ? "Obrigado por confiar no SGS Group para sua jornada financeira."
            : "Sua Mente Financeira pode ir muito além. Desbloqueie o poder completo do ecossistema SGS Group."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
        <Card className="p-8 rounded-3xl border-border/50 bg-card">
          <div className="mb-8">
            <h3 className="text-2xl font-bold font-display text-foreground">Teste Gratuito</h3>
            <p className="text-muted-foreground mt-2">15 dias para explorar</p>
            <div className="mt-6 font-display">
              <span className="text-4xl font-bold text-foreground">R$ 0</span>
              <span className="text-muted-foreground ml-2">/15 dias</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8">
            {["6 Contas pré-definidas", "Distribuição automatizada", "Projeções financeiras", "Painel completo"].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground">
                <Check className="w-5 h-5 text-muted-foreground" /> {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl py-6 text-lg" disabled>
            {isTrial
              ? `${trialDays} ${trialDays === 1 ? 'dia restante' : 'dias restantes'}`
              : isTrialExpired
                ? "Período expirado"
                : "Plano atual"
            }
          </Button>
        </Card>

        <Card className="p-10 rounded-[2.5rem] border-primary shadow-2xl shadow-primary/20 bg-gradient-to-b from-card to-primary/5 relative scale-105 z-10">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold tracking-wide flex items-center gap-2">
            <Star className="w-4 h-4" /> RECOMENDADO
          </div>
          <div className="mb-8">
            <h3 className="text-3xl font-bold font-display text-foreground">Premium SGS</h3>
            <p className="text-muted-foreground mt-2">O controle absoluto do seu dinheiro</p>
            <div className="mt-6 font-display flex items-end gap-2">
              <span className="text-5xl font-bold text-primary">R$ 49</span>
              <span className="text-muted-foreground mb-1">/mês</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              "Contas ilimitadas personalizadas", 
              "Previsão com IA do SGS Group", 
              "Exportação avançada de relatórios",
              "Sincronização bancária automática",
              "Acesso VIP aos mentorados"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                <Check className="w-5 h-5 text-secondary" /> {item}
              </li>
            ))}
          </ul>
          {isActive ? (
            <Button className="w-full rounded-xl py-6 text-lg" disabled>
              <Crown className="w-5 h-5 mr-2" /> Plano Ativo
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-6 text-lg shadow-lg shadow-primary/25 hover:shadow-xl group"
              onClick={handleCheckout}
              disabled={loading}
              data-testid="button-upgrade"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Fazer Upgrade <Zap className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" /></>
              )}
            </Button>
          )}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Processamento seguro via Stripe. Cancele quando quiser.
          </p>
        </Card>
      </div>
    </div>
  );
}
