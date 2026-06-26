'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESTAGIO_COLOR, REGIOES, diasAtraso, mesesAteVencimento, type Estagio } from '@/lib/constants'
import { BatchModal } from '@/app/components/BatchModal'

interface Cliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  contatoNome: string; contatoEmail: string; contatoFone: string
  valorFatura: number | null; economia: number | null
  tipoModelo: string; tipoLead: string
  estagio: Estagio; ultimoContato: string | null; proximoFollowUp: string | null
  totalAtividades: number; concorrente: string | null; vencimento: string | null
}

function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj || '—'
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

const REGIAO_TABS = ['Todos', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [agente, setAgente]     = useState<{ nome: string; cargo: string } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [busca, setBusca]       = useState('')
  const [regiao, setRegiao]     = useState('Todos')
  const [soAtrasados, setSoAtrasados] = useState(false)

  // ações em massa
  const [selMode, setSelMode]   = useState(false)
  const [sel, setSel]           = useState<Set<string>>(new Set())
  const [batchOpen, setBatchOpen] = useState(false)

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => {
        if (!d) return
        if (d.error) { setErro(d.error); return }
        setClientes(d.clientes ?? [])
        setAgente(d.agente ?? null)
      })
      .catch(() => setErro('Erro ao carregar clientes'))
      .finally(() => setLoading(false))
  }, [router])

  const filtrados = useMemo(() => clientes.filter(c => {
    if (regiao !== 'Todos' && c.regiao !== regiao) return false
    if (soAtrasados) { const d = diasAtraso(c.proximoFollowUp); if (d === null || d <= 0) return false }
    if (busca) {
      const q = busca.toLowerCase()
      if (!c.nome.toLowerCase().includes(q) && !c.cnpj.includes(busca) && !c.uf.toLowerCase().includes(q)) return false
    }
    return true
  }), [clientes, regiao, soAtrasados, busca])

  // contagens por região para os tabs
  const countRegiao = useMemo(() => {
    const m: Record<string, number> = { Todos: clientes.length }
    for (const r of Object.keys(REGIOES)) m[r] = clientes.filter(c => c.regiao === r).length
    return m
  }, [clientes])

  const atrasados = useMemo(() => clientes.filter(c => { const d = diasAtraso(c.proximoFollowUp); return d !== null && d > 0 }).length, [clientes])

  function toggleSel(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function iniciarAtendimento() {
    const fila = filtrados.map(c => c.id)
    sessionStorage.setItem('fila_atendimento', JSON.stringify({ ids: fila, label: regiao === 'Todos' ? 'Carteira' : regiao }))
    router.push('/dashboard/atender')
  }
  function goCliente(c: Cliente) {
    if (selMode) { toggleSel(c.id); return }
    sessionStorage.setItem(`cli_${c.id}`, JSON.stringify(c))
    router.push(`/dashboard/${c.id}`)
  }

  return (
    <div style={{ padding: '2rem 2.25rem', maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.4px' }}>
            {agente?.nome ? `Olá, ${agente.nome.split(' ')[0]}` : 'Meus Clientes'}
          </h1>
          <p style={{ fontSize: 13, color: '#81869e' }}>
            {clientes.length} clientes na carteira
            {atrasados > 0 && <span style={{ color: '#ef4444' }}> · {atrasados} follow-up{atrasados > 1 ? 's' : ''} em atraso</span>}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setSelMode(s => !s); setSel(new Set()) }}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1px solid ${selMode ? '#09bc8a' : '#353740'}`,
              background: selMode ? 'rgba(9,188,138,0.12)' : 'transparent',
              color: selMode ? '#09bc8a' : '#81869e', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {selMode ? 'Cancelar seleção' : '☑ Selecionar'}
          </button>
          <button
            onClick={iniciarAtendimento}
            disabled={filtrados.length === 0}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: filtrados.length ? '#09bc8a' : '#353740',
              color: filtrados.length ? '#0d1e18' : '#81869e',
              border: 'none', cursor: filtrados.length ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', boxShadow: filtrados.length ? '0 0 24px rgba(9,188,138,0.35)' : 'none',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            ▶ Iniciar Atendimento
          </button>
        </div>
      </div>

      {/* Região tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {REGIAO_TABS.map(r => (
          <button key={r} onClick={() => setRegiao(r)} style={{
            padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: `1px solid ${regiao === r ? '#09bc8a' : '#353740'}`,
            background: regiao === r ? 'rgba(9,188,138,0.12)' : 'transparent',
            color: regiao === r ? '#09bc8a' : '#81869e', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {r}
            <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 700 }}>{countRegiao[r] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + atraso */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#81869e" strokeWidth="1.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }}>
            <circle cx="6.5" cy="6.5" r="5" /><path d="M10.5 10.5L14 14" />
          </svg>
          <input
            placeholder="Buscar empresa, CNPJ ou UF..."
            value={busca} onChange={e => setBusca(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 34px', background: '#1e1f24', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
            onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
          />
        </div>
        <button onClick={() => setSoAtrasados(s => !s)} style={{
          padding: '0 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          border: `1px solid ${soAtrasados ? '#ef4444' : '#353740'}`,
          background: soAtrasados ? 'rgba(239,68,68,0.12)' : 'transparent',
          color: soAtrasados ? '#ef4444' : '#81869e', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ⚠ Atrasados
        </button>
      </div>

      {/* Estados */}
      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>Carregando carteira...</div>}
      {!loading && erro && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>{erro}</div>}
      {!loading && !erro && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#81869e', fontSize: 13 }}>
          {busca || regiao !== 'Todos' || soAtrasados ? 'Nenhum cliente neste filtro.' : 'Carteira vazia.'}
        </div>
      )}

      {/* Grid de cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 12 }}>
        {filtrados.map((c, i) => {
          const atraso = diasAtraso(c.proximoFollowUp)
          const meses  = mesesAteVencimento(c.vencimento)
          const renovando = meses !== null && meses >= 0 && meses <= 6
          const selecionado = sel.has(c.id)
          return (
            <div key={c.id} onClick={() => goCliente(c)} style={{
              background: '#1e1f24', borderRadius: 14, cursor: 'pointer',
              border: `1px solid ${selecionado ? '#09bc8a' : '#353740'}`,
              padding: '16px', position: 'relative', transition: 'border-color 0.15s, transform 0.15s, background 0.15s, box-shadow 0.15s',
              outline: selecionado ? '1px solid #09bc8a' : 'none',
              animation: 'fadeUp 0.4s ease both', animationDelay: `${Math.min(i, 12) * 35}ms`,
            }}
              onMouseEnter={e => { if (!selecionado) { e.currentTarget.style.borderColor = '#09bc8a55'; e.currentTarget.style.background = '#24262e'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' } }}
              onMouseLeave={e => { if (!selecionado) { e.currentTarget.style.borderColor = '#353740'; e.currentTarget.style.background = '#1e1f24'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' } }}
            >
              {/* topo: avatar + estágio */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 12 }}>
                {selMode && (
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    border: `1.5px solid ${selecionado ? '#09bc8a' : '#353740'}`,
                    background: selecionado ? '#09bc8a' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d1e18', fontSize: 12, fontWeight: 700,
                  }}>{selecionado ? '✓' : ''}</div>
                )}
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#24262e', border: '1px solid #353740', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#09bc8a', flexShrink: 0 }}>
                  {c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: '#81869e', marginTop: 2 }}>{formatCNPJ(c.cnpj)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0, color: ESTAGIO_COLOR[c.estagio], background: `${ESTAGIO_COLOR[c.estagio]}1c`, border: `1px solid ${ESTAGIO_COLOR[c.estagio]}40` }}>{c.estagio}</span>
              </div>

              {/* meta linha */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#c8cad0', background: '#15161b', border: '1px solid #353740', borderRadius: 7, padding: '3px 8px' }}>
                  {c.uf || '—'} · {c.regiao}
                </span>
                {c.valorFatura != null && (
                  <span style={{ fontSize: 11, color: '#c8cad0', background: '#15161b', border: '1px solid #353740', borderRadius: 7, padding: '3px 8px' }}>
                    Fatura R$ {c.valorFatura.toLocaleString('pt-BR')}
                  </span>
                )}
                {renovando && (
                  <span style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 7, padding: '3px 8px' }}>
                    ⏳ Renova em {meses}m
                  </span>
                )}
              </div>

              {/* rodapé: follow-up + atividades */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2a2c34', paddingTop: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: atraso !== null && atraso > 0 ? '#ef4444' : '#81869e' }}>
                  {c.proximoFollowUp
                    ? (atraso! > 0 ? `⚠ Atrasado ${atraso}d` : atraso === 0 ? '● Follow-up hoje' : `Follow-up em ${-atraso!}d`)
                    : 'Sem follow-up'}
                </span>
                <span style={{ fontSize: 11, color: '#81869e' }}>{c.totalAtividades} contato{c.totalAtividades !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra flutuante de seleção */}
      {selMode && sel.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
          background: '#1e1f24', border: '1px solid #09bc8a55', borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          animation: 'modalIn 0.2s ease both',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{sel.size} selecionado{sel.size > 1 ? 's' : ''}</span>
          <button onClick={() => setBatchOpen(true)} style={{ padding: '8px 16px', borderRadius: 9, background: '#09bc8a', color: '#0d1e18', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Registrar em massa
          </button>
        </div>
      )}

      {batchOpen && (
        <BatchModal
          clienteIds={[...sel]}
          onClose={() => setBatchOpen(false)}
          onDone={() => { setBatchOpen(false); setSelMode(false); setSel(new Set()); setLoading(true); location.reload() }}
        />
      )}
    </div>
  )
}
