'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CommandPalette } from '@/app/components/CommandPalette'

const NAV = [
  {
    href: '/dashboard',
    label: 'Meus Clientes',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H9z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/radar',
    label: 'Radar de Risco',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 15, height: 15 }}>
        <path d="M8 1.5l6.5 11.5H1.5z" />
        <path d="M8 6.5v3" />
        <circle cx="8" cy="11.3" r="0.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/atender',
    label: 'Atender',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M4 2l9 6-9 6z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/painel',
    label: 'Painel',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M8 1.5l1.6 4.9H15l-4.2 3 1.6 4.9L8 11.3l-4.4 3.1 1.6-4.9L1 6.4h5.4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/followups',
    label: 'Follow-ups',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 15, height: 15 }}>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v4l2 2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/perfil',
    label: 'Notificações',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 15, height: 15 }}>
        <path d="M8 1.5a4 4 0 00-4 4c0 4-1.5 5-1.5 5h11s-1.5-1-1.5-5a4 4 0 00-4-4z" />
        <path d="M6.5 13.5a1.5 1.5 0 003 0" />
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [agente, setAgente] = useState<{ nome: string; cargo: string; email: string } | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setAgente({ nome: d.nome, cargo: d.cargo, email: d.email }) }).catch(() => {})
  }, [])

  const iniciais = (agente?.nome ?? 'Agente').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="shell">
      <nav className="sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.75rem', padding: '0 4px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#09bc8a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" fill="#0d1e18" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.2px' }}>
            Prospecção Nexi
          </span>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#09bc8a' : '#81869e',
                  background: active ? 'rgba(9,188,138,0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = '#24262e'
                    e.currentTarget.style.color = '#fff'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#81869e'
                  }
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Cmd+K hint */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', marginBottom: 4, borderRadius: 8, background: '#15161b', border: '1px solid #2a2c34', fontSize: 11.5, color: '#81869e' }}>
          <span>Busca rápida</span>
          <kbd style={{ fontSize: 10, color: '#81869e', border: '1px solid #353740', borderRadius: 5, padding: '2px 6px' }}>⌘K</kbd>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #353740', paddingTop: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#09bc8a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#0d1e18',
              flexShrink: 0,
            }}>
              {iniciais}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agente?.nome ?? 'Agente'}</div>
              <div style={{ fontSize: 11, color: '#81869e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agente?.cargo || agente?.email || 'Comercial'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '7px 10px',
              background: 'transparent',
              border: '1px solid #353740',
              borderRadius: 8,
              color: '#81869e',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#24262e'
              e.currentTarget.style.color = '#ef4444'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#81869e'
              e.currentTarget.style.borderColor = '#353740'
            }}
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="main">
        {children}
      </div>

      <CommandPalette />
    </div>
  )
}
