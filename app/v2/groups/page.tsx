'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { fmtDate, hueFromName, initials } from '@/lib/v2-format';
import { Plus, Receipt, Users } from 'lucide-react';

export default function V2GroupsPage() {
  const [search, setSearch] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const filtered = useMemo(() => {
    const list = groups || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((g: any) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="v2-enter mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="v2-section-label">Gruppi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">I tuoi gruppi</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organizza spese con coinquilini, viaggi, eventi.
          </p>
        </div>
        <Link href="/v2/groups/new" className="v2-btn v2-btn-primary">
          <Plus className="h-4 w-4" />
          Crea gruppo
        </Link>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca un gruppo..."
        className="v2-input max-w-sm"
      />

      {!filtered.length ? (
        <div className="v2-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {search.trim() ? 'Nessun gruppo trovato.' : 'Non hai ancora creato gruppi.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g: any) => (
            <Link
              key={g.id}
              href={`/v2/groups/${g.id}`}
              className="v2-card v2-card-hover flex flex-col gap-3 p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-sm font-semibold text-white"
                  style={{ background: `hsl(${hueFromName(g.name)} 60% 50%)` }}
                >
                  {initials(g.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{g.name}</p>
                  {g.description ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{g.description}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {g.members?.length || 0} membri
                </span>
                <span className="inline-flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5" />
                  {g._count?.expenses || 0} spese
                </span>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Aggiornato {fmtDate(g.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
