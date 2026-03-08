import { useEffect, useMemo, useState } from "react";
import { useAccounts, useTransactions, useUser } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  PlusCircle, 
  Download,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Brain,
  ArrowRight,
  CreditCard,
  Calculator,
  X,
  Trash2,
  GraduationCap,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

export default function Dashboard() {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTransactions } =
    useTransactions();
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const planTier = (user as any)?.planTier || "free";

  const totalBalance =
    accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const chartData =
    accounts
      ?.filter((acc) => acc.percentage > 0)
      .map((acc) => ({
        name: acc.name,
        value: acc.percentage,
        color: acc.color || "#4F46E5",
      })) || [];

  const totalIncome =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  const totalExpense =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0) || 0;

  const [commitments, setCommitments] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      const lsKey = `sgs_commitments_v1_user_${user.id}`;
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCommitments(parsed);
      } else {
        setCommitments([]);
      }
    } catch {}
  }, [user?.id]);

  interface Debt {
    id: string;
    creditor: string;
    amount: number;
    dueDate: string;
  }

  const debtsLsKey = user?.id ? `sgs_debts_v1_user_${user.id}` : "";
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtCreditor, setDebtCreditor] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simDebt, setSimDebt] = useState("");
  const [simPayment, setSimPayment] = useState("");

  useEffect(() => {
    if (!debtsLsKey) return;
    try {
      const raw = localStorage.getItem(debtsLsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setDebts(parsed);
      }
    } catch {}
  }, [debtsLsKey]);

  function saveDebts(updated: Debt[]) {
    setDebts(updated);
    if (debtsLsKey) localStorage.setItem(debtsLsKey, JSON.stringify(updated));
  }

  function addDebt() {
    const val = parseFloat(debtAmount.replace(/\./g, "").replace(",", "."));
    if (!debtCreditor || !val || val <= 0) return;
    const newDebt: Debt = {
      id: crypto.randomUUID(),
      creditor: debtCreditor,
      amount: Math.round(val * 100),
      dueDate: debtDueDate,
    };
    saveDebts([...debts, newDebt]);
    setDebtCreditor("");
    setDebtAmount("");
    setDebtDueDate(new Date().toISOString().split("T")[0]);
    setShowDebtForm(false);
  }

  function removeDebt(id: string) {
    saveDebts(debts.filter((d) => d.id !== id));
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

  function calcSimMonths() {
    const debt = parseFloat(simDebt.replace(/\./g, "").replace(",", "."));
    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
    if (!debt || !payment || payment <= 0) return null;
    return Math.ceil(debt / payment);
  }

  const alerts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthIndex = now.getMonth();
    const year = now.getFullYear();
    const msEnd = new Date(year, monthIndex + 1, 0).getTime();

    return commitments.filter(c => {
      const paidPeriods: string[] = c.paidPeriods || [];
      if (paidPeriods.includes(currentPeriod)) return false;

      const d = new Date(c.startDate);
      const t = d.getTime();
      let active = false;
      if (c.recurrence === "FIXO" || c.recurrence === "SEMANAL") {
        active = t <= msEnd;
      } else {
        const n = Math.max(1, Number(c.installments ?? 1));
        const diff = (year - d.getFullYear()) * 12 + (monthIndex - d.getMonth());
        active = diff >= 0 && diff < n && t <= msEnd;
      }
      return active;
    }).map(c => ({
      ...c,
      isIncome: c.commitmentType === 'income',
      status: c.startDate < todayStr ? 'atrasado' : 'soon',
      accountName: accounts?.find(a => a.id === c.accountId)?.name || 'Conta'
    }));
  }, [commitments, accounts]);

  // Filtrar apenas transações do mês atual para as mensagens dinâmicas
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  
  const monthlyIncome = transactions
    ?.filter((t) => t.type === "income" && new Date(t.date).getTime() >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const monthlyExpense = transactions
    ?.filter((t) => t.type === "expense" && new Date(t.date).getTime() >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: user?.currency || "BRL",
    }).format(value / 100);
  };

  if (loadingAccounts || loadingTransactions) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ECOSSISTEMA TOTAL */}
        <Card className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border-0 bg-white dark:bg-card overflow-hidden relative">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground mb-1 sm:mb-2">
                Ecossistema Total
              </p>

              <h2
                className="font-display font-bold text-foreground tracking-tight"
                style={{
                  fontSize: "clamp(22px, 3.2vw, 44px)",
                  lineHeight: 1.05,
                }}
              >
                {formatValue(totalBalance)}
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-sm border-white/20 shadow-sm text-xs sm:text-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>

          <div className="mt-6">
            {/* Card de Alertas/Compromissos */}
            <div className="w-full">
              {alerts.length > 0 ? (
                <div className="w-full bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-3 min-h-[100px]">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Alertas do Ecossistema
                  </div>
                  <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                    {alerts.slice(0, 3).map((alert, i) => (
                      <div key={i} className="flex flex-col gap-1 text-xs border-b border-orange-500/10 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold truncate text-foreground">
                            {alert.isIncome ? "📥 " : ""}{alert.description}
                            {alert.recurrence === "SEMANAL" ? " (semanal)" : ""}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${alert.isIncome ? 'bg-secondary/10 text-secondary' : alert.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                            {alert.isIncome ? 'A receber' : alert.status === 'atrasado' ? 'Atrasado' : 'Vence logo'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground font-medium">{alert.accountName}</span>
                          <span className="font-bold text-foreground">{formatValue(alert.value)}</span>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 3 && (
                      <p className="text-[10px] text-center text-muted-foreground italic">+{alerts.length - 3} outros avisos</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center gap-3 bg-muted/30 px-4 py-4 rounded-2xl border border-border/50 min-h-[80px]">
                  <div className="p-2 bg-muted rounded-full text-muted-foreground">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Nenhum compromisso urgente planejado. Seu ecossistema está em dia!
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* DONUT */}
        <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-black/5 bg-white dark:bg-card flex flex-col justify-center items-center">
          <h3 className="font-display font-semibold text-lg text-center mb-2">
            Distribuição Ideal
          </h3>

          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={92}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, _name, props: any) => [
                    `${value}%`,
                    props?.payload?.name || "Conta",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-display font-bold text-foreground">
                100%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {planTier === "free" || planTier === "app" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {planTier === "free" && (
            <Card
              className="p-4 sm:p-5 rounded-2xl border-secondary/30 bg-gradient-to-r from-secondary/5 to-secondary/10 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate("/planos")}
              data-testid="card-upgrade-method"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground">Método Mente Financeira</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Treinamento completo + app por €197</p>
                </div>
                <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
              </div>
            </Card>
          )}
          <Card
            className="p-4 sm:p-5 rounded-2xl border-amber-400/30 bg-gradient-to-r from-amber-50/50 to-amber-100/30 dark:from-amber-950/10 dark:to-amber-900/5 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/planos")}
            data-testid="card-upgrade-mentoria"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground">Mentoria Transformação</h4>
                <p className="text-xs text-muted-foreground mt-0.5">3 meses de mentoria + tudo incluso por €697</p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
          </Card>
        </div>
      ) : null}

      {/* DÍVIDAS ABERTAS */}
      <Card className="p-6 rounded-3xl border-border shadow-sm" data-testid="card-open-debts">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground" data-testid="text-debts-title">Dívidas Abertas</h3>
              <p className="text-xs text-muted-foreground">Entenda suas dívidas e crie uma estratégia para retomar o controle financeiro.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs shrink-0"
            onClick={() => setShowDebtForm(!showDebtForm)}
            data-testid="button-add-debt"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        {showDebtForm && (
          <div className="bg-muted/30 border border-border rounded-2xl p-4 mb-4 space-y-3" data-testid="form-add-debt">
            <input
              placeholder="Credor (ex: Banco, Loja...)"
              className="w-full p-3 rounded-xl border border-input bg-background text-sm"
              value={debtCreditor}
              onChange={(e) => setDebtCreditor(e.target.value)}
              data-testid="input-debt-creditor"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Valor (ex: 1.500,00)"
                className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                data-testid="input-debt-amount"
              />
              <input
                type="date"
                className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                value={debtDueDate}
                onChange={(e) => setDebtDueDate(e.target.value)}
                data-testid="input-debt-due-date"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl text-xs" onClick={addDebt} data-testid="button-save-debt">Salvar</Button>
              <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setShowDebtForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-destructive/5 border border-destructive/15 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dívida Total</p>
            <p className="text-xl font-display font-bold text-destructive" data-testid="text-total-debt">{formatValue(totalDebt)}</p>
          </div>
          <div className="bg-muted/30 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dívidas Ativas</p>
            <p className="text-xl font-display font-bold text-foreground" data-testid="text-active-debts">{debts.length}</p>
          </div>
        </div>

        {debts.length > 0 ? (
          <div className="space-y-2 mb-4">
            {debts.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-muted/20 border border-border/50 rounded-xl px-4 py-3" data-testid={`row-debt-${d.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate" data-testid={`text-debt-creditor-${d.id}`}>{d.creditor}</p>
                  <p className="text-[10px] text-muted-foreground">Vencimento: {new Date(d.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="font-display font-bold text-sm text-destructive" data-testid={`text-debt-amount-${d.id}`}>{formatValue(d.amount)}</span>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" onClick={() => removeDebt(d.id)} data-testid={`button-remove-debt-${d.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {debts.length > 3 && (
              <p className="text-[10px] text-center text-muted-foreground italic">+{debts.length - 3} outras dívidas</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-muted/20 border border-border/50 rounded-xl px-4 py-4 mb-4" data-testid="text-no-debts">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Você não tem dívidas registradas.</p>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full rounded-2xl border-primary/30 text-primary font-bold text-sm"
          onClick={() => { setSimDebt(""); setSimPayment(""); setShowSimModal(true); }}
          data-testid="button-simulate-debt"
        >
          <Calculator className="w-4 h-4 mr-2" /> Simular Estratégia de Dívidas
        </Button>
      </Card>

      {/* CTA Aprendizado */}
      <Card className="p-6 rounded-3xl border-secondary/20 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" data-testid="card-debt-learning">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-foreground mb-1">Aprenda a gerenciar dívidas sem perder sua liberdade financeira.</h4>
            <p className="text-sm text-muted-foreground">Dívida não deve definir sua vida. Aprenda estratégias para reorganizar suas finanças, retomar o controle do seu fluxo de caixa e focar em realizar seus sonhos.</p>
          </div>
          <Button
            className="rounded-2xl bg-secondary text-white font-bold text-sm shrink-0"
            onClick={() => navigate("/mentorship/debt-strategy")}
            data-testid="button-learn-debt-strategy"
          >
            Saiba Mais <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>

      {/* SIMULATION MODAL */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSimModal(false)}>
          <Card className="w-full max-w-md p-6 rounded-3xl shadow-2xl relative" onClick={(e) => e.stopPropagation()} data-testid="modal-debt-simulation">
            <button onClick={() => setShowSimModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" data-testid="button-close-simulation">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg">Simulação de Dívidas</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor total da dívida</label>
                <input
                  placeholder="Ex: 5.000,00"
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                  value={simDebt}
                  onChange={(e) => setSimDebt(e.target.value)}
                  data-testid="input-sim-debt"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Capacidade de pagamento mensal</label>
                <input
                  placeholder="Ex: 500,00"
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                  value={simPayment}
                  onChange={(e) => setSimPayment(e.target.value)}
                  data-testid="input-sim-payment"
                />
              </div>
              {(() => {
                const months = calcSimMonths();
                if (months === null) return null;
                const years = Math.floor(months / 12);
                const remainingMonths = months % 12;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center space-y-1" data-testid="text-sim-result">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prazo estimado para quitar</p>
                    <p className="text-3xl font-display font-bold text-primary">
                      {months} {months === 1 ? "mês" : "meses"}
                    </p>
                    {years >= 1 && (
                      <p className="text-xs text-muted-foreground">
                        ({years} {years === 1 ? "ano" : "anos"}{remainingMonths > 0 ? ` e ${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}` : ""})
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* SUAS CONTAS */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-bold text-foreground">
            Suas Contas
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map((account) => (
            <Card
              key={account.id}
              className="p-6 rounded-2xl border-border/50 relative overflow-hidden group"
            >
              <div
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300"
                style={{ backgroundColor: account.color || "var(--primary)" }}
              />

              <div className="flex items-start justify-between mb-4 sm:mb-6 mt-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground text-sm sm:text-lg mb-1 truncate">
                    {account.name}
                  </h4>
                  <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    Meta: {account.percentage}%
                  </div>
                </div>

                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ml-2"
                  style={{
                    backgroundColor: `${account.color || "#4F46E5"}20`,
                    color: account.color || "#4F46E5",
                  }}
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Saldo Atual
                </p>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">
                  {formatValue(account.balance)}
                </p>
              </div>

              <div className="mt-6 w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(5, account.percentage))}%`,
                    backgroundColor: account.color || "#4F46E5",
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
