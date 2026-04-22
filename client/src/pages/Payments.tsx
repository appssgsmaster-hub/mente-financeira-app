import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, ArrowDownRight, Receipt, Pencil, Trash2, PlusCircle, Globe, Link2, ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useAccounts,
  useTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
  useDistributeIncome,
  useCreateTransaction,
  useUser,
  useCommitments,
  useUpdateCommitment,
} from "@/hooks/use-finance";
import type { Commitment } from "@shared/schema";

function parseMoneyInput(raw: string) {
  let v = raw.replace(/[^\d.,-]/g, "");
  if (v.includes(",") && v.includes(".")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",")) {
    v = v.replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function getPeriodFromDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Payments() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();

  const { mutate: updateTx, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTx, isPending: isDeleting } = useDeleteTransaction();
  const { mutate: distributeIncome, isPending: isDistributing } = useDistributeIncome();
  const { mutate: createExpense, isPending: isCreatingExpense } = useCreateTransaction();

  const accountsById = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    (accounts || []).forEach((a) => map.set(a.id, { id: a.id, name: a.name }));
    return map;
  }, [accounts]);

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedAcc, setSelectedAcc] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [linkedCommitment, setLinkedCommitment] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const editingTx = useMemo(
    () => (transactions || []).find((t: any) => t.id === editingId) || null,
    [transactions, editingId]
  );
  const [editDescription, setEditDescription] = useState("");
  const [editAmountRaw, setEditAmountRaw] = useState("");

  const { data: commitments = [] } = useCommitments();
  const { mutate: updateCommitmentMut } = useUpdateCommitment();

  const openCommitments = useMemo(() => {
    const now = new Date();
    const currentPeriod = getCurrentPeriod();
    const monthIndex = now.getMonth();
    const year = now.getFullYear();
    const msEnd = new Date(year, monthIndex + 1, 0).getTime();

    return commitments.filter((c) => {
      if ((c.commitmentType || "expense") !== "expense") return false;
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
      if (!active) return false;
      const paid = (c.paidPeriods as string[]) || [];
      return !paid.includes(currentPeriod);
    });
  }, [commitments]);

  const openIncomeCommitments = useMemo(() => {
    const now = new Date();
    const currentPeriod = getCurrentPeriod();
    const monthIndex = now.getMonth();
    const year = now.getFullYear();
    const msEnd = new Date(year, monthIndex + 1, 0).getTime();

    return commitments.filter((c) => {
      if (c.commitmentType !== "income") return false;
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
      if (!active) return false;
      const paid = (c.paidPeriods as string[]) || [];
      return !paid.includes(currentPeriod);
    });
  }, [commitments]);

  function handleLinkChange(commitmentId: string) {
    setLinkedCommitment(commitmentId);
    if (commitmentId) {
      const c = commitments.find((x) => String(x.id) === commitmentId);
      if (c) {
        setDesc(c.description);
        setAmount(String((c.value / 100).toFixed(2)).replace(".", ","));
        if ((c.commitmentType || "expense") === "expense") {
          setSelectedAcc(String(c.accountId));
        } else {
          setSelectedAcc("");
        }
      }
    }
  }

  function getLinkedCommitmentType(): "expense" | "income" | null {
    if (!linkedCommitment) return null;
    const c = commitments.find((x) => String(x.id) === linkedCommitment);
    return c ? ((c.commitmentType || "expense") as "expense" | "income") : null;
  }

  function markCommitmentPaid(commitmentId: string, dateStr: string) {
    if (!user?.id) return;
    const numId = parseInt(commitmentId);
    const c = commitments.find((x) => x.id === numId);
    if (!c) return;
    const period = getPeriodFromDate(dateStr);
    const paid = (c.paidPeriods as string[]) || [];
    if (paid.includes(period)) return;
    updateCommitmentMut({ id: numId, data: { paidPeriods: [...paid, period] } });
  }

  function handleAddIncome() {
    const val = parseMoneyInput(amount);
    if (!val || !desc) return toast({ title: "Erro", description: "Preencha valor e descrição", variant: "destructive" });

    distributeIncome({ amount: Math.round(val * 100), description: desc, date: txDate }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Entrada distribuída no ecossistema!" });
        setDesc(""); setAmount(""); setTxDate(new Date().toISOString().split("T")[0]); setLinkedCommitment("");
      }
    });
  }

  function handleAddExpense() {
    const val = parseMoneyInput(amount);
    const linkedType = getLinkedCommitmentType();

    if (linkedType === "income") {
      if (!val || !desc) return toast({ title: "Erro", description: "Preencha valor e descrição", variant: "destructive" });
      distributeIncome({ amount: Math.round(val * 100), description: desc, date: txDate }, {
        onSuccess: () => {
          markCommitmentPaid(linkedCommitment, txDate);
          toast({ title: "Sucesso", description: "Entrada registrada e receita marcada como recebida!" });
          setDesc(""); setAmount(""); setSelectedAcc(""); setTxDate(new Date().toISOString().split("T")[0]); setLinkedCommitment("");
        }
      });
      return;
    }

    if (!val || !desc || !selectedAcc) return toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });

    createExpense({
      userId: 0,
      description: desc,
      amount: Math.round(val * 100),
      type: "expense",
      accountId: Number(selectedAcc),
      isRecurring: false,
      date: txDate
    } as any, {
      onSuccess: () => {
        if (linkedCommitment) {
          markCommitmentPaid(linkedCommitment, txDate);
          toast({ title: "Sucesso", description: "Saída registrada e compromisso marcado como pago!" });
        } else {
          toast({ title: "Sucesso", description: "Saída registrada com sucesso!" });
        }
        setDesc(""); setAmount(""); setSelectedAcc(""); setTxDate(new Date().toISOString().split("T")[0]); setLinkedCommitment("");
      }
    });
  }

  function openEdit(tx: any) {
    setEditingId(tx.id);
    setEditDescription(tx.description || "");
    setEditAmountRaw(String(tx.amount / 100));
  }

  function closeEdit() {
    setEditingId(null);
    setEditDescription("");
    setEditAmountRaw("");
  }

  function handleSaveEdit() {
    if (!editingTx) return;
    const amountVal = Math.round(parseMoneyInput(editAmountRaw) * 100);
    updateTx({ id: editingTx.id, data: { description: editDescription, amount: amountVal } as any }, {
      onSuccess: () => {
        toast({ title: "Atualizado", description: "Transação atualizada." });
        closeEdit();
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Deseja apagar esta transação? O saldo será revertido.")) return;
    deleteTx(id, { onSuccess: () => toast({ title: "Apagado", description: "Transação removida." }) });
  }

  const list = useMemo(() => {
    return [...(transactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const incomeList = useMemo(() => list.filter((tx) => tx.type === "income"), [list]);
  const expenseList = useMemo(() => list.filter((tx) => tx.type === "expense"), [list]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Pagamentos e Entradas</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1 sm:mt-2">Gerencie seu fluxo de caixa e o ecossistema financeiro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl border-border shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Novo Lançamento
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Vincular?
              </label>
              <select
                className="w-full p-3 rounded-2xl border border-input bg-background text-sm"
                value={linkedCommitment}
                onChange={(e) => handleLinkChange(e.target.value)}
                data-testid="select-link-commitment"
              >
                <option value="">Manual</option>
                {openCommitments.length > 0 && (
                  <optgroup label="Compromissos (Saídas)">
                    {openCommitments.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.description} — {formatCurrency(c.value, user?.currency)}{c.recurrence === "SEMANAL" ? " /semana" : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {openIncomeCommitments.length > 0 && (
                  <optgroup label="Receitas a Receber (Entradas)">
                    {openIncomeCommitments.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.description} — {formatCurrency(c.value, user?.currency)}{c.recurrence === "SEMANAL" ? " /semana" : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <input
              placeholder="Descrição (ex: Salário, Aluguel...)"
              className="w-full p-3 rounded-2xl border border-input bg-background"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              data-testid="input-tx-description"
            />
            <input
              placeholder="Valor (ex: 1.500,00)"
              className="w-full p-3 rounded-2xl border border-input bg-background"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              data-testid="input-tx-amount"
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Data do lançamento</label>
              <input
                type="date"
                className="w-full p-3 rounded-2xl border border-input bg-background"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                data-testid="input-tx-date"
              />
            </div>
            {getLinkedCommitmentType() === "income" ? (
              <div className="w-full p-3 rounded-2xl border border-secondary/30 bg-secondary/5 flex items-center gap-2 text-sm font-medium text-secondary" data-testid="income-ecosystem-info">
                <ArrowDownRight className="w-4 h-4 shrink-0" />
                Ecossistema Total → distribuído automaticamente entre as contas
              </div>
            ) : (
              <select
                className="w-full p-3 rounded-2xl border border-input bg-background"
                value={selectedAcc}
                onChange={e => setSelectedAcc(e.target.value)}
                data-testid="select-account"
              >
                <option value="">Selecione a conta (apenas para Saídas)</option>
                {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                className="flex-1 rounded-2xl bg-secondary hover:bg-secondary/90 text-white text-sm sm:text-base py-2.5 sm:py-3"
                onClick={handleAddIncome}
                disabled={isDistributing}
              >
                Registrar Entrada
              </Button>
              <Button
                className={`flex-1 rounded-2xl text-white text-sm sm:text-base py-2.5 sm:py-3 ${getLinkedCommitmentType() === "income" ? "bg-secondary hover:bg-secondary/90" : "bg-destructive hover:bg-destructive/90"}`}
                onClick={handleAddExpense}
                disabled={isCreatingExpense || isDistributing}
                data-testid="button-add-expense"
              >
                {getLinkedCommitmentType() === "income" ? "Registrar Entrada Vinculada" : "Registrar Saída"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl bg-primary/5 border-primary/10 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-primary mb-2">Como funciona?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <b>Entradas:</b> São distribuídas automaticamente entre todas as contas conforme suas porcentagens.</li>
            <li>• <b>Saídas:</b> São deduzidas diretamente da conta selecionada e do ecossistema.</li>
            <li>• <b>Vincular Saída:</b> Ao vincular a um compromisso, os campos são preenchidos e o compromisso é marcado como pago.</li>
            <li>• <b>Vincular Entrada:</b> Ao vincular a uma receita a receber, registra a entrada e marca como recebida.</li>
            <li>• <b>Apagar:</b> Reverte automaticamente o saldo na conta e no ecossistema.</li>
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="card-transaction-history">

        {/* Histórico de Entradas */}
        <Card className="rounded-3xl border border-secondary/30 p-0 overflow-hidden flex flex-col" data-testid="card-income-history">
          <button
            className="w-full p-5 flex items-center justify-between text-left bg-secondary/5 border-b border-secondary/20"
            onClick={() => setHistoryOpen(!historyOpen)}
            data-testid="button-toggle-history"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Histórico de Entradas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {incomeList.length > 0
                    ? `${incomeList.length} ${incomeList.length === 1 ? "entrada registrada" : "entradas registradas"}`
                    : "Nenhuma entrada encontrada"}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="divide-y divide-border overflow-y-auto max-h-[500px]" data-testid="content-income-history">
              {incomeList.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Nenhuma entrada registrada.</div>
              ) : (
                incomeList.map((tx) => {
                  const accountName = tx.accountId != null ? accountsById.get(tx.accountId)?.name : "Ecossistema (Distribuído)";
                  return (
                    <div key={tx.id} className="p-3 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors gap-2 sm:gap-4" data-testid={`row-income-${tx.id}`}>
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl shrink-0 bg-secondary/10 text-secondary">
                          <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm sm:text-base truncate">{tx.description}</p>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-xs text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{accountName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                        <p className="text-sm sm:text-lg font-bold whitespace-nowrap text-secondary">
                          + {formatCurrency(tx.amount, user?.currency)}
                        </p>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-9 sm:w-9" onClick={() => openEdit(tx)} data-testid={`button-edit-income-${tx.id}`}>
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-9 sm:w-9 hover:text-destructive" onClick={() => handleDelete(tx.id)} disabled={isDeleting} data-testid={`button-delete-income-${tx.id}`}>
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>

        {/* Histórico de Saídas */}
        <Card className="rounded-3xl border border-destructive/30 p-0 overflow-hidden flex flex-col" data-testid="card-expense-history">
          <button
            className="w-full p-5 flex items-center justify-between text-left bg-destructive/5 border-b border-destructive/20"
            onClick={() => setHistoryOpen(!historyOpen)}
            data-testid="button-toggle-history-expense"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Histórico de Saídas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {expenseList.length > 0
                    ? `${expenseList.length} ${expenseList.length === 1 ? "saída registrada" : "saídas registradas"}`
                    : "Nenhuma saída encontrada"}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="divide-y divide-border overflow-y-auto max-h-[500px]" data-testid="content-expense-history">
              {expenseList.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Nenhuma saída registrada.</div>
              ) : (
                expenseList.map((tx) => {
                  const accountName = tx.accountId != null ? accountsById.get(tx.accountId)?.name : "Ecossistema (Distribuído)";
                  return (
                    <div key={tx.id} className="p-3 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors gap-2 sm:gap-4" data-testid={`row-expense-${tx.id}`}>
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl shrink-0 bg-destructive/10 text-destructive">
                          <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm sm:text-base truncate">{tx.description}</p>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-xs text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{accountName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                        <p className="text-sm sm:text-lg font-bold whitespace-nowrap text-destructive">
                          - {formatCurrency(tx.amount, user?.currency)}
                        </p>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-9 sm:w-9" onClick={() => openEdit(tx)} data-testid={`button-edit-expense-${tx.id}`}>
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-9 sm:w-9 hover:text-destructive" onClick={() => handleDelete(tx.id)} disabled={isDeleting} data-testid={`button-delete-expense-${tx.id}`}>
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>

      </div>

      {editingId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-6 rounded-3xl shadow-2xl border-border">
            <h2 className="text-2xl font-display font-bold">Editar Transação</h2>
            <div className="space-y-4">
              <input className="w-full p-3 rounded-2xl border" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Descrição" />
              <input className="w-full p-3 rounded-2xl border" value={editAmountRaw} onChange={e => setEditAmountRaw(e.target.value)} placeholder="Valor" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={closeEdit}>Cancelar</Button>
              <Button className="flex-1 rounded-2xl" onClick={handleSaveEdit} disabled={isUpdating}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
