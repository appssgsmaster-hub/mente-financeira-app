import { useState, useEffect } from "react";
import { useAccounts, useUpdateAccountPercentages } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Settings() {
  const { data: accounts, isLoading } = useAccounts();
  const { mutate: updatePercentages, isPending } = useUpdateAccountPercentages();
  const { toast } = useToast();

  const [localValues, setLocalValues] = useState<{ id: number; percentage: number }[]>([]);

  // Initialize local state when data loads
  useEffect(() => {
    if (accounts) {
      setLocalValues(accounts.map(a => ({ id: a.id, percentage: a.percentage })));
    }
  }, [accounts]);

  const handleSliderChange = (id: number, newValue: number) => {
    setLocalValues(prev => prev.map(v => v.id === id ? { ...v, percentage: newValue } : v));
  };

  const currentTotal = localValues.reduce((sum, v) => sum + v.percentage, 0);
  const isValid = currentTotal === 100;

  const handleSave = () => {
    if (!isValid) return;
    updatePercentages({ updates: localValues }, {
      onSuccess: () => {
        toast({
          title: "Distribuição salva!",
          description: "Sua meta de distribuição foi atualizada com sucesso.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível atualizar as porcentagens.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading || !accounts) return (
    <div className="flex h-64 items-center justify-center text-primary">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Ajustes da Mente Financeira</h1>
        <p className="text-muted-foreground">
          Configure a porcentagem ideal de distribuição para cada uma das suas contas.
        </p>
      </div>

      <Card className="p-8 rounded-3xl border-border/50 shadow-sm relative overflow-hidden">
        {/* Total Status Header */}
        <div className={`p-6 rounded-2xl mb-8 flex items-center justify-between border ${isValid ? 'bg-secondary/10 border-secondary/20' : 'bg-destructive/10 border-destructive/20'}`}>
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              {isValid ? <CheckCircle2 className="w-5 h-5 text-secondary" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
              Total Distribuído
            </h3>
            <p className="text-sm text-muted-foreground mt-1">A soma de todas as contas deve ser exatamente 100%.</p>
          </div>
          <div className="text-4xl font-display font-bold">
            <span className={isValid ? 'text-secondary' : 'text-destructive'}>{currentTotal}%</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="space-y-8">
          {accounts.map((account) => {
            const localVal = localValues.find(v => v.id === account.id)?.percentage || 0;
            return (
              <div key={account.id} className="group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: account.color }}
                    />
                    <label className="font-medium text-foreground">{account.name}</label>
                  </div>
                  <div className="font-display font-bold text-xl w-16 text-right">
                    {localVal}%
                  </div>
                </div>
                <Slider
                  defaultValue={[localVal]}
                  value={[localVal]}
                  onValueChange={(val) => handleSliderChange(account.id, val[0])}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="mt-12 pt-6 border-t border-border flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocalValues(accounts.map(a => ({ id: a.id, percentage: a.percentage })))}
            disabled={isPending}
            className="rounded-xl"
          >
            Restaurar Original
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || isPending}
            className={`rounded-xl px-8 shadow-lg shadow-primary/20 hover:shadow-xl ${isValid ? '' : 'opacity-50'}`}
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Distribuição
          </Button>
        </div>
      </Card>
    </div>
  );
}
