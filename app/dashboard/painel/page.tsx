'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '../context'
import { analisar, AnaliseResult } from '@/lib/analise'

interface PainelCliente {
  _id: string; n: number; nome: string; uf: string; cnpj: string
  meta: string; dias: string; tags: string[]
}

interface PainelKpis { total: number; atrasado: number; semana: number; renovacao: number }

function daysOverdue(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
  return diff === 1 ? '1 dia' : `${diff} dias`
}


const FILTER_LABELS: Record<string, string> = {
  todos: 'Todos os clientes',
  atrasado: 'Follow-up atrasado',
  semana: 'Contatados essa semana',
  renovacao: 'Renovações próximas',
}

export default function PainelPage() {
  const router  = useRouter()
  const [aiKey,    setAiKey]    = useState<string | null>(null)
  const [filter,   setFilter]   = useState('todos')
  const [copied,   setCopied]   = useState(false)
  const [llmData,  setLlmData]  = useState<AnaliseResult | null>(null)
  const [llmLoad,  setLlmLoad]  = useState(false)
  const [llmError, setLlmError] = useState<string | null>(null)
  const { clientes: raw, atividades, loading } = useDashboard()
  const [items, setItems]   = useState<PainelCliente[]>([])
  const [kpis,  setKpis]    = useState<PainelKpis>({ total: 0, atrasado: 0, semana: 0, renovacao: 0 })

  useEffect(() => {
    if (loading) return
    const todayStr   = new Date().toISOString().slice(0, 10)
    const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

    const mapped: PainelCliente[] = raw.map((c, i) => {
      const clientAts = atividades.filter(a => a.cliente_id === c._id)
      const overdueFUs = clientAts.filter(a => a.follow_up_data && a.follow_up_data.slice(0, 10) < todayStr)
      const latestOverdue = overdueFUs.sort((a, b) =>
        (b.follow_up_data ?? '').localeCompare(a.follow_up_data ?? ''))[0]
      const contactedThisWeek = clientAts.some(a => a.created_at.slice(0, 10) >= weekAgoStr)
      const tags: string[] = []
      if (overdueFUs.length)     tags.push('atrasado')
      if (contactedThisWeek)     tags.push('semana')
      if (c.Status?.toLowerCase().includes('renov')) tags.push('renovacao')
      const lastAt = clientAts[0]
      const meta = lastAt
        ? `${lastAt.tipo} · ${lastAt.status}`
        : (c.Status ?? 'Sem atividades')
      const dias = latestOverdue?.follow_up_data ? daysOverdue(latestOverdue.follow_up_data) : ''
      return { _id: c._id, n: i + 1, nome: c['Razão Social'], uf: c.UF ?? '', cnpj: c.CNPJ ?? '', meta, dias, tags }
    })

    setItems(mapped)
    setKpis({
      total:     mapped.length,
      atrasado:  mapped.filter(i => i.tags.includes('atrasado')).length,
      semana:    mapped.filter(i => i.tags.includes('semana')).length,
      renovacao: mapped.filter(i => i.tags.includes('renovacao')).length,
    })
  }, [raw, atividades, loading])

  const aiCliente   = aiKey ? raw.find(c => c._id === aiKey) : null
  const aiAtvs      = aiKey ? atividades.filter(a => a.cliente_id === aiKey) : []
  const aiDataDet: AnaliseResult | null = aiCliente ? analisar(aiCliente, aiAtvs) : null
  const aiData      = llmData ?? aiDataDet
  const aiItem      = aiKey ? items.find(i => i._id === aiKey) : null

  function openAI(id: string) {
    if (aiKey === id) { setAiKey(null); return }
    setAiKey(id); setCopied(false); setLlmData(null); setLlmError(null)

    const cliente = raw.find(c => c._id === id)
    if (!cliente) return
    setLlmLoad(true)
    fetch(`/api/analise-ia/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente }),
    })
      .then(async r => {
        if (r.ok) return r.json()
        const text = await r.text().catch(() => '')
        let msg = `HTTP ${r.status}`
        try { msg = JSON.parse(text).error ?? msg } catch { if (text) msg += `: ${text.slice(0, 120)}` }
        throw new Error(msg)
      })
      .then((data: AnaliseResult) => { setLlmData(data); setLlmLoad(false) })
      .catch((e: unknown) => { setLlmError(e instanceof Error ? e.message : String(e)); setLlmLoad(false) })
  }

  function copyScript() {
    if (!aiData) return
    navigator.clipboard.writeText(aiData.script).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }

  function goCliente(item: PainelCliente) {
    router.push(`/dashboard/${item._id}`)
  }

  const visible = items.filter(item => filter === 'todos' || item.tags.includes(filter))
  const filterOpts = [
    { key: 'todos',     label: 'Todos',                 count: items.length },
    { key: 'atrasado',  label: 'Follow-up atrasado',    count: kpis.atrasado },
    { key: 'semana',    label: 'Contatados essa semana', count: kpis.semana },
    { key: 'renovacao', label: 'Renovações próximas',   count: kpis.renovacao },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className={`painel-main${aiKey ? ' ai-open' : ''}`} style={{ flex: 1, overflow: 'hidden' }}>

        <div className="painel-scroll">
          <div className="painel-body">
            <div className="painel-h1">Painel</div>
            <div className="painel-sub">Sua carteira hoje · {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>

            <div className="kpi-grid">
              <div className="kpi kpi-g">
                <div className="kpi-lbl">Total de Clientes</div>
                <div className="kpi-n">{loading ? '…' : kpis.total}</div>
                <div className="kpi-d">base sincronizada</div>
              </div>
              <div className="kpi kpi-r">
                <div className="kpi-lbl">Follow-ups Atrasados</div>
                <div className="kpi-n">{loading ? '…' : kpis.atrasado}</div>
                <div className="kpi-d">requerem atenção</div>
              </div>
              <div className="kpi kpi-b">
                <div className="kpi-lbl">Contatados essa Semana</div>
                <div className="kpi-n">{loading ? '…' : kpis.semana}</div>
                <div className="kpi-d">meta: 10 por semana</div>
              </div>
              <div className="kpi kpi-a">
                <div className="kpi-lbl">Renovações Próximas</div>
                <div className="kpi-n">{loading ? '…' : kpis.renovacao}</div>
                <div className="kpi-d">contratos em 6 meses</div>
              </div>
            </div>

            <div className="painel-filters">
              {filterOpts.map(f => (
                <button key={f.key} className={`pf-btn${filter === f.key ? ' on' : ''}`} onClick={() => setFilter(f.key)}>
                  {f.label} <span className="pf-count">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="urg-hd">
              {FILTER_LABELS[filter] ?? 'Clientes'} <span className="urg-hd-count">{visible.length}</span>
            </div>

            {!loading && items.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
                Nenhum cliente carregado ainda.
              </div>
            )}

            <div className="urg-list">
              {visible.map(item => (
                <div key={item._id} style={{ marginBottom: 8 }}>
                  <div className="urg-row">
                    <span className="urg-n">{item.n}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="urg-co">{item.nome}</div>
                      <div className="urg-meta">{item.uf}{item.uf && item.meta ? ' · ' : ''}{item.meta}</div>
                    </div>
                    {item.tags.includes('renovacao') && <span className="tag-renovacao">Renovação próxima</span>}
                    {item.tags.includes('semana')    && <span className="tag-semana">Esta semana</span>}
                    {item.dias && (
                      <span className={`urg-days ${item.tags.includes('atrasado') ? 'dc' : 'dw'}`}>{item.dias}</span>
                    )}
                    <button className={`btn-ai${aiKey === item._id ? ' on' : ''}`} onClick={() => openAI(item._id)}>
                      ✦ Ver análise
                    </button>
                    <button className="btn-ver" onClick={() => goCliente(item)}>Ver →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ai-side">
          <div className="ai-side-head">
            <div>
              <div className="ai-badge" style={llmData ? { background: 'rgba(9,188,138,.15)', color: '#09bc8a', borderColor: 'rgba(9,188,138,.3)' } : undefined}>
                {llmLoad
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 5 }}>◌</span>Analisando…</>
                  : llmData ? '✦ IA personalizada' : '✦ Análise de IA'
                }
              </div>
              <div className="ai-client-name">{aiItem?.nome ?? '—'}</div>
            </div>
            <button className="ai-side-close" onClick={() => setAiKey(null)}>✕</button>
          </div>
          {llmError && (
            <div style={{ padding: '8px 20px', fontSize: 12, color: 'var(--red)', background: 'rgba(239,68,68,.06)', borderBottom: '1px solid rgba(239,68,68,.12)' }}>
              {llmError}
            </div>
          )}
          {aiData && (
            <div className="ai-body">
              <div className="ai-chips">
                {aiData.chips.map((c, i) => <span key={i} className="ai-chip">{c}</span>)}
              </div>
              <div className="ai-block">
                <div className="ai-block-title">{aiData.contextTitle}</div>
                <div className="ai-text">{aiData.contexto}</div>
              </div>
              <div className="ai-block">
                <div className="ai-block-title">Como abordar</div>
                <div className="ai-tags">
                  {aiData.tags.map(([t, l], i) => (
                    <span key={i} className={`ai-tag ai-tag-${t}`}>{l}</span>
                  ))}
                </div>
              </div>
              {aiData.script && (
              <div className="ai-block">
                <div className="ai-block-title">Script sugerido</div>
                <div className="ai-script-wrap">
                  <div className="ai-script-text">&ldquo;{aiData.script}&rdquo;</div>
                  <button
                    className="ai-copy"
                    onClick={copyScript}
                    title="Copiar script"
                    style={copied ? { borderColor: 'rgba(9,188,138,.3)' } : undefined}
                  >
                    {copied
                      ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#09bc8a" strokeWidth="2"><path d="M3 8l4 4 6-7"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"/></svg>
                    }
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
