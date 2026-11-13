'use client';

import { useEffect, useId, useState } from 'react';
import {
  FX_CURRENCIES,
  formatForeignFromPaise,
  isFxCurrency,
  pickRate,
  type FxCurrency,
  type InrRates,
} from '@/lib/fx/convert';
import { formatCostForDisplay } from '@/lib/registration/registration';

const STORAGE_KEY = 'sfs-fx-currency';

type Props = {
  /** Amount in paise (INR). */
  paise: number;
  /** Primary INR line size: default matches cost summary. */
  primaryClassName?: string;
  className?: string;
  /** When false, hide the currency picker (still shows INR). */
  showPicker?: boolean;
};

function readStoredCurrency(): FxCurrency {
  if (typeof window === 'undefined') return 'INR';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isFxCurrency(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'INR';
}

export default function AmountWithFx({
  paise,
  primaryClassName = 'text-headline-md text-jubilee-gold-deep tabular-nums',
  className = '',
  showPicker = true,
}: Props) {
  const selectId = useId();
  const [currency, setCurrency] = useState<FxCurrency>('INR');
  const [rates, setRates] = useState<InrRates | null>(null);
  const [rateMeta, setRateMeta] = useState<{ provider?: string; fetchedAt?: number } | null>(
    null
  );

  useEffect(() => {
    setCurrency(readStoredCurrency());
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/fx/rates', { cache: 'default' });
        const payload = await res.json().catch(() => ({}));
        if (!active || !res.ok) return;
        if (payload.rates && typeof payload.rates === 'object') {
          setRates(payload.rates as InrRates);
          setRateMeta({
            provider: typeof payload.provider === 'string' ? payload.provider : undefined,
            fetchedAt: typeof payload.fetchedAt === 'number' ? payload.fetchedAt : undefined,
          });
        }
      } catch {
        /* hide estimate on failure */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function onCurrencyChange(next: string) {
    if (!isFxCurrency(next)) return;
    setCurrency(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const rate = pickRate(rates, currency);
  const estimate =
    currency === 'INR' ? null : formatForeignFromPaise(paise, currency, rate);

  const rateDetail =
    currency !== 'INR' && rate != null
      ? `1 INR ≈ ${rate.toFixed(4)} ${currency}${
          rateMeta?.provider ? ` · ${rateMeta.provider}` : ''
        }`
      : null;

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <p className={primaryClassName}>{formatCostForDisplay(paise)}</p>
      {showPicker ? (
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <label htmlFor={selectId} className="text-label-sm text-on-surface-variant">
            View in
          </label>
          <select
            id={selectId}
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface px-2 py-1 text-label-sm text-on-surface focus:outline-none focus:border-primary"
          >
            {FX_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {estimate ? (
        <p className="text-label-sm text-on-surface-variant tabular-nums text-right">{estimate}</p>
      ) : null}
      {rateDetail ? (
        <p className="text-label-sm text-on-surface-variant text-right">{rateDetail}</p>
      ) : null}
      {currency !== 'INR' ? (
        <p className="text-label-sm text-on-surface-variant text-right">
          Estimate only — you pay in INR.
        </p>
      ) : null}
    </div>
  );
}
