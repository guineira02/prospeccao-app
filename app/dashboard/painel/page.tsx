'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESTAGIO_COLOR, diasAtraso, mesesAteVencimento, type Estagio } from '@/lib/constants'

interface Cliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  estagio: Estagio; ultimoContato: string | null; proximoFollowUp: string | null
  totalAtividades: number; concorrente: string | null; vencimento: string | null
}

export default function PainelPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => { if (d) setClientes(d.clientes ?? []) })
      .finally(() => setLoading(false))
  }, [router])

  const kpis = useMemo(() => {
    const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 7)
    const atrasados = clientes.filter(c => { const d = diasAtraso(c.proximoFollowUp); return d !== null && d > 0 })
    const semana = clientes.filter(c => c.ultimoContato && new Date(c.ultimoContato) >= seteDias)
    const renov = clientes.filter(c => { const m = mesesAteVencimento(c.vencimento); return m !== null && m >= 0 && m <= 6 })
    return {
      total: clientes.length,
      atrasados: atrasados.length,
      semana: semana.length,
      renov: renov.length,
    }
  }, [clientes])

  // 10 follow-ups mais urgentes
  const urgentes = useMemo(() => clientes
    .map(c => ({ c, atraso: diasAtraso(c.proximoFollowUp) }))
    .filter(x => x.atraso !== null)
    .sort((a, b) => (b.atraso ?? 0) - (a.atraso ?? 0))
    .slice(0, 10), [clientes])

  // radar de renovação
  const renovacoes = useMemo(() => clientes
    .map(c => ({ c, meses: mesesAteVencimento(c.vencimento) }))
    .filter(x => x.meses !== null && x.meses >= 0 && x.meses <= 6)
    .sort((a, b) => (a.meses ?? 0) - (b.meses ?? 0)), [clientes])

  function goCliente(c: Cliente) {
    sessionStorage.setItem(`cli_${c.id}`, JSON.stringify(c))
    router.push(`/dashboard/${c.id}`)
  }

  const KPIS = [
    { label: 'Clientes na carteira', value: kpis.total, sub: 'total', color: '#09bc8a' },
    { label: 'Follow-ups em atraso', value: kpis.atrasados, sub: 'precisam de ação', color: '#ef4444' },
    { label: 'Contatados na semana', value: kpis.semana, sub: 'últimos 7 dias', color: '#60a5fa' },
    { label: 'Renovações próximas', value: kpis.renov, sub: 'vencem em ≤6 meses', color: '#fbbf24' },
  ]

  return (
    <div style={{ padding: '1.75rem 2.25rem', maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.4px' }}>Painel</h1>
      <p style={{ fontSize: 13, color: '#81869e', marginBottom: '1.5rem' }}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
      </p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: '1.75rem' }}>
        {KPIS.map((k, i) => (
          <div key={k.label} style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, padding: '18px', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s', animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 60}ms` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: k.color, opacity: 0.7 }} />
            <div style={{ fontSize: 30, fontWeight: 700, color: k.color, marginBottom: 4, letterSpacing: '-1px' }}>{loading ? '—' : k.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: '#81869e' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Follow-ups urgentes */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            🔥 Follow-ups urgentes
          </h2>
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, overflow: 'hidden' }}>
            {urgentes.length === 0 && <Empty>Nenhum follow-up pendente.</Empty>}
            {urgentes.map(({ c, atraso }, i) => (
              <button key={c.id} onClick={() => goCliente(c)} style={rowBtn(i, urgentes.length)}>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#81869e' }}>{c.uf} · {c.estagio}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                  background: (atraso ?? 0) > 0 ? 'rgba(239,68,68,0.12)' : (atraso === 0 ? 'rgba(9,188,138,0.12)' : 'rgba(96,165,250,0.1)'),
                  color: (atraso ?? 0) > 0 ? '#ef4444' : (atraso === 0 ? '#09bc8a' : '#60a5fa') }}>
                  {(atraso ?? 0) > 0 ? `${atraso}d atraso` : atraso === 0 ? 'hoje' : `em ${-(atraso ?? 0)}d`}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Radar de renovação */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            ⏳ Radar de renovação
          </h2>
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, overflow: 'hidden' }}>
            {renovacoes.length === 0 && <Empty>Nenhum contrato vencendo em 6 meses.<br/><span style={{ fontSize: 11 }}>Registre concorrente + vencimento no card do cliente.</span></Empty>}
            {renovacoes.map(({ c, meses }, i) => (
              <button key={c.id} onClick={() => goCliente(c)} style={rowBtn(i, renovacoes.length)}>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#81869e' }}>{c.uf}{c.concorrente ? ` · vs ${c.concorrente}` : ''}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                  background: (meses ?? 9) <= 2 ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                  color: (meses ?? 9) <= 2 ? '#ef4444' : '#fbbf24' }}>
                  {meses === 0 ? 'este mês' : `${meses}m`}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#81869e', fontSize: 13, lineHeight: 1.6 }}>{children}</div>
}
function rowBtn(i: number, total: number): React.CSSProperties {
  return {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
    background: 'transparent', border: 'none', borderBottom: i < total - 1 ? '1px solid #2a2c34' : 'none',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
