'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { Plus, Users, Receipt, ArrowRight, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AuthLayout>
      <DashboardContent />
    </AuthLayout>
  );
}

function DashboardContent() {
  const { user } = useAuthStore();
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-gray-500">Here&apos;s an overview of your trip expenses</p>
        </div>
        <Link href="/groups/new" className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          New Trip
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : !groups?.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No trips yet"
          description="Create your first trip group to start tracking shared expenses with friends."
          action={
            <Link href="/groups/new" className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Trip
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="card hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="mt-1 text-sm text-gray-500 truncate">{group.description}</p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors flex-shrink-0 ml-2" />
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.members.length} members
                </span>
                <span className="flex items-center gap-1">
                  <Receipt className="h-4 w-4" />
                  {group._count?.expenses || 0} expenses
                </span>
              </div>

              {/* Member avatars */}
              <div className="mt-4 flex -space-x-2">
                {group.members.slice(0, 5).map((m: any) => (
                  <Avatar
                    key={m.id}
                    name={m.user.name}
                    avatarUrl={m.user.avatarUrl}
                    size="sm"
                    className="ring-2 ring-white"
                  />
                ))}
                {group.members.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white text-xs font-medium text-gray-600">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
