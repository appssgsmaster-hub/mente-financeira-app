import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, Receipt, Pencil, Trash2, PlusCircle, Globe } from "lucide-react";

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
} from "@/hooks/use-finance";

// --- helpers ---
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

  // Modal states for editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const editingTx = useMemo(
    () => (transactions || []).find((t: any) => t.id === editingId) || null,
    [transactions, editingId]
  );
  const [editDescription, setEditDescription] = useState("");
  const [editAmountRaw, setEditAmountRaw] = useState("");

  function handleAddIncome() {
    const val = parseMoneyInput(amount);
    if (!val || !desc) return toast({ title: "Erro", description: "Preencha valor e descrição", variant: "destructive" });
    
    distributeIncome({ amount: Math.round(val * 100), description: desc, date: txDate }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Entrada distribuída no ecossistema!" });
        setDesc(""); setAmount(""); setTxDate(new Date().toISOString().split("T")[0]);
      }
    });
  }

  function handleAddExpense() {
    const val = parseMoneyInput(amount);
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
        toast({ title: "Sucesso", description: "Saída registrada com sucesso!" });
        setDesc(""); setAmount(""); setSelectedAcc(""); setTxDate(new Date().toISOString().split("T")[0]);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">Pagamentos e Entradas</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1 sm:mt-2">Gerencie seu fluxo de caixa e o ecossistema financeiro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card de Lançamento */}
        <Card className="p-6 rounded-3xl border-border shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Novo Lançamento
          </h2>
          <div className="space-y-4">
            <input
              placeholder="Descrição (ex: Salário, Aluguel...)"
              className="w-full p-3 rounded-2xl border border-input bg-background"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <input
              placeholder="Valor (ex: 1.500,00)"
              className="w-full p-3 rounded-2xl border border-input bg-background"
              value={amount}
              onChange={e => setAmount(e.target.value)}
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
            <select
              className="w-full p-3 rounded-2xl border border-input bg-background"
              value={selectedAcc}
              onChange={e => setSelectedAcc(e.target.value)}
              data-testid="select-account"
            >
              <option value="">Selecione a conta (apenas para Saídas)</option>
              {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                className="flex-1 rounded-2xl bg-secondary hover:bg-secondary/90 text-white text-sm sm:text-base py-2.5 sm:py-3"
                onClick={handleAddIncome}
                disabled={isDistributing}
              >
                Registrar Entrada
              </Button>
              <Button 
                className="flex-1 rounded-2xl bg-destructive hover:bg-destructive/90 text-white text-sm sm:text-base py-2.5 sm:py-3"
                onClick={handleAddExpense}
                disabled={isCreatingExpense}
              >
                Registrar Saída
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 rounded-3xl bg-primary/5 border-primary/10 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-primary mb-2">Como funciona?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <b>Entradas:</b> São distribuídas automaticamente entre todas as contas conforme suas porcentagens.</li>
            <li>• <b>Saídas:</b> São deduzidas diretamente da conta selecionada e do ecossistema.</li>
            <li>• <b>Apagar:</b> Reverte automaticamente o saldo na conta e no ecossistema.</li>
          </ul>
        </Card>
      </div>

      <Card className="rounded-3xl border border-border p-0 overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h2 className="font-bold text-xl">Histórico de Transações</h2>
        </div>
        <div className="divide-y divide-border">
          {list.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhuma transação encontrada.</div>
          ) : (
            list.map((tx) => {
              const isIncome = tx.type === "income";
              const accountName = tx.accountId != null ? accountsById.get(tx.accountId)?.name : "Ecossistema (Distribuído)";
              return (
                <div key={tx.id} className="p-3 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-5 min-w-0 flex-1">
                    <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 ${isIncome ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`}>
                      {isIncome ? <ArrowUpRight className="w-4 h-4 sm:w-6 sm:h-6" /> : <Receipt className="w-4 h-4 sm:w-6 sm:h-6" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm sm:text-lg truncate">{tx.description}</p>
                      <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{accountName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-6 shrink-0">
                    <p className={`text-sm sm:text-xl font-bold whitespace-nowrap ${isIncome ? "text-secondary" : "text-destructive"}`}>
                      {isIncome ? "+" : "-"} {formatCurrency(tx.amount, user?.currency)}
                    </p>
                    <div className="flex items-center gap-0 sm:gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-10 sm:w-10" onClick={() => openEdit(tx)}>
                        <Pencil className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-7 w-7 sm:h-10 sm:w-10 hover:text-destructive" onClick={() => handleDelete(tx.id)} disabled={isDeleting}>
                        <Trash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

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
