'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value:       string
  onChange:    (val: string) => void
  options:     string[]
  placeholder?: string
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecionar...' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#15161b',
          border: `1px solid ${open ? '#09bc8a' : '#353740'}`,
          borderRadius: 10,
          color: value ? '#fff' : '#81869e',
          fontSize: 13,
          fontFamily: 'Montserrat, sans-serif',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          style={{
            width: 11,
            height: 11,
            color: '#81869e',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <path d="M3 6l5 4.5L13 6" />
        </svg>
      </button>

      {/* Menu */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#1e1f24',
          border: '1px solid #353740',
          borderRadius: 10,
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          animation: 'fadeUp 0.15s cubic-bezier(0.4,0,0.2,1) both',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: value === opt ? 'rgba(9,188,138,0.1)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                color: value === opt ? '#09bc8a' : '#c8cad0',
                fontSize: 13,
                fontFamily: 'Montserrat, sans-serif',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => {
                if (value !== opt) e.currentTarget.style.background = '#24262e'
              }}
              onMouseLeave={e => {
                if (value !== opt) e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt}
              {value === opt && (
                <svg viewBox="0 0 16 16" fill="none" stroke="#09bc8a" strokeWidth="2" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <path d="M3 8l4 4 6-7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
