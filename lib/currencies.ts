// Shared currency list used by group + expense forms.
// Default for the whole app is EUR (Italian / European market focus).

export type CurrencyOption = {
  code: string;
  symbol: string;
  label: string;
};

export const DEFAULT_CURRENCY = 'EUR';

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Dollaro USA' },
  { code: 'GBP', symbol: '£', label: 'Sterlina' },
  { code: 'CHF', symbol: 'CHF', label: 'Franco svizzero' },
  { code: 'JPY', symbol: '¥', label: 'Yen' },
  { code: 'CAD', symbol: 'C$', label: 'Dollaro canadese' },
  { code: 'AUD', symbol: 'A$', label: 'Dollaro australiano' },
  { code: 'SEK', symbol: 'kr', label: 'Corona svedese' },
  { code: 'NOK', symbol: 'kr', label: 'Corona norvegese' },
  { code: 'DKK', symbol: 'kr', label: 'Corona danese' },
  { code: 'PLN', symbol: 'zł', label: 'Złoty' },
  { code: 'CZK', symbol: 'Kč', label: 'Corona ceca' },
  { code: 'HUF', symbol: 'Ft', label: 'Fiorino' },
  { code: 'CNY', symbol: '¥', label: 'Yuan' },
];

const SYMBOL_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c.symbol]));

export function currencySymbol(code: string | undefined | null): string {
  if (!code) return '€';
  return SYMBOL_BY_CODE.get(code.toUpperCase()) || code.toUpperCase();
}
