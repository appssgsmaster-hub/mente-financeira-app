import { useAccounts, useTransactions, useUser } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTransactions } = useTransactions();
  const { data: user } = useUser();

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
  
  // Format data for chart
  const chartData = accounts?.filter(acc => acc.percentage > 0).map(acc => ({
    name: acc.name,
    value: acc.percentage,
    color: acc.color || "#4F46E5"
  })) || [];

  const recentTransactions = transactions?.slice(0, 5) || [];

  if (loadingAccounts || loadingTransactions) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Overview */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 glass-card p-8 rounded-3xl border-0 bg-white/60 dark:bg-black/40 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/20 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -ml-10 -mb-10 group-hover:bg-secondary/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Ecossistema Total
                </p>
                <h2 className="text-5xl font-display font-bold text-foreground tracking-tight">
                  {formatCurrency(totalBalance, user?.currency)}
                </h2>
              </div>
              <Button variant="outline" className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/20 shadow-sm">
                <Download className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
            
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-3 bg-secondary/10 px-4 py-2 rounded-xl border border-secondary/20">
                <div className="p-2 bg-secondary/20 rounded-full text-secondary">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Entradas Mês</p>
                  <p className="font-semibold text-foreground">+ {formatCurrency(1250000)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-destructive/10 px-4 py-2 rounded-xl border border-destructive/20">
                <div className="p-2 bg-destructive/20 rounded-full text-destructive">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Saídas Mês</p>
                  <p className="font-semibold text-foreground">- {formatCurrency(430000)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Donut Chart */}
        <Card className="w-full md:w-[350px] p-6 rounded-3xl border-0 shadow-xl shadow-black/5 bg-white dark:bg-card flex flex-col justify-center items-center">
          <h3 className="font-display font-semibold text-lg text-center mb-2">Distribuição Ideal</h3>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [`${value}%`, 'Meta']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-display font-bold text-foreground">100%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-bold text-foreground">Suas Contas</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map((account) => (
            <Card 
              key={account.id} 
              className="p-6 rounded-2xl hover-elevate border-border/50 relative overflow-hidden group"
            >
              {/* Top Accent Line */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300 group-hover:h-2"
                style={{ backgroundColor: account.color || 'var(--primary)' }}
              />
              
              <div className="flex justify-between items-start mb-6 mt-2">
                <div>
                  <h4 className="font-medium text-foreground text-lg mb-1">{account.name}</h4>
                  <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    Meta: {account.percentage}%
                  </div>
                </div>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}20`, color: account.color }}
                >
                  <RefreshCw className="w-5 h-5" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-3xl font-display font-bold text-foreground">
                  {formatCurrency(account.balance, user?.currency)}
                </p>
              </div>

              {/* Progress visual indicator (mocked relative fill) */}
              <div className="mt-6 w-full bg-muted h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min(100, Math.max(5, account.percentage))}%`, 
                    backgroundColor: account.color 
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-display font-bold text-foreground">Últimas Movimentações</h3>
          <Button variant="link" className="text-primary hover:text-primary/80">Ver todas</Button>
        </div>
        
        <Card className="rounded-3xl overflow-hidden border-border/50 shadow-sm">
          <div className="divide-y divide-border/50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${tx.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.date), "dd 'de' MMMM", { locale: ptBR })}
                      {tx.category && <span className="ml-2 px-2 py-0.5 bg-muted rounded-md text-xs">{tx.category}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold font-display ${tx.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, user?.currency)}
                  </p>
                  {tx.accountId && accounts && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {accounts.find(a => a.id === tx.accountId)?.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {recentTransactions.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <p>Nenhuma movimentação recente encontrada.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}
