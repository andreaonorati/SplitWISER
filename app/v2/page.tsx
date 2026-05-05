'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, hueFromName, initials } from '@/lib/v2-format';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';

type FriendBalance = {
  id: string;
  name: string;
  amount: number;
  currency: string;
};

export default function V2RiepilogoPage() {
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

  const { totalOwed, totalOwe, byCurrency, owe, owed } = useMemo(() => {
    let _owed = 0;
    let _owe = 0;
    const _byCurrency = new Set<string>();

    const peopleMap = new Map<string, FriendBalance>();

    balanceQueries.forEach((q, i) => {
      const data = q.data as any;
      if (!data) return;
      const group = (groups || [])[i];
      const currency = group?.currency || 'EUR';
      _byCurrency.add(currency);

      const mine = data.userBalances?.find((e: any) => e.user.id === user?.id);
      if (mine) {
        if (mine.balance > 0) _owed += mine.balance;
        if (mine.balance < 0) _owe += Math.abs(mine.balance);
      }

      data.settlementPlan?.forEach((tx: any) => {
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

    const list = Array.from(peopleMap.values()).filter((p) => Math.abs(p.amount) > 0.01);

    return {
      totalOwed: _owed,
      totalOwe: _owe,
      byCurrency: _byCurrency,
      owe: list.filter((p) => p.amount < 0).sort((a, b) => a.amount - b.amount),
      owed: list.filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount),
    };
  }, [balanceQueries, groups, user?.id]);

  const net = totalOwed - totalOwe;
  const multiCurrency = byCurrency.size > 1;
  const displayCurrency = multiCurrency ? 'EUR' : Array.from(byCurrency)[0] || 'EUR';

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const firstGroupId = (groups || [])[0]?.id;

  return (
    <div className="v2-enter mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="v2-section-label">Riepilogo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ciao, {user?.name?.split(' ')[0] || ''}.</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vista d&apos;insieme delle tue spese condivise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {firstGroupId ? (
            <Link href={`/v2/groups/${firstGroupId}/expenses/new`} className="v2-btn v2-btn-primary">
              <Plus className="h-4 w-4" />
              Aggiungi spesa
            </Link>
          ) : (
            <Link href="/v2/groups/new" className="v2-btn v2-btn-primary">
              <Plus className="h-4 w-4" />
              Crea gruppo
            </Link>
          )}
          {firstGroupId ? (
            <Link href={`/v2/groups/${firstGroupId}`} className="v2-btn v2-btn-ghost">
              Pareggia
            </Link>
          ) : null}
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Bilancio totale" value={net} currency={displayCurrency} multiCurrency={multiCurrency} accent="neutral" />
        <Kpi label="Devi dare" value={-totalOwe} currency={displayCurrency} multiCurrency={multiCurrency} accent="debt" />
        <Kpi label="Ti è dovuto" value={totalOwed} currency={displayCurrency} multiCurrency={multiCurrency} accent="credit" />
      </section>

      {multiCurrency ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          * Hai bilanci in più valute. Il totale è una somma indicativa.
        </p>
      ) : null}

      {/* Two columns */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FriendColumn
          title="Devi dare"
          tone="debt"
          icon={<ArrowDownRight className="h-3.5 w-3.5" />}
          items={owe}
          empty="Sei in pari con tutti."
        />
        <FriendColumn
          title="Ti è dovuto"
          tone="credit"
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          items={owed}
          empty="Nessuno ti deve nulla."
        />
      </section>

      {/* Recent groups */}
      <section className="v2-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Gruppi attivi</h2>
          <Link href="/v2/expenses" className="text-xs font-medium text-[#7c5cff] hover:underline">
            Vedi tutte le spese
          </Link>
        </div>
        {!(groups || []).length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Non hai ancora gruppi.{' '}
            <Link href="/v2/groups/new" className="font-medium text-[#7c5cff] hover:underline">
              Creane uno
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(groups || []).slice(0, 6).map((g: any) => (
              <Link
                key={g.id}
                href={`/v2/groups/${g.id}`}
                className="v2-card v2-card-hover flex items-center gap-3 p-3"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-xs font-semibold text-white"
                  style={{ background: `hsl(${hueFromName(g.name)} 60% 50%)` }}
                >
                  {initials(g.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{g.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(g.members?.length || 0)} membri · {g._count?.expenses || 0} spese
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  currency,
  multiCurrency,
  accent,
}: {
  label: string;
  value: number;
  currency: string;
  multiCurrency: boolean;
  accent: 'neutral' | 'credit' | 'debt';
}) {
  const colorClass =
    accent === 'credit' ? 'v2-credit' : accent === 'debt' ? 'v2-debt' : '';

  return (
    <div className="v2-card p-5">
      <p className="v2-section-label">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight v2-tabular ${colorClass}`}>
        {fmtCurrency(Math.abs(value) < 0.005 ? 0 : value, currency)}
        {multiCurrency ? <span className="ml-1 text-xs font-normal text-slate-400">*</span> : null}
      </p>
    </div>
  );
}

function FriendColumn({
  title,
  tone,
  icon,
  items,
  empty,
}: {
  title: string;
  tone: 'credit' | 'debt';
  icon: React.ReactNode;
  items: FriendBalance[];
  empty: string;
}) {
  const colorClass = tone === 'credit' ? 'v2-credit' : 'v2-debt';
  return (
    <div className="v2-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`v2-pill ${colorClass}`}>
          {icon}
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/v2/friends/${p.id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: `hsl(${hueFromName(p.name)} 55% 50%)` }}
                  aria-hidden
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className={`text-xs font-semibold ${colorClass}`}>
                    {tone === 'credit' ? 'ti deve' : 'devi dare'}{' '}
                    <span className="v2-tabular">{fmtCurrency(Math.abs(p.amount), p.currency)}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

