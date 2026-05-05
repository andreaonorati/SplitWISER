'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword, useUpdateProfile } from '@/lib/hooks';
import toast from 'react-hot-toast';

type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'splitwiser_v2_theme';

export default function V2SettingsPage() {
  const { user, loadUser } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState(user?.name || '');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

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

  const saveTheme = (value: ThemeMode) => {
    setThemeMode(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, value);
      document.documentElement.classList.toggle('dark', value === 'dark');
    }
    toast.success('Theme updated');
  };

  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      await loadUser();
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message || 'Unable to update profile');
    }
  };

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated');
    } catch (error: any) {
      toast.error(error.message || 'Unable to update password');
    }
  };

  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Profile, security, and theme preferences</p>
      </section>

      <section className="v2-panel col-span-12 p-5 lg:col-span-7">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form onSubmit={onProfileSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      <section className="v2-panel col-span-12 p-5 lg:col-span-5">
        <h2 className="text-lg font-semibold">Theme</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose your interface style for Version 2.</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => saveTheme('light')}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              themeMode === 'light'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => saveTheme('dark')}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              themeMode === 'dark'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="v2-panel col-span-12 p-5 lg:col-span-7">
        <h2 className="text-lg font-semibold">Security</h2>
        <form onSubmit={onPasswordSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>

      <section className="v2-panel col-span-12 p-5 lg:col-span-5">
        <h2 className="text-lg font-semibold">Design Notes</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          V2 now supports explicit theme selection and a desktop-first visual system.
          All pages are bound to real API data.
        </p>
      </section>
    </div>
  );
}
