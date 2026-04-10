'use client';

import { getInitials, cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

const colorMap = [
  'bg-primary-100 text-primary-700',
  'bg-accent-100 text-accent-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorMap[Math.abs(hash) % colorMap.length];
}

export function Avatar({ name, avatarUrl, size = 'md', className }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-full object-cover', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold',
        sizeMap[size],
        getColorFromName(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
