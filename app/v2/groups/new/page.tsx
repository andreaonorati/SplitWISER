'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { CURRENCIES } from '@/lib/currencies';

export default function V2NewGroupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const createGroup = useMutation({
    mutationFn: () => api.createGroup({ name, description, currency }),
    onSuccess: (group: any) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Gruppo creato');
      router.push(`/v2/groups/${group.id}`);
    },
    onError: (err: any) => toast.error(err.message || 'Impossibile creare il gruppo'),
  });

  return (
    <div className="v2-enter mx-auto max-w-xl space-y-6">
      <Link
        href="/v2/groups"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tutti i gruppi
      </Link>

      <header>
        <p className="v2-section-label">Nuovo gruppo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Crea un gruppo</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Coinquilini, viaggio, evento — qualunque cosa unisca le spese.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast.error('Inserisci un nome');
          createGroup.mutate();
        }}
        className="v2-card space-y-4 p-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Nome *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="v2-input"
            placeholder="es. Praga 2026"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Descrizione
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="v2-input"
            rows={3}
            placeholder="Di cosa si tratta?"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Valuta predefinita
          </label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="v2-input">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={createGroup.isPending} className="v2-btn v2-btn-primary w-full">
          {createGroup.isPending ? 'Creazione…' : 'Crea gruppo'}
        </button>
      </form>
    </div>
  );
}
