'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDate, getCategoryEmoji } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Trash2, Edit, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

export default function ExpenseDetailPage() {
  return (
    <AuthLayout>
      <ExpenseDetailContent />
    </AuthLayout>
  );
}

function ExpenseDetailContent() {
  const { id: groupId, expenseId } = useParams<{ id: string; expenseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t: tr } = useI18n();

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => api.getExpense(expenseId),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['expense-history', expenseId],
    queryFn: () => api.getExpenseHistory(expenseId),
    enabled: !!expenseId,
  });

  const deleteExpense = useMutation({
    mutationFn: () => api.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>{tr('expenseDetail.expenseDeleted')}</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              restoreExpense.mutate();
            }}
            className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white"
          >
            {tr('expenseDetail.undo')}
          </button>
        </div>
      ), {
        duration: 7000,
      });
      router.push(`/groups/${groupId}`);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const restoreExpense = useMutation({
    mutationFn: () => api.restoreExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      toast.success(tr('expenseDetail.expenseRestored'));
    },
    onError: (err: any) => toast.error(err.message || 'Failed to restore expense'),
  });

  const confirmExpense = useMutation({
    mutationFn: () => api.confirmExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expense-history', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success(tr('expenseDetail.confirmed'));
    },
    onError: (err: any) => toast.error(err.message || 'Failed to confirm expense'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!expense) {
    return <div className="text-center py-20 text-gray-500">{tr('expenseDetail.expenseNotFound')}</div>;
  }

  const myConfirmation = (expense.confirmations || []).find((c: any) => c.userId === user?.id);
  const canConfirm = !!user?.id && !!myConfirmation && myConfirmation.status !== 'confirmed';
  const pendingCount = (expense.confirmations || []).filter((c: any) => c.status === 'pending').length;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr('expenseDetail.backTo')} {expense.group?.name || 'Trip'}
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getCategoryEmoji(expense.category)}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{expense.description}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(expense.date)} · {expense.category}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {tr('expenseDetail.split')} {expense.splitType}
            </p>
            <div className="mt-2">
              {expense.status === 'pending_confirmation' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  <Clock className="h-3 w-3" />
                  {tr('expenseDetail.awaiting')} ({pendingCount})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {tr('expenseDetail.confirmed')}
                </span>
              )}
            </div>
          </div>
        </div>

        {canConfirm && (
          <button
            onClick={() => confirmExpense.mutate()}
            disabled={confirmExpense.isPending}
            className="mt-1 btn-primary text-sm gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmExpense.isPending ? tr('expenseDetail.confirming') : tr('expenseDetail.confirmExpense')}
          </button>
        )}

        {/* Payer */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
          <Avatar name={expense.payer.name} avatarUrl={expense.payer.avatarUrl} size="sm" />
          <div>
            <p className="text-sm font-medium text-green-800">{tr('expenseDetail.paidBy')} {expense.payer.name}</p>
            <p className="text-xs text-green-600">{expense.payer.email}</p>
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-1">{tr('expenseDetail.notes')}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {tr('expenseDetail.splitDetails')} ({expense.participants.length} {tr('expenseDetail.people')})
        </h2>
        <div className="space-y-3">
          {expense.participants.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={p.user.name} size="sm" />
                <div>
                  <p className="font-medium text-gray-900">{p.user.name}</p>
                  <p className="text-xs text-gray-500">{p.user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(p.share, expense.currency)}
                </p>
                {p.percentage != null && (
                  <p className="text-xs text-gray-500">{p.percentage}%</p>
                )}
                {p.isPayer && (
                  <span className="text-xs text-green-600 font-medium">{tr('expenseDetail.payer')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt */}
      {expense.receipt && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{tr('expenseDetail.attachedReceipt')}</h2>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <span className="text-sm text-gray-600">{expense.receipt.fileName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              expense.receipt.status === 'parsed'
                ? 'bg-green-100 text-green-700'
                : expense.receipt.status === 'processing'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {expense.receipt.status}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/groups/${groupId}/expenses/${expenseId}/edit`}
          className="btn-secondary gap-2"
        >
          <Edit className="h-4 w-4" />
          {tr('expenseDetail.editExpense')}
        </Link>
        <button
          onClick={() => {
            if (confirm(tr('expenseDetail.deleteConfirm'))) {
              deleteExpense.mutate();
            }
          }}
          className="btn-danger gap-2"
          disabled={deleteExpense.isPending}
        >
          <Trash2 className="h-4 w-4" />
          {deleteExpense.isPending ? tr('expenseDetail.deleting') : tr('expenseDetail.deleteExpense')}
        </button>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{tr('expenseDetail.history')}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">{tr('expenseDetail.noHistory')}</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-800 capitalize">{entry.action}</p>
                  <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {tr('expenseDetail.by')} {entry.actor?.name || 'System'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
