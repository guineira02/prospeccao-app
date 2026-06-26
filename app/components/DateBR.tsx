'use client'

import { useRef } from 'react'

interface Props {
  value: string                    // ISO yyyy-mm-dd
  onChange: (iso: string) => void
  placeholder?: string
}

// Input de data que SEMPRE mostra dd/mm/aaaa (independente do locale do SO),
// mas abre o calendário nativo. Valor permanece ISO para o backend.
export function DateBR({ value, onChange, placeholder = 'dd/mm/aaaa' }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  function display(iso: string) {
    if (!iso) return placeholder
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  function openPicker() {
    const el = ref.current
    if (!el) return
    // showPicker abre o calendário nativo (Chrome/Edge/Firefox modernos)
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={openPicker} style={{
        width: '100%', padding: '10px 12px', textAlign: 'left',
        background: '#15161b', border: '1px solid #353740', borderRadius: 10,
        color: value ? '#fff' : '#81869e', fontSize: 13, fontFamily: 'inherit',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#09bc8a')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#353740')}>
        <span>{display(value)}</span>
        <svg viewBox="0 0 16 16" fill="none" stroke="#81869e" strokeWidth="1.4" style={{ width: 14, height: 14, flexShrink: 0 }}>
          <rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 6h12M5 1.5v3M11 1.5v3" />
        </svg>
      </button>
      {/* input nativo invisível, só pra abrir o picker e capturar o valor */}
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, pointerEvents: 'none', colorScheme: 'dark',
        }}
        tabIndex={-1}
      />
    </div>
  )
}
