'use client';

import type { ReactNode } from 'react';

type Props = {
  count: number;
  busy?: boolean;
  onClear: () => void;
  children: ReactNode;
};

/** Sticky selection bar for admin multi-select queues. */
export default function AdminBulkBar({ count, busy, onClear, children }: Props) {
  if (count <= 0) return null;
  return (
    <div
      role="status"
      className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-surface-paper px-4 py-3 shadow-lg"
    >
      <p className="text-body-sm text-primary font-medium tabular-nums">
        {count} selected
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="ml-auto rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm text-on-surface-variant disabled:opacity-50 cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
}
