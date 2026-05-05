'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      await register(email, name, password);
      router.push('/v2');
      toast.success('Account creato');
    } catch (err: any) {
      toast.error(err.message || 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v2-shell flex min-h-screen items-center justify-center px-4">
      <div className="v2-enter w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Receipt className="h-7 w-7 text-[#7c5cff]" />
            <span className="text-xl font-semibold tracking-tight">
              Split<span className="text-[#7c5cff]">WISER</span>
            </span>
          </Link>
          <p className="v2-section-label mt-6">Registrati</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Crea il tuo account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Bastano pochi secondi
          </p>
        </div>

        <div className="v2-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Nome
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="v2-input"
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="v2-input"
                placeholder="tu@esempio.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="v2-input"
                placeholder="Almeno 6 caratteri"
              />
            </div>

            <button
              type="submit"
              className="v2-btn v2-btn-primary w-full justify-center"
              disabled={loading}
            >
              {loading ? 'Creazione…' : 'Crea account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
            Hai già un account?{' '}
            <Link href="/login" className="font-semibold text-[#7c5cff] hover:underline">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
