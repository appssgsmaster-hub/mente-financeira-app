import { BookOpen, Award, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Education() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-12">
      <div className="text-center mt-8">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Prosperidade Consciente</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Educação financeira vai além de números. É sobre construir uma mentalidade inabalável para o seu futuro.
        </p>
      </div>

      <Card className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/25 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
              <Award className="w-8 h-8 text-secondary" />
              Visão do Mentor
            </h2>
            <p className="text-lg leading-relaxed text-primary-foreground/90 font-medium italic">
              "Siga firme. Um ajuste por vez e você retoma o controle. A disciplina que você constrói hoje será a fundação da sua liberdade amanhã. O SGS Group está com você nessa jornada."
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 rounded-3xl border-border/50 hover-elevate">
          <h3 className="text-xl font-display font-bold mb-4 text-foreground">O Poder da Divisão</h3>
          <ul className="space-y-4">
            {[
              "Evita o viés da contabilidade mental única",
              "Garante verba para o hoje sem sacrificar o amanhã",
              "Cria barreiras emocionais contra gastos impulsivos"
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-8 rounded-3xl border-border/50 hover-elevate">
          <h3 className="text-xl font-display font-bold mb-4 text-foreground">Os 3 Pilares SGS</h3>
          <ul className="space-y-4">
            {[
              "Clareza Absoluta (Acompanhamento constante)",
              "Ajuste Fino (Proporções adequadas à sua fase)",
              "Foco na Solução (Não no problema)"
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
