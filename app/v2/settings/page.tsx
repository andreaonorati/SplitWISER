'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword, useUpdateProfile } from '@/lib/hooks';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, User } from 'lucide-react';

export default function V2SettingsPage() {
  const { user, loadUser } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      await loadUser();
      toast.success('Profilo aggiornato');
    } catch (err: any) {
      toast.error(err.message || 'Errore aggiornamento profilo');
    }
  };

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('La nuova password deve essere di almeno 6 caratteri');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password aggiornata');
    } catch (err: any) {
      toast.error(err.message || 'Errore aggiornamento password');
    }
  };

  return (
    <div className="v2-enter mx-auto max-w-3xl space-y-6">
      <Link
        href="/v2"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Riepilogo
      </Link>

      <header>
        <p className="v2-section-label">Impostazioni</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Profilo e sicurezza.
        </p>
      </header>

      <section className="v2-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4" />
          Profilo
        </h2>
        <form onSubmit={onProfileSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Nome
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="v2-input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              value={user?.email || ''}
              disabled
              className="v2-input cursor-not-allowed opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="v2-btn v2-btn-primary"
          >
            {updateProfile.isPending ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </form>
      </section>

      <section className="v2-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Lock className="h-4 w-4" />
          Sicurezza
        </h2>
        <form onSubmit={onPasswordSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Password attuale
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="v2-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Nuova password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="v2-input"
            />
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="v2-btn v2-btn-primary"
          >
            {changePassword.isPending ? 'Aggiornamento…' : 'Aggiorna password'}
          </button>
        </form>
      </section>
    </div>
  );
}
