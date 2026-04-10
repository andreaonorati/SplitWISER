'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDate, getCategoryEmoji } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => api.getExpense(expenseId),
  });

  const deleteExpense = useMutation({
    mutationFn: () => api.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Expense deleted');
      router.push(`/groups/${groupId}`);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!expense) {
    return <div className="text-center py-20 text-gray-500">Expense not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {expense.group?.name || 'Trip'}
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
              Split {expense.splitType}
            </p>
          </div>
        </div>

        {/* Payer */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
          <Avatar name={expense.payer.name} avatarUrl={expense.payer.avatarUrl} size="sm" />
          <div>
            <p className="text-sm font-medium text-green-800">Paid by {expense.payer.name}</p>
            <p className="text-xs text-green-600">{expense.payer.email}</p>
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Split Details ({expense.participants.length} people)
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
                  <span className="text-xs text-green-600 font-medium">Payer</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt */}
      {expense.receipt && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Attached Receipt</h2>
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
          Edit Expense
        </Link>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this expense?')) {
              deleteExpense.mutate();
            }
          }}
          className="btn-danger gap-2"
          disabled={deleteExpense.isPending}
        >
          <Trash2 className="h-4 w-4" />
          {deleteExpense.isPending ? 'Deleting...' : 'Delete Expense'}
        </button>
      </div>
    </div>
  );
}
