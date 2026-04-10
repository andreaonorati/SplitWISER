import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    food: '🍽️',
    transport: '🚗',
    accommodation: '🏨',
    entertainment: '🎭',
    shopping: '🛍️',
    groceries: '🛒',
    utilities: '💡',
    general: '📝',
  };
  return map[category] || '📝';
}
