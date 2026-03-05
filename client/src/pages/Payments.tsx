import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, Receipt, Pencil, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useAccounts,
  useTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/hooks/use-finance";

// --- helpers (evita 200 virar 22,00) ---
function parseMoneyInput(raw: string) {
  // deixa só números, vírgula e ponto
  let v = raw.replace(/[^\d.,-]/g, "");

  // se tiver vírgula e ponto, assume ponto como milhar e vírgula como decimal
  if (v.includes(",") && v.includes(".")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",")) {
    // só vírgula -> decimal
    v = v.replace(",", ".");
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export default function Payments() {
  const { toast } = useToast();

  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();

  const { mutate: updateTx, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTx, isPending: isDeleting } = useDeleteTransaction();

  const accountsById = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    (accounts || []).forEach((a) => map.set(a.id, { id: a.id, name: a.name }));
    return map;
  }, [accounts]);

  // Modal simples de edição
  const [editingId, setEditingId] = useState<number | null>(null);
  const editingTx = useMemo(
    () => (transactions || []).find((t: any) => t.id === editingId) || null,
    [transactions, editingId]
  );

  const [editDescription, setEditDescription] = useState("");
  const [editAmountRaw, setEditAmountRaw] = useState("");

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

    const amount = Math.round(parseMoneyInput(editAmountRaw) * 100);

    updateTx(
      {
        id: editingTx.id,
        data: {
          description: editDescription,
          amount,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Atualizado", description: "Transação atualizada." });
          closeEdit();
        },
        onError: (e: any) => {
          toast({
            title: "Erro",
            description: e?.message || "Não foi possível atualizar.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteTx(id, {
      onSuccess: () => {
        toast({ title: "Apagado", description: "Transação removida." });
      },
      onError: (e: any) => {
        toast({
          title: "Erro",
          description: e?.message || "Não foi possível apagar.",
          variant: "destructive",
        });
      },
    });
  }

  const list = useMemo(() => {
    const arr = (transactions || []) as any[];
    // mais recentes primeiro
    return [...arr].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
  }, [transactions]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Histórico Completo
          </h1>
          <p className="text-muted-foreground mt-2">
            Edite ou apague entradas e saídas. O ecossistema será atualizado automaticamente.
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border border-border p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {list.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma transação encontrada.
            </div>
          ) : (
            list.map((tx) => {
              const isIncome = tx.type === "income";
              const accountName =
                tx.accountId != null
                  ? accountsById.get(tx.accountId)?.name || "Conta"
                  : isIncome
                  ? "Distribuído no ecossistema"
                  : "Conta Operacional";

              return (
                <div
                  key={tx.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`p-4 rounded-2xl ${
                        isIncome
                          ? "bg-secondary/10 text-secondary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-6 h-6" />
                      ) : (
                        <Receipt className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-foreground text-lg">
                        {tx.description || "-"}
                      </p>

                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.date), "dd 'de' MMMM, yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {accountName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p
                        className={`text-xl font-bold ${
                          isIncome ? "text-secondary" : "text-destructive"
                        }`}
                      >
                        {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl hover:bg-muted"
                        onClick={() => openEdit(tx)}
                      >
                        <Pencil className="w-5 h-5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                        onClick={() => handleDelete(tx.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Modal de Edição Simples */}
      {editingId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-6 rounded-3xl shadow-2xl border-border">
            <h2 className="text-2xl font-display font-bold">Editar Transação</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-2xl border border-input bg-background"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$)</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-2xl border border-input bg-background"
                  value={editAmountRaw}
                  onChange={(e) => setEditAmountRaw(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={closeEdit}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-primary"
                onClick={handleSaveEdit}
                disabled={isUpdating}
              >
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
