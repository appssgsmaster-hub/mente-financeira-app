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

  const alerts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return commitments.filter(c => {
      // Simplificação: alerta se a data de início for no passado (atrasado) ou nos próximos 7 dias (vence logo)
      // Nota: No mundo real, verificaríamos se já foi pago, mas aqui usamos o planejamento como guia
      return c.startDate <= nextWeekStr;
    }).map(c => ({
      ...c,
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
                          <p className="font-bold truncate text-foreground">{alert.description}</p>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${alert.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                            {alert.status === 'atrasado' ? 'Atrasado' : 'Vence logo'}
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
