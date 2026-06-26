'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value:        string
  onChange:     (val: string) => void
  options:      string[]
  placeholder?: string
}

export default function CSelectModal({ value, onChange, options, placeholder = 'Selecionar...' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  return (
    <div ref={ref} className={`cselect${open ? ' open' : ''}`}>
      <button
        type="button"
        className="cselect-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span className="cselect-val" style={{ color: value ? 'var(--tx)' : 'var(--tx2)' }}>
          {value || placeholder}
        </span>
        <svg
          className="cselect-chev"
          width="12" height="12"
          viewBox="0 0 12 12"
          fill="none" stroke="currentColor" strokeWidth="1.8"
        >
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>
      <div className="cselect-menu">
        {options.map(opt => (
          <div
            key={opt}
            className={`cselect-opt${value === opt ? ' sel' : ''}`}
            onClick={() => { onChange(opt); setOpen(false) }}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  )
}
