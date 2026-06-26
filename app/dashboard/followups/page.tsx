'use client'

import { useState } from 'react'
import CSelectModal from '@/app/components/CSelectModal'

interface FuRow {
  nome:   string
  uf:     string
  ctx:    string
  hint:   string
  delay:  string
  dot:    string
  delayC: string
}

const OVERDUE: FuRow[] = [
  { nome: 'Metalúrgica São Paulo Ltda',    uf: 'SP', ctx: 'Não atendeu · proposta enviada',     hint: '📞 Ligar pela manhã',       delay: '5 dias', dot: 'fu-dot-red',   delayC: 'fu-delay-red'   },
  { nome: 'Cerâmica Vale do Rio S.A.',      uf: 'MG', ctx: 'E-mail sem resposta',                hint: '📞 Ligar agora',            delay: '4 dias', dot: 'fu-dot-red',   delayC: 'fu-delay-red'   },
  { nome: 'Distribuidora Nordeste Ltda',    uf: 'BA', ctx: 'Comprometeu retorno · não ligou',    hint: '📞 Lembrete gentil',        delay: '2 dias', dot: 'fu-dot-red',   delayC: 'fu-delay-red'   },
  { nome: 'Agropecuária Planalto',          uf: 'GO', ctx: 'Proposta enviada ontem',             hint: '📞 Confirmar recebimento',  delay: '1 dia',  dot: 'fu-dot-red',   delayC: 'fu-delay-red'   },
  { nome: 'Porto Seco Logística',           uf: 'RS', ctx: 'Não atendeu ontem',                  hint: '📞 Tentar outro horário',   delay: '1 dia',  dot: 'fu-dot-red',   delayC: 'fu-delay-red'   },
]

const TODAY: FuRow[] = [
  { nome: 'Frigorífico Norte S.A.',         uf: 'PA', ctx: 'Reunião agendada · Renova em 3 meses', hint: '👥 Reunião',             delay: '14h00',  dot: 'fu-dot-green', delayC: 'fu-delay-green' },
  { nome: 'Cooperativa Agrícola Triângulo', uf: 'MG', ctx: 'Proposta em análise interna',         hint: '📞 Ligar',               delay: '16h00',  dot: 'fu-dot-green', delayC: 'fu-delay-green' },
]

const WEEK: FuRow[] = [
  { nome: 'Madeireira Pinheiro Ltda',       uf: 'SC', ctx: 'Pediu proposta · enviar antes',       hint: '📄 Enviar proposta',      delay: 'Sex',    dot: 'fu-dot-blue',  delayC: 'fu-delay-blue'  },
  { nome: 'Indústria Têxtil Modernidade',   uf: 'SP', ctx: '⚠ Contrato vence em 2 meses · CPFL',  hint: '📞 Ligar com comparativo',delay: 'Sex',    dot: 'fu-dot-amber', delayC: 'fu-delay-amber' },
  { nome: 'Laticínios Montanha Ltda',        uf: 'MG', ctx: 'Pediu material de migração',         hint: '✉ Enviar material',       delay: 'Seg',    dot: 'fu-dot-blue',  delayC: 'fu-delay-blue'  },
  { nome: 'Construtora Ômega S.A.',          uf: 'RJ', ctx: 'Reunião reagendada · diretor ausente',hint: '👥 Reunião',             delay: 'Seg',    dot: 'fu-dot-blue',  delayC: 'fu-delay-blue'  },
]

const GRUPOS = [
  { label: 'Em atraso',   labelClass: 'fu-group-label-red',   count: '5 clientes',  rows: OVERDUE },
  { label: 'Hoje',        labelClass: 'fu-group-label-green', count: '2 agendados', rows: TODAY   },
  { label: 'Esta semana', labelClass: 'fu-group-label-muted', count: '4 agendados', rows: WEEK    },
]

const STATUS_OPTS = ['Atendeu', 'Não atendeu', 'Agendou retorno', 'Cliente recusou']
const TIPO_OPTS   = ['📞 Ligação', '✉ E-mail', '👥 Reunião', '📄 Proposta', '✕ Declínio']

function RegModal({ onClose }: { onClose: () => void }) {
  const [tipo,   setTipo]   = useState('')
  const [status, setStatus] = useState('')
  const [nota,   setNota]   = useState('')

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <span className="modal-title">Registrar Contato</span>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span className="fld-lbl">Tipo de contato</span>
          <div className="tipo-row">
            {TIPO_OPTS.map(t => (
              <button
                key={t}
                className={`tipo-btn${tipo === t ? ' on' : ''}`}
                onClick={() => setTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="reg-grid">
          <div>
            <label className="fld-lbl">Status</label>
            <CSelectModal value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="Selecionar..." />
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
          <input type="date" className="fld-inp" style={{ colorScheme: 'dark' }} />
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 5 }}>Pré-preenchido com +2 dias úteis</div>
        </div>

        <div className="reg-foot">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={onClose}>Salvar contato</button>
        </div>
      </div>
    </div>
  )
}

export default function FollowUpsPage() {
  const [modal, setModal] = useState(false)

  return (
    <div className="fu-scroll">
      <div className="fu-body">
        {/* Header */}
        <div className="fu-top">
          <div>
            <div className="fu-title">Follow-ups</div>
            <div className="fu-sub">Quinta-feira, 25 jun · 11 pendentes</div>
          </div>
          <div className="fu-prog-wrap">
            <div className="fu-prog-label">Concluídos hoje</div>
            <div className="fu-prog-bar"><div className="fu-prog-fill" /></div>
            <div className="fu-prog-count">3 / 8</div>
          </div>
        </div>

        {/* Groups */}
        {GRUPOS.map(grupo => (
          <div key={grupo.label} className="fu-group">
            <div className="fu-group-hd">
              <span className={`fu-group-label ${grupo.labelClass}`}>{grupo.label}</span>
              <span className="fu-group-count">{grupo.count}</span>
            </div>
            {grupo.rows.map((row, i) => (
              <div key={i} className="fu-row">
                <div className={`fu-dot ${row.dot}`} />
                <div className={`fu-delay ${row.delayC}`}>{row.delay}</div>
                <div className="fu-name">{row.nome}</div>
                <span className="fu-st">{row.uf}</span>
                <div className="fu-ctx">{row.ctx}</div>
                <span className="fu-action-hint">{row.hint}</span>
                <button className="btn-fu-reg" onClick={() => setModal(true)}>Registrar</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modal && <RegModal onClose={() => setModal(false)} />}
    </div>
  )
}
