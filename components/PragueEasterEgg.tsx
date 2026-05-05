'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  groupName: string;
  /** Optional external trigger (e.g. clicking the group avatar). */
  trigger: number;
};

const PRAGUE_NAMES = ['praga', 'prague', 'praha'];

export function PragueEasterEgg({ groupName, trigger }: Props) {
  const isPrague = useMemo(
    () => PRAGUE_NAMES.includes((groupName || '').trim().toLowerCase()),
    [groupName]
  );

  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!isPrague) return;
    if (trigger <= 0) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 4200);
    return () => clearTimeout(t);
  }, [trigger, isPrague]);

  if (!isPrague || !active) return null;

  // 28 falling beer mugs with random offsets
  const drops = Array.from({ length: 28 }, (_, i) => i);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {drops.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const duration = 2.2 + Math.random() * 1.8;
        const size = 22 + Math.random() * 22;
        const drift = (Math.random() - 0.5) * 60;
        return (
          <span
            key={i}
            className="absolute animate-praga-drop"
            style={{
              left: `${left}%`,
              top: '-10%',
              fontSize: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              ['--praga-drift' as any]: `${drift}px`,
            }}
            aria-hidden
          >
            {i % 4 === 0 ? '🥨' : i % 5 === 0 ? '🇨🇿' : '🍺'}
          </span>
        );
      })}

      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 animate-praga-toast">
        <div className="rounded-2xl border border-amber-300/60 bg-white/90 px-5 py-3 text-center shadow-2xl backdrop-blur-md dark:border-amber-500/40 dark:bg-[#1a1410]/90">
          <p className="text-2xl font-semibold tracking-tight text-amber-700 dark:text-amber-300">
            Na zdraví! 🍺
          </p>
          <p className="mt-0.5 text-xs text-amber-900/70 dark:text-amber-200/70">
            Vítejte v Praze.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes praga-drop {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--praga-drift, 0px), 110vh) rotate(360deg);
            opacity: 0.85;
          }
        }
        .animate-praga-drop {
          animation-name: praga-drop;
          animation-timing-function: cubic-bezier(0.4, 0.05, 0.6, 1);
          animation-fill-mode: forwards;
          will-change: transform, opacity;
        }
        @keyframes praga-toast {
          0% {
            transform: translate(-50%, -10px) scale(0.8);
            opacity: 0;
          }
          15%,
          80% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -10px) scale(0.95);
            opacity: 0;
          }
        }
        .animate-praga-toast {
          animation: praga-toast 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
