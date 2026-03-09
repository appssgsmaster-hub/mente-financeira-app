import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAccounts, useDebts, useCreateDebt, useUpdateDebt, useDeleteDebt, useCreateCommitment } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import {
  CreditCard,
  PlusCircle,
  Calculator,
  Trash2,
  CheckCircle2,
  X,
  Target,
  TrendingUp,
  Shield,
  Heart,
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  Send,
  Pencil,
} from "lucide-react";
import { useLocation } from "wouter";

type DebtPriority = "high" | "medium" | "low";

const priorityOrder: Record<DebtPriority, number> = { high: 0, medium: 1, low: 2 };
const priorityLabel: Record<DebtPriority, string> = { high: "Alta", medium: "Média", low: "Baixa" };
const priorityColor: Record<DebtPriority, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-muted text-muted-foreground",
};

export default function DebtStrategy() {
  const { data: user } = useUser();
  const { data: accounts } = useAccounts();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: debts = [] } = useDebts();
  const { mutate: createDebt } = useCreateDebt();
  const { mutate: updateDebtMut } = useUpdateDebt();
  const { mutate: deleteDebtMut } = useDeleteDebt();
  const { mutate: createCommitment } = useCreateCommitment();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creditor, setCreditor] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState<DebtPriority>("medium");

  const [simDebtId, setSimDebtId] = useState<number | null>(null);
  const [simPayment, setSimPayment] = useState("");
  const [showSimModal, setShowSimModal] = useState(false);
  const [simPriorityFilter, setSimPriorityFilter] = useState<DebtPriority | "all">("all");

  const [showAiPopup, setShowAiPopup] = useState(false);

  function handleSave() {
    const val = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (!creditor || !val || val <= 0) {
      toast({ title: "Erro", description: "Preencha credor e valor.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateDebtMut({ id: editingId, data: { creditor, amount: Math.round(val * 100), priority } }, {
        onSuccess: () => toast({ title: "Dívida atualizada" }),
      });
    } else {
      createDebt({
        userId: user?.id ?? 0,
        creditor,
        amount: Math.round(val * 100),
        registeredDate: new Date().toISOString().split("T")[0],
        priority,
        paid: false,
      }, {
        onSuccess: () => toast({ title: "Dívida registrada" }),
      });
    }
    resetForm();
  }

  function resetForm() {
    setCreditor("");
    setAmount("");
    setPriority("medium");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(d: any) {
    setCreditor(d.creditor);
    setAmount(String((d.amount / 100).toFixed(2)).replace(".", ","));
    setPriority(d.priority as DebtPriority);
    setEditingId(d.id);
    setShowForm(true);
  }

  function removeDebt(id: number) {
    deleteDebtMut(id, { onSuccess: () => toast({ title: "Dívida removida" }) });
  }

  function markPaid(id: number) {
    updateDebtMut({ id, data: { paid: true } }, {
      onSuccess: () => toast({ title: "Dívida quitada!" }),
    });
  }

  function markUnpaid(id: number) {
    updateDebtMut({ id, data: { paid: false } });
  }

  const activeDebts = debts.filter((d) => !d.paid);
  const paidDebts = debts.filter((d) => d.paid);
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.amount, 0);
  const sortedActive = [...activeDebts].sort((a, b) => (priorityOrder[a.priority as DebtPriority] ?? 1) - (priorityOrder[b.priority as DebtPriority] ?? 1));

  const formatValue = (value: number) => formatCurrency(value, user?.currency);

  function openGlobalSim() {
    setSimDebtId(null);
    setSimPayment("");
    setSimPriorityFilter("all");
    setShowSimModal(true);
  }

  function openDebtSim(id: number) {
    setSimDebtId(id);
    setSimPayment("");
    setSimPriorityFilter("all");
    setShowSimModal(true);
  }

  function getSimTotal() {
    if (simDebtId) {
      const d = debts.find((x) => x.id === simDebtId);
      return d ? d.amount : 0;
    }
    if (simPriorityFilter === "all") return totalDebt;
    return activeDebts.filter((d) => d.priority === simPriorityFilter).reduce((s, d) => s + d.amount, 0);
  }

  function calcMonths() {
    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
    const total = getSimTotal();
    if (!payment || payment <= 0 || total <= 0) return null;
    return Math.ceil((total / 100) / payment);
  }

  function addToProjections(debtId: number) {
    if (!user?.id) return;
    const d = debts.find((x) => x.id === debtId);
    if (!d) return;
    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
    if (!payment || payment <= 0) {
      toast({ title: "Erro", description: "Defina a capacidade de pagamento mensal primeiro.", variant: "destructive" });
      return;
    }
    const installmentCents = Math.round(payment * 100);
    const months = Math.ceil(d.amount / installmentCents);

    const debtAccount = accounts?.find((a) => a.name.toLowerCase().includes("despesa") || a.name.toLowerCase().includes("contas"));
    const debtAccountId = debtAccount?.id || accounts?.[0]?.id || 0;

    createCommitment({
      userId: user.id,
      accountId: debtAccountId,
      description: `Pagamento Dívida: ${d.creditor}`,
      value: installmentCents,
      startDate: new Date().toISOString().split("T")[0],
      recurrence: months > 1 ? "PARCELADO" : "FIXO",
      installments: months > 1 ? months : null,
      category: "Compromissos Financeiros",
      commitmentType: "expense",
      paidPeriods: [],
    }, {
      onSuccess: () => {
        toast({ title: "Adicionado às Projeções", description: `${formatValue(installmentCents)}/mês por ${months} ${months === 1 ? "mês" : "meses"} para "${d.creditor}"` });
      },
    });
  }

  const monthlyPaymentCapacity = useMemo(() => {
    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
    return payment > 0 ? payment : 0;
  }, [simPayment]);

  useEffect(() => {
    if (totalDebt <= 0 || !simPayment) return;
    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
    if (!payment || payment <= 0) return;
    const months = Math.ceil((totalDebt / 100) / payment);
    if (months > 60) {
      setShowAiPopup(true);
    }
  }, [totalDebt, simPayment]);

  const strategies = [
    { icon: Target, title: "Método Bola de Neve", desc: "Comece pagando a menor dívida primeiro. Ao quitá-la, direcione o valor para a próxima." },
    { icon: TrendingUp, title: "Método Avalanche", desc: "Priorize a dívida com maior taxa de juros. Matematicamente mais eficiente." },
    { icon: Shield, title: "Negociação", desc: "Negocie diretamente com credores. Muitos oferecem descontos para renegociação." },
    { icon: Heart, title: "Equilíbrio Emocional", desc: "Crie um plano realista e celebre cada passo em direção à liberdade financeira." },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-debt-strategy-title">Estratégia de Dívidas</h1>
          <p className="text-sm text-muted-foreground mt-1">Entenda suas dívidas e construa uma estratégia para retomar o controle financeiro.</p>
        </div>
        <Button className="rounded-2xl font-bold shrink-0" onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-add-debt">
          <PlusCircle className="w-4 h-4 mr-2" /> Nova Dívida
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 rounded-2xl border-border space-y-4" data-testid="form-add-debt">
          <h3 className="font-bold text-foreground">{editingId ? "Editar Dívida" : "Registrar Nova Dívida"}</h3>
          <input
            placeholder="Credor (ex: Banco, Loja...)"
            className="w-full p-3 rounded-xl border border-input bg-background text-sm"
            value={creditor}
            onChange={(e) => setCreditor(e.target.value)}
            data-testid="input-debt-creditor"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Valor da dívida (ex: 5.000,00)"
              className="w-full p-3 rounded-xl border border-input bg-background text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-debt-amount"
            />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Prioridade</label>
              <div className="flex p-1 bg-muted rounded-xl">
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-lg text-xs font-bold py-2.5 transition-all ${priority === p ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                    data-testid={`btn-priority-${p}`}
                  >
                    {priorityLabel[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl" onClick={handleSave} data-testid="button-save-debt">
              {editingId ? "Atualizar" : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={resetForm}>Cancelar</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-destructive/15 bg-destructive/5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dívida Total</p>
          <p className="text-xl sm:text-2xl font-display font-bold text-destructive" data-testid="text-total-debt">{formatValue(totalDebt)}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dívidas Ativas</p>
          <p className="text-xl sm:text-2xl font-display font-bold text-foreground" data-testid="text-active-debts">{activeDebts.length}</p>
        </Card>
        <Card className="p-4 rounded-2xl border-secondary/15 bg-secondary/5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dívidas Quitadas</p>
          <p className="text-xl sm:text-2xl font-display font-bold text-secondary" data-testid="text-paid-debts">{paidDebts.length}</p>
        </Card>
      </div>

      {activeDebts.length > 0 && (
        <Button variant="outline" className="w-full rounded-2xl border-primary/30 text-primary font-bold text-sm" onClick={openGlobalSim} data-testid="button-simulate-global">
          <Calculator className="w-4 h-4 mr-2" /> Simular Estratégia Completa
        </Button>
      )}

      {sortedActive.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold text-foreground">Dívidas Ativas</h2>
          {sortedActive.map((d) => (
            <Card key={d.id} className="p-4 rounded-2xl border-border" data-testid={`card-debt-${d.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-foreground" data-testid={`text-debt-creditor-${d.id}`}>{d.creditor}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColor[d.priority as DebtPriority]}`} data-testid={`badge-priority-${d.id}`}>
                      {priorityLabel[d.priority as DebtPriority]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Registrada em {new Date(d.registeredDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  <p className="text-xl font-display font-bold text-destructive mt-1" data-testid={`text-debt-amount-${d.id}`}>{formatValue(d.amount)}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="rounded-lg text-xs min-h-[36px] sm:min-h-0" onClick={() => startEdit(d)} data-testid={`button-edit-debt-${d.id}`}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs min-h-[36px] sm:min-h-0" onClick={() => openDebtSim(d.id)} data-testid={`button-sim-debt-${d.id}`}>
                    <Calculator className="w-3.5 h-3.5 mr-1" /> Simular
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs min-h-[36px] sm:min-h-0 text-secondary border-secondary/30" onClick={() => markPaid(d.id)} data-testid={`button-pay-debt-${d.id}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Quitar
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground" onClick={() => removeDebt(d.id)} data-testid={`button-remove-debt-${d.id}`}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 rounded-2xl border-border text-center" data-testid="text-no-debts">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Você não tem dívidas ativas registradas.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Dívida" para começar a gerenciar.</p>
        </Card>
      )}

      {paidDebts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-secondary" /> Dívidas Quitadas
          </h2>
          {paidDebts.map((d) => (
            <Card key={d.id} className="p-4 rounded-2xl border-secondary/20 bg-secondary/5 opacity-70" data-testid={`card-debt-paid-${d.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground line-through">{d.creditor}</h4>
                  <p className="text-sm font-bold text-secondary">{formatValue(d.amount)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => markUnpaid(d.id)} data-testid={`button-reopen-debt-${d.id}`}>
                    Reabrir
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground" onClick={() => removeDebt(d.id)} data-testid={`button-remove-paid-${d.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-secondary" /> Estratégias de Pagamento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {strategies.map((s, i) => (
            <Card key={i} className="p-4 rounded-2xl border-border" data-testid={`card-strategy-${i}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{s.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-6 rounded-3xl border-secondary/20 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" data-testid="card-debt-learning">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-foreground mb-1">Aprenda a gerenciar dívidas sem perder sua liberdade financeira.</h4>
            <p className="text-sm text-muted-foreground">Dívida não deve definir seu futuro. Aprenda estratégias para reorganizar suas finanças, retomar o controle do seu fluxo de caixa e focar em realizar seus sonhos.</p>
          </div>
          <Button className="rounded-2xl bg-secondary text-white font-bold text-sm shrink-0" onClick={() => navigate("/planos")} data-testid="button-learn-more">
            Saiba Mais <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>

      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSimModal(false)}>
          <Card className="w-full max-w-lg p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="modal-debt-simulation">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-8 h-8" onClick={() => setShowSimModal(false)} data-testid="button-close-simulation">
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg">
                {simDebtId ? `Simular: ${debts.find((d) => d.id === simDebtId)?.creditor}` : "Simulação Completa"}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/15 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {simDebtId ? "Valor desta dívida" : "Dívida total"}
                </p>
                <p className="text-2xl font-display font-bold text-destructive" data-testid="text-sim-total">{formatValue(getSimTotal())}</p>
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
                const months = calcMonths();
                if (months === null) return null;
                const years = Math.floor(months / 12);
                const rem = months % 12;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center space-y-1" data-testid="text-sim-result">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prazo estimado para quitar</p>
                    <p className="text-3xl font-display font-bold text-primary">
                      {months} {months === 1 ? "mês" : "meses"}
                    </p>
                    {years >= 1 && (
                      <p className="text-xs text-muted-foreground">
                        ({years} {years === 1 ? "ano" : "anos"}{rem > 0 ? ` e ${rem} ${rem === 1 ? "mês" : "meses"}` : ""})
                      </p>
                    )}
                  </div>
                );
              })()}

              {!simDebtId && activeDebts.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Priorizar por nível</label>
                    <div className="flex p-1 bg-muted rounded-xl">
                      {([["all", "Todas"], ["high", "Alta"], ["medium", "Média"], ["low", "Baixa"]] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setSimPriorityFilter(val)}
                          className={`flex-1 rounded-lg text-xs font-bold py-2 transition-all ${simPriorityFilter === val ? "bg-white dark:bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                          data-testid={`btn-sim-priority-${val}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {simPriorityFilter !== "all" && (() => {
                    const filtered = activeDebts.filter((d) => d.priority === simPriorityFilter);
                    const filteredTotal = filtered.reduce((s, d) => s + d.amount, 0);
                    const payment = parseFloat(simPayment.replace(/\./g, "").replace(",", "."));
                    const pMonths = payment > 0 && filteredTotal > 0 ? Math.ceil((filteredTotal / 100) / payment) : null;
                    return (
                      <div className="space-y-2">
                        {filtered.length > 0 ? (
                          <>
                            {filtered.map((d) => (
                              <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                                <span className="text-sm font-medium truncate">{d.creditor}</span>
                                <span className="text-sm font-bold text-destructive shrink-0 ml-2">{formatValue(d.amount)}</span>
                              </div>
                            ))}
                            {pMonths && (
                              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center space-y-1" data-testid="text-sim-priority-result">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Foco: Prioridade {priorityLabel[simPriorityFilter]} ({formatValue(filteredTotal)})
                                </p>
                                <p className="text-2xl font-display font-bold text-amber-600">
                                  {pMonths} {pMonths === 1 ? "mês" : "meses"}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-2">Nenhuma dívida com esta prioridade.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {simDebtId && calcMonths() && (
                <Button
                  className="w-full rounded-2xl font-bold"
                  onClick={() => { addToProjections(simDebtId); setShowSimModal(false); }}
                  data-testid="button-add-to-projections"
                >
                  <Send className="w-4 h-4 mr-2" /> Adicionar Parcela às Projeções
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {showAiPopup && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAiPopup(false)}>
          <Card className="w-full max-w-md p-6 rounded-3xl shadow-2xl relative" onClick={(e) => e.stopPropagation()} data-testid="modal-ai-guidance">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-8 h-8" onClick={() => setShowAiPopup(false)} data-testid="button-close-ai-popup">
              <X className="w-5 h-5" />
            </Button>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">Sua situação pode precisar de uma estratégia estruturada.</h3>
              <p className="text-sm text-muted-foreground">
                Com o pagamento mensal informado, o prazo para quitar suas dívidas é superior a 5 anos. Considere conhecer nossa mentoria financeira especializada para criar um plano personalizado.
              </p>
              <Button className="rounded-2xl bg-secondary text-white font-bold" onClick={() => { setShowAiPopup(false); navigate("/planos"); }} data-testid="button-ai-learn-more">
                Saiba Mais <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
