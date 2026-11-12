'use client';

import { useEffect, useState } from 'react';

export default function RegistrationQr({ code }: { code: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancel = false;
    import('qrcode').then((mod) =>
      mod.default.toDataURL(code, { margin: 1, width: 220, errorCorrectionLevel: 'M' })
    )
      .then((url) => {
        if (!cancel) setSrc(url);
      })
      .catch(() => {
        if (!cancel) setSrc('');
      });
    return () => {
      cancel = true;
    };
  }, [code]);

  if (!src) {
    return <p className="text-body-sm text-on-surface-variant">Preparing QR code…</p>;
  }

  return (
    <img
      src={src}
      alt={`QR code for registration ${code}`}
      width={220}
      height={220}
      className="rounded-lg bg-white p-2"
    />
  );
}
