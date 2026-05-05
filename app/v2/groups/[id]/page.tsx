'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate, getCategoryEmoji } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export default function V2GroupPage() {
	const params = useParams<{ id: string }>();
	const { user } = useAuthStore();
	const groupId = params.id;

	const { data: group, isLoading } = useQuery({
		queryKey: ['group', groupId],
		queryFn: () => api.getGroup(groupId),
		enabled: !!groupId,
	});

	const { data: balances } = useQuery({
		queryKey: ['balances', groupId],
		queryFn: () => api.getGroupBalances(groupId),
		enabled: !!groupId,
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-20">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!group) {
		return <p className="text-sm text-slate-500 dark:text-slate-400">Group not found.</p>;
	}

	const myBalance =
		balances?.userBalances?.find((entry: any) => entry.user.id === user?.id)?.balance || 0;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">V2 Group View</p>
					<h1 className="mt-1 text-3xl font-semibold">{group.name}</h1>
					{group.description ? (
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
					) : null}
				</div>
				<div className="flex gap-2">
					<Link href="/v2/groups" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
						Back to groups
					</Link>
					<Link href={`/groups/${groupId}/expenses/new`} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
						Add expense
					</Link>
				</div>
			</div>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<article className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-5 text-white shadow-lg">
					<p className="text-sm opacity-85">Your balance</p>
					<p className="mt-2 text-3xl font-semibold">{formatCurrency(myBalance, group.currency)}</p>
				</article>
				<article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171923]">
					<p className="text-sm text-slate-500 dark:text-slate-400">Total expenses</p>
					<p className="mt-2 text-3xl font-semibold">{formatCurrency(balances?.totalExpenses || 0, group.currency)}</p>
				</article>
				<article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171923]">
					<p className="text-sm text-slate-500 dark:text-slate-400">Members</p>
					<p className="mt-2 text-3xl font-semibold">{group.members?.length || 0}</p>
				</article>
			</section>

			<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171923]">
				<h2 className="mb-4 text-lg font-semibold">Recent expenses</h2>
				{!group.expenses?.length ? (
					<p className="text-sm text-slate-500 dark:text-slate-400">No expenses in this group yet.</p>
				) : (
					<div className="space-y-2">
						{group.expenses.slice(0, 8).map((expense: any) => (
							<Link
								key={expense.id}
								href={`/groups/${groupId}/expenses/${expense.id}`}
								className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
							>
								<div>
									<p className="text-sm font-medium">
										{getCategoryEmoji(expense.category)} {expense.description}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										Paid by {expense.payer?.name} · {formatDate(expense.date)}
									</p>
								</div>
								<p className="text-sm font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
							</Link>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
