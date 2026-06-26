'use client'

import { useState } from 'react'
import { CustomSelect } from './CustomSelect'
import { DateBR } from './DateBR'
import { TIPOS, STATUS, TIPO_ICON, TIPO_COLOR, proximoFollowUp } from '@/lib/constants'

interface Props {
  clienteIds: string[]
  onClose: () => void
  onDone: () => void
}

export function BatchModal({ clienteIds, onClose, onDone }: Props) {
  const [tipo, setTipo]         = useState('')
  const [status, setStatus]     = useState('')
  const [comentario, setComent] = useState('')
  const [followUp, setFollowUp] = useState(proximoFollowUp())
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState('')

  async function salvar() {
    if (!tipo || !status) { setErro('Selecione tipo e status.'); return }
    setSaving(true); setErro('')
    const res = await fetch('/api/atividades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_ids: clienteIds, tipo, status, comentario: comentario || null, follow_up_data: followUp || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErro(data.error ?? 'Erro ao salvar'); return }
    onDone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#1e1f24', border: '1px solid #353740', borderRadius: 16, padding: '1.5rem', animation: 'modalIn 0.25s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Registrar em massa</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: '#81869e', marginBottom: 18 }}>
          Mesma atividade aplicada a <strong style={{ color: '#09bc8a' }}>{clienteIds.length} clientes</strong>.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Tipo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TIPOS.map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{
                padding: '6px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1px solid ${tipo === t ? TIPO_COLOR[t] : '#353740'}`,
                background: tipo === t ? `${TIPO_COLOR[t]}18` : 'transparent',
                color: tipo === t ? TIPO_COLOR[t] : '#81869e', cursor: 'pointer', fontFamily: 'inherit',
              }}>{TIPO_ICON[t]} {t}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Status</label>
          <CustomSelect value={status} onChange={setStatus} options={[...STATUS]} placeholder="Selecionar status..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Comentário <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
          <textarea value={comentario} onChange={e => setComent(e.target.value)} rows={2} placeholder="Aplica o mesmo comentário a todos..."
            style={{ width: '100%', padding: '10px 12px', background: '#15161b', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Próximo follow-up</label>
          <DateBR value={followUp} onChange={setFollowUp} />
        </div>

        {erro && <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #353740', borderRadius: 10, color: '#81869e', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ flex: 2, padding: '10px', background: saving ? '#353740' : '#09bc8a', color: saving ? '#81869e' : '#0d1e18', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Salvando...' : `Registrar para ${clienteIds.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
