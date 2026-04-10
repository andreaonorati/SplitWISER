'use client';

import { formatCurrency, formatDate, getCategoryEmoji } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import {
  Receipt,
  CheckCircle2,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'expense' | 'settlement';
  date: string;
  data: any;
}

export function ActivityTimeline({
  activities,
  groupId,
  currency,
}: {
  activities: ActivityItem[];
  groupId: string;
  currency: string;
}) {
  if (!activities.length) {
    return (
      <div className="card text-center py-12">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No activity yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Activity will appear here as expenses and settlements are recorded
        </p>
      </div>
    );
  }

  // Group activities by date
  const grouped = new Map<string, ActivityItem[]>();
  for (const item of activities) {
    const dateKey = new Date(item.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(item);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {dateLabel}
          </h4>
          <div className="space-y-1">
            {items.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                groupId={groupId}
                currency={currency}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({
  item,
  groupId,
  currency,
}: {
  item: ActivityItem;
  groupId: string;
  currency: string;
}) {
  const time = new Date(item.date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (item.type === 'expense') {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
            {getCategoryEmoji(item.data.category) || <Receipt className="h-4 w-4" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{item.data.payer.name}</span>{' '}
            added{' '}
            <Link
              href={`/groups/${groupId}/expenses/${item.id}`}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {item.data.description}
            </Link>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{time}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-700">
              {formatCurrency(item.data.amount, currency)}
            </span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-500">
              {item.data.participantCount} people
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Settlement
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            item.data.confirmed
              ? 'bg-green-100 text-green-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {item.data.confirmed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ArrowRightLeft className="h-4 w-4" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{item.data.fromUser.name}</span>{' '}
          paid{' '}
          <span className="font-medium">{item.data.toUser.name}</span>
          {item.data.confirmed && (
            <span className="ml-1.5 inline-flex items-center text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-0.5" />
              Confirmed
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{time}</span>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs font-medium text-gray-700">
            {formatCurrency(item.data.amount, currency)}
          </span>
          {item.data.note && (
            <>
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-gray-500 italic">{item.data.note}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
