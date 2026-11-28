'use client'

import { useState } from 'react'
import { PASSWORD_MAX } from '@/lib/validation'

type Props = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  describedBy?: string
  invalid?: boolean
  onCapsLockChange?: (active: boolean) => void
  maxLength?: number
  autoFocus?: boolean
}

export default function PasswordField({ id, label, value, onChange, autoComplete, describedBy, invalid, onCapsLockChange, maxLength, autoFocus }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={maxLength ?? PASSWORD_MAX}
          required
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onKeyDown={(event) => {
            onCapsLockChange?.(event.getModifierState('CapsLock'))
            if (event.key === 'Escape') setVisible(false)
          }}
          onKeyUp={(event) => onCapsLockChange?.(event.getModifierState('CapsLock'))}
          className="auth-input w-full pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-controls={id}
          className="auth-eye"
        >
          {visible
            ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" /></svg>
            : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>}
        </button>
      </div>
    </div>
  )
}
