'use client';

import { useState } from 'react';

export default function PasswordInput({
  id,
  value,
  onChange,
  className,
  autoComplete,
  disabled,
  required,
  minLength,
  placeholder,
  ariaInvalid,
  ariaDescribedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  autoComplete: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={`${className} w-full pr-12`}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary disabled:opacity-40"
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        disabled={disabled}
        onClick={() => setShown((open) => !open)}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {shown ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  );
}
