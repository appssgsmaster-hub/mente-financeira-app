import { useEffect, useMemo, useState } from "react";
import { useAccounts, useUser } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

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

// categorias universais (depois a gente deixa editável por empresa)
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

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// "875" => 87500 (centavos)
// "8,75" => 875
function moneyToCents(input: string) {
  const raw = (input ?? "").trim();
  if (!raw) return 0;

  // tira símbolos e espaços
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\s/g, "");

  // se tem vírgula e ponto, assume que o separador decimal é o ÚLTIMO
  // e remove os separadores de milhar
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

  // mês selecionado (0-11)
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());

  // accordion: qual conta está aberta
  const [openAccountId, setOpenAccountId] = useState<number | null>(null);

  // dados
  const [items, setItems] = useState<Commitment[]>([]);

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // form (string para valor, pra não virar 8,75 sem querer)
  const [accountId, setAccountId] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [valueStr, setValueStr] = useState("");
  const [startDate, setStartDate] = useState<string>(ymd(now));
  const [recurrence, setRecurrence] = useState<Recurrence>("FIXO");
  const [installmentsStr, setInstallmentsStr] = useState<string>("1");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  // load LS
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Commitment[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      // ignore
    }
  }, []);

  // save LS
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // default accountId quando carregar contas
  useEffect(() => {
    if (!accounts?.length) return;
    if (!accountId) setAccountId(accounts[0].id);
    if (openAccountId === null) setOpenAccountId(accounts[0].id);
  }, [accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthKey = useMemo(() => {
    const year = now.getFullYear(); // por enquanto no ano atual
    return `${year}-${pad2(monthIndex + 1)}`;
  }, [monthIndex, now]);

  const commitmentsThisMonth = useMemo(() => {
    // pega os que impactam o mês selecionado (simples: startDate <= fim do mês)
    // (depois refinamos recorrência e parcelas com mais precisão)
    const year = now.getFullYear();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    const msStart = monthStart.getTime();
    const msEnd = monthEnd.getTime();

    return items.filter((c) => {
      const d = new Date(c.startDate);
      const t = d.getTime();

      if (c.recurrence === "FIXO") {
        // fixo: aparece do startDate em diante
        return t <= msEnd;
      }

      // parcelado: aparece por N meses a partir do startDate
      const n = Math.max(1, Number(c.installments ?? 1));
      // calcula o índice de mês relativo
      const startY = d.getFullYear();
      const startM = d.getMonth();
      const curY = year;
      const curM = monthIndex;
      const diff = (curY - startY) * 12 + (curM - startM);

      return diff >= 0 && diff < n && t <= msEnd && msEnd >= msStart;
    });
  }, [items, monthIndex, now]);

  const sumByAccount = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of commitmentsThisMonth) {
      map.set(c.accountId, (map.get(c.accountId) || 0) + c.value);
    }
    return map;
  }, [commitmentsThisMonth]);

  const totalCommitted = useMemo(() => {
    return commitmentsThisMonth.reduce((sum, c) => sum + c.value, 0);
  }, [commitmentsThisMonth]);

  function openNew(targetAccountId?: number) {
    const accId = targetAccountId ?? accounts?.[0]?.id ?? 0;
    setEditingId(null);
    setAccountId(accId);
    setDescription("");
    setValueStr("");
    setStartDate(ymd(new Date(now.getFullYear(), monthIndex, now.getDate())));
    setRecurrence("FIXO");
    setInstallmentsStr("1");
    setCategory(CATEGORIES[0]);
    setIsModalOpen(true);
  }

  function openEdit(c: Commitment) {
    setEditingId(c.id);
    setAccountId(c.accountId);
    setDescription(c.description);
    // converte centavos -> string amigável (sem forçar separador)
    setValueStr(String((c.value / 100).toFixed(2)).replace(".", ","));
    setStartDate(c.startDate);
    setRecurrence(c.recurrence);
    setInstallmentsStr(String(c.installments ?? 1));
    setCategory(c.category);
    setIsModalOpen(true);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function save() {
    if (!accountId) return;
    if (!description.trim()) return;

    const valueCents = moneyToCents(valueStr);
    if (valueCents <= 0) return;

    const payload: Commitment = {
      id: editingId ?? makeId(),
      accountId,
      description: description.trim(),
      value: valueCents,
      startDate,
      recurrence,
      installments:
        recurrence === "PARCELADO"
          ? Math.max(1, Number(installmentsStr || 1))
          : undefined,
      category,
      createdAt: editingId
        ? (items.find((x) => x.id === editingId)?.createdAt ??
          new Date().toISOString())
        : new Date().toISOString(),
    };

    setItems((prev) => {
      if (editingId) return prev.map((x) => (x.id === editingId ? payload : x));
      return [payload, ...prev];
    });

    setIsModalOpen(false);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Projeção de Compromissos
          </h1>
          <p className="text-muted-foreground">
            Visualize o impacto das decisões ao longo do tempo.
          </p>
        </div>

        <Button onClick={() => openNew()} className="rounded-2xl px-5">
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Month pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {MONTHS.map((m, idx) => (
          <button
            key={m}
            onClick={() => setMonthIndex(idx)}
            className={[
              "px-4 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition",
              idx === monthIndex
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border text-muted-foreground",
            ].join(" ")}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Summary */}
      <Card className="p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-semibold">
              Comprometido ({MONTHS[monthIndex]}):
            </p>
          </div>
          <div className="text-2xl font-display font-bold text-primary">
            {formatCurrency(totalCommitted, user?.currency)}
          </div>
        </div>
      </Card>

      {/* Accounts list */}
      <div className="space-y-4">
        {(accounts || []).map((acc) => {
          const isOpen = openAccountId === acc.id;
          const accTotal = sumByAccount.get(acc.id) || 0;

          // itens dessa conta neste mês
          const accItems = commitmentsThisMonth
            .filter((c) => c.accountId === acc.id)
            .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

          return (
            <Card
              key={acc.id}
              className="rounded-3xl border border-border shadow-sm overflow-hidden"
            >
              {/* HEADER (setinha abre/fecha) */}
              <div className="w-full flex items-center justify-between gap-4 p-5">
                <button
                  className="flex items-center gap-3 text-left flex-1"
                  onClick={() =>
                    setOpenAccountId((prev: number | null) =>
                      prev === acc.id ? null : acc.id,
                    )
                  }
                >
                  <span
                    className="w-2.5 h-10 rounded-full"
                    style={{ backgroundColor: acc.color || "var(--primary)" }}
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-lg text-foreground truncate">
                      {acc.name}
                    </div>
                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Compromissos
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <div className="font-display font-bold text-xl text-foreground">
                    {formatCurrency(accTotal, user?.currency)}
                  </div>

                  <button
                    onClick={() =>
                      setOpenAccountId((prev: number | null) =>
                        prev === acc.id ? null : acc.id,
                      )
                    }
                    className="w-10 h-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center"
                    title={isOpen ? "Fechar" : "Abrir"}
                  >
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* BODY (só aparece quando ABRE) */}
              {isOpen && (
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {accItems.length ? "Itens" : "Sem compromissos"}
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openNew(acc.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {/* Lista de compromissos */}
                  {accItems.length > 0 && (
                    <div className="space-y-3">
                      {accItems.map((c) => (
                        <div
                          key={c.id}
                          className="border border-border rounded-2xl p-4 bg-background"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-bold text-foreground truncate">
                                {c.description}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {c.category} •{" "}
                                {c.recurrence === "FIXO"
                                  ? "Fixa"
                                  : `Parcelado (${Math.max(1, Number(c.installments ?? 1))}x)`}{" "}
                                • Início:{" "}
                                {new Date(c.startDate).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="font-display font-bold text-foreground">
                                {formatCurrency(c.value, user?.currency)}
                              </div>

                              <button
                                className="px-3 py-2 rounded-xl border border-border hover:bg-muted"
                                title="Editar"
                                onClick={() => openEdit(c)}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                className="px-3 py-2 rounded-xl border border-border hover:bg-muted"
                                title="Apagar"
                                onClick={() => remove(c.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-[92vw] max-w-3xl rounded-3xl bg-background border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {editingId
                    ? "Editar Compromisso"
                    : "Planejar Novo Compromisso"}
                </h2>
              </div>
              <button
                className="w-10 h-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center"
                onClick={() => setIsModalOpen(false)}
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* descrição */}
              <div className="md:col-span-1">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  DESCRIÇÃO
                </div>
                <input
                  className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: House Rent"
                />
              </div>

              {/* valor */}
              <div className="md:col-span-1">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  VALOR
                </div>
                <input
                  className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  placeholder="Ex: 875 ou 875,00"
                  inputMode="decimal"
                />
              </div>

              {/* data início */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  DATA DE INÍCIO
                </div>
                <input
                  type="date"
                  className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* categoria */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  CATEGORIA
                </div>
                <select
                  className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* recorrência */}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  RECORRÊNCIA
                </div>

                <div className="flex gap-2 bg-muted/40 p-2 rounded-2xl">
                  <button
                    className={[
                      "flex-1 h-11 rounded-xl font-bold transition",
                      recurrence === "FIXO"
                        ? "bg-background border border-border"
                        : "text-muted-foreground",
                    ].join(" ")}
                    onClick={() => setRecurrence("FIXO")}
                    type="button"
                  >
                    FIXO
                  </button>

                  <button
                    className={[
                      "flex-1 h-11 rounded-xl font-bold transition",
                      recurrence === "PARCELADO"
                        ? "bg-background border border-border"
                        : "text-muted-foreground",
                    ].join(" ")}
                    onClick={() => setRecurrence("PARCELADO")}
                    type="button"
                  >
                    PARCELADO
                  </button>
                </div>
              </div>

              {/* parcelas */}
              {recurrence === "PARCELADO" && (
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    PARCELAS
                  </div>
                  <input
                    className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                    value={installmentsStr}
                    onChange={(e) => setInstallmentsStr(e.target.value)}
                    placeholder="Ex: 6"
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* conta */}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  CONTA
                </div>
                <select
                  className="w-full h-11 rounded-xl border border-border px-3 outline-none bg-background"
                  value={String(accountId)}
                  onChange={(e) => setAccountId(Number(e.target.value))}
                >
                  {(accounts || []).map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-2xl px-5"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>

              <Button className="rounded-2xl px-6" onClick={save}>
                Salvar Plano
              </Button>
            </div>

            {/* dica mínima (sem explicação longa) */}
            <div className="mt-4 text-xs text-muted-foreground">
              Dica: Para <b>875</b> virar oitocentos e setenta e cinco, digite{" "}
              <b>875</b> (ou <b>875,00</b>).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
