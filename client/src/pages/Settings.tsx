import { useState, useEffect } from "react";
import { useAccounts, useUpdateAccountPercentages, useUser } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Globe, Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
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
  const [redistribute, setRedistribute] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || "BRL");
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  // Edit Account States
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedCurrency(user.currency);
    }
  }, [user]);

  useEffect(() => {
    if (accounts) {
      setLocalValues(
        accounts.map((a) => ({ id: a.id, percentage: a.percentage })),
      );
    }
  }, [accounts]);

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

  const handleSliderChange = (id: number, newValue: number) => {
    setLocalValues((prev) =>
      prev.map((v) => (v.id === id ? { ...v, percentage: newValue } : v)),
    );
  };

  const currentTotal = localValues.reduce((sum, v) => sum + v.percentage, 0);
  const isValid = currentTotal === 100;

  const handleSavePercentages = () => {
    if (!isValid) return;
    updatePercentages(
      { updates: localValues, redistribute },
      {
        onSuccess: () => {
          const msg = redistribute
            ? "Porcentagens e saldos redistribuídos com sucesso!"
            : "Sua meta de distribuição foi atualizada.";
          toast({ title: "Distribuição salva!", description: msg });
          setRedistribute(false);
        },
        onError: () => {
          toast({ title: "Erro ao salvar", description: "Não foi possível atualizar as porcentagens.", variant: "destructive" });
        },
      },
    );
  };

  const handleAddAccount = async () => {
    const name = prompt("Nome da nova conta:");
    if (!name) return;
    
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, percentage: 0, color: "#4F46E5", balance: 0 }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Conta Criada", description: "Nova conta adicionada ao ecossistema." });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível criar a conta.", variant: "destructive" });
    }
  };

  const handleRenameAccount = async (id: number) => {
    if (!editName) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Conta Atualizada", description: "Nome da conta alterado com sucesso." });
      setEditingAccountId(null);
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível renomear a conta.", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("Tem certeza que deseja apagar esta conta? Todas as transações associadas serão removidas.")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Conta Removida", description: "Conta e dados associados foram apagados." });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível apagar a conta.", variant: "destructive" });
    }
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Ajustes da Mente Financeira</h1>
          <p className="text-muted-foreground">Personalize suas contas e a distribuição do seu ecossistema.</p>
        </div>
        <Button onClick={handleAddAccount} className="rounded-2xl gap-2 bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4" /> Adicionar Conta
        </Button>
      </div>

      <Card className="p-6 rounded-3xl border-border/50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-foreground">Moeda do Ecossistema</h3>
        </div>
        <select
          value={selectedCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={isUpdatingCurrency}
          className="bg-white dark:bg-black border border-border/50 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none min-w-[120px]"
        >
          <option value="BRL">BRL (R$)</option>
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </Card>

      <Card className="p-8 rounded-3xl border-border/50 shadow-sm">
        <div className={`p-6 rounded-2xl mb-8 flex items-center justify-between border ${isValid ? "bg-secondary/10 border-secondary/20" : "bg-destructive/10 border-destructive/20"}`}>
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              {isValid ? <CheckCircle2 className="w-5 h-5 text-secondary" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
              Total Distribuído
            </h3>
            <p className="text-sm text-muted-foreground mt-1">A soma deve ser exatamente 100%.</p>
          </div>
          <div className="text-4xl font-display font-bold">
            <span className={isValid ? "text-secondary" : "text-destructive"}>{currentTotal}%</span>
          </div>
        </div>

        <div className="space-y-10">
          {accounts.map((account) => {
            const localVal = localValues.find((v) => v.id === account.id)?.percentage || 0;
            const isEditing = editingAccountId === account.id;

            return (
              <div key={account.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: account.color }} />
                    {isEditing ? (
                      <div className="flex gap-2 flex-1 max-w-xs">
                        <input
                          autoFocus
                          className="flex-1 p-1 px-2 text-sm border rounded-lg bg-background"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameAccount(account.id)}
                        />
                        <Button size="sm" onClick={() => handleRenameAccount(account.id)}>OK</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="font-semibold text-lg">{account.name}</span>
                        <button 
                          onClick={() => { setEditingAccountId(account.id); setEditName(account.name); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-display font-bold w-16 text-right">{localVal}%</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive rounded-xl"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Slider
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

        <div className="mt-8 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-foreground">Redistribuir saldos atuais</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ao ativar, o saldo total do ecossistema será redistribuído entre as contas conforme as novas porcentagens. Desativado, só afeta entradas futuras.
                </p>
              </div>
            </div>
            <Switch
              checked={redistribute}
              onCheckedChange={setRedistribute}
              data-testid="switch-redistribute"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => { setLocalValues(accounts.map((a) => ({ id: a.id, percentage: a.percentage }))); setRedistribute(false); }}
            disabled={isPending}
            className="rounded-2xl"
          >
            Restaurar Original
          </Button>
          <Button
            onClick={handleSavePercentages}
            disabled={!isValid || isPending}
            className="rounded-2xl px-8 bg-primary hover:bg-primary/90 shadow-lg"
            data-testid="button-save-percentages"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {redistribute ? "Salvar e Redistribuir" : "Salvar Distribuição"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-3xl border-border/50 shadow-sm">
        <h3 className="text-lg font-bold mb-2">Resetar Ecossistema</h3>
        <p className="text-sm text-muted-foreground mb-4">Isso apaga todas as transações e zera os saldos das contas.</p>
        <Button variant="destructive" onClick={handleReset} className="rounded-2xl">Resetar Tudo</Button>
      </Card>
    </div>
  );
}
