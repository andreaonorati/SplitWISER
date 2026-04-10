import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GroupTrip, Expense, BalanceInfo } from '@/types';

// ── Groups ──────────────────────────────────────────────────────────
export function useGroups() {
  return useQuery<GroupTrip[]>({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });
}

export function useGroup(id: string) {
  return useQuery<GroupTrip & { expenses: Expense[]; settlements: any[] }>({
    queryKey: ['group', id],
    queryFn: () => api.getGroup(id),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; currency?: string }) =>
      api.createGroup(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

// ── Expenses ────────────────────────────────────────────────────────
export function useGroupExpenses(groupId: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', groupId],
    queryFn: () => api.getGroupExpenses(groupId),
    enabled: !!groupId,
  });
}

export function useExpense(id: string) {
  return useQuery<Expense>({
    queryKey: ['expense', id],
    queryFn: () => api.getExpense(id),
    enabled: !!id,
  });
}

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });
}

// ── Balances & Settlements ──────────────────────────────────────────
export function useGroupBalances(groupId: string) {
  return useQuery<BalanceInfo>({
    queryKey: ['balances', groupId],
    queryFn: () => api.getGroupBalances(groupId),
    enabled: !!groupId,
  });
}

export function useCreateSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { groupId: string; toUserId: string; amount: number; note?: string }) =>
      api.createSettlement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}

export function useConfirmSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settlementId: string) => api.confirmSettlement(settlementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}

// ── Import ──────────────────────────────────────────────────────────
export function useUploadReceipt() {
  return useMutation({
    mutationFn: ({ file, groupId }: { file: File; groupId: string }) =>
      api.uploadReceipt(file, groupId),
  });
}

export function useParseText() {
  return useMutation({
    mutationFn: ({ text, groupId }: { text: string; groupId: string }) =>
      api.parseText(text, groupId),
  });
}

// ── Profile ─────────────────────────────────────────────────────────
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: { name: string }) => api.updateProfile(data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.changePassword(data),
  });
}

// ── Activity ────────────────────────────────────────────────────────
export function useActivity(groupId: string) {
  return useQuery({
    queryKey: ['activity', groupId],
    queryFn: () => api.getActivity(groupId),
    enabled: !!groupId,
  });
}
