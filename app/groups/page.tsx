'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { Plus, Users, Receipt, ArrowRight } from 'lucide-react';

export default function GroupsPage() {
  return (
    <AuthLayout>
      <GroupsContent />
    </AuthLayout>
  );
}

function GroupsContent() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="mt-1 text-gray-500">Manage your group trips and shared expenses</p>
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
          description="Create your first trip to start splitting expenses with friends."
          action={
            <Link href="/groups/new" className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              Create Trip
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group: any) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="card flex items-center gap-4 hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="mt-0.5 text-sm text-gray-500 truncate">{group.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.members.length} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="h-4 w-4" />
                    {group._count?.expenses || 0} expenses
                  </span>
                </div>
              </div>

              <div className="flex -space-x-2 mr-2">
                {group.members.slice(0, 4).map((m: any) => (
                  <Avatar key={m.id} name={m.user.name} size="sm" className="ring-2 ring-white" />
                ))}
              </div>

              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
