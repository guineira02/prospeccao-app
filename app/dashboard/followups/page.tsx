'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESTAGIO_COLOR, diasAtraso, type Estagio } from '@/lib/constants'

interface Cliente {
  id: string; nome: string; uf: string; regiao: string
  estagio: Estagio; proximoFollowUp: string | null; concorrente: string | null
}

export default function FollowUpsPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => { if (d) setClientes(d.clientes ?? []) })
      .finally(() => setLoading(false))
  }, [router])

  const grupos = useMemo(() => {
    const comFU = clientes.map(c => ({ c, atraso: diasAtraso(c.proximoFollowUp) })).filter(x => x.atraso !== null)
    const atrasado = comFU.filter(x => (x.atraso ?? 0) > 0).sort((a, b) => (b.atraso ?? 0) - (a.atraso ?? 0))
    const hoje     = comFU.filter(x => x.atraso === 0)
    const semana   = comFU.filter(x => (x.atraso ?? 0) < 0 && (x.atraso ?? 0) >= -7).sort((a, b) => (a.atraso ?? 0) - (b.atraso ?? 0))
    return [
      { title: 'Em atraso',   color: '#ef4444', rows: atrasado },
      { title: 'Hoje',        color: '#09bc8a', rows: hoje },
      { title: 'Próximos 7 dias', color: '#60a5fa', rows: semana },
    ]
  }, [clientes])

  const total = grupos.reduce((s, g) => s + g.rows.length, 0)

  function goCliente(c: Cliente) {
    sessionStorage.setItem(`cli_${c.id}`, JSON.stringify(c))
    router.push(`/dashboard/${c.id}`)
  }

  return (
    <div style={{ padding: '1.75rem 2.25rem', maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.4px' }}>Follow-ups</h1>
      <p style={{ fontSize: 13, color: '#81869e', marginBottom: '1.75rem' }}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} · {total} pendentes
      </p>

      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>Carregando...</div>}
      {!loading && total === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>
          Nenhum follow-up agendado.<br/>
          <span style={{ fontSize: 12 }}>Registre contatos no Modo Atendimento para gerar follow-ups.</span>
        </div>
      )}

      {!loading && grupos.map(g => g.rows.length > 0 && (
        <div key={g.title} style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{g.title}</span>
            <span style={{ fontSize: 12, color: '#81869e' }}>{g.rows.length}</span>
          </div>
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, overflow: 'hidden' }}>
            {g.rows.map(({ c, atraso }, i) => (
              <button key={c.id} onClick={() => goCliente(c)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                background: 'transparent', border: 'none', borderBottom: i < g.rows.length - 1 ? '1px solid #2a2c34' : 'none',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#81869e' }}>{c.uf} · {c.estagio}{c.concorrente ? ` · vs ${c.concorrente}` : ''}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: g.color, flexShrink: 0 }}>
                  {(atraso ?? 0) > 0 ? `${atraso}d atraso` : atraso === 0 ? 'hoje' : `em ${-(atraso ?? 0)}d`}
                </span>
                <span style={{ ...estBadge(c.estagio) }}>{c.estagio}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function estBadge(e: Estagio): React.CSSProperties {
  return { fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0, color: ESTAGIO_COLOR[e], background: `${ESTAGIO_COLOR[e]}1c`, border: `1px solid ${ESTAGIO_COLOR[e]}40` }
}
