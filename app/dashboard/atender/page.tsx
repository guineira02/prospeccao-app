'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  TIPOS, STATUS, TIPO_ICON, TIPO_COLOR, STATUS_COLOR,
  ESTAGIO_COLOR, proximoFollowUp, diasAtraso, whatsappUrl, type Estagio,
} from '@/lib/constants'
import { DateBR } from '@/app/components/DateBR'
import { WhatsIcon } from '@/app/components/WhatsIcon'

interface Cliente {
  id: string; nome: string; cnpj: string; uf: string; regiao: string
  contatoNome: string; contatoEmail: string; contatoFone: string
  valorFatura: number | null; economia: number | null
  estagio: Estagio; ultimoContato: string | null; proximoFollowUp: string | null
  totalAtividades: number
}

function fmtCNPJ(c: string) {
  const d = c.replace(/\D/g, '')
  if (d.length !== 14) return c || '—'
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

// atalhos: tipo = 1..7, status = q w e r
const STATUS_KEY: Record<string, string> = { q: STATUS[0], w: STATUS[1], e: STATUS[2], r: STATUS[3] }

export default function AtenderPage() {
  const router = useRouter()
  const [fila, setFila]     = useState<Cliente[]>([])
  const [label, setLabel]   = useState('Carteira')
  const [idx, setIdx]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone]     = useState(0)
  const [anim, setAnim]     = useState<'in' | 'out'>('in')
  const [view, setView]     = useState<'list' | 'card'>('list')
  const [feitos, setFeitos] = useState<Set<string>>(new Set())

  // registro
  const [tipo, setTipo]     = useState('')
  const [status, setStatus] = useState('')
  const [coment, setComent] = useState('')
  const [followUp, setFollowUp] = useState(proximoFollowUp())
  const [saving, setSaving] = useState(false)
  const comentRef = useRef<HTMLTextAreaElement>(null)

  const atual = fila[idx]
  const acabou = !loading && idx >= fila.length && fila.length > 0

  useEffect(() => {
    const raw = sessionStorage.getItem('fila_atendimento')
    const queue: { ids: string[]; label: string } = raw ? JSON.parse(raw) : { ids: [], label: 'Carteira' }
    setLabel(queue.label || 'Carteira')
    fetch('/api/clientes')
      .then(r => { if (r.status === 401) { router.push('/'); return null } return r.json() })
      .then(d => {
        if (!d) return
        const todos: Cliente[] = d.clientes ?? []
        const ordered = queue.ids.length
          ? queue.ids.map(id => todos.find(c => c.id === id)).filter(Boolean) as Cliente[]
          : todos
        setFila(ordered)
      })
      .finally(() => setLoading(false))
  }, [router])

  const resetForm = useCallback(() => {
    setTipo(''); setStatus(''); setComent(''); setFollowUp(proximoFollowUp())
  }, [])

  const avancar = useCallback(() => {
    setAnim('out')
    setTimeout(() => { setIdx(i => i + 1); resetForm(); setAnim('in') }, 220)
  }, [resetForm])

  const salvar = useCallback(async () => {
    if (!atual || !tipo || !status || saving) return
    setSaving(true)
    await fetch('/api/atividades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: atual.id, tipo, status, comentario: coment || null, follow_up_data: followUp || null }),
    }).catch(() => {})
    setSaving(false)
    setDone(d => d + 1)
    setFeitos(prev => new Set(prev).add(atual.id))
    avancar()
  }, [atual, tipo, status, coment, followUp, saving, avancar])

  function abrirCard(i: number) {
    setIdx(i); resetForm(); setAnim('in'); setView('card')
  }

  // teclado (só no modo card)
  useEffect(() => {
    if (view !== 'card') return
    function onKey(e: KeyboardEvent) {
      if (acabou) { if (e.key === 'Enter' || e.key === 'Escape') setView('list'); return }
      const tag = (e.target as HTMLElement)?.tagName
      const inText = tag === 'TEXTAREA' || tag === 'INPUT'
      if (e.key === 'Escape') { if (inText) (e.target as HTMLElement).blur(); else setView('list'); return }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !inText)) { e.preventDefault(); salvar(); return }
      if (inText) return
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= TIPOS.length) { setTipo(TIPOS[n - 1]); return }
      const s = STATUS_KEY[e.key.toLowerCase()]
      if (s) { setStatus(s); return }
      if (e.key === 'ArrowRight') avancar()
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); comentRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [acabou, salvar, avancar, router, view])

  if (loading) return <Centered>Montando a fila...</Centered>
  if (fila.length === 0) return <Centered>Nenhum cliente na fila. <button onClick={() => router.push('/dashboard')} style={linkBtn}>Voltar</button></Centered>

  const total = fila.length
  const pct = Math.round((Math.min(idx, total) / total) * 100)

  // ── MODO LISTA: entrada do atendimento ──
  if (view === 'list') {
    return (
      <div style={{ padding: '2rem 2.25rem', maxWidth: 860, margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#81869e', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'inherit' }}>← Voltar à carteira</button>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 4 }}>Modo Atendimento</h1>
            <p style={{ fontSize: 13, color: '#81869e' }}>{label} · {total} clientes na fila{feitos.size > 0 && <span style={{ color: '#09bc8a' }}> · {feitos.size} feitos</span>}</p>
          </div>
          <button onClick={() => abrirCard(0)} style={{ padding: '11px 22px', borderRadius: 11, fontSize: 14, fontWeight: 700, background: '#09bc8a', color: '#0d1e18', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(9,188,138,0.35)', display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            ▶ Começar do topo
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#5a5f73', marginBottom: 20 }}>Clique num cliente para iniciar o atendimento a partir dele.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fila.map((c, i) => {
            const feito = feitos.has(c.id)
            const atraso = diasAtraso(c.proximoFollowUp)
            return (
              <button key={c.id} onClick={() => abrirCard(i)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', textAlign: 'left',
                background: '#1e1f24', border: '1px solid #353740', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.15s, transform 0.12s, background 0.15s', opacity: feito ? 0.6 : 1,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#09bc8a55'; e.currentTarget.style.background = '#24262e'; e.currentTarget.style.transform = 'translateX(3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#353740'; e.currentTarget.style.background = '#1e1f24'; e.currentTarget.style.transform = 'translateX(0)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#5a5f73', minWidth: 20 }}>{i + 1}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#15161b', border: `1px solid ${feito ? '#09bc8a' : '#353740'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#09bc8a', flexShrink: 0 }}>
                  {feito ? '✓' : c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: '#81869e' }}>{c.uf || '—'} · {c.regiao} · {c.totalAtividades} contato{c.totalAtividades !== 1 ? 's' : ''}</div>
                </div>
                {c.contatoFone && whatsappUrl(c.contatoFone) && <span style={{ color: '#25d366', display: 'flex' }}><WhatsIcon size={14} /></span>}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0, color: ESTAGIO_COLOR[c.estagio], background: `${ESTAGIO_COLOR[c.estagio]}1c` }}>{c.estagio}</span>
                {atraso !== null && atraso > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>{atraso}d</span>}
                <span style={{ color: '#353740', fontSize: 15, flexShrink: 0 }}>▶</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'radial-gradient(1200px 600px at 50% -10%, rgba(9,188,138,0.06), transparent 60%), #15161b' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: '1px solid #2a2c34' }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: '1px solid #353740', borderRadius: 8, color: '#81869e', fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#09bc8a'; e.currentTarget.style.color = '#09bc8a' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#353740'; e.currentTarget.style.color = '#81869e' }}>
          Esc · Lista
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
              Modo Atendimento <span style={{ color: '#81869e', fontWeight: 500 }}>· {label}</span>
            </span>
            <span style={{ fontSize: 12, color: '#81869e' }}>
              <span style={{ color: '#09bc8a', fontWeight: 700 }}>{Math.min(idx + (acabou ? 0 : 1), total)}</span> / {total}
              {done > 0 && <span style={{ color: '#09bc8a' }}> · {done} registrados</span>}
            </span>
          </div>
          <div style={{ height: 5, background: '#1e1f24', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${acabou ? 100 : pct}%`, background: 'linear-gradient(90deg, #09bc8a, #00e5a0)', borderRadius: 3, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 0 12px rgba(9,188,138,0.5)' }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        {acabou ? (
          <ConcluidoView done={done} total={total} onBack={() => router.push('/dashboard')} />
        ) : atual ? (
          <div key={idx} style={{ width: '100%', maxWidth: 720, animation: `${anim === 'in' ? 'cardIn' : 'cardOut'} 0.22s cubic-bezier(0.4,0,0.2,1) both` }}>
            {/* Card cliente */}
            <div style={{ background: 'linear-gradient(180deg, #21232b, #1b1d23)', border: '1px solid #353740', borderRadius: 18, padding: '24px', marginBottom: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 15, background: '#15161b', border: '2px solid #09bc8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#09bc8a', flexShrink: 0 }}>
                  {atual.nome.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: 4 }}>{atual.nome}</h2>
                  <div style={{ fontSize: 12.5, color: '#81869e' }}>{fmtCNPJ(atual.cnpj)} · {atual.uf || '—'} · {atual.regiao}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, color: ESTAGIO_COLOR[atual.estagio], background: `${ESTAGIO_COLOR[atual.estagio]}1c`, border: `1px solid ${ESTAGIO_COLOR[atual.estagio]}40` }}>{atual.estagio}</span>
              </div>

              {/* Ação primária: WHATSAPP */}
              {atual.contatoFone && whatsappUrl(atual.contatoFone) ? (
                <a href={whatsappUrl(atual.contatoFone)!} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none',
                  background: 'rgba(37,211,102,0.14)', border: '1px solid rgba(37,211,102,0.4)', borderRadius: 12,
                  padding: '14px', marginBottom: 16, color: '#25d366', fontWeight: 700, fontSize: 15, transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.14)')}>
                  <WhatsIcon size={18} /> WhatsApp — {atual.contatoFone}{atual.contatoNome ? ` · ${atual.contatoNome}` : ''}
                </a>
              ) : (
                <div style={{ background: '#15161b', border: '1px solid #2a2c34', borderRadius: 12, padding: '12px 14px', marginBottom: 16, color: '#81869e', fontSize: 12.5 }}>
                  Sem telefone cadastrado na Nexi{atual.contatoEmail ? ` · ${atual.contatoEmail}` : ''}
                </div>
              )}

              {/* Mini stats */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {atual.valorFatura != null && <Stat label="Fatura" value={`R$ ${atual.valorFatura.toLocaleString('pt-BR')}`} />}
                {atual.economia != null && <Stat label="Economia est." value={`R$ ${atual.economia.toLocaleString('pt-BR')}`} accent />}
                <Stat label="Contatos" value={String(atual.totalAtividades)} />
                <Stat label="Último" value={atual.ultimoContato ? new Date(atual.ultimoContato).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'} />
              </div>
            </div>

            {/* Registro inline */}
            <div style={{ background: '#1e1f24', border: '1px solid #353740', borderRadius: 16, padding: '20px' }}>
              {/* Tipo */}
              <Label>Tipo <Hint>1–7</Hint></Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {TIPOS.map((t, i) => (
                  <button key={t} onClick={() => setTipo(t)} style={chip(tipo === t, TIPO_COLOR[t])}>
                    <kbd style={kbd}>{i + 1}</kbd> {TIPO_ICON[t]} {t}
                  </button>
                ))}
              </div>

              {/* Status */}
              <Label>Resultado <Hint>Q W E R</Hint></Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {STATUS.map((s, i) => (
                  <button key={s} onClick={() => setStatus(s)} style={chip(status === s, STATUS_COLOR[s])}>
                    <kbd style={kbd}>{['Q','W','E','R'][i]}</kbd> {s}
                  </button>
                ))}
              </div>

              {/* Comentário + follow-up */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <Label>Comentário <Hint>C</Hint></Label>
                  <textarea ref={comentRef} value={coment} onChange={e => setComent(e.target.value)} rows={2} placeholder="O que aconteceu na ligação?"
                    style={{ width: '100%', padding: '10px 12px', background: '#15161b', border: '1px solid #353740', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#09bc8a')} onBlur={e => (e.currentTarget.style.borderColor = '#353740')} />
                </div>
                <div style={{ flex: '0 0 160px' }}>
                  <Label>Próximo follow-up</Label>
                  <DateBR value={followUp} onChange={setFollowUp} />
                  <div style={{ fontSize: 10.5, color: '#81869e', marginTop: 5 }}>auto: +2 dias úteis</div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
                <button onClick={avancar} style={{ padding: '11px 16px', background: 'transparent', border: '1px solid #353740', borderRadius: 11, color: '#81869e', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Pular →
                </button>
                <button onClick={salvar} disabled={!tipo || !status || saving} style={{
                  flex: 1, padding: '12px', borderRadius: 11, fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  border: 'none', cursor: (!tipo || !status || saving) ? 'not-allowed' : 'pointer',
                  background: (!tipo || !status) ? '#353740' : '#09bc8a',
                  color: (!tipo || !status) ? '#81869e' : '#0d1e18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: (tipo && status) ? '0 0 24px rgba(9,188,138,0.3)' : 'none', transition: 'all 0.15s',
                }}>
                  {saving ? 'Salvando...' : <>Salvar e próximo <kbd style={{ ...kbd, background: 'rgba(0,0,0,0.2)', color: '#0d1e18' }}>↵</kbd></>}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── subcomponentes ──
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: '#15161b', border: '1px solid #2a2c34', borderRadius: 10, padding: '8px 12px', minWidth: 92 }}>
      <div style={{ fontSize: 10, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? '#09bc8a' : '#fff' }}>{value}</div>
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 11, fontWeight: 600, color: '#81869e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{children}</label>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9.5, color: '#5a5f73', fontWeight: 700, letterSpacing: '0.5px', background: '#15161b', border: '1px solid #2a2c34', borderRadius: 5, padding: '1px 6px', textTransform: 'none' }}>{children}</span>
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#81869e', fontSize: 14, gap: 8 }}>{children}</div>
}
function ConcluidoView({ done, total, onBack }: { done: number; total: number; onBack: () => void }) {
  return (
    <div style={{ alignSelf: 'center', textAlign: 'center', animation: 'cardIn 0.4s ease both' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>Atendimento concluído</h2>
      <p style={{ fontSize: 14, color: '#81869e', marginBottom: 28 }}>
        <span style={{ color: '#09bc8a', fontWeight: 700 }}>{done}</span> de {total} clientes registrados nesta sessão.
      </p>
      <button onClick={onBack} style={{ padding: '12px 28px', background: '#09bc8a', color: '#0d1e18', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(9,188,138,0.35)' }}>
        Voltar à carteira
      </button>
    </div>
  )
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#09bc8a', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, textDecoration: 'underline' }
const kbd: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, fontSize: 10, fontWeight: 700, background: '#15161b', border: '1px solid #353740', borderRadius: 4, padding: '0 4px', color: '#81869e', fontFamily: 'inherit' }
function chip(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '7px 11px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? color : '#353740'}`,
    background: active ? `${color}1c` : 'transparent',
    color: active ? color : '#81869e',
    display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.12s',
  }
}
