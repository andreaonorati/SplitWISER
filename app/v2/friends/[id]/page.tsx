'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, hueFromName, initials } from '@/lib/v2-format';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type GroupRow = {
  id: string;
  name: string;
  currency: string;
  balance: number;
};

export default function V2FriendDetailPage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
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

  const { friendName, sharedGroups, totalBalance, currency } = useMemo(() => {
    if (!groups || !user) {
      return { friendName: '', sharedGroups: [] as GroupRow[], totalBalance: 0, currency: 'EUR' };
    }

    let _name = '';
    let _currency = 'EUR';
    let _total = 0;
    const rows: GroupRow[] = [];

    groups.forEach((g: any, i: number) => {
      const isShared = (g.members || []).some((m: any) => m.user.id === friendId);
      if (!isShared) return;

      const friendMember = (g.members || []).find((m: any) => m.user.id === friendId);
      if (friendMember && !_name) _name = friendMember.user.name;
      _currency = g.currency || _currency;

      const data = balanceQueries[i]?.data as any;
      let groupBalance = 0;
      data?.settlementPlan?.forEach((tx: any) => {
        if (tx.from?.id === user.id && tx.to?.id === friendId) {
          groupBalance -= tx.amount;
        }
        if (tx.to?.id === user.id && tx.from?.id === friendId) {
          groupBalance += tx.amount;
        }
      });

      rows.push({
        id: g.id,
        name: g.name,
        currency: g.currency || 'EUR',
        balance: groupBalance,
      });
      _total += groupBalance;
    });

    return { friendName: _name, sharedGroups: rows, totalBalance: _total, currency: _currency };
  }, [groups, balanceQueries, user, friendId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!friendName) {
    return (
      <div className="v2-card mx-auto max-w-2xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Amico non trovato.
      </div>
    );
  }

  const tone = totalBalance > 0.01 ? 'credit' : totalBalance < -0.01 ? 'debt' : 'neutral';
  const colorClass = tone === 'credit' ? 'v2-credit' : tone === 'debt' ? 'v2-debt' : '';

  return (
    <div className="v2-enter mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/v2/friends"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tutti gli amici
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-4">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-semibold text-white"
          style={{ background: `hsl(${hueFromName(friendName)} 55% 50%)` }}
        >
          {initials(friendName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{friendName}</h1>
          {tone === 'neutral' ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Siete in pari.</p>
          ) : (
            <p className={`mt-1 text-sm font-semibold ${colorClass}`}>
              {tone === 'credit' ? 'ti deve' : 'devi dare'}{' '}
              <span className="v2-tabular">{fmtCurrency(Math.abs(totalBalance), currency)}</span>{' '}
              in totale
            </p>
          )}
        </div>
      </header>

      <section className="v2-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Gruppi in comune</h2>
        {!sharedGroups.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nessun gruppo in comune.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {sharedGroups.map((g) => {
              const t = g.balance > 0.01 ? 'credit' : g.balance < -0.01 ? 'debt' : 'neutral';
              const c = t === 'credit' ? 'v2-credit' : t === 'debt' ? 'v2-debt' : 'text-slate-500';
              return (
                <li key={g.id}>
                  <Link
                    href={`/v2/groups/${g.id}`}
                    className="flex items-center gap-3 py-3 transition hover:opacity-80"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-xs font-semibold text-white"
                      style={{ background: `hsl(${hueFromName(g.name)} 60% 50%)` }}
                    >
                      {initials(g.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className={`text-xs font-medium ${c}`}>
                        {t === 'neutral'
                          ? 'in pari'
                          : t === 'credit'
                          ? `ti deve ${fmtCurrency(Math.abs(g.balance), g.currency)}`
                          : `devi dare ${fmtCurrency(Math.abs(g.balance), g.currency)}`}
                      </p>
                    </div>
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
