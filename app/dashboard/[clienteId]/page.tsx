'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CustomSelect } from '@/app/components/CustomSelect'
import { AnalisePanel } from '@/app/components/AnalisePanel'
import { DateBR } from '@/app/components/DateBR'
import { WhatsIcon } from '@/app/components/WhatsIcon'
import {
  TIPOS, STATUS, TIPO_ICON, TIPO_COLOR, STATUS_COLOR,
  ESTAGIO_COLOR, derivarEstagio, proximoFollowUp, mesesAteVencimento, whatsappUrl, type Estagio,
} from '@/lib/constants'

interface Atividade {
  id: string; tipo: string; status: string
  comentario: string | null; follow_up_data: string | null; created_at: string
}
interface Cliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  contatoNome: string; contatoEmail: string; contatoFone: string
  valorFatura: number | null; economia: number | null
  estagio: Estagio; concorrente: string | null; vencimento: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtShort(iso: string) { return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
function fmtCNPJ(c: string) {
  const d = c.replace(/\D/g, ''); if (d.length !== 14) return c || '—'
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function TimelinePage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.clienteId as string

  const [cliente, setCliente]     = useState<Cliente | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [analiseOpen, setAnaliseOpen] = useState(false)

  // registro
  const [tipo, setTipo]       = useState('')
  const [atStatus, setAtStatus] = useState('')
  const [coment, setComent]   = useState('')
  const [followUp, setFollowUp] = useState('')
  const [saving, setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')

  // meta (concorrente + vencimento)
  const [concorrente, setConcorrente] = useState('')
  const [vencimento, setVencimento]   = useState('')
  const [metaSaving, setMetaSaving]   = useState(false)
  const [metaOk, setMetaOk]           = useState(false)

  // cnpj enrich
  const [enrich, setEnrich]     = useState<Record<string, string> | null>(null)
  const [enriching, setEnriching] = useState(false)

  const carregarCliente = useCallback(() => {
    const cached = sessionStorage.getItem(`cli_${clienteId}`)
    if (cached) {
      const c = JSON.parse(cached) as Cliente
      setCliente(c); setConcorrente(c.concorrente ?? ''); setVencimento(c.vencimento ?? '')
    } else {
      fetch('/api/clientes').then(r => r.json()).then(d => {
        const c = (d.clientes ?? []).find((x: Cliente) => x.id === clienteId)
        if (c) { setCliente(c); setConcorrente(c.concorrente ?? ''); setVencimento(c.vencimento ?? '') }
      })
    }
  }, [clienteId])

  useEffect(() => {
    carregarCliente()
    fetch(`/api/atividades/${clienteId}`)
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => { if (d) setAtividades(d.atividades ?? []) })
      .finally(() => setLoading(false))
  }, [clienteId, router, carregarCliente])

  function openModal() {
    setTipo(''); setAtStatus(''); setComent(''); setFollowUp(proximoFollowUp()); setSaveErro(''); setModalOpen(true)
  }

  async function salvar() {
    if (!tipo || !atStatus) { setSaveErro('Selecione tipo e status.'); return }
    setSaving(true); setSaveErro('')
    const res = await fetch('/api/atividades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, tipo, status: atStatus, comentario: coment || null, follow_up_data: followUp || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveErro(data.error ?? 'Erro ao salvar'); return }
    setAtividades(prev => [data.atividade, ...prev])
    setModalOpen(false)
  }

  async function salvarMeta() {
    setMetaSaving(true); setMetaOk(false)
    const res = await fetch('/api/clientes-meta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, concorrente_atual: concorrente || null, data_vencimento_contrato: vencimento || null }),
    })
    setMetaSaving(false)
    if (res.ok) {
      setMetaOk(true); setTimeout(() => setMetaOk(false), 2000)
      if (cliente) { const upd = { ...cliente, concorrente: concorrente || null, vencimento: vencimento || null }; setCliente(upd); sessionStorage.setItem(`cli_${clienteId}`, JSON.stringify(upd)) }
    }
  }

  const [salvoNexi, setSalvoNexi] = useState(false)

  async function enriquecer() {
    if (!cliente?.cnpj) return
    setEnriching(true)
    const res = await fetch(`/api/enriquecer/${clienteId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: cliente.cnpj.replace(/\D/g, '') }),
    })
    const d = await res.json()
    setEnriching(false)
    if (!res.ok) return
    setEnrich(d); setSalvoNexi(!!d.salvoNexi)

    // re-puxa o cliente fresco da Nexi (já com o dado gravado) e atualiza a tela inteira
    try {
      const fresh = await fetch('/api/clientes').then(r => r.json())
      const novo = (fresh.clientes ?? []).find((c: Cliente) => c.id === clienteId)
      if (novo) {
        setCliente(novo)
        setConcorrente(novo.concorrente ?? '')
        setVencimento(novo.vencimento ?? '')
        sessionStorage.setItem(`cli_${clienteId}`, JSON.stringify(novo))
      } else if (cliente) {
        // fallback: ao menos telefone/email vindos da resposta
        const upd = { ...cliente, contatoFone: d.telefone || cliente.contatoFone, contatoEmail: d.email || cliente.contatoEmail }
        setCliente(upd)
        sessionStorage.setItem(`cli_${clienteId}`, JSON.stringify(upd))
      }
    } catch { /* mantém o que já está na tela */ }
  }

  const estagioAtual = derivarEstagio(atividades[0] ?? null)
  const meses = mesesAteVencimento(vencimento || null)
  const renovando = meses !== null && meses >= 0 && meses <= 6

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ── Coluna esquerda ── */}
      <div style={{ width: 320, minWidth: 320, borderRight: '1px solid #2a2c34', padding: '1.75rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>← Voltar à carteira</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#1e1f24', border: '2px solid #09bc8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#09bc8a', margin: '0 auto 12px' }}>
            {(cliente?.nome ?? '··').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>{cliente?.nome ?? 'Carregando...'}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 11px', borderRadius: 20, color: ESTAGIO_COLOR[estagioAtual], background: `${ESTAGIO_COLOR[estagioAtual]}1c`, border: `1px solid ${ESTAGIO_COLOR[estagioAtual]}40` }}>{estagioAtual}</span>
        </div>

        {/* contato — WhatsApp */}
        {cliente?.contatoFone && whatsappUrl(cliente.contatoFone) && (
          <a href={whatsappUrl(cliente.contatoFone)!} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', borderRadius: 10, padding: '10px', color: '#25d366', fontWeight: 700, fontSize: 13, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.12)')}>
            <WhatsIcon /> {cliente.contatoFone}
          </a>
        )}

        {/* dados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Row label="CNPJ" value={fmtCNPJ(cliente?.cnpj ?? '')} />
          <Row label="UF · Região" value={`${cliente?.uf || '—'} · ${cliente?.regiao || '—'}`} />
          {cliente?.contatoEmail && <Row label="E-mail" value={cliente.contatoEmail} />}
          {cliente?.valorFatura != null && <Row label="Valor da fatura" value={`R$ ${cliente.valorFatura.toLocaleString('pt-BR')}`} />}
          {cliente?.economia != null && <Row label="Economia estimada" value={`R$ ${cliente.economia.toLocaleString('pt-BR')}`} accent />}
        </div>

        {/* Enriquecimento CNPJ */}
        <div style={{ borderTop: '1px solid #2a2c34', paddingTop: 14 }}>
          {!enrich ? (
            <button onClick={enriquecer} disabled={enriching || !cliente?.cnpj} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid #353740', borderRadius: 9, color: '#81869e', fontSize: 12, cursor: cliente?.cnpj ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {enriching ? 'Consultando Receita...' : '🔍 Enriquecer via CNPJ'}
            </button>
          ) : (
            <div style={{ background: '#15161b', border: '1px solid #2a2c34', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#09bc8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receita Federal</div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: salvoNexi ? '#09bc8a' : '#81869e' }}>
                  {salvoNexi ? '✓ salvo na Nexi' : 'só local'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {enrich.razao_social && <Row label="Razão social" value={enrich.razao_social} small />}
                {enrich.atividade && <Row label="Atividade" value={enrich.atividade} small />}
                {enrich.situacao && <Row label="Situação" value={enrich.situacao} small />}
                {enrich.municipio && <Row label="Município" value={`${enrich.municipio}/${enrich.uf}`} small />}
                {enrich.telefone && <Row label="Telefone" value={enrich.telefone} small />}
              </div>
            </div>
          )}
        </div>

        {/* Renovação / concorrente */}
        <div style={{ borderTop: '1px solid #2a2c34', paddingTop: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⏳ Renovação {renovando && <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)', borderRadius: 5, padding: '1px 6px', textTransform: 'none', letterSpacing: 0 }}>vence em {meses}m</span>}
          </div>
          <input placeholder="Concorrente atual" value={concorrente} onChange={e => setConcorrente(e.target.value)}
            style={{ width: '100%', padding: '9px 11px', background: '#15161b', border: '1px solid #353740', borderRadius: 9, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
          <div style={{ marginBottom: 8 }}>
            <DateBR value={vencimento} onChange={setVencimento} placeholder="Vencimento (dd/mm/aaaa)" />
          </div>
          <button onClick={salvarMeta} disabled={metaSaving} style={{ width: '100%', padding: '8px', background: metaOk ? 'rgba(9,188,138,0.15)' : 'transparent', border: `1px solid ${metaOk ? '#09bc8a' : '#353740'}`, borderRadius: 9, color: metaOk ? '#09bc8a' : '#81869e', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {metaSaving ? 'Salvando...' : metaOk ? '✓ Salvo' : 'Salvar renovação'}
          </button>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setAnaliseOpen(true)} style={{ background: 'rgba(9,188,138,0.1)', color: '#09bc8a', border: '1px solid rgba(9,188,138,0.3)', borderRadius: 11, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9,188,138,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(9,188,138,0.1)' }}>
            ✦ Análise de IA
          </button>
          <button onClick={openModal} style={{ background: '#09bc8a', color: '#0d1e18', border: 'none', borderRadius: 11, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 18px rgba(9,188,138,0.25)', transition: 'opacity 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            + Registrar contato
          </button>
        </div>
      </div>

      {/* ── Coluna direita: timeline ── */}
      <div style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Linha do tempo</h2>
        <p style={{ fontSize: 12, color: '#81869e', marginBottom: 24 }}>{atividades.length} interaç{atividades.length === 1 ? 'ão' : 'ões'} registrada{atividades.length !== 1 ? 's' : ''}</p>

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#81869e', fontSize: 13 }}>Carregando...</div>}
        {!loading && atividades.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>📋</div>
            <div style={{ color: '#81869e', fontSize: 13, marginBottom: 16 }}>Nenhum contato registrado.</div>
            <button onClick={openModal} style={{ background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.3)', borderRadius: 9, padding: '9px 18px', color: '#09bc8a', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Registrar primeiro contato</button>
          </div>
        )}

        <div style={{ position: 'relative', maxWidth: 640 }}>
          {atividades.length > 1 && <div style={{ position: 'absolute', left: 18, top: 20, bottom: 20, width: 2, background: 'linear-gradient(to bottom, #09bc8a, #2a2c34)' }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {atividades.map(at => (
              <div key={at.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                <div style={{ width: 38, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${TIPO_COLOR[at.tipo] ?? '#353740'}1c`, border: `2px solid ${TIPO_COLOR[at.tipo] ?? '#353740'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, zIndex: 1 }}>
                    {TIPO_ICON[at.tipo] ?? '·'}
                  </div>
                </div>
                <div style={{ flex: 1, background: '#1e1f24', border: '1px solid #353740', borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TIPO_COLOR[at.tipo] ?? '#fff' }}>{at.tipo}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: `${STATUS_COLOR[at.status] ?? '#81869e'}1c`, color: STATUS_COLOR[at.status] ?? '#81869e' }}>{at.status}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#81869e' }}>{fmtDate(at.created_at)}</span>
                  </div>
                  {at.comentario && <p style={{ fontSize: 13, color: '#c8cad0', lineHeight: 1.5, margin: 0 }}>{at.comentario}</p>}
                  {at.follow_up_data && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fbbf24' }}>🕐 Follow-up: {fmtShort(at.follow_up_data)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel de Análise de IA */}
      {analiseOpen && cliente && (
        <AnalisePanel clienteId={clienteId} cliente={cliente} onClose={() => setAnaliseOpen(false)} />
      )}

      {/* Modal registrar */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{ width: '100%', maxWidth: 460, background: '#1e1f24', border: '1px solid #353740', borderRadius: 16, padding: '1.5rem', animation: 'modalIn 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Registrar contato</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <label style={lbl}>Tipo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {TIPOS.map(t => (
                <button key={t} onClick={() => setTipo(t)} style={{ padding: '6px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${tipo === t ? TIPO_COLOR[t] : '#353740'}`, background: tipo === t ? `${TIPO_COLOR[t]}18` : 'transparent', color: tipo === t ? TIPO_COLOR[t] : '#81869e', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {TIPO_ICON[t]} {t}
                </button>
              ))}
            </div>

            <label style={lbl}>Status</label>
            <div style={{ marginBottom: 16 }}>
              <CustomSelect value={atStatus} onChange={setAtStatus} options={[...STATUS]} placeholder="Selecionar status..." />
            </div>

            <label style={lbl}>Comentário <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
            <textarea value={coment} onChange={e => setComent(e.target.value)} rows={3} placeholder="O que aconteceu nesse contato?"
              style={{ width: '100%', padding: '10px 12px', background: '#15161b', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }}
              onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />

            <label style={lbl}>Follow-up <span style={{ fontWeight: 400, textTransform: 'none' }}>(+2 dias úteis)</span></label>
            <div style={{ marginBottom: 18 }}>
              <DateBR value={followUp} onChange={setFollowUp} />
            </div>

            {saveErro && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 12 }}>{saveErro}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #353740', borderRadius: 10, color: '#81869e', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} style={{ flex: 2, padding: '10px', background: saving ? '#353740' : '#09bc8a', color: saving ? '#81869e' : '#0d1e18', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Salvando...' : 'Salvar contato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: small ? 12 : 13, color: accent ? '#09bc8a' : '#fff', fontWeight: accent ? 700 : 400, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }
