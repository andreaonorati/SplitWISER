'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useExpenseFormStore } from '@/stores/expenseFormStore';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/types';
import toast from 'react-hot-toast';

export default function NewExpensePage() {
  return (
    <AuthLayout>
      <NewExpenseContent />
    </AuthLayout>
  );
}

function NewExpenseContent() {
  const { id: groupId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { prefillData, clearPrefillData } = useExpenseFormStore();

  // Fetch group to get members
  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId),
  });

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [payerId, setPayerId] = useState(user?.id || '');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});

  // Pre-fill from AI data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.description) setDescription(prefillData.description);
      if (prefillData.amount) setAmount(String(prefillData.amount));
      if (prefillData.date) setDate(prefillData.date);
      if (prefillData.category) setCategory(prefillData.category);
      if (prefillData.notes) setNotes(prefillData.notes);
      if (prefillData.suggestedParticipants) {
        setSelectedParticipants(prefillData.suggestedParticipants);
      }
      clearPrefillData();
    }
  }, [prefillData, clearPrefillData]);

  // Set default participants when group loads
  useEffect(() => {
    if (group?.members && selectedParticipants.length === 0) {
      setSelectedParticipants(group.members.map((m: any) => m.userId));
    }
    if (user?.id && !payerId) {
      setPayerId(user.id);
    }
  }, [group, user, selectedParticipants.length, payerId]);

  const createExpense = useMutation({
    mutationFn: (data: any) => api.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Expense added!');
      router.push(`/groups/${groupId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add expense');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error('Select at least one participant');
      return;
    }

    // Calculate shares based on split type
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
        (s, uid) => s + (parseFloat(percentageShares[uid]) || 0),
        0
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        toast.error(`Percentages must sum to 100% (currently ${totalPct.toFixed(1)}%)`);
        return;
      }
      participants = selectedParticipants.map((uid) => ({
        userId: uid,
        share: Math.round(amountNum * (parseFloat(percentageShares[uid]) || 0) / 100 * 100) / 100,
        percentage: parseFloat(percentageShares[uid]) || 0,
      }));
    } else {
      // Custom
      const totalCustom = selectedParticipants.reduce(
        (s, uid) => s + (parseFloat(customShares[uid]) || 0),
        0
      );
      if (Math.abs(totalCustom - amountNum) > 0.01) {
        toast.error(`Custom amounts must sum to ${amountNum} (currently ${totalCustom.toFixed(2)})`);
        return;
      }
      participants = selectedParticipants.map((uid) => ({
        userId: uid,
        share: parseFloat(customShares[uid]) || 0,
      }));
    }

    createExpense.mutate({
      description,
      amount: amountNum,
      date,
      category,
      notes: notes || undefined,
      splitType,
      payerId,
      groupId,
      participants,
    });
  };

  const members = group?.members || [];

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {group?.name || 'Trip'}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Expense</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="e.g., Dinner at the Italian place"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="input"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* Split Type */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">Split Method</label>
          <div className="grid grid-cols-3 gap-2">
            {(['equal', 'percentage', 'custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  splitType === type
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {type === 'equal' ? '÷ Equal' : type === 'percentage' ? '% Percentage' : '# Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Participants ({selectedParticipants.length} selected)
          </label>
          <div className="space-y-2">
            {members.map((m: any) => {
              const isSelected = selectedParticipants.includes(m.userId);
              return (
                <div
                  key={m.userId}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isSelected ? 'border-primary-200 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(m.userId)}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{m.user.name}</span>
                  </label>

                  {isSelected && splitType === 'equal' && amount && (
                    <span className="text-sm text-gray-500">
                      ${(parseFloat(amount) / selectedParticipants.length).toFixed(2)}
                    </span>
                  )}

                  {isSelected && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={percentageShares[m.userId] || ''}
                        onChange={(e) =>
                          setPercentageShares((p) => ({ ...p, [m.userId]: e.target.value }))
                        }
                        className="w-20 input text-right"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}

                  {isSelected && splitType === 'custom' && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customShares[m.userId] || ''}
                        onChange={(e) =>
                          setCustomShares((p) => ({ ...p, [m.userId]: e.target.value }))
                        }
                        className="w-24 input text-right"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={createExpense.isPending}
        >
          {createExpense.isPending ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
