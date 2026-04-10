// ── Shared Types ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface GroupTrip {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  coverImage?: string | null;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  _count?: { expenses: number };
}

export interface GroupMember {
  id: string;
  role: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  notes?: string | null;
  splitType: 'equal' | 'percentage' | 'custom';
  payerId: string;
  groupId: string;
  payer: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  participants: ExpenseParticipant[];
  receipt?: ReceiptUpload | null;
  createdAt: string;
}

export interface ExpenseParticipant {
  id: string;
  share: number;
  percentage?: number | null;
  isPayer: boolean;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Settlement {
  id: string;
  amount: number;
  currency: string;
  note?: string | null;
  status: 'pending' | 'confirmed';
  fromUserId: string;
  toUserId: string;
  groupId: string;
  fromUser: Pick<User, 'id' | 'name'>;
  toUser: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface ReceiptUpload {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  ocrRawText?: string | null;
  parsedData?: ParsedExpense | null;
  status: 'processing' | 'parsed' | 'failed';
  createdAt: string;
}

export interface ParsedExpense {
  merchantName: string;
  date: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  taxAmount?: number | null;
  tipAmount?: number | null;
  category: string;
  confidence: number;
}

export interface BalanceInfo {
  totalExpenses: number;
  expenseCount: number;
  userBalances: Array<{
    user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
    balance: number;
    contribution: {
      paid: number;
      owes: number;
      net: number;
    };
  }>;
  settlementPlan: Array<{
    from: Pick<User, 'id' | 'name'>;
    to: Pick<User, 'id' | 'name'>;
    amount: number;
  }>;
}

export interface ImportResult {
  receiptId?: string;
  parsedData: ParsedExpense | ParsedExpense[];
  suggestedParticipants: string[];
  members: Array<{ id: string; name: string }>;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'shopping'
  | 'groceries'
  | 'utilities'
  | 'general';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'food', label: 'Food & Dining', emoji: '🍽️' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'accommodation', label: 'Accommodation', emoji: '🏨' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'groceries', label: 'Groceries', emoji: '🛒' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'general', label: 'General', emoji: '📝' },
];
