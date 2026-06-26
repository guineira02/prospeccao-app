'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CSelectModal from '@/app/components/CSelectModal'

interface FuRow {
  id:          string
  cliente_id:  string
  nome:        string
  uf:          string
  ctx:         string
  hint:        string
  delay:       string
  dot:         string
  delayC:      string
}

interface FuItem {
  id: string; cliente_id: string; nome: string; uf: string
  tipo: string; status: string; comentario: string | null; follow_up_data: string
}

const HINT: Record<string, string> = {
  Ligacao: '📞 Ligar', Email: '✉ Enviar e-mail',
  Reuniao: '👥 Reunião', Proposta: '📄 Enviar proposta', Declinio: '📞 Ligar',
}

function toRow(item: FuItem, dot: string, delayC: string, delay: string): FuRow {
  return {
    id:         item.id,
    cliente_id: item.cliente_id,
    nome:       item.nome || item.cliente_id,
    uf:         item.uf,
    ctx:        `${item.tipo} · ${item.status}${item.comentario ? ` · ${item.comentario.slice(0, 40)}` : ''}`,
    hint:       HINT[item.tipo] ?? '📞 Ligar',
    delay, dot, delayC,
  }
}

function daysOverdue(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
  return diff === 1 ? '1 dia' : `${diff} dias`
}

function weekLabel(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

const STATUS_OPTS = ['Atendeu', 'Não atendeu', 'Agendou retorno', 'Cliente recusou']
const TIPO_OPTS   = ['📞 Ligação', '✉ E-mail', '👥 Reunião', '📄 Proposta', '✕ Declínio']

function RegModal({ onClose }: { onClose: () => void }) {
  const [tipo,   setTipo]   = useState('')
  const [status, setStatus] = useState('')
  const [nota,   setNota]   = useState('')

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <span className="modal-title">Registrar Contato</span>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <span className="fld-lbl">Tipo de contato</span>
          <div className="tipo-row">
            {TIPO_OPTS.map(t => (
              <button key={t} className={`tipo-btn${tipo === t ? ' on' : ''}`} onClick={() => setTipo(t)}>{t}</button>
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
          <textarea className="fld-inp" placeholder="O que aconteceu nesse contato?" value={nota} onChange={e => setNota(e.target.value)} />
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

interface Grupo { label: string; labelClass: string; count: string; rows: FuRow[] }

export default function FollowUpsPage() {
  const router  = useRouter()
  const [modal,  setModal]  = useState(false)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [total,  setTotal]  = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/followups')
      .then(r => { if (!r.ok) return null; return r.json() })
      .then(d => {
        setLoaded(true)
        if (!d) return
        const todayStr = new Date().toISOString().slice(0, 10)
        const overdue: FuRow[] = (d.overdue ?? []).map((i: FuItem) =>
          toRow(i, 'fu-dot-red', 'fu-delay-red', daysOverdue(i.follow_up_data)))
        const today: FuRow[] = (d.today ?? []).map((i: FuItem) =>
          toRow(i, 'fu-dot-green', 'fu-delay-green', 'Hoje'))
        const week: FuRow[] = (d.week ?? []).map((i: FuItem) =>
          toRow(i, 'fu-dot-blue', 'fu-delay-blue', weekLabel(i.follow_up_data)))
        const tot = overdue.length + today.length + week.length
        setTotal(tot)
        const gs: Grupo[] = []
        if (overdue.length) gs.push({ label: 'Em atraso',   labelClass: 'fu-group-label-red',   count: `${overdue.length} clientes`,  rows: overdue })
        if (today.length)   gs.push({ label: 'Hoje',        labelClass: 'fu-group-label-green', count: `${today.length} agendados`,   rows: today   })
        if (week.length)    gs.push({ label: 'Esta semana', labelClass: 'fu-group-label-muted', count: `${week.length} agendados`,    rows: week    })
        setGrupos(gs)
      })
  }, [])

  const now     = new Date()
  const dateSub = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="fu-scroll">
      <div className="fu-body">
        <div className="fu-top">
          <div>
            <div className="fu-title">Follow-ups</div>
            <div className="fu-sub">{dateSub} · {total} pendentes</div>
          </div>
          <div className="fu-prog-wrap">
            <div className="fu-prog-label">Concluídos hoje</div>
            <div className="fu-prog-bar"><div className="fu-prog-fill" /></div>
            <div className="fu-prog-count">0 / {total}</div>
          </div>
        </div>

        {loaded && grupos.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ color: 'var(--tx1)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum follow-up pendente</div>
            <div style={{ color: 'var(--tx3)', fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
              Registre contatos nas timelines dos seus clientes para que os follow-ups apareçam aqui automaticamente.
            </div>
            <button
              style={{ marginTop: 20, padding: '8px 18px', background: 'var(--brand)', color: '#0d1e18', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => router.push('/dashboard')}
            >
              Ver clientes →
            </button>
          </div>
        )}

        {!loaded && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
            Carregando...
          </div>
        )}

        {grupos.map(grupo => (
          <div key={grupo.label} className="fu-group">
            <div className="fu-group-hd">
              <span className={`fu-group-label ${grupo.labelClass}`}>{grupo.label}</span>
              <span className="fu-group-count">{grupo.count}</span>
            </div>
            {grupo.rows.map((row, i) => (
              <div key={row.id ?? i} className="fu-row">
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
