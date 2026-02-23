/**
 * Formats a value in cents to a localized currency string
 */
export function formatCurrency(cents: number, currency: string = "BRL"): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency,
  });
}

/**
 * Parses a string input (e.g., "1.250,50") into cents integer
 */
export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  // Remove anything that isn't a digit, comma, or period
  const clean = value.replace(/[^\d.,]/g, '');
  // Replace Brazilian comma decimal with period
  const standardized = clean.replace(/\./g, '').replace(',', '.');
  const float = parseFloat(standardized);
  return isNaN(float) ? 0 : Math.round(float * 100);
}
