'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AIData {
  name:         string
  contextTitle: string
  chips:        string[]
  contexto:     string
  tags:         [string, string][]
  script:       string
}

const AI_DATA: Record<string, AIData> = {
  metalurgica: {
    name: 'Metalúrgica São Paulo Ltda',
    contextTitle: 'Por que o silêncio?',
    chips: ['📄 Proposta enviada há 8 dias', '👥 Diretor financeiro envolvido', '⚡ Contrato vence em 5 meses', '🕐 Não atendeu às 14h32'],
    contexto: 'Rômulo pediu uma semana para análise interna — passaram 8 dias. O não-atendimento às 14h32 sugere horário inadequado, não evasão. Com o diretor financeiro envolvido, a decisão é colegiada e naturalmente mais lenta.',
    tags: [['g', 'Tom consultivo'], ['i', 'Ligar pela manhã'], ['r', 'Não cobrar resposta'], ['a', 'Reforçar urgência do contrato']],
    script: 'Rômulo, tudo bem? Queria saber se surgiu alguma dúvida sobre a simulação que mandei. O diretor teve chance de dar uma olhada?',
  },
  ceramica: {
    name: 'Cerâmica Vale do Rio S.A.',
    contextTitle: 'Por que o silêncio?',
    chips: ['📧 E-mail sem resposta há 4 dias', '🤝 Nenhuma ligação realizada ainda', '❓ Relação não estabelecida'],
    contexto: 'E-mail tem taxa de abertura incerta — pode estar em spam. Nunca houve ligação: o relacionamento ainda não foi estabelecido de voz.',
    tags: [['g', 'Ligar, não reenviar e-mail'], ['i', 'Apresentação rápida (3 min)'], ['a', 'Confirmar recebimento']],
    script: 'Olá, sou da Tendência Energia. Mandei um e-mail há alguns dias. Você chegou a receber? Consigo apresentar em 3 minutos agora mesmo.',
  },
  frigorifico: {
    name: 'Frigorífico Norte S.A.',
    contextTitle: 'Momento atual',
    chips: ['✅ Reunião realizada', '📅 Retorno agendado', '⚡ Contrato vence em 3 meses', '🔥 Prioridade máxima'],
    contexto: 'Reunião bem recebida e o cliente agendou retorno espontaneamente — sinal claro de interesse real. Com o contrato vencendo em 3 meses, a janela de decisão está aberta agora.',
    tags: [['g', 'Tom parceiro, não vendedor'], ['a', 'Antecipar renovação'], ['i', 'Levar simulação comparativa'], ['r', 'Criar senso de oportunidade']],
    script: 'Fiz a simulação com base nos dados da reunião. Com o contrato vencendo em outubro, antecipar agora pode travar uma tarifa mais favorável antes da alta sazonal.',
  },
}

const TAG_COLOR: Record<string, string> = {
  g: '#09bc8a',
  i: '#60a5fa',
  r: '#fbbf24',
  a: '#a78bfa',
}

const URG_ITEMS = [
  { key: 'metalurgica', n: 1, nome: 'Metalúrgica São Paulo Ltda',    uf: 'SP', meta: 'Ligação · Não atendeu · proposta enviada',   dias: '8 dias atraso',  dc: true  },
  { key: 'ceramica',    n: 2, nome: 'Cerâmica Vale do Rio S.A.',      uf: 'MG', meta: 'E-mail enviado · Sem resposta',             dias: '4 dias atraso',  dc: true  },
  { key: 'frigorifico', n: 3, nome: 'Frigorífico Norte S.A.',         uf: 'PA', meta: 'Reunião realizada · Agendou retorno',       dias: 'Esta semana',    dc: false },
  { key: 'cooperativa', n: 4, nome: 'Cooperativa Agrícola Triângulo', uf: 'MG', meta: 'Proposta enviada · Aguardando resposta',    dias: 'Esta semana',    dc: false },
  { key: 'textil',      n: 5, nome: 'Ind. Têxtil Modernidade',        uf: 'SP', meta: 'Sem contato recente · Contrato em 2 meses', dias: 'Renovação',      dc: false },
]

const KPIS = [
  { label: 'Clientes ativos',     value: '24',  sub: '+3 este mês',   color: '#09bc8a' },
  { label: 'Follow-ups abertos',  value: '11',  sub: '5 em atraso',   color: '#fbbf24' },
  { label: 'Propostas enviadas',  value: '7',   sub: 'Aguardando',    color: '#60a5fa' },
  { label: 'Taxa de conversão',   value: '18%', sub: 'Últimos 30 dias', color: '#a78bfa' },
]

export default function PainelPage() {
  const router   = useRouter()
  const [aiKey, setAiKey]     = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const [filter, setFilter]   = useState('todos')

  const aiData = aiKey ? AI_DATA[aiKey] : null

  function copyScript() {
    if (!aiData) return
    navigator.clipboard.writeText(aiData.script).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const FILTERS = [
    { key: 'todos',    label: 'Todos' },
    { key: 'atrasado', label: 'Em atraso' },
    { key: 'semana',   label: 'Esta semana' },
    { key: 'renovacao',label: 'Renovações' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1.75rem 2rem 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Painel</h1>
        <p style={{ fontSize: 13, color: '#81869e', marginBottom: '1.5rem' }}>
          Quinta-feira, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
        </p>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.75rem' }}>
          {KPIS.map(kpi => (
            <div key={kpi.label} style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{kpi.label}</div>
              <div style={{ fontSize: 11, color: '#81869e' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${filter === f.key ? '#09bc8a' : '#353740'}`,
                background: filter === f.key ? 'rgba(9,188,138,0.12)' : 'transparent',
                color: filter === f.key ? '#09bc8a' : '#81869e',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Urgency list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 2rem 2rem' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#81869e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Clientes com atenção necessária · {URG_ITEMS.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {URG_ITEMS.map(item => (
              <div
                key={item.key}
                style={{
                  background: '#1e1f24',
                  border: `1px solid ${aiKey === item.key ? '#09bc8a40' : '#353740'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#81869e', minWidth: 16 }}>{item.n}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nome}
                  </div>
                  <div style={{ fontSize: 11, color: '#81869e' }}>
                    {item.uf} · {item.meta}
                  </div>
                </div>

                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 20,
                  background: item.dc ? 'rgba(239,68,68,0.1)' : 'rgba(96,165,250,0.1)',
                  color: item.dc ? '#ef4444' : '#60a5fa',
                  flexShrink: 0,
                }}>
                  {item.dias}
                </span>

                <button
                  onClick={() => setAiKey(aiKey === item.key ? null : item.key)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${aiKey === item.key ? '#09bc8a' : '#353740'}`,
                    background: aiKey === item.key ? 'rgba(9,188,138,0.12)' : 'transparent',
                    color: aiKey === item.key ? '#09bc8a' : '#81869e',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  ✦ Análise
                </button>

                <button
                  onClick={() => router.push(`/dashboard/cliente-placeholder?nome=${encodeURIComponent(item.nome)}&uf=${item.uf}`)}
                  style={{ background: 'none', border: 'none', color: '#353740', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 0 }}
                >
                  →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI side panel */}
        {aiData && (
          <div style={{
            width: 320,
            flexShrink: 0,
            background: '#1e1f24',
            borderLeft: '1px solid #353740',
            padding: '1.5rem',
            overflowY: 'auto',
            animation: 'slideFromRight 0.3s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.25)', borderRadius: 20, padding: '3px 10px', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#09bc8a', fontWeight: 600 }}>✦ Análise de IA</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{aiData.name}</div>
              </div>
              <button
                onClick={() => setAiKey(null)}
                style={{ background: 'none', border: 'none', color: '#81869e', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Context chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '1.25rem' }}>
              {aiData.chips.map((chip, i) => (
                <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#24262e', border: '1px solid #353740', color: '#c8cad0' }}>
                  {chip}
                </span>
              ))}
            </div>

            {/* Context */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                {aiData.contextTitle}
              </div>
              <p style={{ fontSize: 12, color: '#c8cad0', lineHeight: 1.6, margin: 0 }}>{aiData.contexto}</p>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Como abordar
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {aiData.tags.map(([t, label], i) => (
                  <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: `${TAG_COLOR[t]}18`, border: `1px solid ${TAG_COLOR[t]}30`, color: TAG_COLOR[t] }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Script */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Script sugerido
              </div>
              <div style={{ background: '#15161b', border: '1px solid #353740', borderRadius: 10, padding: '12px', position: 'relative' }}>
                <p style={{ fontSize: 12, color: '#c8cad0', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  &ldquo;{aiData.script}&rdquo;
                </p>
                <button
                  onClick={copyScript}
                  title="Copiar script"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none',
                    border: `1px solid ${copied ? 'rgba(9,188,138,0.3)' : '#353740'}`,
                    borderRadius: 6, padding: '3px 6px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: copied ? '#09bc8a' : '#81869e',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓' : '⎘'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
