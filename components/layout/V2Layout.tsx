'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import {
  Activity,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
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

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const navItems = useMemo(
    () => [
      { href: '/v2', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/v2/groups', label: 'Groups', icon: Users },
      { href: '/v2/balances', label: 'Balances', icon: BarChart3 },
      { href: '/v2/activity', label: 'Activity', icon: Activity },
      { href: '/v2/settings', label: 'Settings', icon: Settings },
    ],
    []
  );

  const currentTitle = useMemo(() => {
    const current = navItems.find(
      (item) => pathname === item.href || (item.href !== '/v2' && pathname.startsWith(item.href))
    );
    return current?.label || 'Dashboard';
  }, [navItems, pathname]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return (
    <div className="v2-shell min-h-screen text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="m-4 flex w-[292px] shrink-0 flex-col v2-glass p-4">
          <Link href="/v2" className="mb-6 block text-2xl font-semibold tracking-tight text-sky-600 dark:text-sky-400">
            <span className="rounded-md bg-sky-500/10 px-2 py-1 text-sm font-bold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">V2</span>
            <span className="ml-2 align-middle">SplitWISER</span>
          </Link>

          <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
            Real data mode: no mocked content.
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/v2' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className={`rounded-lg p-1.5 ${isActive ? 'bg-white/20' : 'bg-slate-200/70 dark:bg-slate-700/60'}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className={`h-4 w-4 transition ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="v2-panel flex items-center gap-2 p-3">
              <Avatar name={user?.name || ''} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-2 pb-5 pr-5 pt-4">
          <header className="v2-glass v2-enter flex h-[76px] items-center justify-between px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Version Two</p>
              <h1 className="text-xl font-semibold leading-tight">{currentTitle}</h1>
            </div>

            <div className="inline-flex items-center rounded-full border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => setThemeMode('light')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  themeMode === 'light'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  themeMode === 'dark'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </header>

          <main className="v2-enter-delay-1 pt-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
