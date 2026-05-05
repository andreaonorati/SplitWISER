'use client';

import { useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type ExpenseLike = {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  payer?: { id: string; name: string };
  participants?: Array<{
    userId?: string;
    user?: { id: string; name: string };
    share: number;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  groupName: string;
  currency: string;
  totalExpenses: number;
  myBalance: number;
  userId?: string;
  expenses: ExpenseLike[];
};

export function RiepilogoSaldiPopup({
  open,
  onClose,
  groupName,
  currency,
  totalExpenses,
  myBalance,
  userId,
  expenses,
}: Props) {
  const [showCalcDetails, setShowCalcDetails] = useState(true);
  const { t } = useI18n();

  const rows = useMemo(() => {
    if (!userId) return [];

    return expenses.map((exp) => {
      const myShare =
        exp.participants?.find((p) => (p.userId || p.user?.id) === userId)?.share || 0;
      const iAmPayer = exp.payerId === userId;

      const creditPart = iAmPayer ? Math.max(0, exp.amount - myShare) : 0;
      const debitPart = iAmPayer ? 0 : myShare;
      const net = creditPart - debitPart;

      return {
        id: exp.id,
        description: exp.description,
        payerName: exp.payer?.name || t('balancePopup.unknown'),
        amount: exp.amount,
        myShare,
        iAmPayer,
        creditPart,
        debitPart,
        net,
      };
    });
  }, [expenses, userId, t]);

  const totals = useMemo(() => {
    const paidByMe = rows.reduce((s, r) => s + (r.iAmPayer ? r.amount : 0), 0);
    const myShares = rows.reduce((s, r) => s + r.myShare, 0);
    const credits = rows.reduce((s, r) => s + r.creditPart, 0);
    const debits = rows.reduce((s, r) => s + r.debitPart, 0);

    return { paidByMe, myShares, credits, debits };
  }, [rows]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('balancePopup.title')}
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-gray-900 dark:shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('balancePopup.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">{groupName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label={t('balancePopup.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-300">{t('balancePopup.totalGroup')}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-300">{t('balancePopup.totalCredit')}</p>
              <p className="mt-1 text-lg font-semibold text-green-700">
                {formatCurrency(totals.credits, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-300">{t('balancePopup.yourBalance')}</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  myBalance > 0 ? 'text-green-700' : myBalance < 0 ? 'text-red-700' : 'text-gray-700'
                }`}
              >
                {myBalance > 0 ? '+' : ''}
                {formatCurrency(myBalance, currency)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
              {t('balancePopup.relevantTransactions')}
            </div>
            <div className="max-h-72 overflow-auto">
              {rows.map((row) => (
                <div key={row.id} className="border-b border-gray-50 px-3 py-2 last:border-b-0 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {t('balancePopup.payer')}: {row.payerName} - {t('balancePopup.yourShare')}: {formatCurrency(row.myShare, currency)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        row.net > 0 ? 'text-green-700' : row.net < 0 ? 'text-red-700' : 'text-gray-600'
                      }`}
                    >
                      {row.net > 0 ? '+' : ''}
                      {formatCurrency(row.net, currency)}
                    </p>
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-300">{t('balancePopup.noTransactions')}</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-primary-100 bg-primary-50 dark:border-primary-900 dark:bg-primary-950/20">
            <button
              onClick={() => setShowCalcDetails((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              aria-expanded={showCalcDetails}
            >
              <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">{t('balancePopup.howCalculated')}</span>
              {showCalcDetails ? <ChevronUp className="h-4 w-4 text-primary-700" /> : <ChevronDown className="h-4 w-4 text-primary-700" />}
            </button>

            {showCalcDetails && (
              <div className="space-y-1 border-t border-primary-100 px-3 py-3 text-sm text-primary-900 dark:border-primary-900 dark:text-primary-100">
                <p>{t('balancePopup.youPaid')}: {formatCurrency(totals.paidByMe, currency)}</p>
                <p>{t('balancePopup.personalShare')}: {formatCurrency(totals.myShares, currency)}</p>
                <p>{t('balancePopup.creditToOthers')}: {formatCurrency(totals.credits, currency)}</p>
                <p>{t('balancePopup.debtToOthers')}: {formatCurrency(totals.debits, currency)}</p>
                <p className="pt-1 font-semibold">
                  {t('balancePopup.finalBalance')}: {myBalance > 0 ? '+' : ''}
                  {formatCurrency(myBalance, currency)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
