'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, fmtRelativeDay, hueFromName, initials } from '@/lib/v2-format';
import { ArrowLeftRight, Receipt } from 'lucide-react';

type ActivityResponse = {
  activities: Array<{
    id: string;
    type: 'expense' | 'settlement';
    date: string;
    data: {
      description?: string;
      amount?: number;
      currency?: string;
      payer?: { name: string };
      fromUser?: { name: string };
      toUser?: { name: string };
    };
  }>;
};

type FeedItem = {
  id: string;
  date: string;
  groupId: string;
  groupName: string;
  label: string;
  subLabel: string;
  amount?: number;
  currency: string;
  kind: 'expense' | 'settlement';
  actor: string;
};

export default function V2ActivityPage() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const activityQueries = useQueries({
    queries: (groups || []).map((g: any) => ({
      queryKey: ['activity', g.id, 'v2'],
      queryFn: () => api.getActivity(g.id, 50, 0) as Promise<ActivityResponse>,
      enabled: !!g.id,
    })),
  });

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    activityQueries.forEach((q, i) => {
      const group = (groups || [])[i];
      const data = (q.data as ActivityResponse | undefined)?.activities || [];
      data.forEach((entry) => {
        const isExpense = entry.type === 'expense';
        items.push({
          id: `${group?.id}-${entry.id}`,
          date: entry.date,
          groupId: group?.id,
          groupName: group?.name || '—',
          label: isExpense
            ? entry.data.description || 'Spesa'
            : `Pareggio: ${entry.data.fromUser?.name || ''} → ${entry.data.toUser?.name || ''}`,
          subLabel: isExpense
            ? entry.data.payer?.name
              ? `Pagato da ${entry.data.payer.name}`
              : ''
            : 'Pagamento',
          amount: entry.data.amount,
          currency: entry.data.currency || group?.currency || 'EUR',
          kind: entry.type,
          actor: isExpense
            ? entry.data.payer?.name || 'Spesa'
            : entry.data.fromUser?.name || 'Pareggio',
        });
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activityQueries, groups]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    feed.forEach((item) => {
      const key = fmtRelativeDay(item.date);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [feed]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="v2-enter mx-auto max-w-4xl space-y-6">
      <header>
        <p className="v2-section-label">Attività recenti</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tutto ciò che è successo.</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Spese e pareggi attraverso tutti i tuoi gruppi.
        </p>
      </header>

      {!feed.length ? (
        <div className="v2-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nessuna attività ancora.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="v2-section-label mb-2 px-1">{day}</h2>
              <div className="v2-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {items.map((item) => (
                  <article key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                      style={{ background: `hsl(${hueFromName(item.actor)} 55% 50%)` }}
                      aria-hidden
                    >
                      {item.kind === 'expense' ? (
                        <Receipt className="h-4 w-4" />
                      ) : (
                        <ArrowLeftRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.groupName}
                        {item.subLabel ? ` · ${item.subLabel}` : ''}
                      </p>
                    </div>
                    {typeof item.amount === 'number' ? (
                      <p
                        className={`v2-tabular text-sm font-semibold ${
                          item.kind === 'settlement' ? 'v2-credit' : ''
                        }`}
                      >
                        {fmtCurrency(item.amount, item.currency)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
