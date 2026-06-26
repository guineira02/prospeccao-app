'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(MOCK)
  const [filter, setFilter]     = useState('Todos')

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => {
        if (!d) return
        if (d.clientes && d.clientes.length > 0) {
          setClientes(d.clientes.map((c: Record<string,unknown>) => ({
            _id: c._id as string,
            'Razão Social': c['Razão Social'] as string,
            CNPJ: c.CNPJ as string,
            UF: c.UF as string,
            consumo: c['Consumo Estimado'] ? `${c['Consumo Estimado']} kWh/mês` : undefined,
            concorrente: c.Concorrente as string | undefined,
            status: c.Status as string | undefined,
            stripeColor: 'muted',
            badges: c.Status ? [{ label: c.Status as string, type: 'muted' as const }] : [],
          })))
        }
      })
      .catch(() => {})
  }, [router])

  function goTimeline(c: Cliente) {
    const p = new URLSearchParams({ nome: c['Razão Social'], cnpj: c.CNPJ, uf: c.UF, status: c.status ?? '' })
    router.push(`/dashboard/${c._id}?${p}`)
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
