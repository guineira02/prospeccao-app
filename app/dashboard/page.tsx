'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from './context'

interface Cliente {
  _id:           string
  'Razão Social': string
  CNPJ:          string
  UF:            string
  consumo?:      string
  concorrente?:  string
  status?:       string
  ultimoContato?: string
  diasAtraso?:   number
  badges?:       { label: string; type: 'green'|'blue'|'amber'|'red'|'muted' }[]
  stripeColor?:  'green'|'amber'|'blue'|'red'|'muted'
}

/* Mock matching design-preview exactly */
const MOCK: Cliente[] = [
  {
    _id: 'mock-1',
    'Razão Social': 'Metalúrgica São Paulo Ltda',
    CNPJ: '12.345.678/0001-90',
    UF: 'SP',
    consumo: '1.200 kWh/mês',
    concorrente: 'EDP São Paulo',
    status: 'Em contato',
    ultimoContato: 'Última: Ligação — Não atendeu · há 5 dias',
    stripeColor: 'red',
    badges: [
      { label: '⚠ Atrasado 3 dias', type: 'red' },
      { label: 'Em contato',         type: 'muted' },
    ],
  },
  {
    _id: 'mock-2',
    'Razão Social': 'Frigorífico Norte S.A.',
    CNPJ: '23.456.789/0001-01',
    UF: 'PA',
    consumo: '3.800 kWh/mês',
    concorrente: 'Equatorial',
    status: 'Em negociação',
    ultimoContato: 'Última: Reunião — Agendou retorno · há 2 dias',
    stripeColor: 'amber',
    badges: [
      { label: '↻ Renova em 3 meses', type: 'amber' },
      { label: 'Em negociação',        type: 'green' },
    ],
  },
  {
    _id: 'mock-3',
    'Razão Social': 'Cooperativa Agrícola Triângulo',
    CNPJ: '34.567.890/0001-12',
    UF: 'MG',
    consumo: '6.200 kWh/mês',
    concorrente: 'CEMIG',
    status: 'Proposta enviada',
    ultimoContato: 'Última: Proposta enviada · ontem',
    stripeColor: 'green',
    badges: [
      { label: 'Proposta enviada',  type: 'green' },
      { label: 'Follow-up: 28 jun', type: 'muted' },
    ],
  },
  {
    _id: 'mock-4',
    'Razão Social': 'Indústria Têxtil Modernidade',
    CNPJ: '45.678.901/0001-23',
    UF: 'SP',
    consumo: '2.100 kWh/mês',
    concorrente: 'Concorrente não mapeado',
    status: 'Novo',
    ultimoContato: '',
    stripeColor: 'blue',
    badges: [
      { label: 'Novo', type: 'blue' },
    ],
  },
  {
    _id: 'mock-5',
    'Razão Social': 'Supermercados Regional Ltda',
    CNPJ: '56.789.012/0001-34',
    UF: 'RJ',
    consumo: '890 kWh/mês',
    concorrente: '',
    status: 'Recusou',
    ultimoContato: 'Última: Declínio — Cliente recusou · há 8 dias',
    stripeColor: 'muted',
    badges: [
      { label: 'Recusou', type: 'muted' },
    ],
  },
]

const FILTERS = ['Todos', 'Atrasados', 'Renovação próxima', null, 'SP', 'MG', 'PA', 'RJ']

function stripeFromStatus(s?: string): Cliente['stripeColor'] {
  if (!s) return 'muted'
  const l = s.toLowerCase()
  if (l.includes('recus') || l.includes('declin') || l.includes('atraso') || l.includes('perdid')) return 'red'
  if (l.includes('renov') || l.includes('negoc')) return 'amber'
  if (l.includes('proposta') || l.includes('contato') || l.includes('ativo')) return 'green'
  if (l.includes('novo') || l.includes('prospec')) return 'blue'
  return 'muted'
}

function badgeFromStatus(s: string): { label: string; type: 'green'|'blue'|'amber'|'red'|'muted' } {
  const stripe = stripeFromStatus(s)
  const typeMap: Record<string, 'green'|'blue'|'amber'|'red'|'muted'> = {
    red: 'red', amber: 'amber', green: 'green', blue: 'blue', muted: 'muted',
  }
  return { label: s, type: (typeMap[stripe as string] ?? 'muted') as 'green'|'blue'|'amber'|'red'|'muted' }
}

export default function ClientesPage() {
  const router  = useRouter()
  const { clientes: raw, loading } = useDashboard()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filter, setFilter]     = useState('Todos')

  useEffect(() => {
    if (loading) return
    setClientes(raw.map(c => ({
      _id:           c._id,
      'Razão Social': c['Razão Social'],
      CNPJ:          c.CNPJ,
      UF:            c.UF,
      consumo:       c['Consumo Estimado'] ? `${c['Consumo Estimado']} kWh/mês` : undefined,
      concorrente:   (c as unknown as Record<string,unknown>).Concorrente as string | undefined,
      status:        c.Status,
      stripeColor:   stripeFromStatus(c.Status),
      badges:        c.Status ? [badgeFromStatus(c.Status)] : [],
    })))
  }, [raw, loading])

  function goTimeline(c: Cliente) {
    router.push(`/dashboard/${c._id}`)
  }

  const visible = clientes.filter(c => {
    if (filter === 'Todos') return true
    if (filter === 'Atrasados') return c.stripeColor === 'red'
    if (filter === 'Renovação próxima') return c.stripeColor === 'amber'
    return c.UF === filter
  })

  const atrasados = clientes.filter(c => c.stripeColor === 'red').length

  return (
    <>
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="page-h1">Meus Clientes</div>
          <div className="page-sub">Base sincronizada com a Nexi · atualizada agora</div>
        </div>
        <div className="head-stats">
          <div className="h-stat">
            <div className="n n-green">{clientes.length}</div>
            <div className="l">clientes</div>
          </div>
          <div className="h-stat">
            <div className="n n-red">{atrasados}</div>
            <div className="l">atrasados</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        {FILTERS.map((f, i) =>
          f === null
            ? <div key={i} className="chip-sep" />
            : (
              <button
                key={f}
                className={`chip${filter === f ? ' on' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            )
        )}
      </div>

      {/* Loading / empty */}
      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>
          Carregando clientes...
        </div>
      )}
      {!loading && clientes.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>
          Nenhum cliente encontrado.
        </div>
      )}

      {/* Cards */}
      <div className="cl-list">
        {visible.map(c => (
          <div
            key={c._id}
            className="cl-card"
            onClick={() => goTimeline(c)}
            style={c.stripeColor === 'muted' && c.status === 'Recusou' ? { opacity: 0.6 } : undefined}
          >
            <div className={`stripe s-${c.stripeColor ?? 'muted'}`} />
            <div className="cl-body">
              <div className="cl-main">
                <div className="cl-co">{c['Razão Social']}</div>
                <div className="cl-meta">
                  <span>{c.UF}</span>
                  {c.consumo && <><span style={{ color: 'var(--tx3)' }}>·</span><span>{c.consumo}</span></>}
                  {c.concorrente && <><span style={{ color: 'var(--tx3)' }}>·</span><span>{c.concorrente}</span></>}
                </div>
                {c.ultimoContato
                  ? <div className="cl-last" dangerouslySetInnerHTML={{ __html: c.ultimoContato.replace(/· (há \d+ dias|ontem)/, '· <span style="color:var(--tx3)">$1</span>') }} />
                  : <div className="cl-last" style={{ color: 'var(--tx3)' }}>Nenhum contato registrado</div>
                }
              </div>
              <div className="cl-badges">
                {c.badges?.map((b, i) => (
                  <span key={i} className={`bdg bdg-${b.type}`}>{b.label}</span>
                ))}
              </div>
              <div className="cl-arr">→</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
