'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cliente {
  _id:                 string
  'Razão Social':      string
  CNPJ:                string
  UF:                  string
  'Consumo Estimado'?: number
  Status?:             string
}

const STATUS_COLOR: Record<string, string> = {
  'Em prospecção': '#09bc8a',
  'Proposta enviada': '#60a5fa',
  'Aguardando retorno': '#fbbf24',
  'Declínio': '#ef4444',
  'default': '#353740',
}

const STATUS_STRIPE: Record<string, string> = {
  'Em prospecção': '#09bc8a',
  'Proposta enviada': '#60a5fa',
  'Aguardando retorno': '#fbbf24',
  'Declínio': '#ef4444',
  'default': '#81869e',
}

function stripeColor(status?: string) {
  return STATUS_STRIPE[status ?? ''] ?? STATUS_STRIPE['default']
}

function badgeColor(status?: string) {
  const c = STATUS_COLOR[status ?? ''] ?? STATUS_COLOR['default']
  return { color: c, background: `${c}18`, border: `1px solid ${c}30` }
}

function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState('')
  const [busca, setBusca]         = useState('')

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => {
        if (r.status === 401) { router.push('/'); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        if (d.error) { setErro(d.error); return }
        setClientes(d.clientes ?? [])
      })
      .catch(() => setErro('Erro ao carregar clientes'))
      .finally(() => setLoading(false))
  }, [router])

  const filtrados = clientes.filter(c =>
    c['Razão Social'].toLowerCase().includes(busca.toLowerCase()) ||
    c.CNPJ.includes(busca) ||
    c.UF.toLowerCase().includes(busca.toLowerCase())
  )

  function goTimeline(c: Cliente) {
    const params = new URLSearchParams({
      nome: c['Razão Social'],
      cnpj: c.CNPJ,
      uf: c.UF,
      status: c.Status ?? '',
      consumo: String(c['Consumo Estimado'] ?? ''),
    })
    router.push(`/dashboard/${c._id}?${params}`)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Meus Clientes
        </h1>
        <p style={{ fontSize: 13, color: '#81869e' }}>
          Carteira de prospecção — Tendência Energia
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <svg
          viewBox="0 0 16 16" fill="none" stroke="#81869e" strokeWidth="1.5"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }}
        >
          <circle cx="6.5" cy="6.5" r="5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          type="text"
          placeholder="Buscar empresa, CNPJ ou UF..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 34px',
            background: '#1e1f24',
            border: '1px solid #353740',
            borderRadius: 10,
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'Montserrat, sans-serif',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
          onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
        />
      </div>

      {/* Estado */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>
          Carregando clientes...
        </div>
      )}

      {!loading && erro && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>
          {erro}
        </div>
      )}

      {!loading && !erro && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>
          {busca ? 'Nenhum cliente encontrado.' : 'Carteira vazia.'}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtrados.map(c => (
          <div
            key={c._id}
            onClick={() => goTimeline(c)}
            style={{
              background: '#1e1f24',
              border: '1px solid #353740',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#09bc8a40'
              e.currentTarget.style.background = '#24262e'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#353740'
              e.currentTarget.style.background = '#1e1f24'
            }}
          >
            {/* Status stripe */}
            <div style={{ width: 4, flexShrink: 0, background: stripeColor(c.Status) }} />

            {/* Content */}
            <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#24262e',
                border: '1px solid #353740',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#09bc8a',
                flexShrink: 0,
              }}>
                {c['Razão Social'].slice(0, 2).toUpperCase()}
              </div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c['Razão Social']}
                </div>
                <div style={{ fontSize: 12, color: '#81869e' }}>
                  {formatCNPJ(c.CNPJ)} · {c.UF}
                  {c['Consumo Estimado'] ? ` · ${c['Consumo Estimado'].toLocaleString('pt-BR')} kW` : ''}
                </div>
              </div>

              {/* Status badge */}
              {c.Status && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 20,
                  flexShrink: 0,
                  ...badgeColor(c.Status),
                }}>
                  {c.Status}
                </span>
              )}

              {/* Arrow */}
              <span style={{ color: '#353740', fontSize: 16, flexShrink: 0 }}>→</span>
            </div>
          </div>
        ))}
      </div>

      {!loading && !erro && clientes.length > 0 && (
        <div style={{ marginTop: '1rem', fontSize: 12, color: '#81869e', textAlign: 'right' }}>
          {filtrados.length} de {clientes.length} clientes
        </div>
      )}
    </div>
  )
}
