import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAccounts, useDistributeIncome, useCreateTransaction, useTransactions } from "@/hooks/use-finance";
import { parseCurrencyInput, formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownRight, ArrowUpRight, Loader2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Validation schemas for local forms
const incomeSchema = z.object({
  amountStr: z.string().min(1, "Obrigatório"),
  description: z.string().min(3, "Mínimo 3 caracteres"),
});

const expenseSchema = z.object({
  amountStr: z.string().min(1, "Obrigatório"),
  description: z.string().min(3, "Mínimo 3 caracteres"),
  accountId: z.string().min(1, "Selecione uma conta"),
  isRecurring: z.boolean().default(false),
});

export default function Payments() {
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const { mutate: distributeIncome, isPending: incomePending } = useDistributeIncome();
  const { mutate: createExpense, isPending: expensePending } = useCreateTransaction();
  const { toast } = useToast();

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const incomeForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { amountStr: "", description: "" },
  });

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amountStr: "", description: "", accountId: "", isRecurring: false },
  });

  const onIncomeSubmit = (data: z.infer<typeof incomeSchema>) => {
    const amount = parseCurrencyInput(data.amountStr);
    if (amount <= 0) return incomeForm.setError("amountStr", { message: "Valor inválido" });
    
    distributeIncome(
      { amount, description: data.description },
      {
        onSuccess: () => {
          toast({ title: "Entrada distribuída com sucesso!" });
          setIncomeOpen(false);
          incomeForm.reset();
        }
      }
    );
  };

  const onExpenseSubmit = (data: z.infer<typeof expenseSchema>) => {
    const amount = parseCurrencyInput(data.amountStr);
    if (amount <= 0) return expenseForm.setError("amountStr", { message: "Valor inválido" });
    
    createExpense(
      { 
        amount, 
        description: data.description, 
        accountId: Number(data.accountId),
        type: 'expense',
        isRecurring: data.isRecurring,
        category: 'Geral',
        userId: 1 // Default mocked userId
      },
      {
        onSuccess: () => {
          toast({ title: "Gasto registrado com sucesso!" });
          setExpenseOpen(false);
          expenseForm.reset();
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Lançamentos</h1>
        <p className="text-muted-foreground mt-1">Registre suas entradas e despesas com precisão.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => setIncomeOpen(true)}
          className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-secondary/20 bg-secondary/5 hover:bg-secondary/10 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-4 group-hover:-translate-y-2 transition-transform duration-300 shadow-lg shadow-secondary/30">
            <ArrowUpRight className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground">Registrar Entrada</h3>
          <p className="text-muted-foreground mt-2 text-center max-w-xs">
            Distribui o valor automaticamente entre suas contas baseado nas porcentagens.
          </p>
        </button>

        <button 
          onClick={() => setExpenseOpen(true)}
          className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center mb-4 group-hover:-translate-y-2 transition-transform duration-300 shadow-lg shadow-destructive/30">
            <ArrowDownRight className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground">Registrar Gasto</h3>
          <p className="text-muted-foreground mt-2 text-center max-w-xs">
            Deduz o valor diretamente de uma conta específica do seu ecossistema.
          </p>
        </button>
      </div>

      <div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-6 mt-12">Histórico Completo</h3>
        <Card className="rounded-3xl border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {transactions?.map((tx) => (
              <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${tx.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">{tx.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                      {tx.isRecurring && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                          Recorrente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold font-display text-xl ${tx.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                  {tx.accountId && accounts && (
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                      {accounts.find(a => a.id === tx.accountId)?.name}
                    </p>
                  )}
                  {!tx.accountId && tx.type === 'income' && (
                    <p className="text-sm font-medium text-secondary mt-1">
                      Distribuído no ecossistema
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {(!transactions || transactions.length === 0) && (
              <div className="p-16 text-center text-muted-foreground">
                Sem histórico de movimentações.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Income Dialog */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Nova Entrada</DialogTitle>
            <DialogDescription>O valor será dividido automaticamente entre as contas.</DialogDescription>
          </DialogHeader>
          <Form {...incomeForm}>
            <form onSubmit={incomeForm.handleSubmit(onIncomeSubmit)} className="space-y-6 mt-4">
              <FormField
                control={incomeForm.control}
                name="amountStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input placeholder="0,00" className="text-lg py-6 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={incomeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Salário" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full rounded-xl py-6 text-lg shadow-lg" disabled={incomePending}>
                {incomePending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Processar Distribuição
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Registrar Gasto</DialogTitle>
            <DialogDescription>Deduz o valor de uma conta específica.</DialogDescription>
          </DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-5 mt-4">
              <FormField
                control={expenseForm.control}
                name="amountStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input placeholder="0,00" className="text-lg py-6 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Gasto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Conta de Luz" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>De qual conta saiu?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts?.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Gasto Recorrente</FormLabel>
                      <p className="text-sm text-muted-foreground">Acontece todos os meses</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" variant="destructive" className="w-full rounded-xl py-6 text-lg shadow-lg shadow-destructive/20" disabled={expensePending}>
                {expensePending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Registrar Saída
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
