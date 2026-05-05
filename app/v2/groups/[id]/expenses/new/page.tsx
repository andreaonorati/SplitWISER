'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EXPENSE_CATEGORIES } from '@/types';
import { parseLocaleNumber } from '@/lib/utils';
import { CURRENCIES, currencySymbol } from '@/lib/currencies';
import { initials, hueFromName } from '@/lib/v2-format';

export default function V2NewExpensePage() {
  const { id: groupId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId),
    enabled: !!groupId,
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [payerId, setPayerId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});
  const currencyTouched = useRef(false);

  useEffect(() => {
    if (group?.members && selectedParticipants.length === 0) {
      setSelectedParticipants(group.members.map((m: any) => m.userId));
    }
    if (user?.id && !payerId) setPayerId(user.id);
    if (group?.currency && !currencyTouched.current) setCurrency(group.currency);
  }, [group, user, selectedParticipants.length, payerId]);

  const createExpense = useMutation({
    mutationFn: (data: any) => api.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Spesa aggiunta');
      router.push(`/v2/groups/${groupId}`);
    },
    onError: (err: any) => toast.error(err.message || 'Impossibile aggiungere'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseLocaleNumber(amount);
    if (!amountNum || amountNum <= 0) return toast.error('Importo non valido');
    if (selectedParticipants.length === 0) return toast.error('Seleziona almeno un partecipante');

    let participants;
    if (splitType === 'equal') {
      const share = Math.round((amountNum / selectedParticipants.length) * 100) / 100;
      const remainder = Math.round((amountNum - share * selectedParticipants.length) * 100) / 100;
      participants = selectedParticipants.map((uid, i) => ({
        userId: uid,
        share: i === 0 ? share + remainder : share,
      }));
    } else if (splitType === 'percentage') {
      const totalPct = selectedParticipants.reduce(
        (s, uid) => s + (parseLocaleNumber(percentageShares[uid]) || 0),
        0
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        return toast.error(`Le percentuali devono fare 100% (ora ${totalPct.toFixed(1)}%)`);
      }
      participants = selectedParticipants.map((uid) => ({
        userId: uid,
        share:
          Math.round(amountNum * ((parseLocaleNumber(percentageShares[uid]) || 0) / 100) * 100) /
          100,
        percentage: parseLocaleNumber(percentageShares[uid]) || 0,
      }));
    } else {
      const totalCustom = selectedParticipants.reduce(
        (s, uid) => s + (parseLocaleNumber(customShares[uid]) || 0),
        0
      );
      if (Math.abs(totalCustom - amountNum) > 0.01) {
        return toast.error(
          `Le quote devono fare ${amountNum.toFixed(2)} (ora ${totalCustom.toFixed(2)})`
        );
      }
      participants = selectedParticipants.map((uid) => ({
        userId: uid,
        share: parseLocaleNumber(customShares[uid]) || 0,
      }));
    }

    createExpense.mutate({
      description,
      amount: amountNum,
      currency,
      date,
      category,
      notes: notes || undefined,
      splitType,
      payerId,
      groupId,
      participants,
    });
  };

  const toggle = (id: string) =>
    setSelectedParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (isLoading || !group) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  const members = group.members || [];

  return (
    <div className="v2-enter mx-auto max-w-2xl space-y-6">
      <Link
        href={`/v2/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#7c5cff] dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {group.name}
      </Link>

      <header>
        <p className="v2-section-label">Nuova spesa</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Aggiungi spesa</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="v2-card space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Descrizione *
            </label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="v2-input"
              placeholder="es. Cena ristorante"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_140px]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Importo *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol(currency)}
                </span>
                <input
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="v2-input pl-7"
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Valuta
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  currencyTouched.current = true;
                  setCurrency(e.target.value);
                }}
                className="v2-input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="v2-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="v2-input"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Pagato da
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="v2-input"
              >
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Note
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="v2-input"
              rows={2}
            />
          </div>
        </section>

        <section className="v2-card p-5">
          <p className="v2-section-label mb-2">Tipo di divisione</p>
          <div className="grid grid-cols-3 gap-2">
            {(['equal', 'percentage', 'custom'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                className={`v2-btn ${
                  splitType === t ? 'v2-btn-primary' : 'v2-btn-ghost'
                } justify-center`}
              >
                {t === 'equal' ? '÷ Equo' : t === 'percentage' ? '% Percentuale' : '# Personalizzato'}
              </button>
            ))}
          </div>
        </section>

        <section className="v2-card p-5">
          <p className="v2-section-label mb-3">
            Partecipanti ({selectedParticipants.length} selezionati)
          </p>
          <div className="space-y-1.5">
            {members.map((m: any) => {
              const sel = selectedParticipants.includes(m.userId);
              return (
                <div
                  key={m.userId}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                    sel
                      ? 'bg-[#7c5cff]/10 ring-1 ring-[#7c5cff]/40'
                      : 'bg-black/[0.03] dark:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggle(m.userId)}
                    className="h-4 w-4 accent-[#7c5cff]"
                  />
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: `hsl(${hueFromName(m.user.name)} 55% 50%)` }}
                  >
                    {initials(m.user.name)}
                  </span>
                  <span className="flex-1 text-sm font-medium">{m.user.name}</span>

                  {sel && splitType === 'equal' && amount && (
                    <span className="v2-tabular text-xs text-slate-500 dark:text-slate-400">
                      {currencySymbol(currency)}
                      {((parseLocaleNumber(amount) || 0) / selectedParticipants.length).toFixed(2)}
                    </span>
                  )}
                  {sel && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        value={percentageShares[m.userId] || ''}
                        onChange={(e) =>
                          setPercentageShares((p) => ({ ...p, [m.userId]: e.target.value }))
                        }
                        className="v2-input w-20 text-right"
                        inputMode="decimal"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  )}
                  {sel && splitType === 'custom' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">{currencySymbol(currency)}</span>
                      <input
                        value={customShares[m.userId] || ''}
                        onChange={(e) =>
                          setCustomShares((p) => ({ ...p, [m.userId]: e.target.value }))
                        }
                        className="v2-input w-24 text-right"
                        inputMode="decimal"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <button
          type="submit"
          disabled={createExpense.isPending}
          className="v2-btn v2-btn-primary w-full"
        >
          {createExpense.isPending ? 'Aggiunta…' : 'Aggiungi spesa'}
        </button>
      </form>
    </div>
  );
}
