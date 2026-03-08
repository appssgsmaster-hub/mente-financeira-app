import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, Shield, Target, TrendingUp, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function DebtStrategy() {
  const [, navigate] = useLocation();

  const strategies = [
    {
      icon: Target,
      title: "Método Bola de Neve",
      desc: "Comece pagando a menor dívida primeiro. Ao quitá-la, direcione o valor para a próxima. O progresso gera motivação.",
    },
    {
      icon: TrendingUp,
      title: "Método Avalanche",
      desc: "Priorize a dívida com maior taxa de juros. Matematicamente mais eficiente, reduz o custo total.",
    },
    {
      icon: Shield,
      title: "Negociação",
      desc: "Negocie diretamente com credores. Muitos oferecem descontos significativos para pagamento à vista ou renegociação.",
    },
    {
      icon: Heart,
      title: "Equilíbrio Emocional",
      desc: "Dívida não define quem você é. Crie um plano realista e celebre cada passo em direção à liberdade financeira.",
    },
  ];

  return (
    <div className="space-y-8 pb-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/")} data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8 text-secondary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-debt-strategy-title">
          Estratégia de Dívidas
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Aprenda a gerenciar suas dívidas sem perder sua liberdade financeira. Dívida não deve definir sua vida.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {strategies.map((s, i) => (
          <Card key={i} className="p-5 rounded-2xl border-border" data-testid={`card-strategy-${i}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 rounded-3xl border-secondary/20 bg-gradient-to-br from-secondary/5 to-primary/5 text-center space-y-3">
        <h3 className="font-display font-bold text-lg text-foreground">Quer ir mais fundo?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Na Mentoria Transformação, você recebe acompanhamento personalizado para reorganizar sua vida financeira por completo.
        </p>
        <Button className="rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-bold" onClick={() => navigate("/planos")} data-testid="button-view-plans">
          Ver Planos
        </Button>
      </Card>
    </div>
  );
}
