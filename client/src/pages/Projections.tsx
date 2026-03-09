import { useMemo, useState } from "react";
import { useAccounts, useUser, useCommitments, useCreateCommitment, useUpdateCommitment, useDeleteCommitment } from "@/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import type { Commitment } from "@shared/schema";

type Recurrence = "FIXO" | "SEMANAL" | "PARCELADO";
type CommitmentType = "expense" | "income";

const EXPENSE_CATEGORIES = [
  "Estrutura Física",
  "Pessoas & Serviços",
  "Obrigações Legais",
  "Serviços Essenciais",
  "Ferramentas & Sistemas",
  "Aquisição & Visibilidade",
  "Ativos Operacionais",
  "Compromissos Financeiros",
  "Outros (Consciente)",
];

const INCOME_CATEGORIES = [
  "Salário / Wages",
  "Freelance / Contrato",
  "Vendas / Sales",
  "Investimentos",
  "Aluguéis / Rent",
  "Outros Recebimentos",
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getPeriodKey(monthIndex: number, year?: number) {
  const y = year ?? new Date().getFullYear();
  return `${y}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function isCommitmentPaid(c: any, monthIndex: number, year?: number) {
  const period = getPeriodKey(monthIndex, year);
  return ((c.paidPeriods as string[]) || []).includes(period);
}

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function moneyToCents(input: string) {
  const raw = (input ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decPos = Math.max(lastComma, lastDot);
  let normalized = cleaned;
  if (decPos >= 0) {
    const intPart = cleaned.slice(0, decPos).replace(/[.,]/g, "");
    const decPart = cleaned.slice(decPos + 1).replace(/[.,]/g, "");
    normalized = `${intPart}.${decPart}`;
  } else {
    normalized = cleaned.replace(/[.,]/g, "");
  }
  const num = Number(normalized);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function isActiveInMonth(c: any, monthIndex: number, year: number) {
  const d = new Date(c.startDate);
  const msEnd = new Date(year, monthIndex + 1, 0).getTime();
  const t = d.getTime();

  if (c.recurrence === "FIXO" || c.recurrence === "SEMANAL") {
    return t <= msEnd;
  }
  const n = Math.max(1, Number(c.installments ?? 1));
  const diff = (year - d.getFullYear()) * 12 + (monthIndex - d.getMonth());
  return diff >= 0 && diff < n && t <= msEnd;
}

export default function Projections() {
  const { data: accounts } = useAccounts();
  const { data: user } = useUser();
  const { data: items = [], isLoading: isLoadingCommitments } = useCommitments();
  const { mutate: createCommitment, isPending: isCreating } = useCreateCommitment();
  const { mutate: updateCommitmentMut, isPending: isUpdating } = useUpdateCommitment();
  const { mutate: deleteCommitmentMut } = useDeleteCommitment();

  const now = new Date();
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());
  const [openAccountId, setOpenAccountId] = useState<number | null>(null);
  const [openIncomeSection, setOpenIncomeSection] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [accountId, setAccountId] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [startDate, setStartDate] = useState<string>(ymd(now));
  const [recurrence, setRecurrence] = useState<Recurrence>("FIXO");
  const [installmentsStr, setInstallmentsStr] = useState<string>("1");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [commitmentType, setCommitmentType] = useState<CommitmentType>("expense");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: user?.currency || "BRL",
    }).format(value / 100);
  };

  const commitmentsThisMonth = useMemo(() => {
    const year = now.getFullYear();
    return items.filter((c) => isActiveInMonth(c, monthIndex, year));
  }, [items, monthIndex]);

  const expenseCommitments = commitmentsThisMonth.filter(c => (c.commitmentType || "expense") === "expense");
  const incomeCommitments = commitmentsThisMonth.filter(c => c.commitmentType === "income");

  const currentYear = now.getFullYear();
  const totalExpenseCommitted = expenseCommitments.reduce((sum, c) => sum + getMonthlyValue(c, monthIndex, currentYear), 0);
  const totalExpensePaid = expenseCommitments.filter(c => isCommitmentPaid(c, monthIndex)).reduce((sum, c) => sum + getMonthlyValue(c, monthIndex, currentYear), 0);
  const totalExpenseOpen = totalExpenseCommitted - totalExpensePaid;

  const totalIncomeProjected = incomeCommitments.reduce((sum, c) => sum + getMonthlyValue(c, monthIndex, currentYear), 0);
  const totalIncomeReceived = incomeCommitments.filter(c => isCommitmentPaid(c, monthIndex)).reduce((sum, c) => sum + getMonthlyValue(c, monthIndex, currentYear), 0);
  const totalIncomePending = totalIncomeProjected - totalIncomeReceived;

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const chartData = useMemo(() => {
    let runningBalance = totalBalance;
    
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(now.getMonth() + i);
      const mIdx = d.getMonth();
      const mName = MONTHS[mIdx];
      const year = d.getFullYear();

      let monthExpenses = 0;
      let monthIncome = 0;

      items.forEach(c => {
        if (!isActiveInMonth(c, mIdx, year)) return;
        const val = getMonthlyValue(c, mIdx, year);
        if ((c.commitmentType || "expense") === "expense") {
          monthExpenses += val;
        } else {
          monthIncome += val;
        }
      });

      runningBalance = Math.max(0, runningBalance + monthIncome - monthExpenses);
      
      return { 
        name: mName, 
        valor: runningBalance / 100,
        saidas: monthExpenses / 100,
        entradas: monthIncome / 100
      };
    });
  }, [totalBalance, items, now]);

  function openNew(targetAccountId?: number, type: CommitmentType = "expense") {
    setEditingId(null);
    setCommitmentType(type);
    setAccountId(targetAccountId ?? accounts?.[0]?.id ?? 0);
    setDescription("");
    setValueStr("");
    setStartDate(ymd(now));
    setRecurrence("FIXO");
    setInstallmentsStr("1");
    setCategory(type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setIsModalOpen(true);
  }

  function openEdit(c: Commitment) {
    setEditingId(c.id);
    setCommitmentType((c.commitmentType || "expense") as CommitmentType);
    setAccountId(c.accountId ?? 0);
    setDescription(c.description);
    setValueStr(String((c.value / 100).toFixed(2)).replace(".", ","));
    setStartDate(c.startDate);
    setRecurrence(c.recurrence as Recurrence);
    setInstallmentsStr(String(c.installments ?? 1));
    setCategory(c.category);
    setIsModalOpen(true);
  }

  function remove(id: number) {
    deleteCommitmentMut(id);
  }

  function save() {
    if (!description.trim()) return;
    if (commitmentType === "expense" && !accountId) return;
    const valueCents = moneyToCents(valueStr);
    const basePayload = {
      userId: user?.id ?? 0,
      accountId: commitmentType === "income" ? (accountId || accounts?.[0]?.id || 0) : accountId,
      description: description.trim(),
      value: valueCents,
      startDate,
      recurrence,
      installments: recurrence === "PARCELADO" ? Number(installmentsStr) : null,
      category,
      commitmentType,
    };
    if (editingId) {
      updateCommitmentMut({ id: editingId, data: basePayload }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createCommitment({ ...basePayload, paidPeriods: [] as string[] }, { onSuccess: () => setIsModalOpen(false) });
    }
  }

  const categories = commitmentType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Projeções de Prosperidade</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1 sm:mt-2">Visualize o futuro do seu ecossistema financeiro.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => openNew(undefined, "expense")} className="rounded-2xl gap-2 h-10 sm:h-12 px-4 sm:px-6 bg-primary hover:bg-primary/90 text-sm sm:text-base flex-1 sm:flex-none" data-testid="button-new-expense-commitment">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Compromisso
          </Button>
          <Button onClick={() => openNew(undefined, "income")} variant="outline" className="rounded-2xl gap-2 h-10 sm:h-12 px-4 sm:px-6 border-secondary text-secondary hover:bg-secondary/10 text-sm sm:text-base flex-1 sm:flex-none" data-testid="button-new-income-commitment">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" /> A Receber
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border shadow-sm lg:col-span-2">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Curva de Crescimento Estimada
          </h3>
          <div className="h-[260px] sm:h-[300px] w-full -ml-2 sm:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrency(val * 100).split(',')[0]} width={60} tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  formatter={(val: number, name: string) => {
                    const labels: Record<string, string> = { valor: "Patrimônio", saidas: "Saídas", entradas: "Entradas" };
                    return [formatCurrency(val * 100), labels[name] || name];
                  }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend formatter={(val) => {
                  const labels: Record<string, string> = { valor: "Patrimônio", saidas: "Saídas", entradas: "Entradas" };
                  return labels[val] || val;
                }} />
                <Bar dataKey="entradas" fill="#22c55e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="saidas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                <Bar dataKey="valor" fill="url(#colorVal)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 rounded-3xl bg-destructive/5 border-destructive/20 border text-center">
            <ArrowDownRight className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm font-semibold text-destructive uppercase tracking-widest mb-1">Saídas no Mês</p>
            <h2 className="text-3xl font-display font-bold text-foreground" data-testid="text-total-expense-committed">{formatCurrency(totalExpenseCommitted)}</h2>
            <p className="text-xs text-muted-foreground mt-2">Compromissos de saída em {MONTHS[monthIndex]}.</p>
            {totalExpensePaid > 0 && (
              <div className="mt-3 pt-3 border-t border-destructive/20 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-semibold">Pago</span>
                  <span className="text-green-600 font-bold" data-testid="text-expense-paid">{formatCurrency(totalExpensePaid)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-destructive font-semibold">Em aberto</span>
                  <span className="text-destructive font-bold" data-testid="text-expense-open">{formatCurrency(totalExpenseOpen)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-3xl bg-secondary/10 border-secondary/20 border text-center">
            <ArrowUpRight className="w-8 h-8 text-secondary mx-auto mb-3" />
            <p className="text-sm font-semibold text-secondary uppercase tracking-widest mb-1">Entradas Previstas</p>
            <h2 className="text-3xl font-display font-bold text-foreground" data-testid="text-total-income-projected">{formatCurrency(totalIncomeProjected)}</h2>
            <p className="text-xs text-muted-foreground mt-2">Receitas esperadas em {MONTHS[monthIndex]}.</p>
            {totalIncomeReceived > 0 && (
              <div className="mt-3 pt-3 border-t border-secondary/20 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-semibold">Recebido</span>
                  <span className="text-green-600 font-bold" data-testid="text-income-received">{formatCurrency(totalIncomeReceived)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-600 font-semibold">Pendente</span>
                  <span className="text-amber-600 font-bold" data-testid="text-income-pending">{formatCurrency(totalIncomePending)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {MONTHS.map((m, idx) => (
          <button
            key={m}
            onClick={() => setMonthIndex(idx)}
            className={`px-5 py-2.5 rounded-2xl border text-sm font-bold transition-all ${
              idx === monthIndex ? "bg-primary text-white border-primary shadow-lg" : "bg-background hover:bg-muted border-border text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {incomeCommitments.length > 0 && (
        <Card className="rounded-3xl border border-secondary/30 shadow-sm overflow-hidden" data-testid="card-income-section">
          <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors" onClick={() => setOpenIncomeSection(!openIncomeSection)}>
            <div className="flex items-center gap-4">
              <div className="w-3 h-10 rounded-full bg-secondary" />
              <div>
                <h4 className="font-display font-bold text-lg">Entradas Previstas</h4>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Receitas a receber no mês</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-display font-bold text-xl text-secondary">{formatCurrency(totalIncomeProjected)}</span>
              {openIncomeSection ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </div>
          </div>
          {openIncomeSection && (
            <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Receitas Projetadas</span>
                <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 border-secondary/20 hover:border-secondary/40 text-secondary" onClick={(e) => { e.stopPropagation(); openNew(undefined, "income"); }}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomeCommitments.map((c) => {
                  const paid = isCommitmentPaid(c, monthIndex);
                  const monthlyVal = getMonthlyValue(c, monthIndex, currentYear);
                  return (
                    <div key={c.id} className={`p-4 border rounded-2xl flex justify-between items-center group transition-all ${paid ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-secondary/30 bg-secondary/5 hover:border-secondary/50"}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold truncate ${paid ? "text-green-700 dark:text-green-400 line-through" : "text-foreground"}`}>{c.description}</p>
                          {paid && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full shrink-0" data-testid={`badge-received-${c.id}`}>
                              Recebido
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                          <span className="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md">{c.category}</span>
                          <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded-md">
                            {c.recurrence === "FIXO" ? "Mensal" : c.recurrence === "SEMANAL" ? "Semanal" : `${c.installments}x`}
                          </span>
                          {c.recurrence === "SEMANAL" && (
                            <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                              {weeklyOccurrencesInMonth(c.startDate, monthIndex, currentYear)}x no mês = {formatCurrency(monthlyVal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <div className="text-right">
                          <span className={`font-display font-bold text-lg ${paid ? "text-green-700 dark:text-green-400" : "text-secondary"}`}>{formatCurrency(c.value)}</span>
                          {c.recurrence === "SEMANAL" && <p className="text-[10px] text-muted-foreground">/semana</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="rounded-3xl border border-destructive/30 shadow-sm overflow-hidden" data-testid="card-expense-summary">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-3 h-10 rounded-full bg-destructive" />
            <div>
              <h4 className="font-display font-bold text-lg">Future Commitments</h4>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Restante a pagar no mês</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-display font-bold text-xl text-destructive" data-testid="text-expense-summary-total">{formatCurrency(totalExpenseOpen)}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {accounts?.map((acc) => {
          const isOpen = openAccountId === acc.id;
          const accItems = expenseCommitments.filter((c) => c.accountId === acc.id);
          const accTotal = accItems.reduce((sum, c) => sum + getMonthlyValue(c, monthIndex, currentYear), 0);

          return (
            <Card key={acc.id} className="rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors" onClick={() => setOpenAccountId(isOpen ? null : acc.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: acc.color }} />
                  <div>
                    <h4 className="font-display font-bold text-lg">{acc.name}</h4>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Compromissos Planejados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-xl">{formatCurrency(accTotal)}</span>
                  {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>
              {isOpen && (
                <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lista de Compromissos</span>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 border-primary/20 hover:border-primary/40 text-primary" onClick={(e) => { e.stopPropagation(); openNew(acc.id, "expense"); }}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {accItems.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-muted rounded-2xl">
                      <p className="text-sm text-muted-foreground italic">Nenhum compromisso para este mês.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accItems.map((c) => {
                        const paid = isCommitmentPaid(c, monthIndex);
                        const monthlyVal = getMonthlyValue(c, monthIndex, currentYear);
                        return (
                          <div key={c.id} className={`p-4 border rounded-2xl flex justify-between items-center group transition-all ${paid ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-border/60 bg-muted/5 hover:border-primary/30"}`}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-bold truncate ${paid ? "text-green-700 dark:text-green-400 line-through" : "text-foreground"}`}>{c.description}</p>
                                {paid && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full shrink-0" data-testid={`badge-paid-${c.id}`}>
                                    Pago
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                <span className="bg-muted px-1.5 py-0.5 rounded-md">{c.category}</span>
                                <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded-md">
                                  {c.recurrence === "FIXO" ? "Mensal" : c.recurrence === "SEMANAL" ? "Semanal" : `${c.installments} parcelas`}
                                </span>
                                <span className="bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {new Date(c.startDate).toLocaleDateString("pt-BR")}
                                </span>
                                {c.recurrence === "SEMANAL" && (
                                  <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                                    {weeklyOccurrencesInMonth(c.startDate, monthIndex, currentYear)}x no mês = {formatCurrency(monthlyVal)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <div className="text-right">
                                <span className={`font-display font-bold text-lg ${paid ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>{formatCurrency(c.value)}</span>
                                {c.recurrence === "SEMANAL" && <p className="text-[10px] text-muted-foreground">/semana</p>}
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <Card className="relative z-10 w-full max-w-2xl rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden border-0 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-8 space-y-4 sm:space-y-8">
              <div className="flex justify-between items-center gap-2">
                <h2 className="text-xl sm:text-3xl font-display font-bold text-foreground">
                  {editingId ? "Editar" : "Novo"} {commitmentType === "income" ? "Receita a Receber" : "Compromisso"}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full hover:bg-muted w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              </div>

              {!editingId && (
                <div className="flex p-1 bg-muted rounded-[20px] h-12">
                  <button onClick={() => { setCommitmentType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }} className={`flex-1 rounded-[16px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${commitmentType === "expense" ? "bg-white dark:bg-background shadow-sm text-destructive" : "text-muted-foreground hover:text-foreground"}`} data-testid="tab-expense">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Saída
                  </button>
                  <button onClick={() => { setCommitmentType("income"); setCategory(INCOME_CATEGORIES[0]); }} className={`flex-1 rounded-[16px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${commitmentType === "income" ? "bg-white dark:bg-background shadow-sm text-secondary" : "text-muted-foreground hover:text-foreground"}`} data-testid="tab-income">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Descrição</label>
                  <input className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder={commitmentType === "income" ? "Ex: Salary Week" : "Ex: Rent Office"} value={description} onChange={e => setDescription(e.target.value)} data-testid="input-commitment-description" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Valor</label>
                  <input className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder="Ex: 250" value={valueStr} onChange={e => setValueStr(e.target.value)} data-testid="input-commitment-value" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Data de Início</label>
                  <div className="relative">
                    <input type="date" className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium appearance-none" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-commitment-date" />
                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Categoria</label>
                  <select className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)} data-testid="select-commitment-category">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Recorrência</label>
                  <div className="flex p-1 bg-muted rounded-[20px] h-14">
                    <button onClick={() => setRecurrence("FIXO")} className={`flex-1 rounded-[16px] text-xs font-bold transition-all ${recurrence === "FIXO" ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} data-testid="btn-recurrence-fixo">MENSAL</button>
                    <button onClick={() => setRecurrence("SEMANAL")} className={`flex-1 rounded-[16px] text-xs font-bold transition-all ${recurrence === "SEMANAL" ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} data-testid="btn-recurrence-semanal">SEMANAL</button>
                    <button onClick={() => setRecurrence("PARCELADO")} className={`flex-1 rounded-[16px] text-xs font-bold transition-all ${recurrence === "PARCELADO" ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} data-testid="btn-recurrence-parcelado">PARCELADO</button>
                  </div>
                </div>

                {commitmentType === "expense" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Conta de Débito</label>
                    <select className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium appearance-none cursor-pointer" value={String(accountId)} onChange={e => setAccountId(Number(e.target.value))} data-testid="select-commitment-account">
                      {accounts?.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {commitmentType === "income" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Destino</label>
                    <div className="w-full h-14 px-5 rounded-2xl border border-secondary/30 bg-secondary/5 flex items-center gap-2 font-medium text-secondary" data-testid="income-destination-info">
                      <ArrowDownRight className="w-4 h-4" />
                      Ecossistema Total → distribuído automaticamente
                    </div>
                  </div>
                )}

                {recurrence === "PARCELADO" && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Número de Parcelas</label>
                    <input type="number" min="1" className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder="Ex: 12" value={installmentsStr} onChange={e => setInstallmentsStr(e.target.value)} data-testid="input-commitment-installments" />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2 sm:pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 sm:h-14 rounded-2xl font-bold border-border hover:bg-muted text-muted-foreground text-sm sm:text-base">Cancelar</Button>
                <Button onClick={save} className={`flex-1 h-11 sm:h-14 rounded-2xl font-bold text-white shadow-lg text-sm sm:text-base ${commitmentType === "income" ? "bg-secondary hover:bg-secondary/90 shadow-secondary/25" : "bg-primary hover:bg-primary/90 shadow-primary/25"}`} data-testid="button-save-commitment">
                  {editingId ? "Salvar Alterações" : commitmentType === "income" ? "Registrar Receita" : "Salvar Plano"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
