export function formatCurrency(value: number, currency: string = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    // fallback simples
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}
