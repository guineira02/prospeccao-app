'use client'

import { useState } from 'react'
import { CustomSelect } from '@/app/components/CustomSelect'

interface FuRow {
  nome:   string
  uf:     string
  ctx:    string
  hint:   string
  delay:  string
  color:  string
  dotColor: string
}

const OVERDUE: FuRow[] = [
  { nome: 'Metalúrgica São Paulo Ltda',    uf: 'SP', ctx: 'Não atendeu · proposta enviada',     hint: '📞 Ligar pela manhã',        delay: '5 dias', color: '#ef4444', dotColor: '#ef4444' },
  { nome: 'Cerâmica Vale do Rio S.A.',      uf: 'MG', ctx: 'E-mail sem resposta',                hint: '📞 Ligar agora',             delay: '4 dias', color: '#ef4444', dotColor: '#ef4444' },
  { nome: 'Distribuidora Nordeste Ltda',    uf: 'BA', ctx: 'Comprometeu retorno · não ligou',    hint: '📞 Lembrete gentil',         delay: '2 dias', color: '#ef4444', dotColor: '#ef4444' },
  { nome: 'Agropecuária Planalto',          uf: 'GO', ctx: 'Proposta enviada ontem',             hint: '📞 Confirmar recebimento',   delay: '1 dia',  color: '#ef4444', dotColor: '#ef4444' },
  { nome: 'Porto Seco Logística',           uf: 'RS', ctx: 'Não atendeu ontem',                  hint: '📞 Tentar outro horário',    delay: '1 dia',  color: '#ef4444', dotColor: '#ef4444' },
]

const TODAY: FuRow[] = [
  { nome: 'Frigorífico Norte S.A.',         uf: 'PA', ctx: 'Reunião agendada · Renova em 3 meses', hint: '👥 Reunião',              delay: '14h00', color: '#09bc8a', dotColor: '#09bc8a' },
  { nome: 'Cooperativa Agrícola Triângulo', uf: 'MG', ctx: 'Proposta em análise interna',         hint: '📞 Ligar',                delay: '16h00', color: '#09bc8a', dotColor: '#09bc8a' },
]

const WEEK: FuRow[] = [
  { nome: 'Madeireira Pinheiro Ltda',       uf: 'SC', ctx: 'Pediu proposta · enviar antes',       hint: '📄 Enviar proposta',       delay: 'Sex',   color: '#60a5fa', dotColor: '#60a5fa' },
  { nome: 'Indústria Têxtil Modernidade',   uf: 'SP', ctx: '⚠ Contrato vence em 2 meses · CPFL',  hint: '📞 Ligar com comparativo', delay: 'Sex',   color: '#fbbf24', dotColor: '#fbbf24' },
  { nome: 'Laticínios Montanha Ltda',        uf: 'MG', ctx: 'Pediu material de migração',         hint: '✉ Enviar material',        delay: 'Seg',   color: '#60a5fa', dotColor: '#60a5fa' },
  { nome: 'Construtora Ômega S.A.',          uf: 'RJ', ctx: 'Reunião reagendada · diretor ausente', hint: '👥 Reunião',             delay: 'Seg',   color: '#60a5fa', dotColor: '#60a5fa' },
]

const GROUPS = [
  { title: 'Em atraso',    labelColor: '#ef4444', count: `${OVERDUE.length} clientes`, rows: OVERDUE },
  { title: 'Hoje',         labelColor: '#09bc8a', count: `${TODAY.length} agendados`,  rows: TODAY   },
  { title: 'Esta semana',  labelColor: '#81869e', count: `${WEEK.length} agendados`,   rows: WEEK    },
]

const TOTAL   = OVERDUE.length + TODAY.length + WEEK.length
const DONE    = 3
const PROGPCT = Math.round((DONE / (DONE + TOTAL - TODAY.length)) * 100)

function RegModal({ onClose }: { onClose: () => void }) {
  const TIPOS  = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio']
  const STATUS = ['Atendeu', 'Nao atendeu', 'Agendou retorno', 'Cliente recusou']
  const [tipo, setTipo]     = useState('')
  const [status, setStatus] = useState('')
  const [nota, setNota]     = useState('')

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: '#1e1f24', border: '1px solid #353740', borderRadius: 16, padding: '1.5rem', animation: 'modalIn 0.25s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Registrar contato</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>Tipo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {TIPOS.map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1px solid ${tipo === t ? '#09bc8a' : '#353740'}`,
                background: tipo === t ? 'rgba(9,188,138,0.12)' : 'transparent',
                color: tipo === t ? '#09bc8a' : '#81869e',
                cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>Status</label>
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={[...STATUS]}
            placeholder="Selecionar..."
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>Observação</label>
          <textarea rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="O que aconteceu?" style={{
            width: '100%', padding: '9px 12px', background: '#15161b',
            border: '1px solid #353740', borderRadius: 10, color: '#fff',
            fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'Montserrat, sans-serif',
          }} onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #353740', borderRadius: 10, color: '#81869e', fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            Cancelar
          </button>
          <button onClick={onClose} style={{ flex: 2, padding: '10px', background: '#09bc8a', color: '#0d1e18', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function FuRowItem({ row, onReg }: { row: FuRow; onReg: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #353740' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.dotColor, flexShrink: 0 }} />
      <div style={{
        minWidth: 44,
        fontSize: 11,
        fontWeight: 700,
        color: row.color,
        flexShrink: 0,
      }}>
        {row.delay}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {row.nome}
        </div>
        <div style={{ fontSize: 11, color: '#81869e' }}>{row.uf} · {row.ctx}</div>
      </div>
      <span style={{ fontSize: 11, color: '#81869e', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        {row.hint}
      </span>
      <button
        onClick={onReg}
        style={{
          padding: '5px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid #353740',
          background: 'transparent',
          color: '#81869e',
          cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#09bc8a'; e.currentTarget.style.color = '#09bc8a' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#353740'; e.currentTarget.style.color = '#81869e' }}
      >
        Registrar
      </button>
    </div>
  )
}

export default function FollowUpsPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Follow-ups</h1>
          <p style={{ fontSize: 13, color: '#81869e' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} · {TOTAL} pendentes
          </p>
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <div style={{ fontSize: 11, color: '#81869e', marginBottom: 6 }}>Concluídos hoje</div>
          <div style={{ height: 6, background: '#1e1f24', borderRadius: 3, marginBottom: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${PROGPCT}%`, background: '#09bc8a', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#09bc8a' }}>{DONE} / {DONE + TOTAL - TODAY.length}</div>
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: group.labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {group.title}
            </span>
            <span style={{ fontSize: 12, color: '#81869e' }}>{group.count}</span>
          </div>
          <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 12, padding: '0 16px' }}>
            {group.rows.map((row, i) => (
              <FuRowItem key={i} row={row} onReg={() => setModalOpen(true)} />
            ))}
          </div>
        </div>
      ))}

      {modalOpen && <RegModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
