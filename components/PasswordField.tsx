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
}

export default function PasswordField({ id, label, value, onChange, autoComplete, describedBy, invalid }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="w-full rounded border p-2 pr-20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#7a1f2b] underline"
        >
          {visible ? 'Masquer' : 'Afficher'}
        </button>
      </div>
    </div>
  )
}
