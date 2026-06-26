'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CSelectModal from '@/app/components/CSelectModal'
import { useDashboard } from '../context'

interface Atividade {
  id:             string
  tipo:           string
  status:         string
  comentario:     string | null
  follow_up_data: string | null
  created_at:     string
}

const TIPOS   = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS  = ['Atendeu', 'Não atendeu', 'Agendou retorno', 'Cliente recusou']

const TIPO_LABEL: Record<string, string> = {
  Ligacao: 'Ligação', Email: 'E-mail', Reuniao: 'Reunião', Proposta: 'Proposta', Declinio: 'Declínio',
}

const TIPO_NODE: Record<string, string> = {
  Ligacao: 'nd-call', Email: 'nd-email', Reuniao: 'nd-meet', Proposta: 'nd-prop', Declinio: 'nd-call',
}

const STATUS_BDG: Record<string, string> = {
  'Atendeu':          'bdg-green',
  'Não atendeu':      'bdg-red',
  'Agendou retorno':  'bdg-green',
  'Cliente recusou':  'bdg-red',
}

function TipoIcon({ tipo }: { tipo: string }) {
  if (tipo === 'Ligacao' || tipo === 'Declinio') return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5 1c0 0-1.5 0-1.5 1.5C1 7.75 6.25 13 11.5 13c1.5 0 1.5-1.5 1.5-1.5L11 8.5 9 9.5S7.5 8.5 6 7 3.5 4 3.5 4l1-2L2.5 1z"/>
    </svg>
  )
  if (tipo === 'Email') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1" y="3" width="14" height="10" rx="1.5"/>
      <path d="M1 5l7 5 7-5"/>
    </svg>
  )
  if (tipo === 'Reuniao') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5.5" cy="5" r="2.2"/>
      <path d="M1 14c0-3 2-4.5 4.5-4.5S10 11 10 14"/>
      <circle cx="12" cy="5" r="1.8"/>
      <path d="M12 9.8c1.4.2 3 1 3 4.2"/>
    </svg>
  )
  if (tipo === 'Proposta') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="1" width="12" height="14" rx="2"/>
      <path d="M5 5h6M5 8h6M5 11h4"/>
    </svg>
  )
  return <span style={{ fontSize: 12 }}>·</span>
}

function CalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="12" height="11" rx="2"/>
      <path d="M5 1v3M11 1v3M2 7h12"/>
    </svg>
  )
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

function formatFU(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d.length ? `(${d}` : ''
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}


interface Meta { contato_nome: string; contato_telefone: string; contato_email: string }
interface CnpjData {
  razao_social: string; atividade: string; situacao: string
  municipio: string; uf: string; email: string; telefone: string; rep_legal: string
}

export default function TimelinePage() {
  const params    = useParams()
  const router    = useRouter()
  const clienteId = params.clienteId as string
  const { clientes } = useDashboard()

  const ctx    = clientes.find(c => c._id === clienteId)
  const nome   = ctx?.['Razão Social'] ?? 'Cliente'
  const cnpj   = ctx?.CNPJ ?? ''
  const uf     = ctx?.UF ?? ''
  const status = ctx?.Status ?? ''

  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)

  // contact meta
  const [meta,       setMeta]       = useState<Meta>({ contato_nome: '', contato_telefone: '', contato_email: '' })
  const [editField,  setEditField]  = useState<keyof Meta | null>(null)
  const [editVal,    setEditVal]    = useState('')
  const [metaSaving, setMetaSaving] = useState(false)

  // cnpj enrichment
  const [enriching,  setEnriching]  = useState(false)
  const [cnpjData,   setCnpjData]   = useState<CnpjData | null>(null)
  const [cnpjErr,    setCnpjErr]    = useState('')

  // modal state
  const [tipo,     setTipo]   = useState('')
  const [atStatus, setAtSt]   = useState('')
  const [nota,     setNota]   = useState('')
  const [fuDate,   setFuDate] = useState('')
  const [saving,   setSaving] = useState(false)
  const [saveErr,  setSaveErr]= useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/atividades/${clienteId}`)
      .then(r => { if (!r.ok) return null; return r.json() })
      .then(d => { setAtividades(d?.atividades ?? []) })
      .finally(() => setLoading(false))
  }, [clienteId])

  useEffect(() => {
    fetch(`/api/meta/${clienteId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.meta) setMeta({ contato_nome: d.meta.contato_nome ?? '', contato_telefone: d.meta.contato_telefone ?? '', contato_email: d.meta.contato_email ?? '' }) })
  }, [clienteId])

  function startEdit(field: keyof Meta) {
    setEditField(field); setEditVal(meta[field])
  }

  async function commitEdit() {
    if (!editField) return
    const updated = { ...meta, [editField]: editVal }
    setMeta(updated); setEditField(null)
    setMetaSaving(true)
    await fetch(`/api/meta/${clienteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setMetaSaving(false)
  }

  async function enrichCnpj() {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (!cnpjLimpo) return
    setEnriching(true); setCnpjErr(''); setCnpjData(null)
    const res = await fetch(`/api/cnpj/${cnpjLimpo}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCnpjErr(d.error ?? 'CNPJ não encontrado')
    } else {
      const d = await res.json()
      setCnpjData(d)
    }
    setEnriching(false)
  }

  function importCnpjContato() {
    if (!cnpjData) return
    const updated = {
      ...meta,
      contato_telefone: cnpjData.telefone || meta.contato_telefone,
      contato_email:    cnpjData.email    || meta.contato_email,
    }
    setMeta(updated)
    fetch(`/api/meta/${clienteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  function openModal() {
    setTipo(''); setAtSt(''); setNota(''); setFuDate(''); setSaveErr('')
    setModal(true)
  }

  async function handleSave() {
    if (!tipo || !atStatus) { setSaveErr('Selecione tipo e status.'); return }
    setSaving(true); setSaveErr('')
    const res = await fetch('/api/atividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, tipo, status: atStatus, comentario: nota || null, follow_up_data: fuDate || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveErr(data.error ?? 'Erro ao salvar'); return }
    setAtividades(prev => [data.atividade, ...prev])
    setModal(false)
  }

  return (
    <div className="tl-wrap">
      {/* Left panel */}
      <div className="tl-left">
        <div className="tl-hd">
          <button className="tl-back" onClick={() => router.push('/dashboard')}>
            ← Voltar a clientes
          </button>
          <div className="tl-co">{nome}</div>
          <div className="tl-co-sub">{cnpj}{uf ? ` · ${uf}` : ''}</div>
          {status && (
            <div className="tl-status">
              <span className="bdg bdg-muted">{status}</span>
            </div>
          )}
        </div>

        <div className="tl-sec">
          <div className="tl-sec-title">Da Nexi</div>
          {uf && (
            <div className="tl-f">
              <div className="lbl">UF</div>
              <div className="val">{uf}</div>
            </div>
          )}
          {status && (
            <div className="tl-f">
              <div className="lbl">Status</div>
              <div className="val">{status}</div>
            </div>
          )}
          <div className="tl-f">
            <div className="lbl">Total de contatos</div>
            <div className="val">{atividades.length}</div>
          </div>
        </div>

        <div className="tl-sec">
          <div className="tl-sec-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Contato direto
            {metaSaving && <span style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 400 }}>salvando…</span>}
          </div>

          {(['contato_nome', 'contato_telefone', 'contato_email'] as (keyof Meta)[]).map(field => {
            const labels: Record<keyof Meta, string> = { contato_nome: 'Nome', contato_telefone: 'Telefone', contato_email: 'E-mail' }
            const placeholders: Record<keyof Meta, string> = { contato_nome: 'Adicionar nome…', contato_telefone: 'Adicionar telefone…', contato_email: 'Adicionar e-mail…' }
            const isEditing = editField === field
            return (
              <div key={field} className="tl-f">
                <div className="lbl">{labels[field]}</div>
                {isEditing ? (
                  <input
                    autoFocus
                    className="meta-inp"
                    value={editVal}
                    onChange={e => setEditVal(editField === 'contato_telefone' ? maskPhone(e.target.value) : e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditField(null) }}
                  />
                ) : (
                  <div
                    className={`val meta-val${!meta[field] ? ' meta-empty' : ''}`}
                    onClick={() => startEdit(field)}
                    title="Clique para editar"
                  >
                    {meta[field] || placeholders[field]}
                  </div>
                )}
              </div>
            )
          })}

          <button
            className="btn-enrich"
            onClick={enrichCnpj}
            disabled={enriching || !cnpj}
            style={{ marginTop: 8 }}
          >
            {enriching
              ? <><span className="spin-sm" />Consultando CNPJ…</>
              : <>⚡ Enriquecer via CNPJ</>
            }
          </button>

          {cnpjErr && (
            <div className="enrich-err">{cnpjErr}</div>
          )}

          {cnpjData && (
            <div className="enrich-box">
              <div className="enrich-row"><span>Razão Social</span><span>{cnpjData.razao_social}</span></div>
              <div className="enrich-row"><span>Atividade</span><span>{cnpjData.atividade}</span></div>
              <div className="enrich-row"><span>Situação</span><span>{cnpjData.situacao}</span></div>
              {cnpjData.municipio && <div className="enrich-row"><span>Cidade</span><span>{cnpjData.municipio} / {cnpjData.uf}</span></div>}
              {cnpjData.rep_legal && <div className="enrich-row"><span>Rep. Legal</span><span>{cnpjData.rep_legal}</span></div>}
              {cnpjData.telefone && <div className="enrich-row"><span>Telefone</span><span>{cnpjData.telefone}</span></div>}
              {cnpjData.email && <div className="enrich-row"><span>E-mail</span><span>{cnpjData.email}</span></div>}
              {(cnpjData.telefone || cnpjData.email) && (
                <button className="btn-import" onClick={importCnpjContato}>
                  ↓ Importar telefone / e-mail
                </button>
              )}
            </div>
          )}
        </div>

        <div className="tl-sec" style={{ borderBottom: 'none' }}>
          <div className="tl-sec-title">Contexto</div>
          <div className="tl-f">
            <div className="lbl">Último contato</div>
            <div className="val">
              {atividades[0] ? formatWhen(atividades[0].created_at) : '—'}
            </div>
          </div>
          <div className="tl-f">
            <div className="lbl">Follow-ups pendentes</div>
            <div className="val">{atividades.filter(a => a.follow_up_data).length}</div>
          </div>
        </div>

        <button className="btn-reg" onClick={openModal}>
          + Registrar Contato
        </button>
      </div>

      {/* Right: timeline */}
      <div className="tl-right">
        <div className="tl-section-hd">Histórico de contatos</div>

        <div className="tl-entries">
          {loading && (
            <div style={{ color: 'var(--tx3)', fontSize: 13, padding: '32px 0' }}>Carregando...</div>
          )}
          {!loading && atividades.length === 0 && (
            <div style={{ color: 'var(--tx3)', fontSize: 13, padding: '32px 0' }}>
              Nenhum contato registrado ainda. Use o botão abaixo para começar.
            </div>
          )}
          {atividades.map((at) => (
            <div key={at.id} className="tl-entry">
              <div className={`tl-node ${TIPO_NODE[at.tipo] ?? 'nd-call'}`}>
                <TipoIcon tipo={at.tipo} />
              </div>
              <div className="tl-cnt">
                <div className="tl-cnt-top">
                  <div className="tl-bdgs">
                    <span className="bdg bdg-muted">{TIPO_LABEL[at.tipo] ?? at.tipo}</span>
                    <span className={`bdg ${STATUS_BDG[at.status] ?? 'bdg-muted'}`}>{at.status}</span>
                  </div>
                  <span className="tl-when">{formatWhen(at.created_at)}</span>
                </div>
                {at.comentario && (
                  <div className="tl-note">{at.comentario}</div>
                )}
                {at.follow_up_data && (
                  <div className="tl-fu">
                    <CalIcon />
                    Follow-up: <strong>{formatFU(at.follow_up_data)}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}
        >
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <span className="modal-title">Registrar Contato</span>
              <button className="modal-x" onClick={() => setModal(false)}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <span className="fld-lbl">Tipo de contato</span>
              <div className="tipo-row">
                {TIPOS.map(t => (
                  <button
                    key={t}
                    className={`tipo-btn${tipo === t ? ' on' : ''}`}
                    onClick={() => setTipo(t)}
                  >
                    {t === 'Ligacao' && '📞 '}
                    {t === 'Email' && '✉ '}
                    {t === 'Reuniao' && '👥 '}
                    {t === 'Proposta' && '📄 '}
                    {t === 'Declinio' && '✕ '}
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="reg-grid">
              <div>
                <label className="fld-lbl">Status</label>
                <CSelectModal
                  value={atStatus}
                  onChange={setAtSt}
                  options={STATUS}
                  placeholder="Selecionar..."
                />
              </div>
              <div>
                <label className="fld-lbl">Data e hora</label>
                <input type="datetime-local" className="fld-inp" style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="fld-lbl">Comentário</label>
              <textarea
                className="fld-inp"
                placeholder="O que aconteceu nesse contato?"
                value={nota}
                onChange={e => setNota(e.target.value)}
              />
            </div>

            <div>
              <label className="fld-lbl">Próximo Follow-up</label>
              <input
                type="date"
                className="fld-inp"
                value={fuDate}
                onChange={e => setFuDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 5 }}>
                Pré-preenchido com +2 dias úteis
              </div>
            </div>

            {saveErr && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,.1)', borderRadius: 8, color: 'var(--red)', fontSize: 12 }}>
                {saveErr}
              </div>
            )}

            <div className="reg-foot">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
                style={saving ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                {saving ? 'Salvando...' : 'Salvar contato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
