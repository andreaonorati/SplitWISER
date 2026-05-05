'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, hueFromName, initials } from '@/lib/v2-format';
import { ArrowRight } from 'lucide-react';

export default function V2BalancesPage() {
  const { user } = useAuthStore();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const balanceQueries = useQueries({
    queries: (groups || []).map((g: any) => ({
      queryKey: ['balances', g.id],
      queryFn: () => api.getGroupBalances(g.id),
      enabled: !!g.id,
    })),
  });

  const summary = useMemo(() => {
    let owed = 0;
    let owe = 0;
    const peopleMap = new Map<string, { id: string; name: string; amount: number; currency: string }>();
    const currencies = new Set<string>();

    balanceQueries.forEach((q, i) => {
      const data = q.data as any;
      if (!data) return;
      const group = (groups || [])[i];
      const currency = group?.currency || 'EUR';
      currencies.add(currency);

      const mine = data.userBalances?.find((e: any) => e.user.id === user?.id);
      if (mine) {
        if (mine.balance > 0) owed += mine.balance;
        if (mine.balance < 0) owe += Math.abs(mine.balance);
      }

      (data.settlementPlan || []).forEach((tx: any) => {
        if (tx.from?.id === user?.id) {
          const e = peopleMap.get(tx.to.id) || { id: tx.to.id, name: tx.to.name, amount: 0, currency };
          e.amount -= tx.amount;
          peopleMap.set(tx.to.id, e);
        }
        if (tx.to?.id === user?.id) {
          const e = peopleMap.get(tx.from.id) || { id: tx.from.id, name: tx.from.name, amount: 0, currency };
          e.amount += tx.amount;
          peopleMap.set(tx.from.id, e);
        }
      });
    });

    const people = Array.from(peopleMap.values())
      .filter((p) => Math.abs(p.amount) > 0.01)
      .sort((a, b) => b.amount - a.amount);

    const byGroup = (groups || []).map((g: any, i: number) => {
      const data = balanceQueries[i]?.data as any;
      const mine = data?.userBalances?.find((e: any) => e.user.id === user?.id);
      return {
        id: g.id,
        name: g.name,
        currency: g.currency || 'EUR',
        balance: mine?.balance || 0,
      };
    });

    return {
      owed,
      owe,
      net: owed - owe,
      people,
      byGroup,
      multiCurrency: currencies.size > 1,
      displayCurrency: currencies.size === 1 ? Array.from(currencies)[0] : 'EUR',
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
    <div className="v2-enter mx-auto max-w-5xl space-y-6">
      <header>
        <p className="v2-section-label">Bilanci</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">I tuoi conti</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Riepilogo dei bilanci per gruppo e per persona.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Bilancio totale" value={summary.net} currency={summary.displayCurrency} accent="neutral" multi={summary.multiCurrency} />
        <Kpi label="Devi dare" value={-summary.owe} currency={summary.displayCurrency} accent="debt" multi={summary.multiCurrency} />
        <Kpi label="Ti è dovuto" value={summary.owed} currency={summary.displayCurrency} accent="credit" multi={summary.multiCurrency} />
      </section>

      {summary.multiCurrency ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          * Hai bilanci in più valute. Il totale è una somma indicativa.
        </p>
      ) : null}

      <section className="v2-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Persone</h2>
        {!summary.people.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sei in pari con tutti.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {summary.people.map((p) => {
              const tone = p.amount >= 0 ? 'v2-credit' : 'v2-debt';
              return (
                <li key={p.id}>
                  <Link
                    href={`/v2/friends/${p.id}`}
                    className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ background: `hsl(${hueFromName(p.name)} 55% 50%)` }}
                    >
                      {initials(p.name)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</p>
                    <p className={`v2-tabular text-sm font-semibold ${tone}`}>
                      {fmtCurrency(p.amount, p.currency)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="v2-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Per gruppo</h2>
        {!summary.byGroup.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessun gruppo.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {summary.byGroup.map((g) => {
              const tone = g.balance > 0.01 ? 'v2-credit' : g.balance < -0.01 ? 'v2-debt' : 'text-slate-500';
              return (
                <li key={g.id}>
                  <Link
                    href={`/v2/groups/${g.id}`}
                    className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-xs font-semibold text-white"
                      style={{ background: `hsl(${hueFromName(g.name)} 60% 50%)` }}
                    >
                      {initials(g.name)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</p>
                    <p className={`v2-tabular text-sm font-semibold ${tone}`}>
                      {fmtCurrency(g.balance, g.currency)}
                    </p>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  currency,
  accent,
  multi,
}: {
  label: string;
  value: number;
  currency: string;
  accent: 'neutral' | 'credit' | 'debt';
  multi: boolean;
}) {
  const colorClass = accent === 'credit' ? 'v2-credit' : accent === 'debt' ? 'v2-debt' : '';
  return (
    <div className="v2-card p-5">
      <p className="v2-section-label">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight v2-tabular ${colorClass}`}>
        {fmtCurrency(Math.abs(value) < 0.005 ? 0 : value, currency)}
        {multi ? <span className="ml-1 text-xs font-normal text-slate-400">*</span> : null}
      </p>
    </div>
  );
}
