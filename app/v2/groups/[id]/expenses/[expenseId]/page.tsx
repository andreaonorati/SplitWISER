'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, fmtDate, hueFromName, initials } from '@/lib/v2-format';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategoryEmoji } from '@/lib/utils';

export default function V2ExpenseDetailPage() {
  const { id: groupId, expenseId } = useParams<{ id: string; expenseId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => api.getExpense(expenseId),
    enabled: !!expenseId,
  });

  const deleteExpense = useMutation({
    mutationFn: () => api.deleteExpense(expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-expenses', groupId] });
      toast.success('Spesa eliminata');
      router.push(`/v2/groups/${groupId}`);
    },
    onError: (err: any) => toast.error(err.message || 'Errore eliminazione'),
  });

  if (isLoading || !expense) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const currency = expense.currency || 'EUR';
  const canDelete = expense.payer?.id === user?.id || expense.createdById === user?.id;

  return (
    <div className="v2-enter mx-auto max-w-2xl space-y-6">
      <Link
        href={`/v2/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna al gruppo
      </Link>

      <header className="v2-card p-6">
        <p className="v2-section-label">{getCategoryEmoji(expense.category)} {expense.category}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{expense.description}</h1>
        <p className="mt-2 v2-tabular text-2xl font-semibold">
          {fmtCurrency(expense.amount, currency)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pagato da {expense.payer?.id === user?.id ? 'te' : expense.payer?.name} · {fmtDate(expense.date)}
        </p>
        {expense.notes ? (
          <p className="mt-3 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            {expense.notes}
          </p>
        ) : null}
      </header>

      <section className="v2-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Divisione</h2>
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {(expense.participants || []).map((p: any) => (
            <li key={p.userId} className="flex items-center gap-3 py-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: `hsl(${hueFromName(p.user.name)} 55% 50%)` }}
              >
                {initials(p.user.name)}
              </span>
              <span className="flex-1 text-sm font-medium">
                {p.user.id === user?.id ? 'Tu' : p.user.name}
                {p.isPayer ? <span className="ml-2 text-xs text-[#7c5cff]">pagante</span> : null}
              </span>
              <span className="v2-tabular text-sm font-semibold">
                {fmtCurrency(p.share, currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/v2/groups/${groupId}/expenses/${expenseId}/edit`}
          className="v2-btn v2-btn-ghost flex-1"
        >
          Modifica
        </Link>
        {canDelete ? (
          <button
            type="button"
            disabled={deleteExpense.isPending}
            onClick={() => {
              if (confirm('Eliminare questa spesa?')) deleteExpense.mutate();
            }}
            className="v2-btn v2-btn-ghost text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            {deleteExpense.isPending ? 'Eliminazione…' : 'Elimina'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
