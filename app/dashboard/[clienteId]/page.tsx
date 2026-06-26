'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { CustomSelect } from '@/app/components/CustomSelect'

interface Atividade {
  id:             string
  tipo:           string
  status:         string
  comentario:     string | null
  follow_up_data: string | null
  created_at:     string
}

const TIPOS   = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS  = ['Atendeu', 'Nao atendeu', 'Agendou retorno', 'Cliente recusou'] as const

const TIPO_ICON: Record<string, string> = {
  Ligacao:  '📞',
  Email:    '✉',
  Reuniao:  '👥',
  Proposta: '📄',
  Declinio: '✕',
}

const TIPO_COLOR: Record<string, string> = {
  Ligacao:  '#09bc8a',
  Email:    '#60a5fa',
  Reuniao:  '#fbbf24',
  Proposta: '#a78bfa',
  Declinio: '#ef4444',
}

const STATUS_COLOR: Record<string, string> = {
  'Atendeu':          '#09bc8a',
  'Nao atendeu':      '#ef4444',
  'Agendou retorno':  '#fbbf24',
  'Cliente recusou':  '#ef4444',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function TimelinePage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const clienteId    = params.clienteId as string

  const nome    = searchParams.get('nome') ?? 'Cliente'
  const cnpj    = searchParams.get('cnpj') ?? ''
  const uf      = searchParams.get('uf') ?? ''
  const status  = searchParams.get('status') ?? ''
  const consumo = searchParams.get('consumo') ?? ''

  const [atividades, setAtividades]   = useState<Atividade[]>([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)

  // modal state
  const [tipo, setTipo]           = useState<string>('')
  const [atStatus, setAtStatus]   = useState<string>('')
  const [comentario, setComent]   = useState('')
  const [followUp, setFollowUp]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveErro, setSaveErro]   = useState('')

  useEffect(() => {
    fetch(`/api/atividades/${clienteId}`)
      .then(r => {
        if (r.status === 401) { router.push('/'); return null }
        return r.json()
      })
      .then(d => {
        if (d) setAtividades(d.atividades ?? [])
      })
      .finally(() => setLoading(false))
  }, [clienteId, router])

  function openModal() {
    setTipo('')
    setAtStatus('')
    setComent('')
    setFollowUp('')
    setSaveErro('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!tipo || !atStatus) {
      setSaveErro('Selecione tipo e status.')
      return
    }
    setSaving(true)
    setSaveErro('')
    const res = await fetch('/api/atividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id:     clienteId,
        tipo,
        status:         atStatus,
        comentario:     comentario || null,
        follow_up_data: followUp || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setSaveErro(data.error ?? 'Erro ao salvar')
      return
    }
    setAtividades(prev => [data.atividade, ...prev])
    setModalOpen(false)
  }

  function formatCNPJ(c: string) {
    const d = c.replace(/\D/g, '')
    if (d.length !== 14) return c
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left column — client info */}
      <div style={{
        width: 280,
        minWidth: 280,
        borderRight: '1px solid #353740',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'Montserrat, sans-serif' }}
        >
          ← Voltar
        </button>

        {/* Avatar */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#1e1f24',
            border: '2px solid #09bc8a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#09bc8a',
            margin: '0 auto 12px',
          }}>
            {nome.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
            {nome}
          </div>
          {status && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(9,188,138,0.12)', color: '#09bc8a', border: '1px solid rgba(9,188,138,0.25)' }}>
              {status}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'CNPJ', value: formatCNPJ(cnpj) },
            { label: 'UF', value: uf },
            { label: 'Consumo Est.', value: consumo ? `${Number(consumo).toLocaleString('pt-BR')} kW` : '—' },
          ].map(row => (
            <div key={row.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                {row.label}
              </div>
              <div style={{ fontSize: 13, color: '#fff' }}>{row.value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{
          background: '#1e1f24',
          border: '1px solid #353740',
          borderRadius: 10,
          padding: '12px',
          display: 'flex',
          gap: 12,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#09bc8a' }}>{atividades.length}</div>
            <div style={{ fontSize: 10, color: '#81869e', marginTop: 2 }}>Contatos</div>
          </div>
          <div style={{ width: 1, background: '#353740' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
              {atividades.filter(a => a.follow_up_data).length}
            </div>
            <div style={{ fontSize: 10, color: '#81869e', marginTop: 2 }}>Follow-ups</div>
          </div>
        </div>

        <button
          onClick={openModal}
          style={{
            background: '#09bc8a',
            color: '#0d1e18',
            border: 'none',
            borderRadius: 10,
            padding: '11px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            boxShadow: '0 0 16px rgba(9,188,138,0.25)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          + Registrar contato
        </button>
      </div>

      {/* Right column — timeline */}
      <div style={{ flex: 1, padding: '2rem 2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            Linha do tempo
          </h2>
          <p style={{ fontSize: 12, color: '#81869e' }}>Histórico de interações com {nome}</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#81869e', fontSize: 13 }}>
            Carregando...
          </div>
        )}

        {!loading && atividades.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ color: '#81869e', fontSize: 13, marginBottom: 16 }}>Nenhum contato registrado ainda.</div>
            <button
              onClick={openModal}
              style={{ background: 'rgba(9,188,138,0.12)', border: '1px solid rgba(9,188,138,0.3)', borderRadius: 8, padding: '8px 16px', color: '#09bc8a', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
            >
              Registrar primeiro contato
            </button>
          </div>
        )}

        {/* Timeline entries */}
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          {atividades.length > 1 && (
            <div style={{
              position: 'absolute',
              left: 19,
              top: 20,
              bottom: 20,
              width: 2,
              background: 'linear-gradient(to bottom, #09bc8a 0%, #353740 100%)',
            }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {atividades.map((at, i) => (
              <div key={at.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                {/* Dot */}
                <div style={{
                  width: 38,
                  flexShrink: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 2,
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: `${TIPO_COLOR[at.tipo] ?? '#353740'}18`,
                    border: `2px solid ${TIPO_COLOR[at.tipo] ?? '#353740'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    zIndex: 1,
                    position: 'relative',
                    flexShrink: 0,
                  }}>
                    {TIPO_ICON[at.tipo] ?? '·'}
                  </div>
                </div>

                {/* Card */}
                <div style={{
                  flex: 1,
                  background: '#1e1f24',
                  border: '1px solid #353740',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TIPO_COLOR[at.tipo] ?? '#fff' }}>
                      {at.tipo}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '2px 7px',
                      borderRadius: 20,
                      background: `${STATUS_COLOR[at.status] ?? '#81869e'}18`,
                      color: STATUS_COLOR[at.status] ?? '#81869e',
                    }}>
                      {at.status}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#81869e' }}>
                      {formatDate(at.created_at)}
                    </span>
                  </div>

                  {at.comentario && (
                    <p style={{ fontSize: 13, color: '#c8cad0', lineHeight: 1.5, margin: 0 }}>
                      {at.comentario}
                    </p>
                  )}

                  {at.follow_up_data && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fbbf24' }}>
                      <span>🕐</span>
                      <span>Follow-up: {formatDateShort(at.follow_up_data)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal — registrar contato */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 460,
            background: '#1e1f24',
            border: '1px solid #353740',
            borderRadius: 16,
            padding: '1.5rem',
            animation: 'modalIn 0.25s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Registrar contato</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Tipo chips */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Tipo
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIPOS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${tipo === t ? TIPO_COLOR[t] : '#353740'}`,
                      background: tipo === t ? `${TIPO_COLOR[t]}18` : 'transparent',
                      color: tipo === t ? TIPO_COLOR[t] : '#81869e',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      transition: 'all 0.15s',
                    }}
                  >
                    {TIPO_ICON[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Status select */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Status
              </label>
              <CustomSelect
                value={atStatus}
                onChange={setAtStatus}
                options={[...STATUS]}
                placeholder="Selecionar status..."
              />
            </div>

            {/* Comentário */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Comentário <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={e => setComent(e.target.value)}
                rows={3}
                placeholder="O que aconteceu nesse contato?"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#15161b',
                  border: '1px solid #353740',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'Montserrat, sans-serif',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
              />
            </div>

            {/* Follow-up date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Follow-up <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
              </label>
              <input
                type="date"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#15161b',
                  border: '1px solid #353740',
                  borderRadius: 10,
                  color: followUp ? '#fff' : '#81869e',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  colorScheme: 'dark',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')}
                onBlur={e => (e.currentTarget.style.borderColor = '#353740')}
              />
            </div>

            {saveErro && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 12 }}>
                {saveErro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #353740', borderRadius: 10, color: '#81869e', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: saving ? '#353740' : '#09bc8a',
                  color: saving ? '#81869e' : '#0d1e18',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.15s',
                }}
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
