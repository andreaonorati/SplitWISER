'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = {
  /** Increment to fire the egg. */
  trigger: number;
  src?: string;
  caption?: string;
};

export function PragueFirstExpenseEgg({
  trigger,
  src = '/easter-egg-praga.png',
  caption = 'Prima spesa a Praga 🍻',
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 4500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Easter egg Praga"
    >
      <div className="relative animate-praga-egg-pop">
        <div className="relative h-[420px] w-[340px] sm:h-[520px] sm:w-[420px]">
          <Image
            src={src}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 340px, 420px"
            className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
          />
        </div>
        <p className="mt-3 text-center text-sm font-medium tracking-wide text-amber-200">
          {caption}
        </p>
      </div>

      <style jsx global>{`
        @keyframes praga-egg-pop {
          0% {
            transform: scale(0.6) rotate(-6deg);
            opacity: 0;
          }
          12% {
            transform: scale(1.06) rotate(2deg);
            opacity: 1;
          }
          22% {
            transform: scale(1) rotate(0deg);
          }
          85% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.95) rotate(0deg);
            opacity: 0;
          }
        }
        .animate-praga-egg-pop {
          animation: praga-egg-pop 4.5s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
