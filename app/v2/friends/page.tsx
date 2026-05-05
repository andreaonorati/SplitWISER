'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, hueFromName, initials } from '@/lib/v2-format';

type FriendAgg = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  groupCount: number;
};

export default function V2FriendsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

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

  const friends = useMemo<FriendAgg[]>(() => {
    if (!groups || !user) return [];
    const map = new Map<string, FriendAgg>();
    const seen = new Map<string, Set<string>>();

    groups.forEach((g: any, i: number) => {
      g.members?.forEach((m: any) => {
        if (m.user.id === user.id) return;
        if (!map.has(m.user.id)) {
          map.set(m.user.id, {
            id: m.user.id,
            name: m.user.name,
            balance: 0,
            currency: g.currency || 'EUR',
            groupCount: 0,
          });
          seen.set(m.user.id, new Set());
        }
        const s = seen.get(m.user.id)!;
        if (!s.has(g.id)) {
          s.add(g.id);
          const e = map.get(m.user.id)!;
          e.groupCount += 1;
        }
      });

      const data = balanceQueries[i]?.data as any;
      if (!data?.settlementPlan) return;
      data.settlementPlan.forEach((tx: any) => {
        if (tx.from?.id === user.id && map.has(tx.to.id)) {
          const e = map.get(tx.to.id)!;
          e.balance -= tx.amount;
        }
        if (tx.to?.id === user.id && map.has(tx.from.id)) {
          const e = map.get(tx.from.id)!;
          e.balance += tx.amount;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [groups, balanceQueries, user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, search]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="v2-enter mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="v2-section-label">Amici</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Le tue persone</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Bilancio aggregato per ogni amico nei tuoi gruppi.
          </p>
        </div>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca un amico..."
        className="v2-input max-w-sm"
      />

      {!filtered.length ? (
        <div className="v2-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {friends.length
            ? 'Nessun amico corrisponde alla ricerca.'
            : 'Aggiungi membri ai tuoi gruppi per iniziare.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const tone = f.balance > 0.01 ? 'credit' : f.balance < -0.01 ? 'debt' : 'neutral';
            const colorClass = tone === 'credit' ? 'v2-credit' : tone === 'debt' ? 'v2-debt' : '';
            return (
              <Link
                key={f.id}
                href={`/v2/friends/${f.id}`}
                className="v2-card v2-card-hover flex flex-col gap-3 p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                    style={{ background: `hsl(${hueFromName(f.name)} 55% 50%)` }}
                  >
                    {initials(f.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{f.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {f.groupCount} {f.groupCount === 1 ? 'gruppo' : 'gruppi'}
                    </p>
                  </div>
                </div>
                <div>
                  {tone === 'neutral' ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Siete in pari.</p>
                  ) : (
                    <p className={`text-sm font-semibold ${colorClass}`}>
                      {tone === 'credit' ? 'ti deve' : 'devi dare'}{' '}
                      <span className="v2-tabular">{fmtCurrency(Math.abs(f.balance), f.currency)}</span>
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
