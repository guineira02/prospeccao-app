'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESTAGIO_COLOR, type Estagio } from '@/lib/constants'
import { avaliarRisco, NIVEL_LABEL, NIVEL_COLOR, type RiscoResult, type RiscoNivel } from '@/lib/risco'
import { ClienteDossie } from '@/app/components/ClienteDossie'

interface Cliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  contatoNome: string; contatoEmail: string; contatoFone: string
  valorFatura: number | null; economia: number | null
  estagio: Estagio; ultimoContato: string | null; proximoFollowUp: string | null
  totalAtividades: number; concorrente: string | null; vencimento: string | null
}

type ComRisco = { c: Cliente; r: RiscoResult }

const ORDEM: RiscoNivel[] = ['critico', 'atencao', 'observar']

export default function RadarPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [sel, setSel]           = useState<ComRisco | null>(null)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => { if (d) setClientes(d.clientes ?? []) })
      .finally(() => setLoading(false))
  }, [router])

  // avalia risco de cada cliente, mantém só os que têm risco
  const emRisco = useMemo<ComRisco[]>(() => {
    const hoje = new Date()
    return clientes
      .map(c => { const r = avaliarRisco(c, hoje); return r ? { c, r } : null })
      .filter((x): x is ComRisco => x !== null)
      .sort((a, b) => b.r.score - a.r.score)
  }, [clientes])

  const grupos = useMemo(() => {
    return ORDEM.map(nivel => ({
      nivel,
      rows: emRisco.filter(x => x.r.nivel === nivel),
    })).filter(g => g.rows.length > 0)
  }, [emRisco])

  const total = emRisco.length
  const criticos = emRisco.filter(x => x.r.nivel === 'critico').length

  // monta a fila do Modo Atendimento ordenada por score (mais crítico primeiro)
  function atender(rows: ComRisco[], label: string) {
    const ids = rows.map(x => x.c.id)
    sessionStorage.setItem('fila_atendimento', JSON.stringify({ ids, label }))
    router.push('/dashboard/atender')
  }

  function goCliente(c: Cliente) {
    sessionStorage.setItem(`cli_${c.id}`, JSON.stringify(c))
    router.push(`/dashboard/${c.id}`)
  }

  // atender só este cliente (a partir do painel)
  function atenderUm(id: string) {
    const x = emRisco.find(e => e.c.id === id)
    sessionStorage.setItem('fila_atendimento', JSON.stringify({ ids: [id], label: x?.c.nome ?? 'Cliente' }))
    router.push('/dashboard/atender')
  }

  return (
    <div style={{ padding: '1.75rem 2.25rem', maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.4px' }}>Radar de Risco</h1>
          <p style={{ fontSize: 13, color: '#81869e' }}>
            {total} {total === 1 ? 'cliente precisa' : 'clientes precisam'} de atenção
            {criticos > 0 && <span style={{ color: '#ef4444' }}> · {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={() => atender(emRisco, 'Em risco')}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: '#09bc8a', color: '#0d1e18', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 0 24px rgba(9,188,138,0.35)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            ▶ Atender em risco
          </button>
        )}
      </div>

      {/* Estados */}
      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>Varrendo a carteira...</div>}
      {!loading && total === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>
          ✅ Nenhum lead em risco.<br/>
          <span style={{ fontSize: 12 }}>Pipeline aquecido — siga registrando contatos no Modo Atendimento.</span>
        </div>
      )}

      {/* Grupos por nível */}
      {!loading && grupos.map(g => (
        <div key={g.nivel} style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NIVEL_COLOR[g.nivel], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {NIVEL_LABEL[g.nivel]}
            </span>
            <span style={{ fontSize: 12, color: '#81869e' }}>{g.rows.length}</span>
            <button
              onClick={() => atender(g.rows, NIVEL_LABEL[g.nivel])}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none', color: '#09bc8a',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
              }}
            >
              ▶ Atender estes
            </button>
          </div>
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 14, overflow: 'hidden' }}>
            {g.rows.map(({ c, r }, i) => (
              <button key={c.id} onClick={() => setSel({ c, r })} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                background: 'transparent', border: 'none',
                borderBottom: i < g.rows.length - 1 ? '1px solid #2a2c34' : 'none',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#24262e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: NIVEL_COLOR[g.nivel], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: NIVEL_COLOR[g.nivel], marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.principal.label}
                    {r.motivos.length > 1 && <span style={{ color: '#5a5f73' }}> · +{r.motivos.length - 1}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#81869e', flexShrink: 0 }}>{c.uf || '—'}</span>
                <span style={{ ...estBadge(c.estagio) }}>{c.estagio}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {sel && (
        <ClienteDossie
          cliente={sel.c}
          risco={sel.r}
          onClose={() => setSel(null)}
          onAtender={atenderUm}
          onTimeline={c => goCliente(c)}
        />
      )}
    </div>
  )
}

function estBadge(e: Estagio): React.CSSProperties {
  return { fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0, color: ESTAGIO_COLOR[e], background: `${ESTAGIO_COLOR[e]}1c`, border: `1px solid ${ESTAGIO_COLOR[e]}40` }
}
