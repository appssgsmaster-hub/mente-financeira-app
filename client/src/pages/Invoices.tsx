import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Trash2, Pencil, Printer, Eye, ChevronLeft, FileText,
  CheckCircle2, Clock, Send, ExternalLink, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, InvoiceWithItems, InvoiceItem, CompanyProfile, BankDetails } from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function calcTotals(items: { quantity: number; serviceValue: number }[], vatPct: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.serviceValue, 0);
  const vatAmount = Math.round(subtotal * vatPct / 100);
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, total };
}

function nextInvoiceNumber(invoices: Invoice[]) {
  if (!invoices.length) return "INV-0001";
  const nums = invoices.map(i => {
    const m = i.invoiceNumber.match(/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = Math.max(...nums) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

type Status = "draft" | "sent" | "paid";
const STATUS_LABEL: Record<Status, string> = { draft: "Rascunho", sent: "Enviada", paid: "Paga" };
const STATUS_COLOR: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
};

// ─── Print Stylesheet ─────────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  body > * { display: none !important; }
  #invoice-print-root { display: block !important; }
  #invoice-print-root { position: fixed; inset: 0; background: white; }
  @page { margin: 15mm; }
}
#invoice-print-root { display: none; }
`;

// ─── Invoice PDF View ─────────────────────────────────────────────────────────

function InvoicePdfView({ inv, company, bank }: {
  inv: InvoiceWithItems;
  company: CompanyProfile | null;
  bank: BankDetails | null;
}) {
  const { subtotal, vatAmount, total } = calcTotals(inv.items, inv.vatPercent);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", fontSize: 13, lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, borderBottom: "3px solid #1a1a2e", paddingBottom: 20 }}>
        <div>
          {company?.logoUrl && (
            <img src={company.logoUrl} alt="Logo" style={{ maxHeight: 60, marginBottom: 8 }} />
          )}
          <div style={{ fontWeight: 700, fontSize: 18 }}>{company?.companyName || "Sua Empresa"}</div>
          {company?.addressLine1 && <div>{company.addressLine1}</div>}
          {company?.addressLine2 && <div>{company.addressLine2}</div>}
          {company?.city && <div>{company.city}</div>}
          {company?.phone && <div>Tel: {company.phone}</div>}
          {company?.email && <div>Email: {company.email}</div>}
          {company?.registrationNumber && <div>Reg. No: {company.registrationNumber}</div>}
          {company?.vatNumber && <div>VAT No: {company.vatNumber}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1a1a2e", letterSpacing: -1 }}>INVOICE</div>
          <table style={{ marginLeft: "auto", marginTop: 8 }}>
            <tbody>
              <tr><td style={{ paddingRight: 12, color: "#555" }}>Invoice No:</td><td style={{ fontWeight: 700 }}>{inv.invoiceNumber}</td></tr>
              <tr><td style={{ color: "#555" }}>Date:</td><td style={{ fontWeight: 700 }}>{inv.invoiceDate}</td></tr>
              {inv.clientId && <tr><td style={{ color: "#555" }}>Client ID:</td><td>{inv.clientId}</td></tr>}
              {inv.terms && <tr><td style={{ color: "#555" }}>Terms:</td><td>{inv.terms}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#555", marginBottom: 6 }}>Invoice To</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{inv.clientName}</div>
        {inv.clientCompany && <div>{inv.clientCompany}</div>}
        {inv.clientAddress && <div style={{ whiteSpace: "pre-line" }}>{inv.clientAddress}</div>}
        {inv.clientPhone && <div>Tel: {inv.clientPhone}</div>}
        {(inv.processRef || inv.processName) && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: "#f3f4f6", borderRadius: 4, fontSize: 12 }}>
            {inv.processRef && <span style={{ marginRight: 12 }}>Ref: <strong>{inv.processRef}</strong></span>}
            {inv.processName && <span>Process: <strong>{inv.processName}</strong></span>}
          </div>
        )}
      </div>

      {/* Services Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "#1a1a2e", color: "white" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, width: 36 }}>Nº</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>Service Description</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, width: 60 }}>QTD</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 110 }}>Service Value</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 110 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>{idx + 1}</td>
              <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>{item.serviceDescription}</td>
              <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>{fmtEur(item.serviceValue)}</td>
              <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", textAlign: "right", fontWeight: 600 }}>{fmtEur(item.quantity * item.serviceValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
        <table style={{ minWidth: 260 }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 12px 4px 0", color: "#555" }}>Subtotal</td>
              <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>{fmtEur(subtotal)}</td>
            </tr>
            {inv.vatPercent > 0 && (
              <>
                <tr>
                  <td style={{ padding: "4px 12px 4px 0", color: "#555" }}>VAT ({inv.vatPercent}%)</td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>{fmtEur(vatAmount)}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "2px solid #1a1a2e" }}>
              <td style={{ padding: "8px 12px 4px 0", fontWeight: 700, fontSize: 15 }}>Total</td>
              <td style={{ padding: "8px 0 4px", textAlign: "right", fontWeight: 800, fontSize: 15 }}>{fmtEur(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Details */}
      {bank && (bank.iban || bank.accountHolder) && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#555", marginBottom: 8 }}>Payment Details</div>
          <div style={{ marginBottom: 6, color: "#555" }}>To make the payment, please use the details below.</div>
          <table>
            <tbody>
              {bank.accountHolder && <tr><td style={{ paddingRight: 16, color: "#555" }}>Account Holder:</td><td style={{ fontWeight: 600 }}>{bank.accountHolder}</td></tr>}
              {bank.bankName && <tr><td style={{ color: "#555" }}>Bank:</td><td style={{ fontWeight: 600 }}>{bank.bankName}</td></tr>}
              {bank.iban && <tr><td style={{ color: "#555" }}>IBAN:</td><td style={{ fontWeight: 600, fontFamily: "monospace" }}>{bank.iban}</td></tr>}
              {bank.bic && <tr><td style={{ color: "#555" }}>BIC/SWIFT:</td><td style={{ fontWeight: 600, fontFamily: "monospace" }}>{bank.bic}</td></tr>}
              {bank.paymentNote && <tr><td colSpan={2} style={{ paddingTop: 6, color: "#555", fontStyle: "italic" }}>{bank.paymentNote}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Stripe payment link */}
      {inv.stripePaymentLink && (
        <div style={{ marginBottom: 16, padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6 }}>
          <span style={{ color: "#1d4ed8" }}>Pay online: </span>
          <a href={inv.stripePaymentLink} style={{ color: "#1d4ed8", fontWeight: 600 }}>{inv.stripePaymentLink}</a>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, textAlign: "center", color: "#555", fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Thank you for choosing us!</div>
        <div>If you have any questions regarding this invoice, please contact us.</div>
        {company?.phone && <span style={{ marginRight: 12 }}>Tel: {company.phone}</span>}
        {company?.email && <span>Email: {company.email}</span>}
      </div>
    </div>
  );
}

// ─── Empty Line Item ──────────────────────────────────────────────────────────

const emptyItem = () => ({ serviceDescription: "", quantity: 1, serviceValue: 0 });

// ─── Invoice Form ─────────────────────────────────────────────────────────────

function InvoiceForm({ initial, onSave, onCancel, nextNumber }: {
  initial?: InvoiceWithItems | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  nextNumber: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    invoiceNumber: initial?.invoiceNumber ?? nextNumber,
    invoiceDate: initial?.invoiceDate ?? today,
    terms: initial?.terms ?? "Due upon receipt",
    clientId: initial?.clientId ?? "",
    clientName: initial?.clientName ?? "",
    clientCompany: initial?.clientCompany ?? "",
    clientAddress: initial?.clientAddress ?? "",
    clientPhone: initial?.clientPhone ?? "",
    processRef: initial?.processRef ?? "",
    processName: initial?.processName ?? "",
    vatPercent: initial?.vatPercent ?? 0,
    stripePaymentLink: initial?.stripePaymentLink ?? "",
    status: (initial?.status ?? "draft") as Status,
  });
  const [items, setItems] = useState<{ serviceDescription: string; quantity: number; serviceValue: number }[]>(
    initial?.items?.map(i => ({ serviceDescription: i.serviceDescription, quantity: i.quantity, serviceValue: i.serviceValue / 100 })) ?? [emptyItem()]
  );

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function setItem(idx: number, k: string, v: any) {
    setItems(items => items.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  }
  function addItem() { setItems(i => [...i, emptyItem()]); }
  function removeItem(idx: number) { setItems(i => i.filter((_, j) => j !== idx)); }

  const itemsForCalc = items.map(i => ({ quantity: i.quantity, serviceValue: Math.round(i.serviceValue * 100) }));
  const { subtotal, vatAmount, total } = calcTotals(itemsForCalc, form.vatPercent);

  function handleSave() {
    if (!form.clientName.trim()) return alert("Nome do cliente é obrigatório.");
    if (!form.invoiceNumber.trim()) return alert("Número da fatura é obrigatório.");
    onSave({
      ...form,
      vatPercent: Number(form.vatPercent),
      stripePaymentLink: form.stripePaymentLink || null,
      items: items.map((it, i) => ({
        serviceDescription: it.serviceDescription,
        quantity: Number(it.quantity),
        serviceValue: Math.round(Number(it.serviceValue) * 100),
        position: i,
      })),
    });
  }

  const inputCls = "w-full p-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block";

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Número da Fatura</label>
          <input className={inputCls} value={form.invoiceNumber} onChange={e => setField("invoiceNumber", e.target.value)} data-testid="input-invoice-number" />
        </div>
        <div>
          <label className={labelCls}>Data</label>
          <input type="date" className={inputCls} value={form.invoiceDate} onChange={e => setField("invoiceDate", e.target.value)} data-testid="input-invoice-date" />
        </div>
        <div>
          <label className={labelCls}>Terms</label>
          <input className={inputCls} value={form.terms} onChange={e => setField("terms", e.target.value)} placeholder="Ex: Due upon receipt" data-testid="input-invoice-terms" />
        </div>
      </div>

      {/* Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>ID do Cliente</label>
          <input className={inputCls} value={form.clientId} onChange={e => setField("clientId", e.target.value)} placeholder="Ex: CLI-001" data-testid="input-client-id" />
        </div>
        <div>
          <label className={labelCls}>Nome do Cliente *</label>
          <input className={inputCls} value={form.clientName} onChange={e => setField("clientName", e.target.value)} placeholder="Nome completo" data-testid="input-client-name" />
        </div>
        <div>
          <label className={labelCls}>Empresa / Empregador</label>
          <input className={inputCls} value={form.clientCompany} onChange={e => setField("clientCompany", e.target.value)} data-testid="input-client-company" />
        </div>
        <div>
          <label className={labelCls}>Telefone do Cliente</label>
          <input className={inputCls} value={form.clientPhone} onChange={e => setField("clientPhone", e.target.value)} data-testid="input-client-phone" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Endereço do Cliente</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.clientAddress} onChange={e => setField("clientAddress", e.target.value)} data-testid="input-client-address" />
        </div>
      </div>

      {/* Process */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Referência do Processo</label>
          <input className={inputCls} value={form.processRef} onChange={e => setField("processRef", e.target.value)} placeholder="Ex: PROC-2024-001" data-testid="input-process-ref" />
        </div>
        <div>
          <label className={labelCls}>Nome do Processo</label>
          <input className={inputCls} value={form.processName} onChange={e => setField("processName", e.target.value)} data-testid="input-process-name" />
        </div>
      </div>

      {/* Items Table */}
      <div>
        <label className={labelCls}>Serviços</label>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8">Nº</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Service Description</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground w-20">QTD</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground w-32">Service Value (€)</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground w-28">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => (
                <tr key={idx} className="bg-background">
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <input className="w-full p-1.5 rounded-lg border border-input bg-background text-sm" value={item.serviceDescription} onChange={e => setItem(idx, "serviceDescription", e.target.value)} placeholder="Descrição do serviço" data-testid={`input-item-desc-${idx}`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" className="w-full p-1.5 rounded-lg border border-input bg-background text-sm text-center" value={item.quantity} onChange={e => setItem(idx, "quantity", e.target.value)} data-testid={`input-item-qty-${idx}`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" className="w-full p-1.5 rounded-lg border border-input bg-background text-sm text-right" value={item.serviceValue} onChange={e => setItem(idx, "serviceValue", e.target.value)} data-testid={`input-item-value-${idx}`} />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtEur(Math.round(item.quantity * item.serviceValue * 100))}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-item-${idx}`}><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-border bg-muted/20">
            <button onClick={addItem} className="text-sm text-primary font-medium flex items-center gap-1.5 hover:underline" data-testid="button-add-item">
              <Plus className="w-3.5 h-3.5" /> Adicionar serviço
            </button>
          </div>
        </div>
      </div>

      {/* VAT + Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>VAT % (0 se isento)</label>
            <input type="number" min="0" max="100" step="0.1" className={inputCls} value={form.vatPercent} onChange={e => setField("vatPercent", parseFloat(e.target.value) || 0)} data-testid="input-vat-percent" />
          </div>
          <div>
            <label className={labelCls}>Stripe Payment Link (opcional)</label>
            <input className={inputCls} value={form.stripePaymentLink} onChange={e => setField("stripePaymentLink", e.target.value)} placeholder="https://buy.stripe.com/..." data-testid="input-stripe-link" />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={e => setField("status", e.target.value)} data-testid="select-invoice-status">
              <option value="draft">Rascunho</option>
              <option value="sent">Enviada</option>
              <option value="paid">Paga</option>
            </select>
          </div>
        </div>
        <div className="rounded-2xl border border-border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{fmtEur(subtotal)}</span></div>
          {form.vatPercent > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">VAT ({form.vatPercent}%)</span><span>{fmtEur(vatAmount)}</span></div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-bold text-base">Total</span>
            <span className="font-bold text-base text-primary">{fmtEur(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} className="rounded-2xl px-6" data-testid="button-save-invoice">
          {initial ? "Salvar Alterações" : "Criar Fatura"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-2xl" data-testid="button-cancel-invoice">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type View = "list" | "form" | "preview";

export default function Invoices() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<View>("list");
  const [editingInv, setEditingInv] = useState<InvoiceWithItems | null>(null);
  const [previewInv, setPreviewInv] = useState<InvoiceWithItems | null>(null);

  const { data: invoiceList = [], isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: company } = useQuery<CompanyProfile | null>({ queryKey: ["/api/company-profile"] });
  const { data: bank } = useQuery<BankDetails | null>({ queryKey: ["/api/bank-details"] });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/invoices"] });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { invalidate(); setView("list"); toast({ title: "Fatura criada com sucesso!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { invalidate(); setView("list"); toast({ title: "Fatura atualizada!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message);
    },
    onSuccess: () => { invalidate(); toast({ title: "Fatura apagada." }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/invoices/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  async function loadForEdit(inv: Invoice) {
    const res = await fetch(`/api/invoices/${inv.id}`, { credentials: "include" });
    const full: InvoiceWithItems = await res.json();
    setEditingInv(full);
    setView("form");
  }

  async function loadForPreview(inv: Invoice) {
    const res = await fetch(`/api/invoices/${inv.id}`, { credentials: "include" });
    const full: InvoiceWithItems = await res.json();
    setPreviewInv(full);
    setView("preview");
  }

  function handlePrint() {
    window.print();
  }

  const nextNumber = nextInvoiceNumber(invoiceList);

  // ── List View ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <style>{PRINT_CSS}</style>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold">Faturas</h1>
            <p className="text-sm text-muted-foreground mt-1">Crie e gerencie suas faturas profissionais.</p>
          </div>
          <Button onClick={() => { setEditingInv(null); setView("form"); }} className="rounded-2xl gap-2" data-testid="button-new-invoice">
            <Plus className="w-4 h-4" /> Nova Fatura
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando...</div>
        ) : invoiceList.length === 0 ? (
          <Card className="p-16 rounded-3xl flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Nenhuma fatura ainda</h2>
            <p className="text-muted-foreground text-sm max-w-xs">Crie sua primeira fatura clicando no botão "Nova Fatura".</p>
            <Button onClick={() => { setEditingInv(null); setView("form"); }} className="rounded-2xl mt-2" data-testid="button-new-invoice-empty">
              <Plus className="w-4 h-4 mr-2" /> Nova Fatura
            </Button>
          </Card>
        ) : (
          <Card className="rounded-3xl overflow-hidden border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground">Fatura</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden sm:table-cell">Cliente</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden md:table-cell">Data</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoiceList.map(inv => {
                    const st = (inv.status || "draft") as Status;
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-invoice-${inv.id}`}>
                        <td className="px-5 py-4">
                          <div className="font-bold text-foreground">{inv.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground sm:hidden mt-0.5">{inv.clientName}</div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <div className="font-medium">{inv.clientName}</div>
                          {inv.clientCompany && <div className="text-xs text-muted-foreground">{inv.clientCompany}</div>}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{inv.invoiceDate}</td>
                        <td className="px-5 py-4 text-center">
                          <select
                            value={st}
                            onChange={e => statusMut.mutate({ id: inv.id, status: e.target.value })}
                            className={`text-xs font-semibold rounded-full px-3 py-1 border-0 cursor-pointer ${STATUS_COLOR[st]}`}
                            data-testid={`select-status-${inv.id}`}
                          >
                            <option value="draft">Rascunho</option>
                            <option value="sent">Enviada</option>
                            <option value="paid">Paga</option>
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => loadForPreview(inv)} title="Visualizar / Imprimir" data-testid={`button-preview-${inv.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => loadForEdit(inv)} data-testid={`button-edit-${inv.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:text-destructive" onClick={() => { if (confirm("Apagar esta fatura?")) deleteMut.mutate(inv.id); }} data-testid={`button-delete-${inv.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ── Form View ──────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <style>{PRINT_CSS}</style>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setView("list")} data-testid="button-back-list">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">{editingInv ? "Editar Fatura" : "Nova Fatura"}</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados abaixo para gerar a fatura.</p>
          </div>
        </div>
        <Card className="p-6 sm:p-8 rounded-3xl border-border/50">
          <InvoiceForm
            initial={editingInv}
            nextNumber={nextNumber}
            onCancel={() => setView("list")}
            onSave={data => {
              if (editingInv) {
                updateMut.mutate({ id: editingInv.id, data });
              } else {
                createMut.mutate(data);
              }
            }}
          />
        </Card>
      </div>
    );
  }

  // ── Preview / Print View ───────────────────────────────────────────────────
  if (view === "preview" && previewInv) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 pb-12">
        {/* Print CSS — hides everything else when printing */}
        <style>{PRINT_CSS}</style>

        {/* Toolbar (hidden on print) */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setView("list")} data-testid="button-back-from-preview">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Fatura {previewInv.invoiceNumber}</h1>
              <p className="text-sm text-muted-foreground">{previewInv.clientName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl gap-2" onClick={() => loadForEdit(previewInv)} data-testid="button-edit-from-preview">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button className="rounded-2xl gap-2" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Invoice card — visible on screen and printed */}
        <Card className="p-8 sm:p-12 rounded-3xl border-border/50 shadow-sm" id="invoice-print-root" ref={printRef}>
          <InvoicePdfView inv={previewInv} company={company ?? null} bank={bank ?? null} />
        </Card>
      </div>
    );
  }

  return null;
}
