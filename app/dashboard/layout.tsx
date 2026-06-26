'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DashboardProvider, useDashboard } from './context'

const NAV = [
  {
    href: '/dashboard',
    label: 'Meus Clientes',
    icon: (
      <svg className="nav-ic" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H9z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/painel',
    label: 'Painel',
    icon: (
      <svg className="nav-ic" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5l1.6 4.9H15l-4.2 3 1.6 4.9L8 11.3l-4.4 3.1 1.6-4.9L1 6.4h5.4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/followups',
    label: 'Follow-ups',
    icon: (
      <svg className="nav-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v4l2 2" />
      </svg>
    ),
  },
]

function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { me }   = useDashboard()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <div className="sb-icon">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" fill="#0d1e18" />
          </svg>
        </div>
        <span className="sb-name">Prospecção</span>
      </div>

      {NAV.map(item => {
        const active = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={`nav-item${active ? ' on' : ''}`}>
            {item.icon}
            {item.label}
          </Link>
        )
      })}

      <div className="sb-foot">
        <div className="agent-row">
          <div className="agent-av">{me?.initials ?? '…'}</div>
          <div>
            <div className="agent-name">{me?.nome ?? '—'}</div>
            <div className="agent-role">{me?.cargo ?? 'Agente comercial'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 12, width: '100%', padding: '7px 10px',
            background: 'transparent', border: '1px solid var(--border-s)',
            borderRadius: 8, color: 'var(--tx2)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx2)'; e.currentTarget.style.borderColor = 'var(--border-s)' }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="shell">
        <Sidebar />
        <div className="main">{children}</div>
      </div>
    </DashboardProvider>
  )
}
