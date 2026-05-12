import { useState, useEffect } from "react";
import { useAccounts, useUpdateAccountPercentages, useUser } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Globe, Plus, Trash2, Pencil, RefreshCw, ChevronDown, BookOpen, Wallet, Landmark, ShieldCheck, Rocket, TrendingUp } from "lucide-react";
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
  const [editDescription, setEditDescription] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Tracks raw typed strings for percentage inputs so "24." doesn't snap back
  const [percentageStrings, setPercentageStrings] = useState<Record<number, string>>({});

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

  const handlePercentageInput = (id: number, raw: string) => {
    setPercentageStrings((prev) => ({ ...prev, [id]: raw }));
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      handleSliderChange(id, Math.round(v * 100) / 100);
    }
  };

  const handlePercentageBlur = (id: number) => {
    const raw = percentageStrings[id] ?? "";
    const v = parseFloat(raw);
    const current = localValues.find((x) => x.id === id)?.percentage ?? 0;
    const resolved = isNaN(v) ? current : Math.min(100, Math.max(0, Math.round(v * 100) / 100));
    handleSliderChange(id, resolved);
    setPercentageStrings((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const currentTotal = Math.round(localValues.reduce((sum, v) => sum + v.percentage, 0) * 100) / 100;
  const isValid = currentTotal === 100;

  const formatBalance = (cents: number) => {
    const currency = user?.currency || "EUR";
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

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

  const handleSaveAccountEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Conta Atualizada", description: "Nome e descrição atualizados com sucesso." });
      setEditingAccountId(null);
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível atualizar a conta.", variant: "destructive" });
    }
  };

  const DEFAULT_ACCOUNT_NAMES = [
    "Vida Financeira PF",
    "Conta Operacional",
    "Taxas & Obrigações",
    "Conta de Oportunidades",
    "Lucro / Doação",
    "Reserva / Estabilidade",
  ];

  const handleRestoreDefaultNames = async () => {
    if (!accounts) return;
    if (!confirm("Restaurar os nomes padrão do Mente Financeira para as suas contas? Apenas os nomes serão alterados, os saldos e histórico serão mantidos.")) return;
    try {
      for (let i = 0; i < Math.min(accounts.length, DEFAULT_ACCOUNT_NAMES.length); i++) {
        await fetch(`/api/accounts/${accounts[i].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: DEFAULT_ACCOUNT_NAMES[i] }),
        });
      }
      toast({ title: "Nomes restaurados!", description: "As contas voltaram aos nomes padrão do Mente Financeira." });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    } catch {
      toast({ title: "Erro", description: "Não foi possível restaurar os nomes.", variant: "destructive" });
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
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Ajustes da Mente Financeira</h1>
          <p className="text-muted-foreground">Personalize suas contas e a distribuição do seu ecossistema.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleRestoreDefaultNames}
            className="rounded-2xl gap-2 text-sm"
            data-testid="button-restore-default-names"
          >
            <RefreshCw className="w-4 h-4" /> Restaurar nomes padrão
          </Button>
          <Button onClick={handleAddAccount} className="rounded-2xl gap-2 bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4" /> Adicionar Conta
          </Button>
        </div>
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
            <span className={isValid ? "text-secondary" : "text-destructive"}>{+(currentTotal.toFixed(2))}%</span>
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
                      <div className="flex flex-col gap-2 flex-1 max-w-sm">
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            placeholder="Nome da conta"
                            className="flex-1 p-1.5 px-3 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveAccountEdit(account.id)}
                            data-testid={`input-edit-name-${account.id}`}
                          />
                          <Button size="sm" className="rounded-xl" onClick={() => handleSaveAccountEdit(account.id)}>OK</Button>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Descrição e propósito desta conta (opcional)..."
                          className="w-full p-2 px-3 text-sm border rounded-xl bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          data-testid={`input-edit-description-${account.id}`}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 group">
                          <span className="font-semibold text-lg">{account.name}</span>
                          <button
                            onClick={() => { setEditingAccountId(account.id); setEditName(account.name); setEditDescription(account.description ?? ""); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                            data-testid={`button-rename-account-${account.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            account.balance > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : account.balance < 0
                              ? "text-red-500 dark:text-red-400"
                              : "text-muted-foreground"
                          }`}
                          data-testid={`text-balance-${account.id}`}
                        >
                          Saldo atual: {formatBalance(account.balance)}
                        </span>
                        {account.description && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-xs leading-relaxed">
                            {account.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center w-24">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={percentageStrings[account.id] !== undefined ? percentageStrings[account.id] : +(localVal.toFixed(2))}
                        onChange={(e) => handlePercentageInput(account.id, e.target.value)}
                        onBlur={() => handlePercentageBlur(account.id)}
                        data-testid={`input-percentage-${account.id}`}
                        className="w-16 text-right text-2xl font-display font-bold bg-transparent border-b-2 border-border focus:border-primary outline-none transition-colors"
                      />
                      <span className="text-2xl font-display font-bold text-muted-foreground">%</span>
                    </div>
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
                  step={0.01}
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

      <AccountGuideSection />

      <Card className="p-6 rounded-3xl border-border/50 shadow-sm">
        <h3 className="text-lg font-bold mb-2">Resetar Ecossistema</h3>
        <p className="text-sm text-muted-foreground mb-4">Isso apaga todas as transações e zera os saldos das contas.</p>
        <Button variant="destructive" onClick={handleReset} className="rounded-2xl">Resetar Tudo</Button>
      </Card>
    </div>
  );
}

const GUIDE_THEMES = [
  { icon: Wallet,     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30",  border: "border-violet-200 dark:border-violet-800",  dot: "bg-violet-500" },
  { icon: Landmark,   color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950/30",      border: "border-blue-200 dark:border-blue-800",      dot: "bg-blue-500" },
  { icon: ShieldCheck,color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30",    border: "border-amber-200 dark:border-amber-800",    dot: "bg-amber-500" },
  { icon: ShieldCheck,color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-950/30",border:"border-emerald-200 dark:border-emerald-800",  dot: "bg-emerald-500" },
  { icon: Rocket,     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800",  dot: "bg-orange-500" },
  { icon: TrendingUp, color: "text-secondary",                       bg: "bg-secondary/5",                      border: "border-secondary/20",                       dot: "bg-secondary" },
];

function AccountGuideSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { data: accounts } = useAccounts();

  if (!accounts || accounts.length === 0) return null;

  return (
    <Card className="p-8 rounded-3xl border-border/50 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Entenda suas contas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Propósito de cada conta — edite o lápis acima para personalizar nome e descrição.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {accounts.map((account, idx) => {
          const theme = GUIDE_THEMES[idx % GUIDE_THEMES.length];
          const Icon = theme.icon;
          const isOpen = openIndex === idx;
          const hasDescription = !!account.description;

          return (
            <div
              key={account.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen ? `${theme.border} ${theme.bg}` : "border-border/40 hover:border-border/70 bg-background"}`}
              data-testid={`accordion-account-${idx}`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3"
                data-testid={`button-account-guide-${idx}`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${isOpen ? `${theme.bg} ${theme.border}` : "bg-muted border-border/30"}`}
                  >
                    <Icon className={`${isOpen ? theme.color : "text-muted-foreground"}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm sm:text-base leading-tight truncate">{account.name}</p>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                    </div>
                    <p className="text-xs mt-0.5 text-muted-foreground/70 truncate">
                      {account.percentage}% do ecossistema
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1">
                  {hasDescription ? (
                    <p className="text-sm text-foreground/80 leading-relaxed">{account.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma descrição definida. Clique no <strong>lápis</strong> ao lado do nome da conta acima para personalizar o propósito desta conta.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
