import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function MentoriaWelcome() {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-in fade-in duration-700">
      <div className="text-center pt-8">
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-secondary" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-3" data-testid="text-mentoria-welcome-title">
          Parabéns! Sua Mentoria está Ativa
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-4">
          Bem-vindo à Mentoria Premium SGS Group. Sua jornada de transformação financeira começa agora.
        </p>
      </div>

      <Card className="p-6 sm:p-10 rounded-2xl sm:rounded-3xl border-secondary/30 bg-gradient-to-b from-card to-secondary/5">
        <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-4" data-testid="text-mentoria-next-steps">
          Próximos Passos
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">1. Assista ao Vídeo de Boas-Vindas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Entenda como funciona a Mentoria, o Método das 5 Contas e como usar o app para transformar sua vida financeira.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <span className="text-primary font-bold text-sm">PNL</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">2. Sessão de PNL — Mentalidade Financeira</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Antes de organizar números, precisamos organizar a mente. A sessão de Programação Neurolinguística vai preparar
                seu mindset para que o método funcione de verdade.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <span className="text-primary font-bold text-sm">5C</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">3. Guia Completo — Método das 5 Contas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aprenda a metodologia por trás de cada conta. Por que cada uma existe, como distribuir seu dinheiro e como
                manter o equilíbrio financeiro para sempre.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-1">
              <ArrowRight className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">4. Mentoria Online ao Vivo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você receberá um e-mail com o link para agendar sua sessão de mentoria individual.
                Tire suas dúvidas, defina metas e comece com acompanhamento.
              </p>
            </div>
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
          Ir para o Painel
        </Button>
      </div>
    </div>
  );
}
