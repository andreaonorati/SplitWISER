'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowUpRight, Receipt, Sparkles, Users } from 'lucide-react';

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

export default function V2HomePage() {
  const { user } = useAuthStore();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const groupIds = (groups || []).map((group: any) => group.id);

  const balanceQueries = useQueries({
    queries: groupIds.map((groupId: string) => ({
      queryKey: ['balances', groupId],
      queryFn: () => api.getGroupBalances(groupId),
      enabled: !!groupId,
    })),
  });

  const activityQueries = useQueries({
    queries: groupIds.slice(0, 4).map((groupId: string) => ({
      queryKey: ['activity', groupId, 'v2-dashboard'],
      queryFn: () => api.getActivity(groupId, 10, 0) as Promise<ActivityResponse>,
      enabled: !!groupId,
    })),
  });

  const totals = useMemo(() => {
    let owed = 0;
    let owe = 0;

    for (const query of balanceQueries) {
      const balances = (query.data as any)?.userBalances || [];
      const mine = balances.find((entry: any) => entry.user.id === user?.id);
      if (!mine) continue;

      if (mine.balance > 0) owed += mine.balance;
      if (mine.balance < 0) owe += Math.abs(mine.balance);
    }

    return {
      owed,
      owe,
      net: owed - owe,
    };
  }, [balanceQueries, user?.id]);

  const recentActivities = useMemo(() => {
    const entries: Array<{
      id: string;
      date: string;
      groupName: string;
      label: string;
      amount?: number;
      kind: 'expense' | 'settlement';
    }> = [];

    activityQueries.forEach((query, index) => {
      const group = groups?.[index];
      const activity = (query.data as ActivityResponse | undefined)?.activities || [];

      activity.forEach((item) => {
        const label =
          item.type === 'expense'
            ? item.data.description || 'Expense'
            : `${item.data.fromUser?.name || 'Member'} paid ${item.data.toUser?.name || 'member'}`;

        entries.push({
          id: `${group?.id || 'group'}-${item.id}`,
          date: item.date,
          groupName: group?.name || 'Group',
          label,
          amount: item.data.amount,
          kind: item.type,
        });
      });
    });

    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [activityQueries, groups]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="v2-panel v2-enter col-span-12 overflow-hidden p-7 lg:col-span-8">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2.5rem] bg-gradient-to-br from-cyan-400/25 to-indigo-500/10" />
        <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Smart Overview
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Desktop command center for your shared finances, fed only by live group data.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/v2/groups" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Open Groups
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/groups/new" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            Create Group
          </Link>
        </div>
      </section>

      <section className="v2-panel v2-enter-delay-1 col-span-12 p-6 lg:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Portfolio</p>
        <p className="mt-3 text-4xl font-semibold">{formatCurrency(totals.net)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Net balance across all groups</p>
      </section>

      <section className="v2-kpi v2-enter-delay-1 col-span-12 md:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">You are owed</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-500">{formatCurrency(totals.owed)}</p>
      </section>
      <section className="v2-kpi v2-enter-delay-2 col-span-12 md:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">You owe</p>
        <p className="mt-2 text-3xl font-semibold text-rose-500">{formatCurrency(totals.owe)}</p>
      </section>
      <section className="v2-kpi v2-enter-delay-3 col-span-12 md:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Active groups</p>
        <p className="mt-2 text-3xl font-semibold">{(groups || []).length}</p>
      </section>

      <section className="v2-panel v2-enter-delay-2 col-span-12 p-5 lg:col-span-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent groups</h3>
          <Link href="/v2/groups" className="text-sm font-medium text-sky-600 dark:text-sky-400">View all</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(groups || []).slice(0, 4).map((group: any) => (
            <Link
              key={group.id}
              href={`/v2/groups/${group.id}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/40"
            >
              <p className="text-base font-semibold">{group.name}</p>
              {group.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.members.length} members</span>
                <span className="inline-flex items-center gap-1"><Receipt className="h-3.5 w-3.5" />{group._count?.expenses || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="v2-panel v2-enter-delay-3 col-span-12 p-5 lg:col-span-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Activity feed</h3>
          <Link href="/v2/activity" className="text-sm font-medium text-sky-600 dark:text-sky-400">Open</Link>
        </div>

        {!recentActivities.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
        ) : (
          <div className="space-y-2.5">
            {recentActivities.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.groupName} · {formatDate(item.date)}</p>
                {typeof item.amount === 'number' ? (
                  <p className={`mt-1 text-sm font-semibold ${item.kind === 'expense' ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-500'}`}>
                    {formatCurrency(item.amount)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
