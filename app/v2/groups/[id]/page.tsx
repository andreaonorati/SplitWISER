'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { fmtCurrency, fmtDate, hueFromName, initials } from '@/lib/v2-format';
import { ArrowLeft, ArrowRight, Plus, Receipt } from 'lucide-react';
import { PragueEasterEgg } from '@/components/PragueEasterEgg';
import { PragueFirstExpenseEgg } from '@/components/PragueFirstExpenseEgg';

export default function V2GroupPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const groupId = params.id;

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId),
    enabled: !!groupId,
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => api.getGroupBalances(groupId),
    enabled: !!groupId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Gruppo non trovato.</p>;
  }

  const currency = group.currency || 'EUR';
  const myBalance =
    (balances?.userBalances || []).find((entry: any) => entry.user.id === user?.id)?.balance || 0;

  const myBalanceClass = myBalance > 0.01 ? 'v2-credit' : myBalance < -0.01 ? 'v2-debt' : '';

  // Easter egg: 3 clicks on the avatar of the Praga group
  const [eggTrigger, setEggTrigger] = useState(0);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAvatarClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1200);
    if (clickCount.current >= 3) {
      clickCount.current = 0;
      setEggTrigger((t) => t + 1);
    }
  };

  // Easter egg: first expense added by the current user in a Praga group
  const [firstExpenseEgg, setFirstExpenseEgg] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!group || !user?.id) return;
    const isPrague = ['praga', 'prague', 'praha'].includes(
      (group.name || '').trim().toLowerCase()
    );
    if (!isPrague) return;
    const myExpenses = (group.expenses || []).filter((e: any) => {
      return e.createdById === user.id || e.payer?.id === user.id;
    });
    if (myExpenses.length < 1) return;
    const flagKey = `splitwiser-praga-egg-${group.id}-${user.id}`;
    if (window.localStorage.getItem(flagKey)) return;
    window.localStorage.setItem(flagKey, '1');
    setFirstExpenseEgg((t) => t + 1);
  }, [group, user?.id]);

  return (
    <div className="v2-enter mx-auto max-w-5xl space-y-6">
      <PragueEasterEgg groupName={group.name} trigger={eggTrigger} />
      <PragueFirstExpenseEgg trigger={firstExpenseEgg} />
      <div>
        <Link
          href="/v2/groups"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tutti i gruppi
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-base font-semibold text-white outline-none transition focus:ring-2 focus:ring-[#7c5cff]/40"
            style={{ background: `hsl(${hueFromName(group.name)} 60% 50%)` }}
            aria-label={group.name}
          >
            {initials(group.name)}
          </button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
            {group.description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/v2/groups/${groupId}/expenses/new`} className="v2-btn v2-btn-primary">
            <Plus className="h-4 w-4" />
            Aggiungi spesa
          </Link>
          <Link href={`/groups/${groupId}`} className="v2-btn v2-btn-ghost">
            Gestisci
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="v2-card p-5">
          <p className="v2-section-label">Tuo bilancio</p>
          <p className={`mt-2 text-3xl font-semibold v2-tabular ${myBalanceClass}`}>
            {fmtCurrency(myBalance, currency)}
          </p>
        </div>
        <div className="v2-card p-5">
          <p className="v2-section-label">Spese totali</p>
          <p className="mt-2 text-3xl font-semibold v2-tabular">
            {fmtCurrency(balances?.totalExpenses || 0, currency)}
          </p>
        </div>
        <div className="v2-card p-5">
          <p className="v2-section-label">Membri</p>
          <p className="mt-2 text-3xl font-semibold">{group.members?.length || 0}</p>
        </div>
      </section>

      <section className="v2-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Membri</h2>
        <div className="flex flex-wrap gap-2">
          {(group.members || []).map((m: any) => (
            <span
              key={m.user.id}
              className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-medium dark:bg-white/[0.06]"
            >
              <span
                className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white"
                style={{ background: `hsl(${hueFromName(m.user.name)} 55% 50%)` }}
              >
                {initials(m.user.name)}
              </span>
              {m.user.id === user?.id ? 'Tu' : m.user.name}
            </span>
          ))}
        </div>
      </section>

      {balances?.settlementPlan?.length ? (
        <section className="v2-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Piano di pareggio</h2>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {balances.settlementPlan.map((tx: any, i: number) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="font-medium">
                  {tx.from.id === user?.id ? 'Tu' : tx.from.name}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">
                  {tx.to.id === user?.id ? 'tu' : tx.to.name}
                </span>
                <span className="ml-auto v2-tabular font-semibold">
                  {fmtCurrency(tx.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="v2-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Spese recenti</h2>
          <Link href={`/groups/${groupId}`} className="text-xs font-medium text-[#7c5cff] hover:underline">
            Vedi tutte
          </Link>
        </div>
        {!group.expenses?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nessuna spesa ancora.{' '}
          <Link href={`/v2/groups/${groupId}/expenses/new`} className="font-medium text-[#7c5cff] hover:underline">
              Aggiungine una
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {group.expenses.slice(0, 10).map((e: any) => (
              <li key={e.id}>
                <Link
                  href={`/v2/groups/${groupId}/expenses/${e.id}`}
                  className="flex items-center gap-3 py-3 transition hover:opacity-80"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.description}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      Pagato da {e.payer?.id === user?.id ? 'te' : e.payer?.name} · {fmtDate(e.date)}
                    </p>
                  </div>
                  <p className="v2-tabular text-sm font-semibold">
                    {fmtCurrency(e.amount, e.currency || currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
