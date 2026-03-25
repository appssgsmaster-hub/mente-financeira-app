import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, Zap, Loader2, AlertTriangle, Crown, Sparkles, Brain, Rocket, BookOpen, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TIER_HIERARCHY: Record<string, number> = { free: 0, app: 1, method: 2, mentoria: 3 };
const TIER_LABELS: Record<string, string> = {
  free: "Teste Gratuito",
  app: "Mente Financeira App",
  method: "Método Mente Financeira",
  mentoria: "Mentoria Transformação",
};

export default function Plans() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncedRef = useRef(false);

  const currentTier = (user as any)?.planTier || "free";
  const currentTierLevel = TIER_HIERARCHY[currentTier] || 0;
  const isTrialExpired = user?.subscriptionStatus === "trial_expired";
  const isActive = user?.subscriptionStatus === "active" || currentTierLevel > 0;
  const isTrial = user?.subscriptionStatus === "trial";

  function getTrialDaysLeft() {
    if (!user?.trialEndDate || !isTrial) return null;
    const end = new Date(user.trialEndDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  const trialDays = getTrialDaysLeft();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success" && !syncedRef.current) {
      syncedRef.current = true;
      const tier = params.get("tier") || "app";
      setSyncing(true);
      window.history.replaceState({}, "", "/planos");
      syncPurchase(tier);
    }
  }, []);

  async function syncPurchase(tier: string) {
    try {
      const res = await apiRequest("POST", "/api/stripe/sync-purchase", { planTier: tier });
      const data = await res.json();
      if (data.status === "active") {
        toast({ title: "Compra confirmada! 🎉", description: `Seu plano ${TIER_LABELS[tier] || tier} foi ativado com sucesso.` });
        await refetchUser();
      } else {
        toast({ title: "A verificar pagamento...", description: "Se o problema persistir, contacte o suporte.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao confirmar compra", description: "Tente actualizar a página.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  if (syncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" data-testid="state-syncing-purchase">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-lg font-display font-semibold text-foreground">A confirmar o seu pagamento…</p>
        <p className="text-sm text-muted-foreground">Por favor aguarde um momento.</p>
      </div>
    );
  }

  async function handleCheckout(tier: string) {
    setLoading(tier);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", {
        planTier: tier,
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Erro", description: "Não foi possível iniciar o pagamento", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  function canUpgradeTo(tier: string) {
    return (TIER_HIERARCHY[tier] || 0) > currentTierLevel;
  }

  function getButtonState(tier: string) {
    const tierLevel = TIER_HIERARCHY[tier] || 0;
    if (tierLevel <= currentTierLevel && currentTierLevel > 0) return "owned";
    if (tierLevel === currentTierLevel + 1) return "next";
    return "available";
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-16 px-4">
      {isTrialExpired && currentTierLevel === 0 && (
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
                Escolha um plano para continuar usando o Mente Financeira e transformar sua vida financeira.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isActive && currentTierLevel > 0 && (
        <Card className="p-5 sm:p-6 rounded-2xl border-secondary/30 bg-secondary/5 mt-6 sm:mt-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground" data-testid="text-plan-active">
                {TIER_LABELS[currentTier]} — Ativo
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {currentTierLevel < 3
                  ? "Você pode expandir sua jornada fazendo upgrade para um plano superior."
                  : "Você tem acesso completo ao ecossistema Mente Financeira. Parabéns!"
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center mt-6 sm:mt-10">
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-2 sm:mb-4" data-testid="text-plans-title">
          Ecossistema de Transformação Financeira
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Do controle financeiro à transformação completa. Escolha o nível que faz sentido para o seu momento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-6xl mx-auto items-start">

        <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-border/50 bg-card flex flex-col">
          <div className="mb-5 sm:mb-6">
            <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-plan-trial">Teste Gratuito</h3>
            <p className="text-xs text-muted-foreground mt-1">7 dias para explorar</p>
            <div className="mt-3 sm:mt-4 font-display">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">€0</span>
              <span className="text-muted-foreground ml-2 text-xs">/7 dias</span>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "Dashboard financeiro básico",
              "Criar contas e testar",
              "Projeções limitadas",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl py-4 text-sm" disabled data-testid="button-trial">
            {isTrial && trialDays !== null
              ? `${trialDays} ${trialDays === 1 ? 'dia restante' : 'dias restantes'}`
              : isTrialExpired
                ? "Período expirado"
                : currentTierLevel > 0 ? "Incluso" : "Plano atual"
            }
          </Button>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-primary/30 bg-card flex flex-col">
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-plan-app">Mente Financeira App</h3>
            </div>
            <p className="text-xs text-muted-foreground">Acesso completo ao app</p>
            <div className="mt-3 sm:mt-4 font-display flex items-end gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-primary">€47</span>
              <span className="text-muted-foreground mb-0.5 text-xs">único</span>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "6 contas financeiras",
              "Distribuição automatizada",
              "Dashboard completo",
              "Projeções básicas",
              "Exportação de relatórios",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
              </li>
            ))}
          </ul>
          {getButtonState("app") === "owned" ? (
            <Button className="w-full rounded-xl py-4 text-sm" disabled data-testid="button-app">
              <Check className="w-4 h-4 mr-1.5" /> Adquirido
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-4 text-sm shadow-md group"
              onClick={() => handleCheckout("app")}
              disabled={loading === "app"}
              data-testid="button-app"
            >
              {loading === "app" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Começar Agora <Zap className="w-4 h-4 ml-1.5 group-hover:scale-110 transition-transform" /></>
              )}
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground mt-2.5">Pagamento único via Stripe</p>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border-secondary shadow-xl shadow-secondary/15 bg-gradient-to-b from-card to-secondary/5 relative flex flex-col z-10">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> RECOMENDADO
          </div>
          <div className="mb-5 sm:mb-6 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-secondary" />
              <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-plan-method">Método Mente Financeira</h3>
            </div>
            <p className="text-xs text-muted-foreground">App + Método completo</p>
            <div className="mt-3 sm:mt-4 font-display flex items-end gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-secondary">€197</span>
              <span className="text-muted-foreground mb-0.5 text-xs">único</span>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "Tudo do plano App",
              "Treinamento financeiro completo",
              "Guia das 5 contas",
              "Tutorial de organização",
              "Vídeo-aulas exclusivas",
              "Implementação passo a passo",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground font-medium">
                <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {item}
              </li>
            ))}
          </ul>
          {getButtonState("method") === "owned" ? (
            <Button className="w-full rounded-xl py-4 text-sm bg-secondary hover:bg-secondary/90" disabled data-testid="button-method">
              <Check className="w-4 h-4 mr-1.5" /> Adquirido
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-4 text-sm bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl group"
              onClick={() => handleCheckout("method")}
              disabled={loading === "method"}
              data-testid="button-method"
            >
              {loading === "method" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {canUpgradeTo("method") && currentTierLevel > 0 ? "Fazer Upgrade" : "Quero o Método"}
                  <Sparkles className="w-4 h-4 ml-1.5 group-hover:scale-110 transition-transform" />
                </>
              )}
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground mt-2.5">Pagamento único. Acesso imediato.</p>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border-amber-400/50 shadow-xl shadow-amber-500/10 bg-gradient-to-b from-card via-amber-50/30 to-amber-100/20 dark:from-card dark:via-amber-950/10 dark:to-amber-900/5 relative flex flex-col">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> TRANSFORMAÇÃO
          </div>
          <div className="mb-5 sm:mb-6 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold font-display text-foreground" data-testid="text-plan-mentoria">Mentoria Transformação</h3>
            </div>
            <p className="text-xs text-muted-foreground">Programa premium completo</p>
            <div className="mt-3 sm:mt-4 font-display flex items-end gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">€697</span>
              <span className="text-muted-foreground mb-0.5 text-xs">único</span>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "Tudo do plano Método",
              "3 meses de mentoria",
              "3 sessões ao vivo",
              "Estratégia personalizada",
              "Comunidade privada",
              "Acesso vitalício ao app",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground font-medium">
                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {item}
              </li>
            ))}
          </ul>
          {getButtonState("mentoria") === "owned" ? (
            <Button className="w-full rounded-xl py-4 text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-white" disabled data-testid="button-mentoria">
              <Check className="w-4 h-4 mr-1.5" /> Adquirido
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-4 text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl group"
              onClick={() => handleCheckout("mentoria")}
              disabled={loading === "mentoria"}
              data-testid="button-mentoria"
            >
              {loading === "mentoria" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {canUpgradeTo("mentoria") && currentTierLevel > 0 ? "Fazer Upgrade" : "Quero a Mentoria"}
                  <Brain className="w-4 h-4 ml-1.5 group-hover:scale-110 transition-transform" />
                </>
              )}
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground mt-2.5">Pagamento único. Inclui tudo.</p>
        </Card>
      </div>
    </div>
  );
}
