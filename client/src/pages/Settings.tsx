import { useState, useEffect } from "react";
import { useAccounts, useUpdateAccountPercentages, useUser } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Globe } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

export default function Settings() {
  const { data: user } = useUser();
  const { data: accounts, isLoading } = useAccounts();
  const { mutate: updatePercentages, isPending } =
    useUpdateAccountPercentages();
  const { toast } = useToast();

  const [localValues, setLocalValues] = useState<
    { id: number; percentage: number }[]
  >([]);

  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || "BRL");
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedCurrency(user.currency);
    }
  }, [user]);

  const handleCurrencyChange = async (currency: string) => {
    setIsUpdatingCurrency(true);
    try {
      const res = await fetch(api.user.update.path, {
        method: api.user.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Moeda Atualizada", description: `A moeda do sistema agora é ${currency}.` });
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível alterar a moeda.", variant: "destructive" });
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  useEffect(() => {
    if (accounts) {
      setLocalValues(
        accounts.map((a) => ({ id: a.id, percentage: a.percentage })),
      );
    }
  }, [accounts]);

  const handleSliderChange = (id: number, newValue: number) => {
    setLocalValues((prev) =>
      prev.map((v) => (v.id === id ? { ...v, percentage: newValue } : v)),
    );
  };

  const currentTotal = localValues.reduce((sum, v) => sum + v.percentage, 0);
  const isValid = currentTotal === 100;

  const handleSave = () => {
    if (!isValid) return;

    updatePercentages(
      { updates: localValues },
      {
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
        },
      },
    );
  };

  const handleReset = () => {
    if (!confirm("Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.")) return;
    
    fetch("/api/transactions/reset", { method: "POST" })
      .then(() => {
        toast({ title: "Ecossistema Resetado", description: "Todos os saldos e transações foram apagados." });
        window.location.reload();
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível resetar os dados.", variant: "destructive" });
      });
  };

  if (isLoading || !accounts) {
    return (
      <div className="flex h-64 items-center justify-center text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Ajustes da Mente Financeira
        </h1>

        <p className="text-muted-foreground">
          Configure a porcentagem ideal de distribuição para cada uma das suas
          contas.
        </p>
      </div>

      <Card className="p-6 rounded-3xl border-border/50 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> Moeda do Sistema
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Escolha a moeda principal para exibição de valores em todo o aplicativo.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { code: "BRL", label: "Real (R$)", flag: "🇧🇷" },
            { code: "EUR", label: "Euro (€)", flag: "🇪🇺" },
            { code: "USD", label: "Dólar ($)", flag: "🇺🇸" },
            { code: "GBP", label: "Libra (£)", flag: "🇬🇧" },
          ].map((c) => (
            <Button
              key={c.code}
              variant={selectedCurrency === c.code ? "default" : "outline"}
              className="rounded-2xl h-auto py-4 flex flex-col gap-1 border-2"
              onClick={() => handleCurrencyChange(c.code)}
              disabled={isUpdatingCurrency}
            >
              <span className="text-2xl">{c.flag}</span>
              <span className="font-bold">{c.code}</span>
              <span className="text-[10px] opacity-70">{c.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-8 rounded-3xl border-border/50 shadow-sm">
        <div
          className={`p-6 rounded-2xl mb-8 flex items-center justify-between border ${
            isValid
              ? "bg-secondary/10 border-secondary/20"
              : "bg-destructive/10 border-destructive/20"
          }`}
        >
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-secondary" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              Total Distribuído
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              A soma de todas as contas deve ser exatamente 100%.
            </p>
          </div>

          <div className="text-4xl font-display font-bold">
            <span className={isValid ? "text-secondary" : "text-destructive"}>
              {currentTotal}%
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {accounts.map((account) => {
            const localVal =
              localValues.find((v) => v.id === account.id)?.percentage || 0;

            return (
              <div key={account.id}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />

                    <div className="font-medium">{account.name}</div>
                  </div>

                  <div className="text-xl font-display font-bold w-16 text-right">
                    {localVal}%
                  </div>
                </div>

                <Slider
                  value={[localVal]}
                  onValueChange={(val) =>
                    handleSliderChange(account.id, val[0])
                  }
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-6 border-t flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() =>
              setLocalValues(
                accounts.map((a) => ({ id: a.id, percentage: a.percentage })),
              )
            }
            disabled={isPending}
            className="rounded-xl"
          >
            Restaurar Original
          </Button>

          <Button
            onClick={handleSave}
            disabled={!isValid || isPending}
            className="rounded-xl px-8 shadow-lg hover:shadow-xl"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Salvar Distribuição
          </Button>
        </div>
      </Card>

      {/* RESET BUTTON */}

      <Card className="p-6 rounded-3xl border-border/50 shadow-sm">
        <h3 className="text-lg font-bold mb-2">Resetar Ecossistema</h3>

        <p className="text-sm text-muted-foreground mb-4">
          Isso apaga todas as transações e dados salvos no navegador.
        </p>

        <Button
          variant="destructive"
          onClick={handleReset}
          className="rounded-xl"
        >
          Resetar Tudo
        </Button>
      </Card>
    </div>
  );
}
