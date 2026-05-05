'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadBlob } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDate, getCategoryEmoji } from '@/lib/utils';
import {
  ContributionChart,
  BalanceChart,
  CategoryPieChart,
  DebtFlowDiagram,
} from '@/components/charts/Charts';
import { EXPENSE_CATEGORIES } from '@/types';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Upload,
  Users,
  Receipt,
  PieChart,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  Trash2,
  Search,
  Filter,
  Download,
  Copy,
  X,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { RiepilogoSaldiPopup } from '@/components/RiepilogoSaldiPopup';
import { useI18n } from '@/lib/i18n';

export default function GroupDetailPage() {
  return (
    <AuthLayout>
      <GroupDetailContent />
    </AuthLayout>
  );
}

function GroupDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'activity'>('expenses');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showBalancePopup, setShowBalancePopup] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.getGroup(id),
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', id],
    queryFn: () => api.getGroupBalances(id),
    enabled: !!id,
  });

  const { data: activityData } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => api.getActivity(id),
    enabled: !!id,
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const invite = await api.inviteToGroup(id, inviteEmail);
      if (invite?.token && typeof window !== 'undefined') {
        setInviteLink(`${window.location.origin}/invite?token=${invite.token}`);
      }
      toast.success(`${t('groupPage.inviteSentTo')} ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err.message || t('groupPage.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return <div className="text-center py-20 text-gray-500">{t('groupPage.notFound')}</div>;
  }

  const myMembership = (group.members || []).find((m: any) => m.user.id === user?.id);
  const canManageMembers = myMembership?.role === 'admin';

  const tabs = [
    { key: 'expenses' as const, label: t('groupPage.tabExpenses'), icon: Receipt, count: group.expenses?.length },
    { key: 'balances' as const, label: t('groupPage.tabBalances'), icon: PieChart },
    { key: 'members' as const, label: t('groupPage.tabMembers'), icon: Users, count: group.members?.length },
    { key: 'activity' as const, label: t('groupPage.tabActivity'), icon: Clock },
  ];

  return (
    <div>
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        {t('navbar.dashboard')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="mt-1 text-gray-500">{group.description}</p>}
          {balances && (
            <button
              onClick={() => setShowBalancePopup(true)}
              className="mt-2 text-left text-lg font-semibold text-primary-600 hover:text-primary-700"
            >
              {t('groupPage.total')}: {formatCurrency(balances.totalExpenses, group.currency)}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/groups/${id}/import`} className="btn-secondary gap-2">
            <Upload className="h-4 w-4" />
            {t('groupPage.aiImport')}
          </Link>
          <Link href={`/groups/${id}/expenses/new`} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            {t('groupPage.addExpense')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'expenses' && (
        <ExpensesTab
          expenses={group.expenses || []}
          groupId={id}
          currency={group.currency}
          userId={user?.id}
          queryClient={queryClient}
          balances={balances}
          onOpenBalanceDetails={() => setShowBalancePopup(true)}
          recentActivities={activityData?.activities || []}
          onOpenActivityTab={() => setActiveTab('activity')}
        />
      )}
      {activeTab === 'balances' && (
        <BalancesTab
          balances={balances}
          currency={group.currency}
          expenses={group.expenses || []}
          groupId={id}
          userId={user?.id}
          queryClient={queryClient}
        />
      )}
      {activeTab === 'members' && (
        <MembersTab
          members={group.members}
          settlements={group.settlements || []}
          userId={user?.id}
          groupId={id}
          queryClient={queryClient}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteLink={inviteLink}
          onInvite={handleInvite}
          inviting={inviting}
          canManageMembers={canManageMembers}
        />
      )}
      {activeTab === 'activity' && (
        <ActivityTimeline
          activities={activityData?.activities || []}
          groupId={id}
          currency={group.currency}
        />
      )}

      <RiepilogoSaldiPopup
        open={showBalancePopup}
        onClose={() => setShowBalancePopup(false)}
        groupName={group.name}
        currency={group.currency}
        totalExpenses={balances?.totalExpenses || 0}
        myBalance={
          balances?.userBalances?.find((ub: any) => ub.user.id === user?.id)?.balance || 0
        }
        userId={user?.id}
        expenses={group.expenses || []}
      />
    </div>
  );
}

// ── Expenses Tab ────────────────────────────────────────────────────
function ExpensesTab({
  expenses,
  groupId,
  currency,
  userId,
  queryClient,
  balances,
  onOpenBalanceDetails,
  recentActivities,
  onOpenActivityTab,
}: {
  expenses: any[];
  groupId: string;
  currency: string;
  userId?: string;
  queryClient: any;
  balances?: any;
  onOpenBalanceDetails: () => void;
  recentActivities: any[];
  onOpenActivityTab: () => void;
}) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const deleteExpense = useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success(t('expenseDetail.expenseDeleted'));
    },
    onError: (err: any) => toast.error(err.message || t('expenseDetail.deleteExpense')),
  });

  const scopedExpenses =
    viewMode === 'mine' && userId
      ? expenses.filter((expense: any) =>
          expense.participants?.some((p: any) => p.user?.id === userId)
        )
      : expenses;

  const filteredExpenses = scopedExpenses.filter((expense: any) => {
    if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter && expense.category !== categoryFilter) {
      return false;
    }
    if (dateFrom && new Date(expense.date) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && new Date(expense.date) > new Date(dateTo + 'T23:59:59')) {
      return false;
    }
    return true;
  });

  const hasActiveFilters = searchQuery || categoryFilter || dateFrom || dateTo;

  const personalImpact = (expense: any) => {
    const myParticipant = expense.participants?.find((p: any) => p.user?.id === userId);
    const myShare = myParticipant?.share || 0;
    const iAmPayer = expense.payer?.id === userId;
    const owedToMe = iAmPayer ? Math.max(0, expense.amount - myShare) : 0;

    return {
      myShare,
      iAmPayer,
      owedToMe,
      notInvolved: !myParticipant,
    };
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.exportExpensesCsv(groupId);
      downloadBlob(blob, `expenses-${groupId}.csv`);
      toast.success('CSV exported!');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!expenses.length) {
    return (
      <div className="card text-center py-12">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{t('groupPage.noExpensesYet')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('groupPage.addFirstExpense')}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/groups/${groupId}/import`} className="btn-secondary gap-2">
            <Upload className="h-4 w-4" />
            {t('groupPage.aiImport')}
          </Link>
          <Link href={`/groups/${groupId}/expenses/new`} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            {t('groupPage.addExpense')}
          </Link>
        </div>
      </div>
    );
  }

  const visibleTotal = filteredExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('groupPage.view')}</p>
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setViewMode('mine')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'mine' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}
              >
                {t('groupPage.myShare')}
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'all' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}
              >
                {t('groupPage.allExpenses')}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('groupPage.searchExpenses')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 !py-2 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg border p-2 transition-colors ${
                hasActiveFilters
                  ? 'border-primary-300 bg-primary-50 text-primary-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
              title={t('groupPage.filters')}
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
              title={t('groupPage.exportCsv')}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{t('groupPage.category')}</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input !py-1.5 text-sm"
                >
                  <option value="">{t('groupPage.allCategories')}</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{t('groupPage.from')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input !py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{t('groupPage.to')}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input !py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end justify-start sm:justify-end">
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    {t('groupPage.clearAll')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <p className="text-sm text-gray-500">
            {t('groupPage.showing')} {filteredExpenses.length} {t('groupPage.of')} {scopedExpenses.length} {t('groupPage.tabExpenses').toLowerCase()}
          </p>
        )}

        {filteredExpenses.length === 0 ? (
          <div className="card text-center py-8">
            <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">{t('groupPage.noExpensesMatch')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense: any) => (
              <div key={expense.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              {(() => {
                const impact = personalImpact(expense);
                return (
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('groupPage.paidLabel')}</p>
                      {impact.iAmPayer ? (
                        <p className="text-sm font-semibold text-gray-900">
                          {t('groupPage.youPaid')} {formatCurrency(expense.amount, currency)}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700">
                          {t('groupPage.paidBy')} {expense.payer.name}: {formatCurrency(expense.amount, currency)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('groupPage.lentLabel')}</p>
                      {impact.notInvolved ? (
                        <p className="text-sm text-gray-500">{t('groupPage.notInvolved')}</p>
                      ) : impact.iAmPayer ? (
                        <p className="text-sm font-semibold text-green-700">
                          {t('groupPage.youAreOwed')} {formatCurrency(impact.owedToMe, currency)}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-red-700">
                          {t('groupPage.youOwe')} {formatCurrency(impact.myShare, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {expense.status === 'pending_confirmation' && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  <Clock className="h-3 w-3" />
                  {t('groupPage.awaiting')} ({(expense.confirmations || []).filter((c: any) => c.status === 'pending').length})
                </div>
              )}
              {viewMode === 'mine' && userId && (() => {
                const mine = expense.participants?.find((p: any) => p.user?.id === userId);
                return mine ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-2 py-1 text-xs text-primary-700">
                    {t('groupPage.yourShareLabel')}: {formatCurrency(mine.share, currency)}
                  </div>
                ) : null;
              })()}

              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-2xl">{getCategoryEmoji(expense.category)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/groups/${groupId}/expenses/${expense.id}`}
                      className="font-medium text-gray-900 truncate hover:text-primary-600 transition-colors"
                    >
                      {expense.description}
                    </Link>
                    <span className="font-semibold text-gray-900 ml-2">
                      {formatCurrency(expense.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      {t('groupPage.paidBy')} <span className="font-medium text-gray-700">{expense.payer.name}</span>
                    </span>
                    <span>•</span>
                    <span>{formatDate(expense.date)}</span>
                    <span>•</span>
                    <span>{expense.participants.length} {t('groupPage.people')}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(t('groupPage.deleteExpenseConfirm'))) {
                      deleteExpense.mutate(expense.id);
                    }
                  }}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t('groupPage.deleteExpense')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Participant breakdown */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {expense.participants.map((p: any) => (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-1 rounded-full ${
                      p.isPayer
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.user.name}: {formatCurrency(p.share, currency)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-24 lg:h-fit">
        {balances?.userBalances?.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{t('groupPage.groupBalancePanel')}</h3>
              <button
                onClick={onOpenBalanceDetails}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {t('groupPage.details')}
              </button>
            </div>
            <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {t('groupPage.simplifyDebts')}: <span className="font-semibold text-gray-900">{t('groupPage.active')}</span>
            </div>
            <div className="space-y-2">
              {balances.userBalances.map((ub: any) => (
                <div key={ub.user.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={ub.user.name} avatarUrl={ub.user.avatarUrl} size="sm" />
                    <span className="text-sm font-medium text-gray-800">{ub.user.name}</span>
                  </div>
                  {Math.abs(ub.balance) < 0.01 ? (
                    <span className="text-xs font-medium text-gray-500">{t('groupPage.settled')}</span>
                  ) : ub.balance > 0 ? (
                    <span className="text-xs font-medium text-green-700">
                      {t('groupPage.shouldReceive')} {formatCurrency(Math.abs(ub.balance), currency)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-700">
                      {t('groupPage.shouldPay')} {formatCurrency(Math.abs(ub.balance), currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">{t('groupPage.tabExpenses')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>{t('groupPage.showing')}</span>
              <span className="font-semibold text-gray-900">{filteredExpenses.length}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>{t('groupPage.total')}</span>
              <span className="font-semibold text-gray-900">{formatCurrency(visibleTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>{t('groupPage.view')}</span>
              <span className="font-semibold text-gray-900">{viewMode === 'mine' ? t('groupPage.myShare') : t('groupPage.allExpenses')}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{t('groupPage.recentActivity')}</h3>
            <button
              onClick={onOpenActivityTab}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {t('groupPage.seeAllActivity')}
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500">{t('groupPage.noActivityYet')}</p>
          ) : (
            <div className="space-y-2">
              {recentActivities.slice(0, 6).map((item: any) => (
                <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-gray-500">
                      {item.type === 'expense' ? (
                        <Receipt className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {item.type === 'expense' ? (
                        <p className="truncate text-xs text-gray-700">
                          <span className="font-medium text-gray-900">{item.data?.payer?.name}</span> {t('groupPage.addedExpense')}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-gray-700">
                          <span className="font-medium text-gray-900">{item.data?.fromUser?.name}</span> {t('groupPage.paidTo')} <span className="font-medium text-gray-900">{item.data?.toUser?.name}</span>
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-gray-500">{item.data?.description || item.data?.note || '-'}</span>
                        <span className="text-[11px] font-medium text-gray-700">
                          {formatCurrency(item.data?.amount || 0, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Balances Tab ────────────────────────────────────────────────────
function BalancesTab({
  balances,
  currency,
  expenses,
  groupId,
  userId,
  queryClient,
}: {
  balances: any;
  currency: string;
  expenses: any[];
  groupId: string;
  userId?: string;
  queryClient: any;
}) {
  const [settleTarget, setSettleTarget] = useState<any>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [exportingType, setExportingType] = useState<string | null>(null);

  const createSettlement = useMutation({
    mutationFn: (data: { groupId: string; toUserId: string; amount: number; note?: string }) =>
      api.createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Settlement recorded!');
      setSettleTarget(null);
      setSettleAmount('');
      setSettleNote('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to record settlement'),
  });

  if (!balances) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // Prepare chart data
  const contributionData = balances.userBalances.map((ub: any) => ({
    name: ub.user.name.split(' ')[0],
    paid: ub.contribution.paid,
    owes: ub.contribution.owes,
  }));

  const balanceData = balances.userBalances.map((ub: any) => ({
    name: ub.user.name.split(' ')[0],
    balance: ub.balance,
  }));

  // Category breakdown
  const categoryMap = new Map<string, number>();
  for (const exp of expenses) {
    const cat = exp.category || 'general';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + exp.amount);
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(balances.totalExpenses, currency)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Number of Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{balances.expenseCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Per Person (avg)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(
              balances.userBalances.length
                ? balances.totalExpenses / balances.userBalances.length
                : 0,
              currency
            )}
          </p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={async () => {
            setExportingType('csv');
            try {
              const blob = await api.exportExpensesCsv(groupId);
              downloadBlob(blob, `expenses-${groupId}.csv`);
              toast.success('Expenses CSV exported');
            } catch (err: any) {
              toast.error(err.message || 'Export failed');
            } finally {
              setExportingType(null);
            }
          }}
          disabled={!!exportingType}
          className="btn-secondary text-sm gap-2"
        >
          <Download className="h-4 w-4" />
          {exportingType === 'csv' ? 'Exporting...' : 'Export Expenses CSV'}
        </button>
        <button
          onClick={async () => {
            setExportingType('summary');
            try {
              const blob = await api.exportSummaryCsv(groupId);
              downloadBlob(blob, `summary-${groupId}.csv`);
              toast.success('Summary CSV exported');
            } catch (err: any) {
              toast.error(err.message || 'Export failed');
            } finally {
              setExportingType(null);
            }
          }}
          disabled={!!exportingType}
          className="btn-secondary text-sm gap-2"
        >
          <Download className="h-4 w-4" />
          {exportingType === 'summary' ? 'Exporting...' : 'Export Summary CSV'}
        </button>
      </div>

      {/* Charts row */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Paid vs Owed</h3>
            <ContributionChart data={contributionData} currency={currency} />
          </div>
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Net Balance</h3>
            <BalanceChart data={balanceData} currency={currency} />
          </div>
        </div>
      )}

      {/* Category spending */}
      {categoryData.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <CategoryPieChart data={categoryData} currency={currency} />
            <div className="space-y-2">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(c.value, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-user balances */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Balances</h3>
        <div className="space-y-3">
          {balances.userBalances.map((ub: any) => (
            <div key={ub.user.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={ub.user.name} avatarUrl={ub.user.avatarUrl} size="sm" />
                <div>
                  <p className="font-medium text-gray-900">{ub.user.name}</p>
                  <p className="text-xs text-gray-500">
                    Paid {formatCurrency(ub.contribution.paid, currency)} · Owes{' '}
                    {formatCurrency(ub.contribution.owes, currency)}
                  </p>
                </div>
              </div>
              <span
                className={`font-semibold ${
                  ub.balance > 0
                    ? 'text-green-600'
                    : ub.balance < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {ub.balance > 0 ? '+' : ''}
                {formatCurrency(ub.balance, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Debts graph */}
      {balances.settlementPlan.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary-600" />
            Debts Graph
          </h3>
          <DebtFlowDiagram settlements={balances.settlementPlan} currency={currency} />
        </div>
      )}

      {/* Optimized settlement plan with Settle Up action */}
      {balances.settlementPlan.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-600" />
            Settlement Plan
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {balances.settlementPlan.length} payment{balances.settlementPlan.length !== 1 ? 's' : ''} to settle all debts
          </p>
          <div className="space-y-3">
            {balances.settlementPlan.map((sp: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={sp.from.name} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">{sp.from.name}</p>
                    <p className="text-xs text-gray-500">pays</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-gray-400 mx-2" />
                  <Avatar name={sp.to.name} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">{sp.to.name}</p>
                    <p className="text-xs text-gray-500">receives</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-primary-600">
                    {formatCurrency(sp.amount, currency)}
                  </span>
                  {/* Settle Up button — only visible for the debtor */}
                  {userId === sp.from.id && (
                    <button
                      onClick={() => {
                        setSettleTarget(sp);
                        setSettleAmount(String(sp.amount));
                      }}
                      className="btn-primary text-xs px-3 py-1.5 gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Settle Up
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle-up modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Settlement</h3>
            <p className="text-sm text-gray-500 mb-6">
              You are recording a payment to <strong>{settleTarget.to.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="input"
                  placeholder="e.g., Venmo payment"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSettleTarget(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(settleAmount);
                  if (!amt || amt <= 0) {
                    toast.error('Enter a valid amount');
                    return;
                  }
                  createSettlement.mutate({
                    groupId,
                    toUserId: settleTarget.to.id,
                    amount: amt,
                    note: settleNote || undefined,
                  });
                }}
                className="btn-primary flex-1 gap-2"
                disabled={createSettlement.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {createSettlement.isPending ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Members Tab ─────────────────────────────────────────────────────
function MembersTab({
  members,
  settlements,
  userId,
  groupId,
  queryClient,
  inviteEmail,
  setInviteEmail,
  inviteLink,
  onInvite,
  inviting,
  canManageMembers,
}: {
  members: any[];
  settlements: any[];
  userId?: string;
  groupId: string;
  queryClient: any;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteLink: string;
  onInvite: () => void;
  inviting: boolean;
  canManageMembers: boolean;
}) {
  const confirmSettlement = useMutation({
    mutationFn: (id: string) => api.confirmSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Settlement confirmed!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to confirm'),
  });

  const pendingSettlements = settlements.filter((s: any) => s.status === 'pending');
  const confirmedSettlements = settlements.filter((s: any) => s.status === 'confirmed');

  const removeMember = useMutation({
    mutationFn: (memberUserId: string) => api.removeMemberFromGroup(groupId, memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to remove member'),
  });

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary-600" />
          Invite Someone
        </h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input flex-1"
            placeholder="friend@example.com"
          />
          <button onClick={onInvite} className="btn-primary" disabled={inviting || !inviteEmail}>
            {inviting ? 'Sending...' : 'Invite'}
          </button>
        </div>

        {inviteLink && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Invite link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="input flex-1 !py-1.5 text-sm"
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                  toast.success('Invite link copied');
                }}
                className="btn-secondary gap-1"
                title="Copy link"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending settlements that need confirmation */}
      {pendingSettlements.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" />
            Pending Settlements
          </h3>
          <div className="space-y-3">
            {pendingSettlements.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{s.fromUser.name}</span>
                  <span className="text-gray-500"> paid </span>
                  <span className="font-semibold text-primary-600">{formatCurrency(s.amount)}</span>
                  <span className="text-gray-500"> to </span>
                  <span className="font-medium text-gray-900">{s.toUser.name}</span>
                  {s.note && <span className="text-gray-400 ml-2">— {s.note}</span>}
                </div>
                {userId === s.toUserId && (
                  <button
                    onClick={() => confirmSettlement.mutate(s.id)}
                    className="btn-primary text-xs px-3 py-1.5 gap-1"
                    disabled={confirmSettlement.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm
                  </button>
                )}
                {userId !== s.toUserId && (
                  <span className="text-xs text-amber-600 font-medium">Awaiting confirmation</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed settlements history */}
      {confirmedSettlements.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Settlement History
          </h3>
          <div className="space-y-2">
            {confirmedSettlements.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{s.fromUser.name}</span>
                  <span className="text-gray-500"> → </span>
                  <span className="font-medium text-gray-900">{s.toUser.name}</span>
                  {s.note && <span className="text-gray-400 ml-2">({s.note})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{formatCurrency(s.amount)}</span>
                  <span className="text-xs text-green-600">✓ Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Members ({members.length})
        </h3>
        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{m.user.name}</p>
                <p className="text-sm text-gray-500">{m.user.email}</p>
              </div>
              {m.role === 'admin' && (
                <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
              {canManageMembers && m.user.id !== userId && m.role !== 'admin' && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${m.user.name} from this trip?`)) {
                      removeMember.mutate(m.user.id);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                  disabled={removeMember.isPending}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
