'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, fmtDate, hueFromName, initials } from '@/lib/v2-format';
import { Receipt, Search } from 'lucide-react';

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  groupId: string;
  groupName: string;
  payer: { id: string; name: string };
};

export default function V2ExpensesPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const expenseQueries = useQueries({
    queries: (groups || []).map((g: any) => ({
      queryKey: ['group-expenses', g.id, 'v2'],
      queryFn: () => api.getGroupExpenses(g.id),
      enabled: !!g.id,
    })),
  });

  const expenses = useMemo<ExpenseRow[]>(() => {
    const items: ExpenseRow[] = [];
    expenseQueries.forEach((q, i) => {
      const group = (groups || [])[i];
      const list = (q.data as any[]) || [];
      list.forEach((e: any) => {
        items.push({
          id: e.id,
          description: e.description,
          amount: e.amount,
          currency: e.currency || group?.currency || 'EUR',
          date: e.date,
          groupId: group?.id,
          groupName: group?.name || '—',
          payer: e.payer || { id: '', name: '—' },
        });
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseQueries, groups]);

  const filtered = useMemo(() => {
    let list = expenses;
    if (groupFilter) list = list.filter((e) => e.groupId === groupFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.payer.name.toLowerCase().includes(q) ||
          e.groupName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, search, groupFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="v2-enter mx-auto max-w-5xl space-y-6">
      <header>
        <p className="v2-section-label">Tutte le spese</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Spese</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cerca e filtra tra tutti i tuoi gruppi.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca descrizione, persona, gruppo..."
            className="v2-input pl-9"
          />
        </div>
      </div>

      {(groups || []).length ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGroupFilter(null)}
            className={`v2-pill ${
              !groupFilter ? 'bg-[#7c5cff] text-white border-transparent' : ''
            }`}
          >
            Tutti
          </button>
          {(groups || []).map((g: any) => (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`v2-pill ${
                groupFilter === g.id ? 'bg-[#7c5cff] text-white border-transparent' : ''
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: `hsl(${hueFromName(g.name)} 60% 55%)` }}
              />
              {g.name}
            </button>
          ))}
        </div>
      ) : null}

      {!filtered.length ? (
        <div className="v2-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nessuna spesa trovata.
        </div>
      ) : (
        <div className="v2-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/v2/groups/${e.groupId}/expenses/${e.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                style={{ background: `hsl(${hueFromName(e.payer.name)} 55% 50%)` }}
                aria-hidden
              >
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.description}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {e.groupName} · pagato da {e.payer.id === user?.id ? 'te' : e.payer.name} · {fmtDate(e.date)}
                </p>
              </div>
              <p className="v2-tabular text-sm font-semibold">{fmtCurrency(e.amount, e.currency)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
