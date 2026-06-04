import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useUser,
  useAccounts,
  useCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  usePayCommitmentPeriod,
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
} from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import {
  CheckCircle2,
  X,
  Target,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  History,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Commitment } from "@shared/schema";

function getPeriodKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function getPlanStatus(paidCount: number, total: number) {
  if (total === 0 || paidCount === 0) return "Em aberto";
  if (paidCount >= total) return "Quitado";
  return "Em andamento";
}

function statusStyle(status: string) {
  if (status === "Quitado") return "bg-secondary/10 text-secondary";
  if (status === "Em andamento") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function toCents(str: string) {
  return Math.round(parseFloat(str.replace(/\./g, "").replace(",", ".")) * 100);
}

function fromCents(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function DebtStrategy() {
  const { data: user } = useUser();
  const { data: accounts } = useAccounts();
  const { data: allCommitments = [] } = useCommitments();
  const { data: debts = [] } = useDebts();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { mutate: createCommitment } = useCreateCommitment();
  const { mutate: updateCommitment } = useUpdateCommitment();
  const { mutate: deleteCommitment } = useDeleteCommitment();
  const { mutate: payPeriod, isPending: isPayingPeriod } = usePayCommitmentPeriod();
  const { mutate: createDebt } = useCreateDebt();
  const { mutate: updateDebtMut } = useUpdateDebt();
  const { mutate: deleteDebtMut } = useDeleteDebt();

  const fv = (v: number) => formatCurrency(v, user?.currency);

  const now = new Date();
  const currentPeriod = getPeriodKey(now.getFullYear(), now.getMonth());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<number | null>(null);
  const [showRegistros, setShowRegistros] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  // Plan form
  const [desc, setDesc] = useState("");
  const [totalVal, setTotalVal] = useState("");
  const [instCount, setInstCount] = useState("");
  const [instVal, setInstVal] = useState("");
  const [accId, setAccId] = useState<number | "">("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Debt form
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [debtCreditor, setDebtCreditor] = useState("");
  const [debtAmt, setDebtAmt] = useState("");
  const [debtPriority, setDebtPriority] = useState<"high" | "medium" | "low">("medium");

  // ── Derived data ──────────────────────────────────────────────────────────
  const defaultAccId = useMemo(() => {
    if (!accounts?.length) return "";
    return accounts.find(a => a.name.toLowerCase().includes("compromisso"))?.id ?? accounts[0].id;
  }, [accounts]);

  const plans = useMemo(() => {
    return (allCommitments as Commitment[])
      .filter(c => c.recurrence === "PARCELADO" && (c.commitmentType === "expense" || !c.commitmentType))
      .map(c => {
        const n = Math.max(1, Number(c.installments ?? 1));
        const paid = (c.paidPeriods as string[] ?? []).length;
        const totalAmt = n * c.value;
        const paidAmt = paid * c.value;
        const remaining = totalAmt - paidAmt;
        const progress = Math.round((paid / n) * 100);
        const status = getPlanStatus(paid, n);
        const accountName = accounts?.find(a => a.id === c.accountId)?.name ?? "";
        const isPaidThisMonth = (c.paidPeriods as string[] ?? []).includes(currentPeriod);
        const sortedPeriods = [...(c.paidPeriods as string[] ?? [])].sort();
        return { ...c, n, paid, totalAmt, paidAmt, remaining, progress, status, accountName, isPaidThisMonth, sortedPeriods };
      });
  }, [allCommitments, accounts, currentPeriod]);

  const active = plans.filter(p => p.status !== "Quitado");
  const completed = plans.filter(p => p.status === "Quitado");

  const summaryTotal = active.reduce((s, p) => s + p.totalAmt, 0);
  const summaryPaid = active.reduce((s, p) => s + p.paidAmt, 0);
  const summaryRemaining = active.reduce((s, p) => s + p.remaining, 0);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function recompInstVal(total: string, count: string) {
    const t = parseFloat(total.replace(/\./g, "").replace(",", "."));
    const c = parseInt(count);
    return (t > 0 && c > 0) ? ((t / c).toFixed(2).replace(".", ",")) : "";
  }

  function openNew() {
    setEditingId(null);
    setDesc(""); setTotalVal(""); setInstCount(""); setInstVal("");
    setAccId(defaultAccId);
    setStartDate(new Date().toISOString().split("T")[0]);
    setShowModal(true);
  }

  function openEdit(c: typeof plans[0]) {
    setEditingId(c.id);
    setDesc(c.description);
    setInstCount(String(c.n));
    setInstVal(fromCents(c.value));
    setTotalVal(fromCents(c.n * c.value));
    setAccId(c.accountId ?? "");
    setStartDate(c.startDate);
    setShowModal(true);
  }

  function handleSave() {
    if (!desc.trim()) return toast({ title: "Erro", description: "Informe a descrição.", variant: "destructive" });
    const count = parseInt(instCount);
    if (!count || count < 1) return toast({ title: "Erro", description: "Informe o nº de parcelas.", variant: "destructive" });
    const iv = parseFloat(instVal.replace(/\./g, "").replace(",", "."));
    if (!iv || iv <= 0) return toast({ title: "Erro", description: "Informe o valor da parcela.", variant: "destructive" });
    const ivCents = Math.round(iv * 100);
    const accountId = accId ? Number(accId) : (accounts?.[0]?.id ?? null);
    if (editingId) {
      updateCommitment({ id: editingId, data: { description: desc.trim(), value: ivCents, installments: count, accountId, startDate } }, {
        onSuccess: () => { toast({ title: "Plano atualizado!" }); setShowModal(false); },
      });
    } else {
      createCommitment({
        userId: user?.id ?? 0,
        accountId,
        description: desc.trim(),
        value: ivCents,
        startDate,
        dueDate: null,
        recurrence: "PARCELADO",
        installments: count,
        category: "Compromissos Financeiros",
        commitmentType: "expense",
        paidPeriods: [],
      }, {
        onSuccess: () => {
          toast({ title: "Plano criado!", description: `${fv(ivCents)}/mês · ${count} parcelas · Total: ${fv(ivCents * count)}` });
          setShowModal(false);
        },
      });
    }
  }

  function handleDelete(id: number) {
    deleteCommitment(id, { onSuccess: () => toast({ title: "Plano removido" }) });
  }

  function handlePayPeriod(id: number) {
    setPayingId(id);
    payPeriod({ id, period: currentPeriod }, {
      onSuccess: () => {
        toast({ title: "Pagamento registado!", description: `Parcela de ${formatPeriod(currentPeriod)} registada com sucesso.` });
        setPayingId(null);
      },
      onError: (err: unknown) => {
        toast({ title: "Erro", description: (err as Error).message ?? "Não foi possível registar.", variant: "destructive" });
        setPayingId(null);
      },
    });
  }

  function saveDebt() {
    if (!debtCreditor.trim() || !debtAmt) return toast({ title: "Erro", description: "Preencha credor e valor.", variant: "destructive" });
    const v = toCents(debtAmt);
    if (!v || v <= 0) return toast({ title: "Erro", description: "Valor inválido.", variant: "destructive" });
    if (editingDebtId) {
      updateDebtMut({ id: editingDebtId, data: { creditor: debtCreditor, amount: v, priority: debtPriority } }, { onSuccess: () => toast({ title: "Registo atualizado" }) });
    } else {
      createDebt({ userId: user?.id ?? 0, creditor: debtCreditor, amount: v, registeredDate: new Date().toISOString().split("T")[0], priority: debtPriority, paid: false }, { onSuccess: () => toast({ title: "Registo criado" }) });
    }
    setDebtCreditor(""); setDebtAmt(""); setDebtPriority("medium"); setEditingDebtId(null); setShowDebtForm(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-plan-title">Plano de Quitação</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe compromissos de aquisição e a evolução dos pagamentos.</p>
        </div>
        <Button className="rounded-2xl font-bold shrink-0" onClick={openNew} data-testid="button-new-plan">
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {/* Summary */}
      {active.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 rounded-2xl border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Comprometido</p>
            <p className="text-lg sm:text-xl font-display font-bold text-foreground" data-testid="text-summary-total">{fv(summaryTotal)}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-secondary/20 bg-secondary/5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Pago</p>
            <p className="text-lg sm:text-xl font-display font-bold text-secondary" data-testid="text-summary-paid">{fv(summaryPaid)}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Saldo Restante</p>
            <p className="text-lg sm:text-xl font-display font-bold text-primary" data-testid="text-summary-remaining">{fv(summaryRemaining)}</p>
          </Card>
        </div>
      )}

      {/* Active plans */}
      {active.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Planos Ativos</h2>
          {active.map(plan => (
            <Card key={plan.id} className="rounded-3xl border border-border shadow-sm overflow-hidden" data-testid={`card-plan-${plan.id}`}>
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-lg text-foreground" data-testid={`text-plan-description-${plan.id}`}>{plan.description}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle(plan.status)}`} data-testid={`badge-status-${plan.id}`}>
                        {plan.status}
                      </span>
                    </div>
                    {plan.accountName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.accountName} · Desde {new Date(plan.startDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary" onClick={() => openEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => handleDelete(plan.id)} data-testid={`button-delete-plan-${plan.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{plan.paid}/{plan.n} parcelas · {plan.progress}% quitado</span>
                    <span className="text-xs font-medium text-muted-foreground">{plan.n - plan.paid} pendentes</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-secondary/70 rounded-full transition-all duration-700"
                      style={{ width: `${plan.progress}%` }}
                      data-testid={`progress-plan-${plan.id}`}
                    />
                  </div>
                </div>

                {/* Value grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                  <div className="bg-muted/40 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                    <p className="font-display font-bold text-sm text-foreground" data-testid={`text-plan-total-${plan.id}`}>{fv(plan.totalAmt)}</p>
                  </div>
                  <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pago</p>
                    <p className="font-display font-bold text-sm text-secondary" data-testid={`text-plan-paid-${plan.id}`}>{fv(plan.paidAmt)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Restante</p>
                    <p className="font-display font-bold text-sm text-primary" data-testid={`text-plan-remaining-${plan.id}`}>{fv(plan.remaining)}</p>
                  </div>
                </div>

                {/* Pay row */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Parcela mensal: <span className="font-bold text-foreground">{fv(plan.value)}</span>
                  </p>
                  {!plan.isPaidThisMonth ? (
                    <Button
                      size="sm"
                      className="rounded-xl font-bold bg-secondary text-white hover:bg-secondary/90 gap-1.5"
                      onClick={() => handlePayPeriod(plan.id)}
                      disabled={payingId === plan.id || isPayingPeriod}
                      data-testid={`button-pay-period-${plan.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {payingId === plan.id ? "A registar..." : `Pagar ${formatPeriod(currentPeriod)}`}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary/10 px-3 py-1.5 rounded-xl" data-testid={`badge-paid-this-month-${plan.id}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pago este mês
                    </span>
                  )}
                </div>

                {/* Payment history */}
                {plan.sortedPeriods.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <button
                      className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setOpenHistoryId(openHistoryId === plan.id ? null : plan.id)}
                      data-testid={`button-toggle-history-${plan.id}`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Histórico de pagamentos ({plan.sortedPeriods.length})
                      {openHistoryId === plan.id ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
                    </button>
                    {openHistoryId === plan.id && (
                      <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {plan.sortedPeriods.map(p => (
                          <div key={p} className="flex items-center justify-between px-3 py-2 bg-secondary/5 border border-secondary/15 rounded-xl" data-testid={`row-history-${plan.id}-${p}`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                              <span className="text-xs font-medium capitalize">{formatPeriod(p)}</span>
                            </div>
                            <span className="text-xs font-bold text-secondary shrink-0">{fv(plan.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 rounded-3xl border-2 border-dashed border-muted text-center" data-testid="text-no-plans">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground mb-1">Nenhum plano de quitação ativo</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crie um plano para registar compromissos parcelados como aquisições, compras maiores ou financiamentos.
          </p>
          <Button className="rounded-2xl font-bold" onClick={openNew} data-testid="button-create-first-plan">
            <PlusCircle className="w-4 h-4 mr-2" /> Criar Primeiro Plano
          </Button>
        </Card>
      )}

      {/* Completed plans */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Planos Quitados ({completed.length})
          </h2>
          {completed.map(plan => (
            <Card key={plan.id} className="p-4 rounded-2xl border-secondary/20 bg-secondary/5 opacity-75" data-testid={`card-plan-done-${plan.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{plan.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fv(plan.totalAmt)} · {plan.n} parcelas ·{" "}
                    <span className="font-bold text-secondary">Quitado</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground" onClick={() => handleDelete(plan.id)} data-testid={`button-delete-done-${plan.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* How it works info card */}
      {plans.length === 0 && (
        <Card className="p-5 rounded-3xl border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-display font-bold text-foreground mb-1">Como funciona o Plano de Quitação</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Registe o valor total e o número de parcelas</li>
                <li>A parcela mensal aparece automaticamente em Projeções</li>
                <li>Clique em "Pagar" para registar cada parcela paga</li>
                <li>O saldo restante é atualizado automaticamente</li>
                <li>Acompanhe o progresso até à quitação total</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Old debts (registros avulsos) — collapsed section */}
      <div className="border-t border-border/40 pt-4">
        <button
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          onClick={() => setShowRegistros(!showRegistros)}
          data-testid="button-toggle-registros"
        >
          {showRegistros ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          Registros Avulsos de Compromisso
          {debts.length > 0 && (
            <span className="ml-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">{debts.length}</span>
          )}
        </button>

        {showRegistros && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Valores totais sem parcelamento detalhado.</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => { setEditingDebtId(null); setDebtCreditor(""); setDebtAmt(""); setDebtPriority("medium"); setShowDebtForm(true); }}
                data-testid="button-add-registro"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            {showDebtForm && (
              <Card className="p-4 rounded-2xl border-border space-y-3" data-testid="form-add-debt">
                <input
                  placeholder="Credor / Descrição"
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                  value={debtCreditor}
                  onChange={e => setDebtCreditor(e.target.value)}
                  data-testid="input-debt-creditor"
                />
                <input
                  placeholder="Valor total (ex: 5.000,00)"
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm"
                  value={debtAmt}
                  onChange={e => setDebtAmt(e.target.value)}
                  data-testid="input-debt-amount"
                />
                <div className="flex p-1 bg-muted rounded-xl">
                  {(["high", "medium", "low"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setDebtPriority(p)}
                      className={`flex-1 rounded-lg text-xs font-bold py-2 transition-all ${debtPriority === p ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                      data-testid={`btn-priority-${p}`}
                    >
                      {{ high: "Alta", medium: "Média", low: "Baixa" }[p]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl" onClick={saveDebt} data-testid="button-save-debt">{editingDebtId ? "Atualizar" : "Salvar"}</Button>
                  <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowDebtForm(false)}>Cancelar</Button>
                </div>
              </Card>
            )}

            {debts.length === 0 && !showDebtForm && (
              <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum registo avulso.</p>
            )}

            {debts.map(d => (
              <Card key={d.id} className={`p-4 rounded-2xl border-border ${d.paid ? "opacity-60" : ""}`} data-testid={`card-registro-${d.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${d.paid ? "line-through text-muted-foreground" : "text-foreground"}`}>{d.creditor}</p>
                    <p className={`text-sm font-bold mt-0.5 ${d.paid ? "text-secondary" : "text-foreground"}`}>{fv(d.amount)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!d.paid ? (
                      <Button
                        variant="outline" size="sm" className="rounded-lg text-xs text-secondary border-secondary/30"
                        onClick={() => updateDebtMut({ id: d.id, data: { paid: true } }, { onSuccess: () => toast({ title: "Quitado!" }) })}
                        data-testid={`button-pay-debt-${d.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Quitar
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => updateDebtMut({ id: d.id, data: { paid: false } })} data-testid={`button-reopen-debt-${d.id}`}>
                        Reabrir
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground"
                      onClick={() => deleteDebtMut(d.id, { onSuccess: () => toast({ title: "Removido" }) })}
                      data-testid={`button-delete-debt-${d.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {debts.length > 0 && (
              <Button
                variant="outline"
                className="w-full rounded-2xl text-xs border-primary/20 text-primary font-bold"
                onClick={() => navigate("/planos")}
              >
                Criar Plano de Quitação para organizar com parcelas
              </Button>
            )}
          </div>
        )}
      </div>

      {/* New / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-lg p-6 rounded-3xl shadow-2xl relative max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="modal-plan">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-8 h-8" onClick={() => setShowModal(false)} data-testid="button-close-plan-modal">
              <X className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">{editingId ? "Editar Plano" : "Novo Plano de Quitação"}</h3>
                <p className="text-xs text-muted-foreground">Compromisso parcelado vinculado a uma conta</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Descrição do Compromisso</label>
                <input
                  placeholder="Ex: Brazza by Virginia, Equipamento, Carro..."
                  className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  data-testid="input-plan-description"
                />
              </div>

              {/* Count + Installment value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Nº de Parcelas</label>
                  <input
                    placeholder="Ex: 10"
                    type="number"
                    min="1"
                    className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    value={instCount}
                    onChange={e => {
                      setInstCount(e.target.value);
                      setInstVal(recompInstVal(totalVal, e.target.value));
                    }}
                    data-testid="input-plan-installments"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Valor da Parcela</label>
                  <input
                    placeholder="Ex: 1.000,00"
                    className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    value={instVal}
                    onChange={e => {
                      setInstVal(e.target.value);
                      const iv = parseFloat(e.target.value.replace(/\./g, "").replace(",", "."));
                      const cnt = parseInt(instCount);
                      if (iv > 0 && cnt > 0) setTotalVal((iv * cnt).toFixed(2).replace(".", ","));
                    }}
                    data-testid="input-plan-installment-value"
                  />
                </div>
              </div>

              {/* Total value */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Valor Total do Compromisso</label>
                <input
                  placeholder="Ex: 10.000,00"
                  className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  value={totalVal}
                  onChange={e => {
                    setTotalVal(e.target.value);
                    setInstVal(recompInstVal(e.target.value, instCount));
                  }}
                  data-testid="input-plan-total"
                />
                {instCount && instVal && (() => {
                  const iv = parseFloat(instVal.replace(/\./g, "").replace(",", "."));
                  const cnt = parseInt(instCount);
                  return (iv > 0 && cnt > 0) ? (
                    <p className="text-xs text-muted-foreground ml-1">
                      {cnt}× {fv(Math.round(iv * 100))} = <span className="font-bold text-foreground">{fv(Math.round(iv * 100) * cnt)}</span>
                    </p>
                  ) : null;
                })()}
              </div>

              {/* Account */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Conta de Débito</label>
                <select
                  className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium appearance-none cursor-pointer"
                  value={accId}
                  onChange={e => setAccId(Number(e.target.value))}
                  data-testid="select-plan-account"
                >
                  {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* Start date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Início do Pagamento</label>
                <input
                  type="date"
                  className="w-full h-14 px-5 rounded-2xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  data-testid="input-plan-start-date"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1 rounded-2xl font-bold" onClick={handleSave} data-testid="button-save-plan">
                  {editingId ? "Atualizar Plano" : "Criar Plano"}
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
