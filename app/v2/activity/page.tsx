'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

type ActivityResponse = {
  activities: Array<{
    id: string;
    type: 'expense' | 'settlement';
    date: string;
    data: {
      description?: string;
      amount?: number;
      fromUser?: { name: string };
      toUser?: { name: string };
    };
  }>;
};

export default function V2ActivityPage() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const activityQueries = useQueries({
    queries: (groups || []).map((group: any) => ({
      queryKey: ['activity', group.id, 'v2-activity'],
      queryFn: () => api.getActivity(group.id, 20, 0) as Promise<ActivityResponse>,
      enabled: !!group.id,
    })),
  });

  const feed = useMemo(() => {
    const items: Array<{
      id: string;
      groupName: string;
      date: string;
      label: string;
      amount?: number;
    }> = [];

    activityQueries.forEach((query, index) => {
      const group = groups?.[index];
      const data = (query.data as ActivityResponse | undefined)?.activities || [];

      data.forEach((entry) => {
        const label =
          entry.type === 'expense'
            ? entry.data.description || 'Expense added'
            : `${entry.data.fromUser?.name || 'Member'} paid ${entry.data.toUser?.name || 'member'}`;

        items.push({
          id: `${group?.id || 'group'}-${entry.id}`,
          groupName: group?.name || 'Group',
          date: entry.date,
          label,
          amount: entry.data.amount,
        });
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activityQueries, groups]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Recent activity across your groups</p>
      </section>

      {!feed.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#171923] dark:text-slate-400">
          No activity yet.
        </section>
      ) : (
        <section className="space-y-3">
          {feed.map((item) => (
            <article key={item.id} className="v2-panel relative overflow-hidden px-4 py-3">
              <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-indigo-400/40 via-cyan-400/20 to-transparent" />
              <div className="flex items-start justify-between gap-3 pl-4">
                <div className="relative">
                  <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.groupName} · {formatDate(item.date)}
                  </p>
                </div>
                {typeof item.amount === 'number' ? (
                  <p className="text-sm font-semibold text-emerald-500">{formatCurrency(item.amount)}</p>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
