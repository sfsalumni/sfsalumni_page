'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AmountWithFx from '@/components/amount-with-fx';
import {
  buildUpiPayUri,
  type BankAccountPublic,
} from '@/lib/payments/bank-details';

export type { BankAccountPublic };

export type ExistingOfflineProof = {
  utr: string | null;
  hasScreenshot: boolean;
  status: 'pending';
};

type Props = {
  open: boolean;
  onClose: () => void;
  account: BankAccountPublic;
  amountPaise: number;
  note?: string;
  source:
    | { type: 'registration'; registrationId: string }
    | { type: 'donation'; causeId: string; message?: string };
  /** When set, proof was already submitted and cannot be replaced until reviewed. */
  existingProof?: ExistingOfflineProof | null;
  onSubmitted?: (message: string) => void;
  submitUrl?: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function OfflinePayModal({
  open,
  onClose,
  account,
  amountPaise,
  note,
  source,
  existingProof = null,
  onSubmitted,
  submitUrl = '/api/payments/offline-proof',
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [phase, setPhase] = useState<'pay' | 'thanks'>('pay');
  const [thanksMessage, setThanksMessage] = useState('');
  const proofLocked = existingProof?.status === 'pending';

  const upiUri = account.upi_id
    ? buildUpiPayUri({
        upiId: account.upi_id,
        amountPaise,
        payeeName: account.account_name,
        note: note || account.label,
      })
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setUtr(existingProof?.utr?.trim() || '');
    setFile(null);
    setError('');
    setPhase('pay');
    setThanksMessage('');
  }, [open, existingProof?.utr]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, phase]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (phase === 'thanks') {
        const msg =
          thanksMessage ||
          'Thank you. Your payment is pending confirmation. Your QR will appear once the committee marks it paid.';
        onSubmitted?.(msg);
        setPhase('pay');
        setThanksMessage('');
        onClose();
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, phase, thanksMessage, onSubmitted, onClose]);

  useEffect(() => {
    if (!open || !upiUri || proofLocked) {
      setQrSrc('');
      return;
    }
    let cancel = false;
    import('qrcode')
      .then((mod) =>
        mod.default.toDataURL(upiUri, {
          margin: 1,
          width: 220,
          errorCorrectionLevel: 'M',
        })
      )
      .then((url) => {
        if (!cancel) setQrSrc(url);
      })
      .catch(() => {
        if (!cancel) setQrSrc('');
      });
    return () => {
      cancel = true;
    };
  }, [open, upiUri, proofLocked]);

  // Portal to document.body so this form is never nested inside the registration <form>
  // (nested forms make "Submit for verification" save the page form instead of posting proof).
  if (!open || !mounted) return null;

  function finishThanks() {
    const msg =
      thanksMessage ||
      'Thank you. Your payment is pending confirmation. Your QR will appear once the committee marks it paid.';
    onSubmitted?.(msg);
    setPhase('pay');
    setThanksMessage('');
    onClose();
  }

  async function onCopy(label: string, value: string) {
    const ok = await copyText(value);
    setCopied(ok ? label : '');
    if (ok) setTimeout(() => setCopied(''), 1500);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    if (proofLocked) {
      setError('A proof is already pending committee review.');
      return;
    }
    if (!utr.trim()) {
      setError('UTR / reference is required');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('sourceType', source.type);
      fd.set('paymentAccountId', account.id);
      if (utr.trim()) fd.set('utr', utr.trim());
      if (file) fd.set('screenshot', file);
      if (source.type === 'registration') {
        fd.set('registrationId', source.registrationId);
      } else {
        fd.set('causeId', source.causeId);
        fd.set('amountPaise', String(amountPaise));
        if (source.message) fd.set('message', source.message);
      }
      const res = await fetch(submitUrl, { method: 'POST', body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not submit');
        return;
      }
      setUtr('');
      setFile(null);
      setThanksMessage(
        'Thank you for your payment. Your QR will appear once the committee marks it paid.'
      );
      setPhase('thanks');
    } catch {
      setError('Could not submit. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const rows: { label: string; value: string; key: string }[] = [
    { key: 'name', label: 'Account name', value: account.account_name },
    { key: 'number', label: 'Account number', value: account.account_number },
    { key: 'ifsc', label: 'IFSC', value: account.ifsc },
  ];
  if (account.bank_name) {
    rows.push({ key: 'bank', label: 'Bank', value: account.bank_name });
  }
  if (account.upi_id) {
    rows.push({ key: 'upi', label: 'UPI ID', value: account.upi_id });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
      role="presentation"
      onClick={() => {
        if (busy) return;
        if (phase === 'thanks') finishThanks();
        else onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface border border-outline-variant shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'thanks' ? (
          <div className="px-5 py-8 space-y-5 text-center">
            <h2 id={titleId} className="text-lg font-semibold text-on-surface">
              Thank you
            </h2>
            <p className="text-sm text-on-surface-variant">
              Thank you for your payment. The committee will confirm the remittance.
            </p>
            <p className="text-sm text-on-surface font-medium">
              Your QR will appear once they mark it paid.
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={finishThanks}
              className="w-full rounded-lg bg-primary text-on-primary px-4 py-3 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              OK
            </button>
          </div>
        ) : proofLocked ? (
          <div className="px-5 py-8 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-semibold text-on-surface">
                Payment already submitted
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-on-surface" role="status">
              Your Bank / UPI payment proof is already on file and pending committee review. Do not
              pay again.
            </p>
            {existingProof?.utr?.trim() ? (
              <p className="text-sm text-on-surface-variant">
                UTR / reference: <span className="tabular-nums text-on-surface">{existingProof.utr.trim()}</span>
              </p>
            ) : null}
            {existingProof?.hasScreenshot ? (
              <p className="text-sm text-on-surface-variant">Screenshot is on file.</p>
            ) : null}
            <p className="text-sm text-on-surface-variant">
              Your QR will appear once the committee marks this payment paid. You can update
              details after they review it.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-primary text-on-primary px-4 py-3 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 flex items-start justify-between gap-3 bg-surface border-b border-outline-variant px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-on-surface">
                  Bank / UPI transfer
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Pay the amount below to <strong>{account.label}</strong>, then submit proof.
                </p>
                <div className="mt-2">
                  <AmountWithFx
                    paise={amountPaise}
                    primaryClassName="text-headline-sm text-jubilee-gold-deep tabular-nums"
                  />
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                        {r.label}
                      </p>
                      <p className="text-sm break-all tabular-nums text-on-surface">{r.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onCopy(r.key, r.value)}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold uppercase text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {copied === r.key ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                ))}
              </ul>

              {account.upi_id ? (
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-center">
                  <p className="text-xs uppercase tracking-wider mb-3 text-on-surface-variant">
                    Scan with any UPI app
                  </p>
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt={`UPI QR for ${account.upi_id}`}
                      width={220}
                      height={220}
                      className="mx-auto rounded-lg bg-white p-2"
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant">Preparing QR…</p>
                  )}
                  <p className="text-sm text-on-surface-variant mt-2 break-all">{account.upi_id}</p>
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-3 border-t border-outline-variant pt-4">
                <p className="text-sm text-on-surface-variant">
                  After paying, enter the UTR / bank reference so the committee can verify. A screenshot
                  is optional.
                </p>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant">
                    UTR / reference *
                  </span>
                  <input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    disabled={busy}
                    required
                    aria-required
                    className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-70"
                    placeholder="Bank / UPI reference number"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant">
                    Screenshot (optional)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-on-surface"
                  />
                </label>
                {error ? (
                  <p
                    className="rounded-lg bg-red-50 text-red-700 text-sm p-3"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-primary text-on-primary px-4 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {busy ? 'Registering…' : 'Register'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
