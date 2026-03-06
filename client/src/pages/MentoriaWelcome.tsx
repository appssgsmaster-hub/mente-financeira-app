import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Users, Calendar, ArrowRight, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MentoriaWelcome() {
  const [, navigate] = useLocation();
  const { refetchUser } = useAuth();
  const { toast } = useToast();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success" && !synced) {
      setSynced(true);
      const tier = params.get("tier") || "mentoria";
      apiRequest("POST", "/api/stripe/sync-purchase", { planTier: tier })
        .then(res => res.json())
        .then(data => {
          if (data.status === "active") {
            toast({ title: "Compra confirmada!", description: "Sua Mentoria Transformação Financeira está ativa." });
            refetchUser();
          }
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState({}, "", "/mentoria/boas-vindas");
        });
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-in fade-in duration-700">
      <div className="text-center pt-8">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-3" data-testid="text-mentoria-welcome-title">
          Bem-vindo à Mentoria Transformação Financeira
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-4">
          Sua jornada de transformação financeira completa começa agora. Aqui está tudo que você precisa saber.
        </p>
      </div>

      <Card className="p-6 sm:p-10 rounded-2xl sm:rounded-3xl border-amber-400/30 bg-gradient-to-b from-card to-amber-50/10 dark:to-amber-950/5">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6" data-testid="text-mentoria-next-steps">
          Sua Jornada em 4 Etapas
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">1. Acesso Completo ao App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você tem acesso vitalício ao Mente Financeira App com todas as funcionalidades: 6 contas, distribuição automatizada, projeções e relatórios.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-1">
              <span className="text-secondary font-bold text-sm">5C</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">2. Método Financeiro Completo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Treinamento do Método das 5 Contas, vídeo-aulas exclusivas, tutorial de organização financeira e guia de implementação passo a passo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-1">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">3. Programa de Mentoria — 3 Meses</h3>
              <p className="text-sm text-muted-foreground mt-1">
                3 sessões de mentoria ao vivo com estratégia financeira personalizada. Você receberá um e-mail com o link para agendar suas sessões.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-1">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">4. Comunidade Privada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso à comunidade exclusiva de alunos para trocar experiências, tirar dúvidas e crescer juntos na jornada financeira.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6 rounded-2xl border-border/50 bg-card/50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-foreground text-sm">Próximos Passos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique seu e-mail. Você receberá as instruções de acesso ao treinamento, link para agendar as sessões de mentoria e convite para a comunidade nas próximas 24 horas.
            </p>
          </div>
        </div>
      </Card>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground italic">
          "Foco na Solução" — Missão SGS Group
        </p>
        <Button
          className="rounded-2xl px-8 py-6 text-lg shadow-lg"
          onClick={() => navigate("/")}
          data-testid="button-go-to-dashboard"
        >
          Ir para o Painel <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
