import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, Calendar, Target, ShieldCheck } from "lucide-react";

export default function Projections() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Projeções & Futuro</h1>
          <p className="text-muted-foreground mt-1">Visualize o impacto das suas decisões ao longo do tempo.</p>
        </div>
        <Button className="rounded-full gap-2 shadow-lg shadow-primary/25 hover:shadow-xl">
          <Plus className="w-4 h-4" /> Novo Cenário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-3xl border-border/50 bg-gradient-to-br from-card to-card shadow-sm hover-elevate">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Impacto Anual</h3>
          <p className="text-muted-foreground text-sm mb-4">Se mantiver a distribuição atual, sua reserva crescerá exponencialmente.</p>
          <p className="text-3xl font-display font-bold text-foreground">+ R$ 45.000</p>
        </Card>

        <Card className="p-6 rounded-3xl border-border/50 bg-gradient-to-br from-card to-card shadow-sm hover-elevate">
          <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Metas Atingidas</h3>
          <p className="text-muted-foreground text-sm mb-4">Você está a 3 meses de alcançar sua meta de segurança operacional.</p>
          <p className="text-3xl font-display font-bold text-secondary">85% Concluído</p>
        </Card>

        <Card className="p-6 rounded-3xl border-border/50 bg-gradient-to-br from-card to-card shadow-sm hover-elevate">
          <div className="w-12 h-12 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Estabilidade</h3>
          <p className="text-muted-foreground text-sm mb-4">Sua taxa de poupança está acima da média recomendada pelo SGS Group.</p>
          <p className="text-xl font-bold text-foreground">Status: <span className="text-primary">Excelente</span></p>
        </Card>
      </div>

      {/* Placeholder for future charts */}
      <Card className="p-10 rounded-3xl border-border/50 text-center py-20 flex flex-col items-center justify-center bg-muted/30 border-dashed">
        <TrendingUp className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-display font-bold text-muted-foreground">Gráficos de Projeção em Breve</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          A inteligência artificial do SGS Group está analisando seu histórico para gerar gráficos previsivos ultra-personalizados.
        </p>
      </Card>
    </div>
  );
}
