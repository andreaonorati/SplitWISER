'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export default function V2GroupsPage() {
  const [search, setSearch] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const filteredGroups = useMemo(() => {
    const list = groups || [];
    if (!search.trim()) return list;

    return list.filter((group: any) =>
      group.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [groups, search]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalTrips = filteredGroups.length;

  return (
    <div className="space-y-5">
      <section className="v2-panel v2-enter overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your expense groups</p>
          </div>
          <Link href="/groups/new" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Create Group
          </Link>
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="v2-kpi v2-enter-delay-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total groups</p>
          <p className="mt-2 text-2xl font-semibold">{totalTrips}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredGroups.map((group: any) => (
          <Link
            key={group.id}
            href={`/v2/groups/${group.id}`}
            className="v2-panel v2-enter-delay-2 overflow-hidden p-5"
          >
            <div className="mb-4 h-1 w-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
            <p className="text-lg font-semibold">{group.name}</p>
            {group.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
            ) : null}

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{group.members?.length || 0} members</span>
              <span>{group._count?.expenses || 0} expenses</span>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Updated {formatDate(group.updatedAt)}
            </p>
          </Link>
        ))}
      </section>

      {!filteredGroups.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No groups found.</p>
      ) : null}
    </div>
  );
}
