'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export default function V2BalancesPage() {
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

  const summary = useMemo(() => {
    let totalOwed = 0;
    let totalOwe = 0;

    const peopleMap = new Map<string, { name: string; amount: number }>();

    balanceQueries.forEach((query) => {
      const data = query.data as any;
      if (!data) return;

      const mine = data.userBalances?.find((entry: any) => entry.user.id === user?.id);
      if (mine) {
        if (mine.balance > 0) totalOwed += mine.balance;
        if (mine.balance < 0) totalOwe += Math.abs(mine.balance);
      }

      (data.settlementPlan || []).forEach((tx: any) => {
        if (tx.from?.id === user?.id) {
          const current = peopleMap.get(tx.to.id) || { name: tx.to.name, amount: 0 };
          current.amount -= tx.amount;
          peopleMap.set(tx.to.id, current);
        }
        if (tx.to?.id === user?.id) {
          const current = peopleMap.get(tx.from.id) || { name: tx.from.name, amount: 0 };
          current.amount += tx.amount;
          peopleMap.set(tx.from.id, current);
        }
      });
    });

    const people = Array.from(peopleMap.entries())
      .map(([id, value]) => ({ id, ...value }))
      .filter((person) => Math.abs(person.amount) > 0.01)
      .sort((a, b) => b.amount - a.amount);

    const byGroup = (groups || []).map((group: any, index: number) => {
      const data = balanceQueries[index]?.data as any;
      const mine = data?.userBalances?.find((entry: any) => entry.user.id === user?.id);
      return {
        id: group.id,
        name: group.name,
        balance: mine?.balance || 0,
      };
    });

    return {
      totalOwed,
      totalOwe,
      net: totalOwed - totalOwe,
      people,
      byGroup,
    };
  }, [balanceQueries, groups, user?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Balances</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of your real balances</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="v2-kpi v2-enter bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg">
          <p className="text-sm opacity-85">Net Balance</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.net)}</p>
        </article>
        <article className="v2-kpi v2-enter-delay-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">You are owed</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-500">{formatCurrency(summary.totalOwed)}</p>
        </article>
        <article className="v2-kpi v2-enter-delay-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">You owe</p>
          <p className="mt-2 text-3xl font-semibold text-rose-500">{formatCurrency(summary.totalOwe)}</p>
        </article>
      </section>

      <section className="v2-panel v2-enter-delay-2 p-5">
        <h2 className="text-lg font-semibold">People</h2>
        {!summary.people.length ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No pending balances with other members.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {summary.people.map((person) => (
              <article key={person.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm font-medium">{person.name}</p>
                <p className={`text-sm font-semibold ${person.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(person.amount)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">By Group</h2>
        {summary.byGroup.map((group) => (
          <article key={group.id} className="v2-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className={`text-sm font-semibold ${group.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(group.balance)}
                </p>
              </div>
              <Link href={`/v2/groups/${group.id}`} className="text-sm font-medium text-sky-600 dark:text-sky-400">
                View
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
