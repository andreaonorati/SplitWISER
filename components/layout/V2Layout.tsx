'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader } from '@/components/ui/Spinner';
import { fmtCurrency, hueFromName, initials } from '@/lib/v2-format';
import {
  Activity,
  Home,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Sun,
} from 'lucide-react';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'splitwiser_v2_theme';

function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const storedTheme =
      typeof window !== 'undefined'
        ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null)
        : null;

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setThemeMode(storedTheme);
      return;
    }

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setThemeMode(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

  return { themeMode, setThemeMode };
}

export function V2Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { themeMode, setThemeMode } = useThemeMode();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
    enabled: isAuthenticated,
  });

  const balanceQueries = useQueries({
    queries: (groups || []).map((g: any) => ({
      queryKey: ['balances', g.id],
      queryFn: () => api.getGroupBalances(g.id),
      enabled: !!g.id && isAuthenticated,
    })),
  });

  const friends = useMemo(() => {
    if (!groups || !user) return [] as Array<{ id: string; name: string; balance: number; currency: string }>;

    const map = new Map<string, { id: string; name: string; balance: number; currency: string }>();

    groups.forEach((g: any, i: number) => {
      g.members?.forEach((m: any) => {
        if (m.user.id === user.id) return;
        if (!map.has(m.user.id)) {
          map.set(m.user.id, { id: m.user.id, name: m.user.name, balance: 0, currency: g.currency || 'EUR' });
        }
      });

      const data = balanceQueries[i]?.data as any;
      if (!data?.settlementPlan) return;
      data.settlementPlan.forEach((tx: any) => {
        if (tx.from?.id === user.id) {
          const e = map.get(tx.to.id) || { id: tx.to.id, name: tx.to.name, balance: 0, currency: g.currency || 'EUR' };
          e.balance -= tx.amount;
          map.set(tx.to.id, e);
        }
        if (tx.to?.id === user.id) {
          const e = map.get(tx.from.id) || { id: tx.from.id, name: tx.from.name, balance: 0, currency: g.currency || 'EUR' };
          e.balance += tx.amount;
          map.set(tx.from.id, e);
        }
      });
    });

    return Array.from(map.values());
  }, [groups, balanceQueries, user]);

  const navItems = useMemo(
    () => [
      { href: '/v2', label: 'Riepilogo', icon: Home, exact: true },
      { href: '/v2/activity', label: 'Attività recenti', icon: Activity },
      { href: '/v2/expenses', label: 'Tutte le spese', icon: Receipt },
    ],
    []
  );

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/') || pathname === href;

  const filterLower = filter.toLowerCase().trim();
  const groupList = (groups || []).filter((g: any) =>
    !filterLower || g.name.toLowerCase().includes(filterLower)
  );
  const friendList = friends.filter((f) => !filterLower || f.name.toLowerCase().includes(filterLower));

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return (
    <div className="v2-shell">
      <div className="flex min-h-screen">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="v2-side sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto px-4 py-5 lg:flex">
          <Link href="/v2" className="mb-5 flex items-center gap-2 px-1">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#7c5cff] text-sm font-bold text-white">
              S
            </span>
            <span className="text-base font-semibold tracking-tight">SplitWISER</span>
          </Link>

          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`v2-link ${isActive(item.href, item.exact) ? 'v2-link-active' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-5">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtra per nome"
              className="v2-input"
            />
          </div>

          {/* Gruppi */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="v2-section-label">Gruppi</span>
              <Link href="/v2/groups/new" className="text-xs font-medium text-[#7c5cff] hover:underline">
                + aggiungi
              </Link>
            </div>
            <div className="space-y-0.5">
              {groupList.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">Nessun gruppo.</p>
              ) : (
                groupList.slice(0, 12).map((g: any) => (
                  <Link
                    key={g.id}
                    href={`/v2/groups/${g.id}`}
                    className={`v2-link ${pathname === `/v2/groups/${g.id}` ? 'v2-link-active' : ''}`}
                  >
                    <SidebarTag color={`hsl(${hueFromName(g.name)} 65% 55%)`} />
                    <span className="flex-1 truncate">{g.name}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Amici */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="v2-section-label">Amici</span>
              <Link href="/v2/friends" className="text-xs font-medium text-[#7c5cff] hover:underline">
                + aggiungi
              </Link>
            </div>
            <div className="space-y-0.5">
              {friendList.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">Nessun amico ancora.</p>
              ) : (
                friendList.slice(0, 12).map((f) => (
                  <Link
                    key={f.id}
                    href={`/v2/friends/${f.id}`}
                    className={`v2-link ${pathname === `/v2/friends/${f.id}` ? 'v2-link-active' : ''}`}
                  >
                    <SidebarAvatar name={f.name} />
                    <span className="flex-1 truncate">{f.name}</span>
                    {Math.abs(f.balance) > 0.01 ? (
                      <span
                        className={`v2-tabular text-[11px] font-semibold ${
                          f.balance >= 0 ? 'v2-credit' : 'v2-debt'
                        }`}
                      >
                        {fmtCurrency(f.balance, f.currency)}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white p-2 dark:border-white/[0.06] dark:bg-[#131318]">
              <SidebarAvatar name={user?.name || ''} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5"
                title={themeMode === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
              >
                {themeMode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <Link href="/v2/settings" className="v2-btn v2-btn-ghost flex-1">
                <Settings className="h-3.5 w-3.5" />
                Impostazioni
              </Link>
              <button
                onClick={logout}
                className="v2-btn v2-btn-ghost"
                title="Esci"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarTag({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden
    />
  );
}

function SidebarAvatar({ name }: { name: string }) {
  const hue = hueFromName(name);
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: `hsl(${hue} 55% 50%)` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
