import { useState } from "react";
import { useTransactions, useBusinessSettings, useUpsertBusinessSettings, useFixedCosts, useCreateFixedCost, useUpdateFixedCost, useDeleteFixedCost, useUser } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, TrendingUp, Building2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

function fmt(cents: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "BRL" ? "R$" : currency === "GBP" ? "£" : "$";
  const val = cents / 100;
  return `${symbol} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function ResultsDistribution() {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const { data: user } = useUser();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: settings, isLoading: settingsLoading } = useBusinessSettings();
  const { data: fixedCosts, isLoading: costsLoading } = useFixedCosts();
  const { mutate: saveSettings, isPending: savingSettings } = useUpsertBusinessSettings();
  const { mutate: createCost, isPending: creatingCost } = useCreateFixedCost();
  const { mutate: updateCost } = useUpdateFixedCost();
  const { mutate: deleteCost } = useDeleteFixedCost();
  const { toast } = useToast();

  const currency = user?.currency || "EUR";

  const [retentionPct, setRetentionPct] = useState<string>("");
  const [partnersPct, setPartnersPct] = useState<string>("");
  const [mentorshipPct, setMentorshipPct] = useState<string>("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  if (settings && !settingsInitialized) {
    setRetentionPct(String(settings.retentionPct ?? 0));
    setPartnersPct(String(settings.partnersPct ?? 0));
    setMentorshipPct(String(settings.mentorshipPct ?? 0));
    setSettingsInitialized(true);
  }

  const [newCostDesc, setNewCostDesc] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostCategory, setNewCostCategory] = useState("");
  const [showNewCostForm, setShowNewCostForm] = useState(false);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [editCostDesc, setEditCostDesc] = useState("");
  const [editCostAmount, setEditCostAmount] = useState("");

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthTxs = (transactions || []).filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const monthlyIncome = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalFixedCosts = (fixedCosts || []).reduce((s, c) => s + c.amount, 0);
  const netProfit = monthlyIncome - monthlyExpenses - totalFixedCosts;

  const ret = parseFloat(retentionPct) || 0;
  const par = parseFloat(partnersPct) || 0;
  const men = parseFloat(mentorshipPct) || 0;
  const totalPct = ret + par + men;

  const retValue = Math.round(netProfit * ret / 100);
  const parValue = Math.round(netProfit * par / 100);
  const menValue = Math.round(netProfit * men / 100);
  const remaining = netProfit - retValue - parValue - menValue;

  const handleSaveSettings = () => {
    saveSettings(
      { retentionPct: ret, partnersPct: par, mentorshipPct: men },
      {
        onSuccess: () => toast({ title: "Configurações salvas!" }),
        onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
      }
    );
  };

  const handleCreateCost = () => {
    if (!newCostDesc || !newCostAmount) return;
    createCost(
      { description: newCostDesc, amount: parseFloat(newCostAmount), category: newCostCategory || undefined },
      {
        onSuccess: () => {
          setNewCostDesc(""); setNewCostAmount(""); setNewCostCategory(""); setShowNewCostForm(false);
          toast({ title: "Custo fixo adicionado!" });
        },
        onError: () => toast({ title: "Erro ao adicionar custo", variant: "destructive" }),
      }
    );
  };

  const handleUpdateCost = (id: number) => {
    if (!editCostDesc || !editCostAmount) return;
    updateCost(
      { id, data: { description: editCostDesc, amount: parseFloat(editCostAmount) } },
      {
        onSuccess: () => { setEditingCostId(null); toast({ title: "Custo atualizado!" }); },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      }
    );
  };

  const handleDeleteCost = (id: number) => {
    deleteCost(id, {
      onSuccess: () => toast({ title: "Custo removido" }),
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    });
  };

  if (txLoading || settingsLoading || costsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          Distribuição de Resultados
        </h1>
        <p className="text-muted-foreground">Calcule e distribua o lucro líquido da empresa por período.</p>
      </div>

      {/* Month selector */}
      <Card className="p-5 rounded-3xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-xl font-bold font-display text-foreground">{MONTHS_PT[viewMonth]}</p>
            <p className="text-sm text-muted-foreground">{viewYear}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* P&L Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receita</p>
          <p className="text-xl font-bold font-display text-secondary">{fmt(monthlyIncome, currency)}</p>
        </Card>
        <Card className="p-5 rounded-3xl border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Despesas</p>
          <p className="text-xl font-bold font-display text-destructive">{fmt(monthlyExpenses, currency)}</p>
        </Card>
        <Card className="p-5 rounded-3xl border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Custos Fixos</p>
          <p className="text-xl font-bold font-display text-amber-600">{fmt(totalFixedCosts, currency)}</p>
        </Card>
        <Card className={`p-5 rounded-3xl border-2 shadow-sm ${netProfit >= 0 ? "border-secondary/30 bg-secondary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lucro Líquido</p>
          <p className={`text-xl font-bold font-display ${netProfit >= 0 ? "text-secondary" : "text-destructive"}`}>{fmt(netProfit, currency)}</p>
        </Card>
      </div>

      {/* Distribution percentages */}
      <Card className="p-8 rounded-3xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Distribuição do Lucro
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Defina como o lucro líquido é distribuído.</p>
          </div>
          {totalPct > 100 && (
            <span className="text-xs text-destructive font-semibold bg-destructive/10 px-3 py-1 rounded-full">
              Total: {totalPct.toFixed(1)}% — excede 100%
            </span>
          )}
        </div>

        <div className="space-y-5">
          {[
            { label: "Retenção", emoji: "🏦", pct: retentionPct, setPct: setRetentionPct, value: retValue, color: "text-blue-600" },
            { label: "Sócios", emoji: "🤝", pct: partnersPct, setPct: setPartnersPct, value: parValue, color: "text-purple-600" },
            { label: "Mentoria", emoji: "🎓", pct: mentorshipPct, setPct: setMentorshipPct, value: menValue, color: "text-amber-600" },
          ].map(({ label, emoji, pct, setPct, value, color }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-44 shrink-0">
                <p className="font-semibold text-foreground">{emoji} {label}</p>
              </div>
              <div className="flex items-center gap-2 w-28">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={pct}
                  onChange={e => setPct(e.target.value)}
                  data-testid={`input-pct-${label.toLowerCase()}`}
                  className="w-16 text-right text-xl font-display font-bold bg-transparent border-b-2 border-border focus:border-primary outline-none transition-colors"
                />
                <span className="text-xl font-display font-bold text-muted-foreground">%</span>
              </div>
              <div className="flex-1 text-right">
                <span className={`text-lg font-bold font-display ${color}`}>{fmt(value, currency)}</span>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t flex items-center gap-4">
            <div className="w-44 shrink-0">
              <p className="font-semibold text-muted-foreground">⚖️ Restante</p>
            </div>
            <div className="w-28" />
            <div className="flex-1 text-right">
              <span className={`text-lg font-bold font-display ${remaining >= 0 ? "text-foreground" : "text-destructive"}`}>{fmt(remaining, currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings || totalPct > 100}
            className="rounded-2xl px-8 bg-primary hover:bg-primary/90 shadow-lg"
            data-testid="button-save-distribution"
          >
            {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Distribuição
          </Button>
        </div>
      </Card>

      {/* Fixed Administrative Costs */}
      <Card className="p-8 rounded-3xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">🏢 Custos Fixos Administrativos</h2>
            <p className="text-sm text-muted-foreground mt-1">Custos mensais recorrentes deduzidos antes do cálculo do lucro.</p>
          </div>
          <Button
            onClick={() => setShowNewCostForm(true)}
            className="rounded-2xl gap-2 bg-secondary hover:bg-secondary/90"
            disabled={showNewCostForm}
            data-testid="button-add-fixed-cost"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {showNewCostForm && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/40 border border-border/50">
              <input
                autoFocus
                placeholder="Descrição (ex: Folha de pagamento)"
                value={newCostDesc}
                onChange={e => setNewCostDesc(e.target.value)}
                className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-new-cost-desc"
              />
              <input
                placeholder="Valor mensal"
                type="number"
                step="0.01"
                min="0"
                value={newCostAmount}
                onChange={e => setNewCostAmount(e.target.value)}
                className="w-36 bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-new-cost-amount"
              />
              <input
                placeholder="Categoria (opcional)"
                value={newCostCategory}
                onChange={e => setNewCostCategory(e.target.value)}
                className="w-36 bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button size="icon" className="rounded-xl shrink-0" onClick={handleCreateCost} disabled={creatingCost} data-testid="button-confirm-cost">
                {creatingCost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="rounded-xl shrink-0 text-muted-foreground hover:text-destructive" onClick={() => { setShowNewCostForm(false); setNewCostDesc(""); setNewCostAmount(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {(fixedCosts || []).length === 0 && !showNewCostForm && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Nenhum custo fixo cadastrado.</p>
              <p className="text-xs mt-1">Adicione folha de pagamento, contabilidade, aluguel, etc.</p>
            </div>
          )}

          {(fixedCosts || []).map(cost => (
            <div key={cost.id} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-border/30 group" data-testid={`row-fixed-cost-${cost.id}`}>
              {editingCostId === cost.id ? (
                <>
                  <input
                    autoFocus
                    value={editCostDesc}
                    onChange={e => setEditCostDesc(e.target.value)}
                    className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    value={editCostAmount}
                    type="number"
                    step="0.01"
                    onChange={e => setEditCostAmount(e.target.value)}
                    className="w-32 bg-background border border-border/50 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button size="icon" className="rounded-xl shrink-0" onClick={() => handleUpdateCost(cost.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-xl shrink-0" onClick={() => setEditingCostId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{cost.description}</p>
                    {cost.category && <p className="text-xs text-muted-foreground">{cost.category}</p>}
                  </div>
                  <p className="font-bold text-amber-700 dark:text-amber-400 shrink-0">{fmt(cost.amount, currency)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="rounded-lg w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingCostId(cost.id); setEditCostDesc(cost.description); setEditCostAmount(String(cost.amount / 100)); }}
                      data-testid={`button-edit-cost-${cost.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-lg w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteCost(cost.id)}
                      data-testid={`button-delete-cost-${cost.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {(fixedCosts || []).length > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-border/50 px-1">
              <p className="text-sm font-semibold text-muted-foreground">Total mensal de custos fixos</p>
              <p className="font-bold text-lg text-amber-700 dark:text-amber-400">{fmt(totalFixedCosts, currency)}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
