export const fmtCurrency = (n: number, c = 'EUR') =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: c,
    minimumFractionDigits: 2,
  }).format(n);

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d));

export const fmtDateShort = (d: string | Date) =>
  new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(d));

export const fmtRelativeDay = (d: string | Date) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Oggi';
  if (sameDay(date, yesterday)) return 'Ieri';
  return fmtDate(date);
};

export const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Stable hashed pastel color per name (for tinted avatars).
export const hueFromName = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
};
