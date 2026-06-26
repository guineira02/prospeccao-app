'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import CSelectModal from '@/app/components/CSelectModal'

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

/* Mock timeline matching design-preview */
const MOCK_AT: Atividade[] = [
  { id:'m1', tipo:'Ligacao',  status:'Não atendeu',     comentario:'Liguei novamente para o Rômulo. Não atendeu. Número correto, mas fora do horário de trabalho.',                                                                          follow_up_data:'2026-06-25', created_at:'2026-06-20T14:32:00Z' },
  { id:'m2', tipo:'Email',    status:'Atendeu',          comentario:'Enviei proposta de migração com simulação de 12 meses. Rômulo confirmou recebimento e pediu uma semana para análise interna com o financeiro.',                          follow_up_data:'2026-06-24', created_at:'2026-06-17T09:15:00Z' },
  { id:'m3', tipo:'Reuniao',  status:'Agendou retorno',  comentario:'Video com Rômulo e o diretor financeiro. Apresentei o modelo de economia no mercado livre. Ficaram interessados — pediram proposta formal com simulação de 12 meses.', follow_up_data:'2026-06-17', created_at:'2026-06-10T16:00:00Z' },
  { id:'m4', tipo:'Ligacao',  status:'Atendeu',          comentario:'Falei com Rômulo, responsável financeiro. Consumo confirmado acima de 500 kWh. Aberto para conversa — agendamos reunião para o dia 10.',                              follow_up_data:'2026-06-10', created_at:'2026-06-05T11:20:00Z' },
  { id:'m5', tipo:'Ligacao',  status:'Não atendeu',      comentario:'Primeiro contato. Não atendeu. Deixei recado.',                                                                                                                          follow_up_data:'2026-06-05', created_at:'2026-06-03T09:00:00Z' },
]

export default function TimelinePage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const clienteId    = params.clienteId as string

  const nome    = searchParams.get('nome') ?? 'Cliente'
  const cnpj    = searchParams.get('cnpj') ?? ''
  const uf      = searchParams.get('uf')   ?? ''
  const status  = searchParams.get('status') ?? ''

  const [atividades, setAtividades] = useState<Atividade[]>(MOCK_AT)
  const [modal,      setModal]      = useState(false)

  // modal state
  const [tipo,     setTipo]   = useState('')
  const [atStatus, setAtSt]   = useState('')
  const [nota,     setNota]   = useState('')
  const [fuDate,   setFuDate] = useState('')
  const [saving,   setSaving] = useState(false)
  const [saveErr,  setSaveErr]= useState('')

  useEffect(() => {
    if (!clienteId.startsWith('mock-')) {
      fetch(`/api/atividades/${clienteId}`)
        .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
        .then(d => { if (d?.atividades?.length) setAtividades(d.atividades) })
    }
  }, [clienteId, router])

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
