import { create } from 'zustand';

interface ExpenseFormState {
  // Pre-fill data from AI parsing
  prefillData: {
    description?: string;
    amount?: number;
    date?: string;
    category?: string;
    notes?: string;
    suggestedParticipants?: string[];
  } | null;

  setPrefillData: (data: ExpenseFormState['prefillData']) => void;
  clearPrefillData: () => void;
}

export const useExpenseFormStore = create<ExpenseFormState>((set) => ({
  prefillData: null,

  setPrefillData: (data) => set({ prefillData: data }),
  clearPrefillData: () => set({ prefillData: null }),
}));
