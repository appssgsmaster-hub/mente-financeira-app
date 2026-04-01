import { useMemo, useState } from "react";
import { useAccounts, useTransactions, useUser, useCommitments, useDebts, useRecalculateBalances } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Brain,
  ArrowRight,
  CreditCard,
  ChevronDown,
  Download,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

function weeklyOccurrencesInMonth(startDateStr: string, monthIndex: number, year: number) {
  const startDate = new Date(startDateStr);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const effectiveStart = startDate > monthStart ? startDate : monthStart;
  if (effectiveStart > monthEnd) return 0;
  const daysInRange = Math.floor((monthEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.ceil(daysInRange / 7);
}

function getMonthlyValue(c: any, monthIndex: number, year: number) {
  if (c.recurrence === "SEMANAL") {
    return c.value * weeklyOccurrencesInMonth(c.startDate, monthIndex, year);
  }
  return c.value;
}

export default function Dashboard() {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTransactions } =
    useTransactions();
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const planTier = (user as any)?.planTier || "free";
  const { toast } = useToast();
  const { mutate: recalculate, isPending: isRecalculating } = useRecalculateBalances();

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

  const [commitmentsOpen, setCommitmentsOpen] = useState(true);
  const [debtsOpen, setDebtsOpen] = useState(true);
  const [receivablesOpen, setReceivablesOpen] = useState(true);

  const { data: commitments = [] } = useCommitments();
  const { data: debtsData = [] } = useDebts();
  const activeDebts = debtsData.filter((d) => !d.paid);
  const totalDebt = activeDebts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();
  const currentPeriod = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  const expenseAlerts = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    const msEnd = new Date(currentYear, currentMonthIndex + 1, 0).getTime();

    return commitments.filter(c => {
      if ((c.commitmentType || "expense") !== "expense") return false;
      const paidPeriods: string[] = c.paidPeriods || [];
      if (paidPeriods.includes(currentPeriod)) return false;

      const d = new Date(c.startDate);
      const t = d.getTime();
      if (c.recurrence === "FIXO" || c.recurrence === "SEMANAL") {
        return t <= msEnd;
      }
      const n = Math.max(1, Number(c.installments ?? 1));
      const diff = (currentYear - d.getFullYear()) * 12 + (currentMonthIndex - d.getMonth());
      return diff >= 0 && diff < n && t <= msEnd;
    }).map(c => ({
      ...c,
      status: ((c as any).dueDate ?? c.startDate) < todayStr ? 'atrasado' : 'soon',
      accountName: accounts?.find((a: any) => a.id === c.accountId)?.name || 'Conta'
    }));
  }, [commitments, accounts, currentPeriod]);

  const incomeAlerts = useMemo(() => {
    const msEnd = new Date(currentYear, currentMonthIndex + 1, 0).getTime();

    return commitments.filter(c => {
      if (c.commitmentType !== "income") return false;
      const paidPeriods: string[] = c.paidPeriods || [];
      if (paidPeriods.includes(currentPeriod)) return false;

      const d = new Date(c.startDate);
      const t = d.getTime();
      if (c.recurrence === "FIXO" || c.recurrence === "SEMANAL") {
        return t <= msEnd;
      }
      const n = Math.max(1, Number(c.installments ?? 1));
      const diff = (currentYear - d.getFullYear()) * 12 + (currentMonthIndex - d.getMonth());
      return diff >= 0 && diff < n && t <= msEnd;
    }).map(c => ({
      ...c,
      accountName: accounts?.find((a: any) => a.id === c.accountId)?.name || 'Conta'
    }));
  }, [commitments, accounts, currentPeriod]);

  const totalIncomeReceivable = incomeAlerts.reduce((sum: number, c: any) => sum + getMonthlyValue(c, currentMonthIndex, currentYear), 0);

  const totalExpenseRemaining = expenseAlerts.reduce((sum: number, c: any) => sum + getMonthlyValue(c, currentMonthIndex, currentYear), 0);

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

  function downloadReport() {
    const curr = user?.currency || "BRL";
    const fmtVal = (v: number) => (v / 100).toFixed(2);
    const lines: string[] = [];
    lines.push("Mente Financeira - Relatório Financeiro");
    lines.push(`Data: ${new Date().toLocaleDateString("pt-BR")}`);
    lines.push(`Usuário: ${user?.name || ""}`);
    lines.push("");
    lines.push("=== CONTAS ===");
    lines.push("Conta,Porcentagem,Saldo");
    (accounts || []).forEach(a => {
      lines.push(`${a.name},${a.percentage}%,${fmtVal(a.balance)}`);
    });
    lines.push(`Total,,${fmtVal(totalBalance)}`);
    lines.push("");
    lines.push("=== TRANSAÇÕES ===");
    lines.push("Data,Descrição,Tipo,Valor,Conta");
    (transactions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(t => {
      const accName = accounts?.find(a => a.id === t.accountId)?.name || "Ecossistema";
      lines.push(`${new Date(t.date).toLocaleDateString("pt-BR")},${t.description},${t.type === "income" ? "Entrada" : "Saída"},${fmtVal(t.amount)},${accName}`);
    });
    lines.push("");
    lines.push("=== COMPROMISSOS ===");
    lines.push("Descrição,Tipo,Valor,Recorrência,Categoria");
    commitments.forEach(c => {
      lines.push(`${c.description},${c.commitmentType === "income" ? "Receita" : "Despesa"},${fmtVal(c.value)},${c.recurrence},${c.category}`);
    });
    lines.push("");
    lines.push("=== DÍVIDAS ===");
    lines.push("Credor,Valor,Prioridade,Status");
    debtsData.forEach(d => {
      lines.push(`${d.creditor},${fmtVal(d.amount)},${d.priority},${d.paid ? "Quitada" : "Ativa"}`);
    });

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mente-financeira-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Painel Financeiro</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculate(undefined, {
              onSuccess: () => toast({ title: "Saldos recalculados", description: "Os saldos das contas foram corrigidos com base nas transações." }),
              onError: () => toast({ title: "Erro", description: "Não foi possível recalcular os saldos.", variant: "destructive" }),
            })}
            disabled={isRecalculating}
            className="gap-2"
            data-testid="button-recalculate"
            title="Recalcular saldos com base nas transações registradas"
          >
            <RefreshCw className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRecalculating ? "Recalculando..." : "Recalcular Saldos"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadReport} className="gap-2" data-testid="button-download-report">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar Relatório</span>
          </Button>
        </div>
      </div>
      {/* 1 — ECOSSISTEMA TOTAL + DONUT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-primary/10 bg-gradient-to-br from-primary/[0.03] via-white to-secondary/[0.04] dark:from-primary/[0.06] dark:via-card dark:to-secondary/[0.06] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary/60" />
          <div className="flex items-start justify-between gap-2 sm:gap-4 mt-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground font-semibold">
                  Ecossistema Total
                </p>
              </div>

              <h2
                className="font-display font-bold text-foreground tracking-tight"
                style={{
                  fontSize: "clamp(24px, 3.2vw, 44px)",
                  lineHeight: 1.05,
                }}
              >
                {formatValue(totalBalance)}
              </h2>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 text-secondary" />
                  </div>
                  <span className="text-muted-foreground">Entradas:</span>
                  <span className="font-bold text-secondary">{formatValue(monthlyIncome)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ArrowDownRight className="w-3 h-3 text-destructive" />
                  </div>
                  <span className="text-muted-foreground">Saídas:</span>
                  <span className="font-bold text-destructive">{formatValue(monthlyExpense)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ECOSYSTEM ALERTS (only expense commitments) */}
          <div className="mt-5">
            <div className="w-full">
              {expenseAlerts.length > 0 ? (
                <div className="w-full bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-3 min-h-[100px]">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Alertas do Ecossistema
                  </div>
                  <div className="space-y-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                    {expenseAlerts.slice(0, 3).map((alert, i) => (
                      <div key={i} className="flex flex-col gap-1 text-xs border-b border-orange-500/10 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold truncate text-foreground">
                            {alert.description}
                            {alert.recurrence === "SEMANAL" ? " (semanal)" : ""}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${alert.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                            {alert.status === 'atrasado' ? 'Atrasado' : 'Vence logo'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground font-medium">
                            {(alert as any).dueDate
                              ? `Vence: ${new Date((alert as any).dueDate).toLocaleDateString("pt-BR")} · ${alert.accountName}`
                              : alert.accountName}
                          </span>
                          <span className="font-bold text-foreground">{formatValue(getMonthlyValue(alert, currentMonthIndex, currentYear))}</span>
                        </div>
                      </div>
                    ))}
                    {expenseAlerts.length > 3 && (
                      <p className="text-[10px] text-center text-muted-foreground italic">+{expenseAlerts.length - 3} outros avisos</p>
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

        {/* RIGHT COLUMN: Donut + Accounts Receivable stacked */}
        <div className="flex flex-col gap-6">
          {/* DONUT (Distribuição Ideal) */}
          <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-black/5 bg-white dark:bg-card flex flex-col justify-center items-center">
            <h3 className="font-display font-semibold text-lg text-center mb-2">
              Distribuição Ideal
            </h3>

            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={82}
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

          {/* ACCOUNTS RECEIVABLE (below donut) */}
          <Card className="rounded-2xl border-border overflow-hidden" data-testid="card-accounts-receivable">
            <button
              className="w-full p-4 flex items-center justify-between text-left"
              onClick={() => setReceivablesOpen(!receivablesOpen)}
              data-testid="button-toggle-receivables"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground" data-testid="text-receivable-title">Accounts Receivable</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {incomeAlerts.length > 0
                      ? `${incomeAlerts.length} ${incomeAlerts.length === 1 ? "recebimento pendente" : "recebimentos pendentes"}`
                      : "Nenhum recebimento pendente"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalIncomeReceivable > 0 && (
                  <span className="font-display font-bold text-base text-secondary" data-testid="text-receivable-total">{formatValue(totalIncomeReceivable)}</span>
                )}
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${receivablesOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {receivablesOpen && (
              <div className="px-4 pb-4 space-y-3" data-testid="content-receivables-expanded">
                {incomeAlerts.length > 0 ? (
                  <div className="space-y-2">
                    {incomeAlerts.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.accountName}
                            {item.recurrence === "SEMANAL" ? " · Semanal" : item.recurrence === "PARCELADO" ? ` · ${item.installments}x` : " · Mensal"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-secondary">{formatValue(getMonthlyValue(item, currentMonthIndex, currentYear))}</p>
                          <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[10px] mt-0.5 bg-secondary/10 text-secondary">A receber</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Nenhum recebimento pendente para este mês.</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs"
                  onClick={() => navigate("/projecoes")}
                  data-testid="button-go-to-receivables"
                >
                  Ver projeções de receita <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* MENTORSHIP CTA CARDS (2 side by side, above accounts) */}
      {(planTier === "free" || planTier === "app") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground mt-0.5">Treinamento completo + app</p>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
            </div>
          </Card>
        </div>
      )}

      {/* SUAS CONTAS (Five Accounts) */}
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

      {/* 6 — COLLAPSIBLE: UPCOMING COMMITMENTS (expense only, remaining unpaid) */}
      <Card className="rounded-2xl border-border overflow-hidden" data-testid="card-commitments-collapsible">
        <button
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left"
          onClick={() => setCommitmentsOpen(!commitmentsOpen)}
          data-testid="button-toggle-commitments"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Upcoming Commitments</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {expenseAlerts.length > 0
                  ? `Total a pagar este mês: ${formatValue(totalExpenseRemaining)}`
                  : "Nenhum compromisso pendente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalExpenseRemaining > 0 && (
              <span className="font-display font-bold text-lg text-destructive" data-testid="text-commitments-total">{formatValue(totalExpenseRemaining)}</span>
            )}
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${commitmentsOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {commitmentsOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3" data-testid="content-commitments-expanded">
            {expenseAlerts.length > 0 ? (
              <div className="space-y-2">
                {expenseAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {alert.description}
                        {alert.recurrence === "SEMANAL" ? " (semanal)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(alert as any).dueDate
                          ? `Vence: ${new Date((alert as any).dueDate).toLocaleDateString("pt-BR")} · ${alert.accountName}`
                          : alert.accountName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-foreground">{formatValue(getMonthlyValue(alert, currentMonthIndex, currentYear))}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] mt-0.5 ${alert.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                        {alert.status === 'atrasado' ? 'Atrasado' : 'Vence logo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhum compromisso pendente para este mês.</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs"
              onClick={() => navigate("/projecoes")}
              data-testid="button-go-to-projections"
            >
              Ver todas as projeções <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </Card>

      {/* 7 — COLLAPSIBLE: DÍVIDAS ABERTAS */}
      <Card className="rounded-2xl border-border overflow-hidden" data-testid="card-open-debts">
        <button
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left"
          onClick={() => setDebtsOpen(!debtsOpen)}
          data-testid="button-toggle-debts"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground" data-testid="text-debts-title">Open Debts</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeDebts.length > 0
                  ? `${activeDebts.length} ${activeDebts.length === 1 ? "dívida ativa" : "dívidas ativas"} · ${formatValue(totalDebt)}`
                  : "Nenhuma dívida registrada"}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${debtsOpen ? "rotate-180" : ""}`} />
        </button>
        {debtsOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3" data-testid="content-debts-expanded">
            {activeDebts.length > 0 ? (
              <div className="space-y-2">
                {activeDebts.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{d.creditor}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.priority === "high" ? "Alta" : d.priority === "low" ? "Baixa" : "Média"} prioridade
                      </p>
                    </div>
                    <p className="font-bold text-sm text-destructive shrink-0">{formatValue(d.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhuma dívida ativa registrada.</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs"
              onClick={() => navigate("/dividas")}
              data-testid="button-go-to-debts"
            >
              Gerenciar dívidas <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
