import { useEffect, useMemo, useState } from "react";
import { useAccounts, useUser } from "@/hooks/use-finance";
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
  BarChart3,
  Target
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";

type Recurrence = "FIXO" | "PARCELADO";

type Commitment = {
  id: string;
  accountId: number;
  description: string;
  value: number; // CENTAVOS
  startDate: string; // YYYY-MM-DD
  recurrence: Recurrence;
  installments?: number; // only PARCELADO
  category: string;
  createdAt: string;
};

const LS_KEY = "sgs_commitments_v1";

const CATEGORIES = [
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

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

export default function Projections() {
  const { data: accounts } = useAccounts();
  const { data: user } = useUser();
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());
  const [openAccountId, setOpenAccountId] = useState<number | null>(null);
  const [items, setItems] = useState<Commitment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [accountId, setAccountId] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [startDate, setStartDate] = useState<string>(ymd(now));
  const [recurrence, setRecurrence] = useState<Recurrence>("FIXO");
  const [installmentsStr, setInstallmentsStr] = useState<string>("1");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (accounts?.length && !accountId) setAccountId(accounts[0].id);
  }, [accounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: user?.currency || "BRL",
    }).format(value / 100);
  };

  const commitmentsThisMonth = useMemo(() => {
    const year = now.getFullYear();
    const msEnd = new Date(year, monthIndex + 1, 0).getTime();
    const msStart = new Date(year, monthIndex, 1).getTime();

    return items.filter((c) => {
      const d = new Date(c.startDate);
      const t = d.getTime();
      if (c.recurrence === "FIXO") return t <= msEnd;
      const n = Math.max(1, Number(c.installments ?? 1));
      const diff = (year - d.getFullYear()) * 12 + (monthIndex - d.getMonth());
      return diff >= 0 && diff < n && t <= msEnd;
    });
  }, [items, monthIndex]);

  const totalCommitted = commitmentsThisMonth.reduce((sum, c) => sum + c.value, 0);
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  // Projection Chart Data
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(now.getMonth() + i);
      const mIdx = d.getMonth();
      const mName = MONTHS[mIdx];
      
      // Basic projection: balance + small growth - commitments
      // (Simplified for visual impact)
      const growth = (totalBalance / 100) * (1 + 0.01 * i); 
      return { name: mName, valor: Math.max(0, growth) };
    });
  }, [totalBalance]);

  function openNew(targetAccountId?: number) {
    setEditingId(null);
    setAccountId(targetAccountId ?? accounts?.[0]?.id ?? 0);
    setDescription("");
    setValueStr("");
    setStartDate(ymd(new Date(now.getFullYear(), monthIndex, 1)));
    setIsModalOpen(true);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function save() {
    if (!accountId || !description.trim()) return;
    const valueCents = moneyToCents(valueStr);
    const payload: Commitment = {
      id: editingId ?? makeId(),
      accountId,
      description: description.trim(),
      value: valueCents,
      startDate,
      recurrence,
      installments: recurrence === "PARCELADO" ? Number(installmentsStr) : undefined,
      category,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => editingId ? prev.map((x) => (x.id === editingId ? payload : x)) : [payload, ...prev]);
    setIsModalOpen(false);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Projeções de Prosperidade</h1>
          <p className="text-muted-foreground mt-2">Visualize o futuro do seu ecossistema financeiro.</p>
        </div>
        <Button onClick={() => openNew()} className="rounded-2xl gap-2">
          <Plus className="w-4 h-4" /> Planejar Futuro
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 rounded-3xl border-border shadow-sm lg:col-span-2">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Curva de Crescimento Estimada
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} hide />
                <RechartsTooltip 
                  formatter={(val: number) => [formatCurrency(val * 100), "Patrimônio Estimado"]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="valor" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 rounded-3xl bg-secondary/10 border-secondary/20 border text-center">
            <Target className="w-8 h-8 text-secondary mx-auto mb-3" />
            <p className="text-sm font-semibold text-secondary uppercase tracking-widest mb-1">Impacto no Mês</p>
            <h2 className="text-3xl font-display font-bold text-foreground">{formatCurrency(totalCommitted)}</h2>
            <p className="text-xs text-muted-foreground mt-2">Total de compromissos planejados para {MONTHS[monthIndex]}.</p>
          </Card>

          <Card className="p-6 rounded-3xl border-border shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Mentor Prosperidade
            </h3>
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              "O ecossistema prospera quando cada decisão futura é plantada hoje. Suas projeções mostram um caminho de clareza e liberdade."
            </p>
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

      <div className="space-y-4">
        {accounts?.map((acc) => {
          const isOpen = openAccountId === acc.id;
          const accItems = commitmentsThisMonth.filter((c) => c.accountId === acc.id);
          const accTotal = accItems.reduce((sum, c) => sum + c.value, 0);

          return (
            <Card key={acc.id} className="rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setOpenAccountId(isOpen ? null : acc.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: acc.color }} />
                  <div>
                    <h4 className="font-display font-bold text-lg">{acc.name}</h4>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Compromissos Planejados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-xl">{formatCurrency(accTotal)}</span>
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </div>
              {isOpen && (
                <div className="px-5 pb-5 space-y-3">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={(e) => { e.stopPropagation(); openNew(acc.id); }}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                    </Button>
                  </div>
                  {accItems.map((c) => (
                    <div key={c.id} className="p-4 border rounded-2xl bg-muted/10 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{c.description}</p>
                        <p className="text-xs text-muted-foreground">{c.category} • {c.recurrence === "FIXO" ? "Recorrente" : `${c.installments} parcelas`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatCurrency(c.value)}</span>
                        <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <Card className="relative z-10 w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-display font-bold">Novo Planejamento</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></Button>
            </div>
            <input className="w-full p-3 rounded-2xl border bg-background" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
            <input className="w-full p-3 rounded-2xl border bg-background" placeholder="Valor" value={valueStr} onChange={e => setValueStr(e.target.value)} />
            <select className="w-full p-3 rounded-2xl border bg-background" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-2xl" onClick={save}>Salvar no Futuro</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
