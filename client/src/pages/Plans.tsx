import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, Zap } from "lucide-react";

export default function Plans() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-16">
      <div className="text-center mt-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">Escolha sua Trajetória</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Sua Mente Financeira pode ir muito além. Desbloqueie o poder completo do ecossistema SGS Group.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
        {/* Basic Plan */}
        <Card className="p-8 rounded-3xl border-border/50 bg-card">
          <div className="mb-8">
            <h3 className="text-2xl font-bold font-display text-foreground">Essencial</h3>
            <p className="text-muted-foreground mt-2">Para iniciar sua organização</p>
            <div className="mt-6 font-display">
              <span className="text-4xl font-bold text-foreground">Gratuito</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8">
            {["6 Contas pré-definidas", "Distribuição automatizada", "Histórico de 30 dias"].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground">
                <Check className="w-5 h-5 text-muted-foreground" /> {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl py-6 text-lg" disabled>
            Plano Atual
          </Button>
        </Card>

        {/* Premium Plan */}
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
          <Button className="w-full rounded-xl py-6 text-lg shadow-lg shadow-primary/25 hover:shadow-xl group">
            Fazer Upgrade <Zap className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Processamento seguro via Stripe. Cancele quando quiser.
          </p>
        </Card>
      </div>
    </div>
  );
}
